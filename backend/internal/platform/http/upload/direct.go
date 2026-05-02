package upload

import (
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/storage"
)

const directMultipartPartSize int64 = 5 * 1024 * 1024

type directUploadSession struct {
	UploadID     string    `json:"upload_id"`
	TenantID     string    `json:"tenant_id"`
	FolderPrefix string    `json:"folder_prefix"`
	FileName     string    `json:"file_name"`
	ContentType  string    `json:"content_type"`
	TotalSize    int64     `json:"total_size"`
	TotalParts   int       `json:"total_parts"`
	ObjectKey    string    `json:"object_key"`
	ProviderID   string    `json:"provider_id"`
	Mode         string    `json:"mode"`
	CreatedAt    time.Time `json:"created_at"`
}

func HandleDirectInitiate(c *gin.Context, folderPrefix string) {
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

	s3Client, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal inisialisasi storage"})
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

	objectKey := fmt.Sprintf("%s/%s/%s%s", strings.Trim(folderPrefix, "/"), tenantID, uuid.NewString(), ext)
	if req.TotalSize <= directMultipartPartSize {
		putURL, err := s3Client.PresignPutObject(c.Request.Context(), objectKey, req.ContentType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyiapkan upload langsung"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"mode":       "single",
			"upload_url": putURL,
			"url":        s3Client.PublicURLForKey(objectKey),
			"object_key": objectKey,
			"headers": gin.H{
				"Content-Type": req.ContentType,
			},
		})
		return
	}

	providerID, err := s3Client.CreateMultipartUpload(c.Request.Context(), objectKey, req.ContentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memulai multipart upload"})
		return
	}

	uploadID := uuid.NewString()
	totalParts := int((req.TotalSize + directMultipartPartSize - 1) / directMultipartPartSize)
	session := directUploadSession{
		UploadID:     uploadID,
		TenantID:     tenantID,
		FolderPrefix: folderPrefix,
		FileName:     req.FileName,
		ContentType:  req.ContentType,
		TotalSize:    req.TotalSize,
		TotalParts:   totalParts,
		ObjectKey:    objectKey,
		ProviderID:   providerID,
		Mode:         "multipart",
		CreatedAt:    time.Now().UTC(),
	}
	if err := writeDirectUploadSession(session); err != nil {
		_ = s3Client.AbortMultipartUpload(c.Request.Context(), objectKey, providerID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan sesi upload langsung"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"mode":        "multipart",
		"upload_id":   uploadID,
		"part_size":   directMultipartPartSize,
		"total_parts": totalParts,
		"url":         s3Client.PublicURLForKey(objectKey),
	})
}

func HandleDirectPartURL(c *gin.Context) {
	session, err := readDirectUploadSession(c.Param("uploadID"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sesi upload tidak ditemukan"})
		return
	}
	if session.TenantID != c.MustGet("tenantID").(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "sesi upload tidak sesuai tenant aktif"})
		return
	}
	if session.Mode != "multipart" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sesi upload bukan multipart"})
		return
	}

	partNumber, err := strconv.Atoi(c.Query("part_number"))
	if err != nil || partNumber <= 0 || partNumber > session.TotalParts {
		c.JSON(http.StatusBadRequest, gin.H{"error": "part_number tidak valid"})
		return
	}

	s3Client, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal inisialisasi storage"})
		return
	}
	url, err := s3Client.PresignUploadPart(c.Request.Context(), session.ObjectKey, session.ProviderID, int32(partNumber))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyiapkan upload part"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"upload_url": url})
}

func HandleDirectComplete(c *gin.Context) {
	session, err := readDirectUploadSession(c.Param("uploadID"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sesi upload tidak ditemukan"})
		return
	}
	if session.TenantID != c.MustGet("tenantID").(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "sesi upload tidak sesuai tenant aktif"})
		return
	}

	if session.Mode != "multipart" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sesi upload bukan multipart"})
		return
	}

	var req struct {
		Parts []struct {
			PartNumber int    `json:"part_number"`
			ETag       string `json:"etag"`
		} `json:"parts"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload complete upload tidak valid"})
		return
	}
	if len(req.Parts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "daftar part wajib diisi"})
		return
	}

	completedParts := make([]types.CompletedPart, 0, len(req.Parts))
	for _, part := range req.Parts {
		if part.PartNumber <= 0 || strings.TrimSpace(part.ETag) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "part upload tidak lengkap"})
			return
		}
		etag := strings.TrimSpace(part.ETag)
		completedParts = append(completedParts, types.CompletedPart{
			ETag:       aws.String(etag),
			PartNumber: aws.Int32(int32(part.PartNumber)),
		})
	}

	s3Client, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal inisialisasi storage"})
		return
	}
	if err := s3Client.CompleteMultipartUpload(c.Request.Context(), session.ObjectKey, session.ProviderID, completedParts); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyelesaikan multipart upload"})
		return
	}
	cleanupDirectUploadSession(session.UploadID)

	c.JSON(http.StatusOK, gin.H{
		"url":       s3Client.PublicURLForKey(session.ObjectKey),
		"mime_type": session.ContentType,
		"size":      session.TotalSize,
	})
}

func writeDirectUploadSession(session directUploadSession) error {
	if err := os.MkdirAll(directUploadSessionDir(session.UploadID), 0o755); err != nil {
		return err
	}
	bytes, err := json.Marshal(session)
	if err != nil {
		return err
	}
	return os.WriteFile(directUploadSessionFile(session.UploadID), bytes, 0o644)
}

func readDirectUploadSession(uploadID string) (*directUploadSession, error) {
	bytes, err := os.ReadFile(directUploadSessionFile(uploadID))
	if err != nil {
		return nil, err
	}
	var session directUploadSession
	if err := json.Unmarshal(bytes, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func cleanupDirectUploadSession(uploadID string) {
	_ = os.RemoveAll(directUploadSessionDir(uploadID))
}

func directUploadSessionFile(uploadID string) string {
	return filepath.Join(directUploadSessionDir(uploadID), "session.json")
}

func directUploadSessionDir(uploadID string) string {
	return filepath.Join(os.TempDir(), "bookinaja-direct-uploads", uploadID)
}

func CleanupDirectUploadSessions(olderThan time.Duration) error {
	baseDir := filepath.Join(os.TempDir(), "bookinaja-direct-uploads")
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
