package paymentgateway

import (
	"encoding/base64"
	"testing"
)

func TestEncryptDecryptRoundTrip(t *testing.T) {
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i)
	}
	t.Setenv("PAYMENT_SECRET_KEY", base64.StdEncoding.EncodeToString(key))

	plain := "SB-Mid-server-abc123DEF456"
	enc, err := encrypt(plain)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	if len(enc) == 0 {
		t.Fatal("ciphertext kosong")
	}
	if string(enc) == plain {
		t.Fatal("ciphertext sama dengan plaintext")
	}

	got, err := decrypt(enc)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if got != plain {
		t.Fatalf("roundtrip = %q, want %q", got, plain)
	}
}

func TestEncryptEmptyIsNil(t *testing.T) {
	t.Setenv("PAYMENT_SECRET_KEY", base64.StdEncoding.EncodeToString(make([]byte, 32)))
	enc, err := encrypt("")
	if err != nil {
		t.Fatalf("encrypt empty: %v", err)
	}
	if enc != nil {
		t.Fatal("plaintext kosong harus menghasilkan nil")
	}
}

func TestMissingMasterKey(t *testing.T) {
	t.Setenv("PAYMENT_SECRET_KEY", "")
	if _, err := encrypt("x"); err != ErrNoMasterKey {
		t.Fatalf("err = %v, want ErrNoMasterKey", err)
	}
}
