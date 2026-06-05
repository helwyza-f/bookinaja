package middleware

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	allowedOrigins := loadAllowedOrigins()
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if origin != "" && isAllowedOrigin(origin, allowedOrigins) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		// 2. Credentials & Methods
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		// 3. Headers
		// X-Tenant-ID dipertahankan untuk kompatibilitas legacy/internal.
		// Browser tenant modern cukup mengandalkan slug/domain aktif.
		allowedHeaders := []string{
			"Content-Type",
			"Content-Length",
			"Accept-Encoding",
			"X-CSRF-Token",
			"Authorization",
			"Accept",
			"Origin",
			"Cache-Control",
			"X-Requested-With",
			"X-Tenant-ID",
			"X-Tenant-Slug",
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", strings.Join(allowedHeaders, ", "))
		c.Writer.Header().Set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers")

		// 4. ELIMINASI OPTIONS BERULANG (The Magic Key)
		// Browser akan menyimpan hasil preflight di cache selama waktu yang ditentukan (dalam detik).
		// 43200 detik = 12 Jam. Jadi browser cuma nanya OPTIONS sekali tiap 12 jam per URL.
		c.Writer.Header().Set("Access-Control-Max-Age", "43200")

		// 5. Handle Preflight Request
		if c.Request.Method == "OPTIONS" {
			log.Printf("[CORS] Preflight origin=%q path=%s req_headers=%q", origin, c.Request.URL.String(), c.GetHeader("Access-Control-Request-Headers"))
			if origin != "" && c.Writer.Header().Get("Access-Control-Allow-Origin") == "" {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
			// Kasih tau browser kalau preflight ini sukses dan bisa di-cache
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func loadAllowedOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if raw == "" {
		raw = strings.TrimSpace(os.Getenv("APP_ALLOWED_ORIGINS"))
	}
	if raw == "" {
		raw = "https://bookinaja.com,https://www.bookinaja.com,https://*.bookinaja.com,http://localhost:*,http://127.0.0.1:*,http://lvh.me:*,http://*.lvh.me:*"
	}

	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		cleaned := strings.TrimSpace(part)
		if cleaned != "" {
			origins = append(origins, cleaned)
		}
	}
	return origins
}

func isAllowedOrigin(origin string, allowed []string) bool {
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return false
	}
	for _, rule := range allowed {
		if originMatchesRule(origin, parsed, rule) {
			return true
		}
	}
	return false
}

func originMatchesRule(origin string, parsed *url.URL, rule string) bool {
	rule = strings.TrimSpace(rule)
	if rule == "" {
		return false
	}
	if rule == origin {
		return true
	}

	rulePortWildcard := strings.HasSuffix(rule, ":*")
	parseRule := rule
	if rulePortWildcard {
		parseRule = strings.TrimSuffix(rule, ":*")
	}
	ruleURL, err := url.Parse(parseRule)
	if err != nil || ruleURL.Scheme == "" || ruleURL.Host == "" {
		return false
	}
	if ruleURL.Scheme != parsed.Scheme {
		return false
	}

	ruleHost := ruleURL.Hostname()
	if !strings.HasPrefix(ruleHost, "*.") {
		return ruleHost == parsed.Hostname() && (rulePortWildcard || portMatches(ruleURL.Port(), parsed.Port()))
	}

	suffix := strings.TrimPrefix(ruleHost, "*")
	if !strings.HasSuffix(parsed.Hostname(), suffix) {
		return false
	}
	if rulePortWildcard {
		return true
	}
	return portMatches(ruleURL.Port(), parsed.Port())
}

func portMatches(rulePort string, originPort string) bool {
	return rulePort == "" || rulePort == "*" || rulePort == originPort
}
