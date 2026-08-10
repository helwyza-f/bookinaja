/// Konfigurasi aplikasi.
class AppConfig {
  /// Base URL REST API Go (production).
  /// Override lewat: --dart-define=API_BASE_URL=http://IP:8080/api/v1
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://bookinaja.com/api/v1',
  );

  /// Data (booking, kasir, customer) kini memakai API asli by default.
  /// Set true untuk balik ke data demo: flutter run --dart-define=DEMO_DATA=true
  static const bool useDemoData = bool.fromEnvironment('DEMO_DATA', defaultValue: false);

  static const Duration requestTimeout = Duration(seconds: 20);
}
