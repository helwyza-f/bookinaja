// Package paymentgateway menyimpan & memakai kredensial payment gateway milik
// tenant (BYO gateway). Server key disimpan terenkripsi at-rest; paket ini
// tidak pernah meng-log atau menserialisasi secret ke JSON.
package paymentgateway

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

// ErrNoMasterKey dikembalikan bila PAYMENT_SECRET_KEY belum diset. Enkripsi
// kredensial gateway wajib punya master key; tanpa itu fitur BYO dinonaktifkan.
var ErrNoMasterKey = errors.New("PAYMENT_SECRET_KEY belum diset")

// masterKey membaca kunci AES-256 dari env. Menerima base64 (disarankan, 32
// byte hasil decode) atau string mentah tepat 32 karakter.
func masterKey() ([]byte, error) {
	raw := strings.TrimSpace(os.Getenv("PAYMENT_SECRET_KEY"))
	if raw == "" {
		return nil, ErrNoMasterKey
	}
	if decoded, err := base64.StdEncoding.DecodeString(raw); err == nil && len(decoded) == 32 {
		return decoded, nil
	}
	if len(raw) == 32 {
		return []byte(raw), nil
	}
	return nil, fmt.Errorf("PAYMENT_SECRET_KEY harus 32 byte (base64 dari 32 byte, atau string 32 karakter)")
}

// MasterKeyReady melaporkan apakah master key tersedia & valid — dipakai untuk
// gating fitur BYO di boot/health.
func MasterKeyReady() bool {
	_, err := masterKey()
	return err == nil
}

// encrypt mengembalikan nonce||ciphertext (AES-256-GCM). Plaintext kosong →
// nil (tidak menyimpan apa-apa).
func encrypt(plain string) ([]byte, error) {
	if plain == "" {
		return nil, nil
	}
	key, err := masterKey()
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, []byte(plain), nil), nil
}

// decrypt membalik encrypt. Input kosong → string kosong.
func decrypt(enc []byte) (string, error) {
	if len(enc) == 0 {
		return "", nil
	}
	key, err := masterKey()
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(enc) < gcm.NonceSize() {
		return "", errors.New("ciphertext gateway tidak valid")
	}
	nonce, ct := enc[:gcm.NonceSize()], enc[gcm.NonceSize():]
	out, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", err
	}
	return string(out), nil
}
