import '../api/api_client.dart';
import '../models/customer_booking.dart';

/// Data booking milik customer login. Endpoint `/user/me/*` — di-resolve dari
/// klaim `customer_id` pada JWT, lintas-tenant (tanpa header tenant).
class CustomerBookingRepository {
  CustomerBookingRepository(this._api);
  final ApiClient _api;

  static List<CustomerBookingItem> _parseList(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => CustomerBookingItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// GET /user/me/active → {active_bookings, active_orders}. Gabungan booking &
  /// order yang masih berjalan/menunggu, diurut terbaru dulu.
  Future<List<CustomerBookingItem>> active() async {
    final res = await _api.get('/user/me/active');
    final map = res is Map ? Map<String, dynamic>.from(res) : const <String, dynamic>{};
    final items = [..._parseList(map['active_bookings']), ..._parseList(map['active_orders'])];
    items.sort((a, b) => (b.date ?? DateTime(0)).compareTo(a.date ?? DateTime(0)));
    return items;
  }

  /// GET /user/me/history → {past_history, past_orders}. Riwayat selesai/batal.
  Future<List<CustomerBookingItem>> history() async {
    final res = await _api.get('/user/me/history');
    final map = res is Map ? Map<String, dynamic>.from(res) : const <String, dynamic>{};
    final items = [..._parseList(map['past_history']), ..._parseList(map['past_orders'])];
    items.sort((a, b) => (b.date ?? DateTime(0)).compareTo(a.date ?? DateTime(0)));
    return items;
  }
}
