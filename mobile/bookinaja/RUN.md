# Bookinaja Admin — cara menjalankan

Toolchain sudah terpasang di laptop ini:

- Flutter 3.44.9 (stable) + Dart 3.12.2 → `C:\src\flutter`
- JDK 17 (Microsoft OpenJDK) → `C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot`
- Android SDK 36 (+ platform-tools/adb, build-tools) → `C:\src\android-sdk`
- Env permanen sudah diset: `PATH` (flutter), `JAVA_HOME`, `ANDROID_SDK_ROOT`

## PENTING: jalankan dari terminal kamu sendiri

Build Android (Gradle) TIDAK bisa jalan dari dalam agen Claude karena environment
eksekusinya memblokir Unix domain socket (AF_UNIX) yang dibutuhkan NIO selector JDK.
Di terminal kamu sendiri (PowerShell/CMD) ini normal dan build akan sukses.

## Langkah

1. Colok HP Android via USB.
2. Aktifkan **Developer options** (tap "Build number" 7×) lalu **USB debugging: ON**.
3. Saat muncul popup "Allow USB debugging?" → Allow.
4. Buka **PowerShell baru** (biar PATH kebaca), lalu:

```powershell
cd C:\projects\bookinaja\mobile\bookinaja
flutter devices          # pastikan HP muncul
flutter run              # build + install + hot reload
```

Kalau HP belum muncul di `flutter devices`, cek driver USB / mode koneksi (pakai
"File transfer / MTP"), dan `adb devices` harus menampilkannya.

## Build APK (opsional, tanpa HP tersambung)

```powershell
cd C:\projects\bookinaja\mobile\bookinaja
flutter build apk --debug
# hasil: build\app\outputs\flutter-apk\app-debug.apk  → transfer & install manual ke HP
```

## Isi MVP saat ini

- Shell bottom-nav 5 tab: Home · Booking · Ops · Customer · Lainnya
- **Dashboard** (fungsional), **Antrean Booking** + filter (fungsional),
  **Booking Action Center** (fungsional, ada dialog konfirmasi)
- Ops/Customer/Lainnya masih placeholder
- Data contoh di `lib/data.dart` — nanti diganti REST API Go (routes `protected`)
