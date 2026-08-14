import '../api/api_client.dart';
import '../config.dart';
import '../models/cancellation_policy.dart';
import '../models/payment_method.dart';

/// Pengaturan tenant (owner-only). Endpoint: /admin/cancellation-settings,
/// /admin/payment-methods.
class SettingsRepository {
  SettingsRepository(this._api);
  final ApiClient _api;

  // --- Metode pembayaran ---

  Future<List<PaymentMethod>> getPaymentMethods() async {
    final res = await _api.get('/admin/payment-methods');
    return _parseMethods(res);
  }

  Future<List<PaymentMethod>> savePaymentMethods(List<PaymentMethod> items) async {
    final res = await _api.put('/admin/payment-methods', body: {
      'items': items.map((e) => e.toInput()).toList(),
    });
    final parsed = _parseMethods(res);
    return parsed.isNotEmpty ? parsed : items;
  }

  List<PaymentMethod> _parseMethods(dynamic res) {
    final list = (res is Map && res['items'] is List)
        ? res['items'] as List
        : (res is List ? res : const []);
    return list
        .whereType<Map>()
        .map((e) => PaymentMethod.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  // Simpan sementara untuk mode demo (biar perubahan terlihat dalam sesi).
  static CancellationPolicy _demo = CancellationPolicy.initial;

  Future<CancellationPolicy> getCancellation() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return _demo;
    }
    final res = await _api.get('/admin/cancellation-settings');
    return CancellationPolicy.fromJson(Map<String, dynamic>.from(res as Map));
  }

  Future<CancellationPolicy> saveCancellation(CancellationPolicy p) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      _demo = p;
      return p;
    }
    final res = await _api.put('/admin/cancellation-settings', body: p.toJson());
    final data = (res is Map && res['data'] is Map) ? Map<String, dynamic>.from(res['data'] as Map) : null;
    return data != null ? CancellationPolicy.fromJson(data) : p;
  }
}
