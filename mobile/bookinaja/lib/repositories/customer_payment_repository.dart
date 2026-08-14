import '../api/api_client.dart';
import '../models/customer_payment.dart';

/// Pembayaran manual sisi customer (transfer/QRIS + upload bukti). Metode
/// otomatis (Snap/midtrans) belum didukung di mobile — arah BYO default manual.
class CustomerPaymentRepository {
  CustomerPaymentRepository(this._api);
  final ApiClient _api;

  /// GET /user/me/bookings/:id → info pembayaran (metode, nominal, status).
  Future<BookingPaymentInfo> info(String bookingId) async {
    final res = await _api.get('/user/me/bookings/$bookingId');
    return BookingPaymentInfo.fromJson(Map<String, dynamic>.from(res as Map));
  }

  /// Upload bukti transfer (multipart, field 'image'). Kembalikan URL publik.
  /// POST /user/me/bookings/:id/upload-proof.
  Future<String> uploadProof(String bookingId, String filePath) async {
    final res = await _api.uploadFile('/user/me/bookings/$bookingId/upload-proof', filePath);
    if (res is Map) {
      final url = res['url'] ?? (res['data'] is Map ? (res['data'] as Map)['url'] : null);
      if (url != null) return '$url';
    }
    throw ApiException(0, 'Bukti gagal diunggah. Coba lagi.');
  }

  /// Kirim pembayaran manual untuk verifikasi admin.
  /// POST /user/me/bookings/:id/manual-payment.
  Future<String> submitManual(
    String bookingId, {
    required String scope,
    required String method,
    String note = '',
    String proofUrl = '',
  }) async {
    final res = await _api.post('/user/me/bookings/$bookingId/manual-payment', body: {
      'booking_id': bookingId,
      'scope': scope,
      'method': method,
      'note': note,
      'proof_url': proofUrl,
    });
    final ref = (res is Map) ? '${res['reference'] ?? ''}' : '';
    return ref;
  }
}
