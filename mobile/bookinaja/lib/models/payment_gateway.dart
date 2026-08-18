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

  /// Gateway siap dipakai bila server key & callback secret sudah tersimpan.
  bool get configured => serverKeySet && callbackSecretSet && provider.isNotEmpty;

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
