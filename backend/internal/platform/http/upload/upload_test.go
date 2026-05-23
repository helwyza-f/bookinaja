package upload

import (
	"strings"
	"testing"
)

func TestDetectSupportedUploadContentTypeRejectsSVG(t *testing.T) {
	_, err := detectSupportedUploadContentType(strings.NewReader(`<svg><script>alert(1)</script></svg>`))
	if err == nil {
		t.Fatal("detectSupportedUploadContentType() error = nil, want unsupported format")
	}
}

func TestDetectSupportedUploadContentTypeAcceptsWebP(t *testing.T) {
	data := "RIFFxxxxWEBPVP8 "
	got, err := detectSupportedUploadContentType(strings.NewReader(data))
	if err != nil {
		t.Fatalf("detectSupportedUploadContentType() error = %v", err)
	}
	if got != "image/webp" {
		t.Fatalf("content type = %q, want image/webp", got)
	}
}

func TestValidateUploadDescriptorRejectsUnlistedImageType(t *testing.T) {
	err := validateUploadDescriptor("image/svg+xml", 512)
	if err == nil {
		t.Fatal("validateUploadDescriptor() error = nil, want unsupported format")
	}
}
