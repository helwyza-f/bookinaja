package upload

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/storage"
)

const uploadChunkSize int64 = 256 * 1024

type chunkUploadSession struct {
	UploadID     string    `json:"upload_id"`
	TenantID     string    `json:"tenant_id"`
	FolderPrefix string    `json:"folder_prefix"`
	FileName     string    `json:"file_name"`
	ContentType  string    `json:"content_type"`
	TotalSize    int64     `json:"total_size"`
	TotalChunks  int       `json:"total_chunks"`
	ObjectKey    string    `json:"object_key"`
	CreatedAt    time.Time `json:"created_at"`
}

func HandleChunkInitiate(c *gin.Context, folderPrefix string) {
	tenantID := c.MustGet("tenantID").(string)

	var req struct {
		FileName    string `json:"file_name"`
		ContentType string `json:"content_type"`
		TotalSize   int64  `json:"total_size"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload upload tidak valid"})
		return
	}

	req.FileName = strings.TrimSpace(req.FileName)
	req.ContentType = strings.ToLower(strings.TrimSpace(req.ContentType))
	if req.FileName == "" || req.ContentType == "" || req.TotalSize <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file_name, content_type, dan total_size wajib diisi"})
		return
	}
	if err := validateUploadDescriptor(req.ContentType, req.TotalSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ext := strings.ToLower(filepath.Ext(req.FileName))
	if ext == "" {
		if exts, _ := mime.ExtensionsByType(req.ContentType); len(exts) > 0 {
			ext = exts[0]
		}
	}
	if ext == "" {
		ext = ".bin"
	}

	uploadID := uuid.NewString()
	totalChunks := int((req.TotalSize + uploadChunkSize - 1) / uploadChunkSize)
	session := chunkUploadSession{
		UploadID:     uploadID,
		TenantID:     tenantID,
		FolderPrefix: folderPrefix,
		FileName:     req.FileName,
		ContentType:  req.ContentType,
		TotalSize:    req.TotalSize,
		TotalChunks:  totalChunks,
		ObjectKey:    fmt.Sprintf("%s/%s/%s%s", strings.Trim(folderPrefix, "/"), tenantID, uuid.NewString(), ext),
		CreatedAt:    time.Now().UTC(),
	}
	if err := writeChunkSession(session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyiapkan sesi upload"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"upload_id":    session.UploadID,
		"chunk_size":   uploadChunkSize,
		"total_chunks": session.TotalChunks,
	})
}

func HandleChunkPart(c *gin.Context) {
	session, err := readChunkSession(c.Param("uploadID"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sesi upload tidak ditemukan"})
		return
	}
	if session.TenantID != c.MustGet("tenantID").(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "sesi upload tidak sesuai tenant aktif"})
		return
	}

	chunkIndex, err := strconv.Atoi(c.PostForm("chunk_index"))
	if err != nil || chunkIndex < 0 || chunkIndex >= session.TotalChunks {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chunk_index tidak valid"})
		return
	}

	file, err := firstFormFile(c, "chunk", "file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chunk tidak ditemukan"})
		return
	}
	if file.Size <= 0 || file.Size > uploadChunkSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ukuran chunk melebihi batas"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membaca chunk"})
		return
	}
	defer src.Close()

	partPath := chunkPartPath(session.UploadID, chunkIndex)
	if err := os.MkdirAll(filepath.Dir(partPath), 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyiapkan folder chunk"})
		return
	}

	dst, err := os.Create(partPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan chunk"})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menulis chunk"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "chunk diterima"})
}

func HandleChunkComplete(c *gin.Context) {
	session, err := readChunkSession(c.Param("uploadID"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sesi upload tidak ditemukan"})
		return
	}
	if session.TenantID != c.MustGet("tenantID").(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "sesi upload tidak sesuai tenant aktif"})
		return
	}

	assembledPath := filepath.Join(chunkSessionDir(session.UploadID), "assembled.bin")
	if err := assembleChunks(session, assembledPath); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defer cleanupChunkSession(session.UploadID)

	file, err := os.Open(assembledPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuka file hasil upload"})
		return
	}
	defer file.Close()

	s3, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal inisialisasi storage"})
		return
	}

	url, err := s3.UploadReader(c.Request.Context(), file, session.ObjectKey, session.ContentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal upload ke storage"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":       url,
		"mime_type": session.ContentType,
		"size":      session.TotalSize,
	})
}

func validateUploadDescriptor(contentType string, size int64) error {
	switch {
	case strings.HasPrefix(contentType, "image/"):
		const maxImageBytes = 5 * 1024 * 1024
		if size > maxImageBytes {
			return errors.New("ukuran gambar melebihi 5MB")
		}
		return nil
	case strings.HasPrefix(contentType, "video/"):
		const maxVideoBytes = 80 * 1024 * 1024
		if size > maxVideoBytes {
			return errors.New("ukuran video melebihi 80MB")
		}
		return nil
	default:
		return errors.New("hanya file gambar atau video yang didukung")
	}
}

func writeChunkSession(session chunkUploadSession) error {
	if err := os.MkdirAll(chunkSessionDir(session.UploadID), 0o755); err != nil {
		return err
	}
	bytes, err := json.Marshal(session)
	if err != nil {
		return err
	}
	return os.WriteFile(chunkSessionFile(session.UploadID), bytes, 0o644)
}

func readChunkSession(uploadID string) (*chunkUploadSession, error) {
	bytes, err := os.ReadFile(chunkSessionFile(uploadID))
	if err != nil {
		return nil, err
	}
	var session chunkUploadSession
	if err := json.Unmarshal(bytes, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func assembleChunks(session *chunkUploadSession, destination string) error {
	if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
		return err
	}
	dst, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer dst.Close()

	var totalWritten int64
	for i := 0; i < session.TotalChunks; i++ {
		partPath := chunkPartPath(session.UploadID, i)
		part, err := os.Open(partPath)
		if err != nil {
			return errors.New("masih ada chunk yang belum selesai diupload")
		}
		written, copyErr := io.Copy(dst, part)
		_ = part.Close()
		if copyErr != nil {
			return copyErr
		}
		totalWritten += written
	}
	if totalWritten != session.TotalSize {
		return errors.New("ukuran file hasil upload tidak cocok")
	}
	return nil
}

func cleanupChunkSession(uploadID string) {
	_ = os.RemoveAll(chunkSessionDir(uploadID))
}

func chunkSessionFile(uploadID string) string {
	return filepath.Join(chunkSessionDir(uploadID), "session.json")
}

func chunkPartPath(uploadID string, chunkIndex int) string {
	return filepath.Join(chunkSessionDir(uploadID), fmt.Sprintf("part-%06d.bin", chunkIndex))
}

func chunkSessionDir(uploadID string) string {
	return filepath.Join(os.TempDir(), "bookinaja-chunk-uploads", uploadID)
}

func CleanupChunkUploads(ctx context.Context, olderThan time.Duration) error {
	_ = ctx
	baseDir := filepath.Join(os.TempDir(), "bookinaja-chunk-uploads")
	entries, err := os.ReadDir(baseDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	threshold := time.Now().Add(-olderThan)
	for _, entry := range entries {
		info, infoErr := entry.Info()
		if infoErr != nil {
			continue
		}
		if info.ModTime().Before(threshold) {
			_ = os.RemoveAll(filepath.Join(baseDir, entry.Name()))
		}
	}
	return nil
}
