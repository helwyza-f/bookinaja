import '../api/api_client.dart';
import '../models/subscription.dart';

/// Langganan tenant (billing platform). Endpoint owner-only:
///   GET  /billing/subscription  → status paket aktif
///   POST /billing/checkout      → buat tagihan, dapat halaman pembayaran
class BillingRepository {
  BillingRepository(this._api);
  final ApiClient _api;

  Future<SubscriptionInfo> getSubscription() async {
    final res = await _api.get('/billing/subscription');
    return res is Map
        ? SubscriptionInfo.fromJson(Map<String, dynamic>.from(res))
        : const SubscriptionInfo(plan: '', status: '');
  }

  /// Buat tagihan langganan. [plan] = starter|pro. Mengembalikan
  /// [CheckoutResult] dengan redirect_url halaman pembayaran hosted.
  Future<CheckoutResult> checkout({
    required String plan,
    required BillingInterval interval,
  }) async {
    final res = await _api.post('/billing/checkout', body: {
      'plan': plan,
      'interval': interval.wire,
    });
    return res is Map
        ? CheckoutResult.fromJson(Map<String, dynamic>.from(res))
        : const CheckoutResult(orderId: '', redirectUrl: '', snapToken: '', amount: 0);
  }
}
