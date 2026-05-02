package upload

import (
	"errors"
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

	tenantID := c.MustGet("tenantID").(string)

	s3, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal inisialisasi storage"})
		return
	}

	url, err := s3.UploadFile(c.Request.Context(), file, folderPrefix+"/"+tenantID)
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

	switch {
	case strings.HasPrefix(contentType, "image/"):
		const maxImageBytes = 5 * 1024 * 1024
		if file.Size > maxImageBytes {
			return errors.New("ukuran gambar melebihi 5MB")
		}
		return nil
	case strings.HasPrefix(contentType, "video/"):
		const maxVideoBytes = 80 * 1024 * 1024
		if file.Size > maxVideoBytes {
			return errors.New("ukuran video melebihi 80MB")
		}
		return nil
	default:
		return errors.New("hanya file gambar atau video yang didukung")
	}
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

	tenantID := c.MustGet("tenantID").(string)

	s3, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal inisialisasi storage"})
		return
	}

	urls, err := s3.UploadBulk(c.Request.Context(), files, folderPrefix+"/"+tenantID)
	if err != nil {
		c.JSON(http.StatusMultiStatus, gin.H{
			"error": "Beberapa file gagal diupload",
			"urls":  urls,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"urls": urls})
}
