/// Konfigurasi aplikasi.
class AppConfig {
  /// Base URL REST API Go (production).
  /// Override lewat: --dart-define=API_BASE_URL=http://IP:8080/api/v1
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://bookinaja.com/api/v1',
  );

  /// AUTH selalu memakai API asli (login + daftar workspace dari backend).
  /// DATA (booking, kasir, customer) masih demo sampai di-wire ke API.
  /// Set false untuk pakai data asli: flutter run --dart-define=DEMO_DATA=false
  static const bool useDemoData = bool.fromEnvironment('DEMO_DATA', defaultValue: true);

  static const Duration requestTimeout = Duration(seconds: 20);
}
