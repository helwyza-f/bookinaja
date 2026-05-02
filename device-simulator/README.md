# Device Simulator

Simulator MQTT untuk `Bookinaja Smart Point` yang berdiri sendiri di luar project backend.

## Tujuan

- Meniru perilaku device fisik sebelum hardware siap
- Bisa dijalankan / dimatikan terpisah dari backend
- Tetap bicara langsung ke broker MQTT
- Opsional melakukan pairing ke backend untuk test provisioning

## Setup

1. Copy [`D:\projects\bookinaja\device-simulator\.env.example`](D:\projects\bookinaja\device-simulator\.env.example) menjadi `.env`.
2. Isi `DEVICE_SIM_DEVICE_ID` dan `DEVICE_SIM_DEVICE_KEY` sesuai device production yang mau diuji.
3. Pastikan `MQTT_*` sesuai broker EMQX production.
4. Isi `DEVICE_SIM_API_URL` ke endpoint backend production kalau mau test pairing.
5. Kalau hanya mau test MQTT transport, ubah `DEVICE_SIM_AUTO_PAIR=false`.

Contoh PowerShell:

```powershell
cd D:\projects\bookinaja\device-simulator
Copy-Item .env.example .env
go run .
```

## Test dari laptop ke production

Simulator ini memang dirancang untuk tetap jalan lokal sambil menembak environment production.

Flow yang disarankan:

1. Claim device di dashboard production.
2. Assign device ke resource production yang memang aman untuk dites.
3. Atur `.env` simulator:
   - `MQTT_BROKER_HOST`, `MQTT_USERNAME`, `MQTT_PASSWORD`
   - `MQTT_CA_CERT_PEM`
   - `DEVICE_SIM_API_URL=https://bookinaja.com/api/v1/public`
4. Jalankan `go run .` dari laptop.
5. Kalau `DEVICE_SIM_AUTO_PAIR=true`, simulator akan pair sekali ke backend production lalu lanjut full MQTT.

## Flow test claim, assign, pair

1. Admin claim device di dashboard `Smart Devices` memakai `device_id` dan `device_key` yang sama dengan `.env` simulator.
2. Admin assign device itu ke resource yang diinginkan.
3. Jalankan simulator dengan `DEVICE_SIM_AUTO_PAIR=true` kalau mau meniru proses alat pertama kali aktif.
4. Simulator akan hit `POST /api/v1/public/devices/pair` sekali, lalu lanjut full MQTT.
5. Setelah itu simulator subscribe ke command topic dan publish state/ack ke broker.

Kalau mau langsung test MQTT tanpa provisioning:

1. Claim dan assign device dari dashboard.
2. Jalankan simulator dengan `DEVICE_SIM_AUTO_PAIR=false`.
3. Simulator akan connect langsung ke broker tanpa call backend.

## Perilaku runtime

- Subscribe ke topic `bookinaja/devices/{device_id}/set`
- Publish heartbeat/state ke `bookinaja/devices/{device_id}/state`
- Publish ack ke `bookinaja/devices/{device_id}/ack`
- Saat shutdown, publish payload `offline`

## Catatan

- Backend hanya dipakai untuk pairing/provisioning jika `DEVICE_SIM_AUTO_PAIR=true`.
- Jalur realtime normal tetap:
  `backend -> MQTT broker -> simulator`
  `simulator -> MQTT broker -> backend`
- `MQTT_CA_CERT_PEM` sekarang didukung langsung, jadi simulator tidak perlu lagi bergantung ke file cert lokal dari project backend.
