package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CheckMeUserResponse adalah DTO untuk memutus dependensi ke model tenant.User
// CheckMeUserResponse adalah DTO untuk memutus dependensi ke model tenant.User
type CheckMeUserResponse struct {
	ID       uuid.UUID `json:"id"`
	TenantID uuid.UUID `json:"tenant_id"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Role     string    `json:"role"`
	LogoURL  string    `json:"logo_url"` // Tambahkan ini
}

// TenantService adalah Interface untuk memutus Import Cycle.
type TenantService interface {
	GetUserByID(ctx context.Context, id uuid.UUID) (*CheckMeUserResponse, error)
}

type Handler struct {
	service       *Service
	tenantService TenantService
}

func NewHandler(s *Service, ts TenantService) *Handler {
	return &Handler{
		service:       s,
		tenantService: ts,
	}
}

func (h *Handler) CheckMe(c *gin.Context) {
	// 1. Ambil data dari Context
	idVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tidak ditemukan"})
		return
	}

	// 2. SMART PARSING: Handle jika ID dikirim middleware sebagai string atau uuid.UUID
	var userID uuid.UUID
	var err error

	switch v := idVal.(type) {
	case string:
		// Jika string (kasus MapClaims), kita parsing ke UUID
		userID, err = uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "format session id korup"})
			return
		}
	case uuid.UUID:
		// Jika sudah UUID, tinggal pakai
		userID = v
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid session format"})
		return
	}

	// 3. Tarik data profil terbaru dari DB via Service
	user, err := h.tenantService.GetUserByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "authenticated",
		"user": gin.H{
			"id":        user.ID,
			"tenant_id": user.TenantID,
			"role":      user.Role,
			"name":      user.Name,
			"email":     user.Email,
			"logo_url":  user.LogoURL, // Tampilkan di JSON
			"initials":  h.getInitials(user.Name),
		},
	})
}

func (h *Handler) getInitials(name string) string {
	words := strings.Fields(name)
	if len(words) >= 2 {
		return strings.ToUpper(words[0][:1] + words[1][:1])
	}
	if len(words) == 1 {
		return strings.ToUpper(words[0][:1])
	}
	return "U"
}