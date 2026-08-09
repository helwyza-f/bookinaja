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

  /// Kasir walk-in F&B: buat menu order lalu lunasi cash (cetak nota).
  /// POST /sales-orders/menu {items:[{fnb_item_id, quantity}]}
  /// → POST /sales-orders/:id/settle-cash {payment_method: cash}
  /// Kembalikan order_number untuk nota.
  Future<String> checkoutCash(List<CartLine> lines) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 500));
      return 'ORD-DEMO';
    }
    final res = await _api.post('/sales-orders/menu', body: {
      'items': lines.map((l) => {'fnb_item_id': l.item.id, 'quantity': l.qty}).toList(),
    });
    final order = (res is Map && res['data'] is Map)
        ? Map<String, dynamic>.from(res['data'] as Map)
        : (res is Map ? Map<String, dynamic>.from(res) : <String, dynamic>{});
    final id = '${order['id'] ?? ''}';
    final orderNumber = '${order['order_number'] ?? id}';
    if (id.isNotEmpty) {
      await _api.post('/sales-orders/$id/settle-cash', body: {'payment_method': 'cash'});
    }
    return orderNumber;
  }
}
