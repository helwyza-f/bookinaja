package upload

import (
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/platform/storage"
)

// HandleSingleUpload mengurus upload satu file untuk domain apa saja
func HandleSingleUpload(c *gin.Context, folderPrefix string) {
	file, err := firstFormFile(c, "image", "file", "media")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File tidak ditemukan"})
		return
	}
	if err := validateUploadFile(file); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	scopeID, ok := uploadScopeIDFromContext(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "upload scope missing"})
		return
	}

	s3, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal inisialisasi storage"})
		return
	}

	url, err := s3.UploadFile(c.Request.Context(), file, folderPrefix+"/"+scopeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal upload ke storage"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":       url,
		"mime_type": strings.ToLower(strings.TrimSpace(file.Header.Get("Content-Type"))),
		"size":      file.Size,
	})
}

func firstFormFile(c *gin.Context, keys ...string) (*multipart.FileHeader, error) {
	for _, key := range keys {
		file, err := c.FormFile(key)
		if err == nil {
			return file, nil
		}
	}
	return nil, http.ErrMissingFile
}

func validateUploadFile(file *multipart.FileHeader) error {
	contentType := strings.ToLower(strings.TrimSpace(file.Header.Get("Content-Type")))
	if contentType == "" {
		return errors.New("content type file tidak dikenali")
	}
	if err := validateUploadDescriptor(contentType, file.Size); err != nil {
		return err
	}

	src, err := file.Open()
	if err != nil {
		return errors.New("file tidak bisa dibaca")
	}
	defer src.Close()

	detected, err := detectSupportedUploadContentType(src)
	if err != nil {
		return err
	}
	if !contentTypesCompatible(contentType, detected) {
		return errors.New("format file tidak sesuai dengan content type")
	}
	file.Header.Set("Content-Type", detected)
	return nil
}

func detectSupportedUploadContentType(reader io.Reader) (string, error) {
	buffer := make([]byte, 512)
	n, err := reader.Read(buffer)
	if err != nil && err != io.EOF {
		return "", errors.New("file tidak bisa dibaca")
	}
	if n == 0 {
		return "", errors.New("file kosong")
	}

	detected := strings.ToLower(http.DetectContentType(buffer[:n]))
	if isAllowedUploadContentType(detected) {
		return detected, nil
	}
	if isWebP(buffer[:n]) {
		return "image/webp", nil
	}
	if isQuickTime(buffer[:n]) {
		return "video/quicktime", nil
	}
	return "", errors.New("format file tidak didukung")
}

func isAllowedUploadContentType(contentType string) bool {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/jpeg", "image/png", "image/webp", "image/gif",
		"video/mp4", "video/mpeg", "video/webm", "video/quicktime":
		return true
	default:
		return false
	}
}

func contentTypesCompatible(claimed string, detected string) bool {
	claimed = strings.ToLower(strings.TrimSpace(strings.Split(claimed, ";")[0]))
	detected = strings.ToLower(strings.TrimSpace(strings.Split(detected, ";")[0]))
	if claimed == detected {
		return true
	}
	return strings.HasPrefix(claimed, "video/") && strings.HasPrefix(detected, "video/")
}

func isWebP(data []byte) bool {
	return len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP"
}

func isQuickTime(data []byte) bool {
	return len(data) >= 12 && string(data[4:8]) == "ftyp" && strings.Contains(string(data[8:12]), "qt")
}

// HandleBulkUpload mengurus upload banyak file (gallery)
func HandleBulkUpload(c *gin.Context, folderPrefix string) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Form multipart tidak valid"})
		return
	}

	files := form.File["images"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Minimal upload 1 gambar"})
		return
	}

	scopeID, ok := uploadScopeIDFromContext(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "upload scope missing"})
		return
	}

	s3, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal inisialisasi storage"})
		return
	}

	urls, err := s3.UploadBulk(c.Request.Context(), files, folderPrefix+"/"+scopeID)
	if err != nil {
		c.JSON(http.StatusMultiStatus, gin.H{
			"error": "Beberapa file gagal diupload",
			"urls":  urls,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"urls": urls})
}

func uploadScopeIDFromContext(c *gin.Context) (string, bool) {
	if raw, exists := c.Get("tenantID"); exists && raw != nil {
		tenantID := strings.TrimSpace(raw.(string))
		if tenantID != "" {
			return tenantID, true
		}
	}
	if raw, exists := c.Get("customerID"); exists && raw != nil {
		customerID := strings.TrimSpace(raw.(string))
		if customerID != "" {
			return customerID, true
		}
	}
	return "", false
}
