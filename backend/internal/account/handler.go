package account

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/http/upload"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Signup(c *gin.Context) {
	var req SignupReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email dan password wajib diisi"})
		return
	}

	res, err := h.service.Signup(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email dan password wajib diisi"})
		return
	}

	res, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, errAccountEmailNotVerified) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": err.Error(),
				"code":  "email_not_verified",
			})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) GoogleAuth(c *gin.Context) {
	var req GoogleAuthReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token Google wajib diisi"})
		return
	}

	res, err := h.service.GoogleAuth(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) RequestEmailVerification(c *gin.Context) {
	var req EmailVerificationRequestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email wajib diisi"})
		return
	}

	res, err := h.service.RequestEmailVerification(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) VerifyEmail(c *gin.Context) {
	var req EmailVerificationVerifyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token verifikasi wajib diisi"})
		return
	}

	res, err := h.service.VerifyEmail(c.Request.Context(), req.Token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) Me(c *gin.Context) {
	accountID, ok := accountIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "akun tidak valid"})
		return
	}

	res, err := h.service.Me(c.Request.Context(), accountID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) ListWorkspaces(c *gin.Context) {
	accountID, ok := accountIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "akun tidak valid"})
		return
	}

	res, err := h.service.Me(c.Request.Context(), accountID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": res.Workspaces})
}

func (h *Handler) CreateWorkspace(c *gin.Context) {
	accountID, ok := accountIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "akun tidak valid"})
		return
	}

	var req CreateWorkspaceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nama workspace wajib diisi"})
		return
	}

	res, err := h.service.CreateWorkspace(c.Request.Context(), accountID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *Handler) GetOnboarding(c *gin.Context) {
	accountID, ok := accountIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "akun tidak valid"})
		return
	}
	workspaceID, ok := workspaceIDFromParam(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace tidak valid"})
		return
	}

	res, err := h.service.GetOnboarding(c.Request.Context(), accountID, workspaceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "onboarding workspace tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) UpdateOnboardingStep(c *gin.Context) {
	accountID, ok := accountIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "akun tidak valid"})
		return
	}
	workspaceID, ok := workspaceIDFromParam(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace tidak valid"})
		return
	}

	var req OnboardingStepUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload onboarding tidak valid"})
		return
	}

	res, err := h.service.UpdateOnboardingStep(c.Request.Context(), accountID, workspaceID, c.Param("step"), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) UploadWorkspaceAsset(c *gin.Context) {
	accountID, ok := accountIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "akun tidak valid"})
		return
	}
	workspaceID, ok := workspaceIDFromParam(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace tidak valid"})
		return
	}

	tenantID, err := h.service.GetWorkspaceTenantIDForUpload(c.Request.Context(), accountID, workspaceID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "workspace tidak bisa diakses"})
		return
	}

	c.Set("tenantID", tenantID.String())
	upload.HandleSingleUpload(c, "tenants/onboarding")
}

func accountIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	raw := strings.TrimSpace(c.GetString("accountID"))
	if raw == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(raw)
	if err != nil || id == uuid.Nil {
		return uuid.Nil, false
	}
	return id, true
}

func workspaceIDFromParam(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(strings.TrimSpace(c.Param("workspaceId")))
	if err != nil || id == uuid.Nil {
		return uuid.Nil, false
	}
	return id, true
}
