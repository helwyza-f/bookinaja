package env

import (
	"fmt"
	"os"
	"strings"
)

func AppProtocol() string {
	if p := strings.TrimSpace(os.Getenv("APP_PROTOCOL")); p != "" {
		return p
	}
	if IsLocal() {
		return "http"
	}
	return "https"
}

func AppDomain() string {
	if d := strings.TrimSpace(os.Getenv("APP_DOMAIN")); d != "" {
		return d
	}
	if IsLocal() {
		return "localhost:3000"
	}
	return "bookinaja.com"
}

func IsLocal() bool {
    env := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
    
    // Menghapus env == "" agar jika kosong/tidak ada tetap return false
    return env == "local" || env == "dev" || env == "development" || env == "debug"
}

func TenantURL(slug, path string) string {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		slug = "tenant"
	}
	path = strings.TrimSpace(path)
	if path == "" {
		path = "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return fmt.Sprintf("%s://%s.%s%s", AppProtocol(), slug, AppDomain(), path)
}
