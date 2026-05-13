package middleware

import (
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func SlowRequestLogger() gin.HandlerFunc {
	threshold := resolveSlowRequestThreshold()

	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		duration := time.Since(start)
		if duration < threshold {
			return
		}

		log.Printf(
			"[SLOW] method=%s path=%s status=%d duration=%s client_ip=%s tenant_slug=%s tenant_id=%s auth_type=%s user_role=%s query=%q errors=%q",
			c.Request.Method,
			c.FullPath(),
			c.Writer.Status(),
			duration.Round(time.Millisecond),
			c.ClientIP(),
			c.GetString("tenantSlug"),
			c.GetString("tenantID"),
			c.GetString("authType"),
			c.GetString("userRole"),
			c.Request.URL.RawQuery,
			c.Errors.String(),
		)
	}
}

func DebugAccessGuard() gin.HandlerFunc {
	token := strings.TrimSpace(os.Getenv("PPROF_TOKEN"))

	return func(c *gin.Context) {
		if isTrustedDebugClient(c.ClientIP()) {
			c.Next()
			return
		}

		if token != "" {
			if header := strings.TrimSpace(c.GetHeader("X-Debug-Token")); header == token {
				c.Next()
				return
			}

			if auth := strings.TrimSpace(c.GetHeader("Authorization")); strings.HasPrefix(auth, "Bearer ") {
				if strings.TrimSpace(strings.TrimPrefix(auth, "Bearer ")) == token {
					c.Next()
					return
				}
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "debug access denied"})
	}
}

func resolveSlowRequestThreshold() time.Duration {
	raw := strings.TrimSpace(os.Getenv("SLOW_REQUEST_THRESHOLD_MS"))
	if raw == "" {
		return 2 * time.Second
	}

	ms, err := strconv.Atoi(raw)
	if err != nil || ms <= 0 {
		return 2 * time.Second
	}

	return time.Duration(ms) * time.Millisecond
}

func isTrustedDebugClient(ip string) bool {
	parsed := net.ParseIP(strings.TrimSpace(ip))
	if parsed == nil {
		return false
	}

	if parsed.IsLoopback() {
		return true
	}

	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
	}

	for _, cidr := range privateRanges {
		_, network, err := net.ParseCIDR(cidr)
		if err == nil && network.Contains(parsed) {
			return true
		}
	}

	return false
}
