# Backend Notes

## Google Auth Environment

Phase 2 customer Google sign-in memakai tiga audience Google OAuth yang perlu
tersedia di environment backend:

```env
GOOGLE_CLIENT_ID_WEB=39127355505-h1dl0k4evqipvo89vjn3rf78qbfpl0ug.apps.googleusercontent.com
GOOGLE_CLIENT_ID_IOS=39127355505-69ph15i21481t87eoktnj2462h6ofp5h.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=39127355505-pp4rj37f5qa4mag36dj597j03o2mkvjm.apps.googleusercontent.com
```

Google login flow:
- kalau `google_subject` sudah terhubung, customer langsung login
- kalau email Google cocok dengan akun existing, akun akan di-link lalu login
- kalau akun belum ada, backend akan keluarkan `claim_token` dan customer wajib
  melanjutkan claim nomor WhatsApp + OTP

Redis wajib aktif untuk flow `claim_token` Google karena token claim disimpan
sementara selama 15 menit.
