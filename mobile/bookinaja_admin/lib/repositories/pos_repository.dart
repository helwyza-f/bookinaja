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

  /// Ambil order lengkap (termasuk payment_methods & grand_total dari server).
  Future<PosOrder> getOrder(String orderId) async {
    final res = await _api.get('/sales-orders/$orderId');
    return PosOrder.fromJson(_asMap(res));
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

  /// Kirim pembayaran manual (transfer/QRIS) + bukti → menunggu verifikasi.
  Future<void> submitManual(String orderId, {required String method, required String proofUrl, String? note}) async {
    await _api.post('/sales-orders/$orderId/manual-payment', body: {
      'method': method,
      'proof_url': proofUrl,
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    });
  }

  /// Tutup order yang belum dibayar (mis. kasir batal) — best-effort.
  Future<void> closeOrder(String orderId) async {
    try {
      await _api.post('/sales-orders/$orderId/close');
    } catch (_) {
      // abaikan; order terbuka tetap bisa diselesaikan nanti dari web.
    }
  }
}
