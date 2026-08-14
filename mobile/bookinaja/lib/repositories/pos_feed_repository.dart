import '../api/api_client.dart';
import '../models/pos_action_item.dart';

/// Sumber data POS "action desk": daftar transaksi (booking + sales-order)
/// yang masih perlu ditindak. Anchor per-transaksi, bukan per-resource.
class PosFeedRepository {
  PosFeedRepository(this._api);
  final ApiClient _api;

  /// `GET /pos/action-feed?window_minutes=&limit=&search=` → `{items:[...]}`.
  /// Tenant di-resolve backend via header X-Tenant-Slug.
  Future<List<PosActionItem>> actionFeed({
    String search = '',
    int windowMinutes = 360,
    int limit = 80,
  }) async {
    final query = <String, String>{
      'window_minutes': '$windowMinutes',
      'limit': '$limit',
      if (search.trim().isNotEmpty) 'search': search.trim(),
    };
    final path = Uri(path: '/pos/action-feed', queryParameters: query).toString();
    final res = await _api.get(path);
    final items = (res is Map && res['items'] is List)
        ? res['items'] as List
        : const [];
    return items
        .whereType<Map>()
        .map((e) => PosActionItem.fromJson(Map<String, dynamic>.from(e)))
        // Buang draft order kosong (open, tanpa item/pembayaran) agar lane
        // Prioritas bersih dari draft nyasar.
        .where((it) => !it.isEmptyDraft)
        .toList();
  }
}
