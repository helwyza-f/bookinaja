import '../api/api_client.dart';
import '../config.dart';
import '../data/sample_data.dart';
import '../models/menu_item.dart';
import '../models/pos_order.dart';

/// Katalog + transaksi kasir (F&B walk-in).
/// Alur: buat order → (cash) settle-cash  atau  (non-cash) upload bukti → manual-payment.
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

  Map<String, dynamic> _asMap(dynamic res) {
    if (res is Map && res['data'] is Map) return Map<String, dynamic>.from(res['data'] as Map);
    if (res is Map) return Map<String, dynamic>.from(res);
    return <String, dynamic>{};
  }

  /// Buat order menu (belum dibayar). Kembalikan id-nya.
  Future<String> createMenuOrder(List<CartLine> lines, {String? notes}) async {
    final res = await _api.post('/sales-orders/menu', body: {
      'items': lines.map((l) => {'fnb_item_id': l.item.id, 'quantity': l.qty}).toList(),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    });
    final id = '${_asMap(res)['id'] ?? ''}';
    if (id.isEmpty) throw Exception('Order gagal dibuat (id kosong)');
    return id;
  }

  /// Metode bayar tenant (tanpa perlu membuat order lebih dulu).
  Future<List<PosPaymentMethod>> listPaymentMethods() async {
    if (AppConfig.useDemoData) return const [];
    final res = await _api.get('/sales-orders/payment-methods');
    final items = (res is Map && res['items'] is List)
        ? res['items'] as List
        : (res is List ? res : const []);
    return items
        .whereType<Map>()
        .map((e) => PosPaymentMethod.fromJson(Map<String, dynamic>.from(e)))
        .where((m) => m.code.isNotEmpty)
        .toList();
  }

  /// Ambil order lengkap (termasuk payment_methods & grand_total dari server).
  Future<PosOrder> getOrder(String orderId) async {
    final res = await _api.get('/sales-orders/$orderId');
    return PosOrder.fromJson(_asMap(res));
  }

  /// Riwayat transaksi kasir terbaru — hanya order walk-in (menu & direct-sale),
  /// dan sembunyikan order 'open' yang belum jadi transaksi.
  Future<List<PosOrder>> listRecentOrders({int limit = 40}) async {
    final res = await _api.get('/sales-orders?limit=$limit&kind=menu,direct_sale');
    final items = (res is Map && res['items'] is List)
        ? res['items'] as List
        : (res is List ? res : const []);
    return items
        .whereType<Map>()
        .map((e) => PosOrder.fromJson(Map<String, dynamic>.from(e)))
        .where((o) => o.status.toLowerCase() != 'open')
        .toList();
  }

  /// Lunasi tunai.
  Future<void> settleCash(String orderId, {String method = 'cash', String? notes}) async {
    await _api.post('/sales-orders/$orderId/settle-cash', body: {
      'payment_method': method,
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    });
  }

  /// Unggah foto bukti pembayaran, kembalikan URL-nya.
  Future<String> uploadProof(String filePath) async {
    final res = await _api.uploadFile('/admin/upload', filePath);
    final url = (res is Map ? '${res['url'] ?? ''}' : '').trim();
    if (url.isEmpty) throw Exception('Upload bukti gagal (url kosong)');
    return url;
  }

  /// Batalkan order yang belum terbayar (open/pending_payment).
  Future<void> cancelOrder(String orderId) async {
    await _api.post('/sales-orders/$orderId/cancel');
  }

  /// Kirim pembayaran manual (transfer/QRIS) → menunggu verifikasi.
  /// [proofUrl] & [note] opsional.
  Future<void> submitManual(String orderId, {required String method, String? proofUrl, String? note}) async {
    await _api.post('/sales-orders/$orderId/manual-payment', body: {
      'method': method,
      if (proofUrl != null && proofUrl.trim().isNotEmpty) 'proof_url': proofUrl.trim(),
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    });
  }

}
