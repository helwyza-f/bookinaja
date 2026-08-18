/// Konfigurasi BYO payment gateway tenant (`/admin/payment-gateway`).
/// Server hanya mengembalikan versi ter-mask (server key tak pernah dikirim
/// balik). [configured] = kredensial lengkap tersimpan → metode gateway bisa
/// diaktifkan.
class PaymentGateway {
  final String provider; // 'midtrans' | 'xendit' | ''
  final String environment; // 'sandbox' | 'production' | ''
  final String clientKey;
  final String serverKeyMasked;
  final bool serverKeySet;
  final bool callbackSecretSet;
  final String status; // 'active' | 'error' | 'unconfigured' | ...
  final String lastError;

  const PaymentGateway({
    this.provider = '',
    this.environment = '',
    this.clientKey = '',
    this.serverKeyMasked = '',
    this.serverKeySet = false,
    this.callbackSecretSet = false,
    this.status = '',
    this.lastError = '',
  });

  /// Kredensial inti tersimpan. Cukup provider + server key (samakan dgn web:
  /// isConfigured = provider && server_key_set). Field kedua beda per provider
  /// (Midtrans: client key; Xendit: callback token) diwajibkan saat SIMPAN,
  /// bukan sebagai syarat "sudah terkonfigurasi" — jadi punya SALAH SATU
  /// gateway saja sudah cukup. Bisa true meski status 'disabled'.
  bool get hasCredentials => serverKeySet && provider.isNotEmpty;

  /// Backend menonaktifkan gateway dengan status 'disabled' (bukan menghapus
  /// kredensial). Gateway yang disabled TIDAK boleh dianggap siap.
  bool get isDisabled => status.toLowerCase() == 'disabled';

  /// Sudah diverifikasi via tes koneksi.
  bool get isVerified => status.toLowerCase() == 'verified' || status.toLowerCase() == 'active';

  /// Gateway SIAP dipakai (metode online boleh aktif): kredensial lengkap DAN
  /// tidak sedang dinonaktifkan.
  bool get configured => hasCredentials && !isDisabled;

  /// Label status ringkas untuk UI.
  String get stateLabel {
    if (!hasCredentials) return 'Belum di-setup';
    if (isDisabled) return 'Nonaktif';
    if (isVerified) return 'Aktif · terverifikasi';
    return 'Aktif · belum dites';
  }

  factory PaymentGateway.fromJson(Map<String, dynamic> j) => PaymentGateway(
        provider: '${j['provider'] ?? ''}',
        environment: '${j['environment'] ?? ''}',
        clientKey: '${j['client_key'] ?? ''}',
        serverKeyMasked: '${j['server_key_masked'] ?? ''}',
        serverKeySet: j['server_key_set'] == true,
        callbackSecretSet: j['callback_secret_set'] == true,
        status: '${j['status'] ?? ''}',
        lastError: '${j['last_error'] ?? ''}',
      );
}
