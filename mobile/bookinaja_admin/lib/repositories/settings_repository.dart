import '../api/api_client.dart';
import '../config.dart';
import '../models/cancellation_policy.dart';

/// Pengaturan tenant (owner-only). Endpoint: /admin/cancellation-settings.
class SettingsRepository {
  SettingsRepository(this._api);
  final ApiClient _api;

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
