package upload

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/helwiza/saas/internal/platform/storage"
)

// HandleSingleUpload mengurus upload satu file untuk domain apa saja
func HandleSingleUpload(c *gin.Context, folderPrefix string) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File image tidak ditemukan"})
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

	c.JSON(http.StatusOK, gin.H{"url": url})
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
