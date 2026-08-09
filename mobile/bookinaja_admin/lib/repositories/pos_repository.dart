import '../api/api_client.dart';
import '../config.dart';
import '../data/sample_data.dart';
import '../models/menu_item.dart';

/// Katalog menu untuk kasir. Endpoint admin: GET /fnb.
class PosRepository {
  PosRepository(this._api);
  final ApiClient _api;

  Future<List<MenuItem>> listMenu() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 350));
      return sampleMenu;
    }
    final res = await _api.get('/fnb');
    final list = (res is List) ? res : (res is Map && res['data'] is List ? res['data'] as List : const []);
    return list.whereType<Map>().map((e) => MenuItem.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  /// Buat order langsung (walk-in). Endpoint: POST /sales-orders/direct.
  Future<void> createDirectOrder(List<CartLine> lines) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 500));
      return;
    }
    await _api.post('/sales-orders/direct', body: {
      'items': lines.map((l) => {'menu_item_id': l.item.id, 'qty': l.qty}).toList(),
    });
  }
}
