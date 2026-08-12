import 'package:flutter/foundation.dart';
import '../models/menu_item.dart';
import '../models/pos_order.dart';
import '../repositories/pos_repository.dart';
import 'async_value.dart';

/// Hasil transaksi kasir terakhir (untuk layar ringkasan).
class PosResult {
  final String orderNumber;
  final int total;
  final bool awaitingVerification; // true untuk pembayaran manual (menunggu verifikasi)
  final int? cashReceived; // untuk cash
  const PosResult({
    required this.orderNumber,
    required this.total,
    this.awaitingVerification = false,
    this.cashReceived,
  });

  int get change => cashReceived == null ? 0 : (cashReceived! - total).clamp(0, cashReceived!);
}

/// Kasir/POS: memuat menu, kelola keranjang, buat order, dan bayar
/// (tunai atau non-tunai dengan bukti). Order dibuat sekali lalu dipakai
/// ulang saat retry agar tidak menumpuk order duplikat.
class PosController extends ChangeNotifier {
  PosController(this._repo);
  final PosRepository _repo;

  AsyncValue<List<MenuItem>> _menu = const AsyncValue.loading();
  AsyncValue<List<MenuItem>> get menu => _menu;

  final Map<String, CartLine> _cart = {};
  String category = 'Semua';
  String query = '';

  bool preparing = false; // sedang membuat/memuat order untuk pembayaran
  bool submitting = false; // sedang melunasi/mengirim bukti
  String? checkoutError;

  PosOrder? _pendingOrder; // order yang sudah dibuat tapi belum lunas
  PosOrder? get pendingOrder => _pendingOrder;

  PosResult? lastResult;

  List<String> get categories {
    final set = {'Semua', ...(_menu.data ?? const []).map((m) => m.category)};
    return set.toList();
  }

  List<MenuItem> get visibleMenu {
    final all = _menu.data ?? const [];
    final q = query.trim().toLowerCase();
    return all.where((m) {
      if (category != 'Semua' && m.category != category) return false;
      if (q.isEmpty) return true;
      return m.name.toLowerCase().contains(q) || m.category.toLowerCase().contains(q);
    }).toList();
  }

  List<CartLine> get cart => _cart.values.toList();
  int qtyOf(String id) => _cart[id]?.qty ?? 0;
  int get cartCount => _cart.values.fold(0, (a, l) => a + l.qty);
  int get cartTotal => _cart.values.fold(0, (a, l) => a + l.subtotal);

  void setCategory(String c) {
    category = c;
    notifyListeners();
  }

  void setQuery(String q) {
    query = q;
    notifyListeners();
  }

  // Setiap perubahan keranjang membatalkan order yang sudah disiapkan agar
  // pembayaran tidak menyelesaikan order dengan isi yang sudah berbeda.
  void _invalidatePending() {
    final stale = _pendingOrder;
    _pendingOrder = null;
    checkoutError = null;
    if (stale != null) {
      // biarkan order lama terbuka di server (bisa ditutup dari web); best-effort.
      _repo.closeOrder(stale.id);
    }
  }

  void add(MenuItem item) {
    _invalidatePending();
    _cart.update(item.id, (l) {
      l.qty++;
      return l;
    }, ifAbsent: () => CartLine(item));
    notifyListeners();
  }

  void remove(MenuItem item) {
    final line = _cart[item.id];
    if (line == null) return;
    _invalidatePending();
    if (line.qty <= 1) {
      _cart.remove(item.id);
    } else {
      line.qty--;
    }
    notifyListeners();
  }

  void clearCart() {
    _invalidatePending();
    _cart.clear();
    notifyListeners();
  }

  Future<void> load() async {
    _menu = const AsyncValue.loading();
    notifyListeners();
    try {
      _menu = AsyncValue.data(await _repo.listMenu());
    } catch (e) {
      _menu = AsyncValue.error(e);
    }
    notifyListeners();
  }

  /// Siapkan order untuk pembayaran: buat di server (sekali) lalu ambil detail
  /// lengkap (metode bayar + grand_total). Dipakai ulang bila sudah ada.
  Future<PosOrder?> prepareOrder() async {
    if (_cart.isEmpty) return null;
    if (_pendingOrder != null) return _pendingOrder;
    preparing = true;
    checkoutError = null;
    notifyListeners();
    try {
      final id = await _repo.createMenuOrder(cart);
      _pendingOrder = await _repo.getOrder(id);
      preparing = false;
      notifyListeners();
      return _pendingOrder;
    } catch (e) {
      checkoutError = e.toString();
      preparing = false;
      notifyListeners();
      return null;
    }
  }

  /// Lunasi tunai. [cashReceived] hanya untuk hitung kembalian di struk (opsional).
  Future<bool> payCash({String method = 'cash', int? cashReceived}) async {
    final order = _pendingOrder ?? await prepareOrder();
    if (order == null) return false;
    return _run(() async {
      await _repo.settleCash(order.id, method: method);
      _finalize(PosResult(
        orderNumber: order.orderNumber,
        total: order.grandTotal,
        cashReceived: cashReceived,
      ));
    });
  }

  /// Bayar non-tunai: unggah bukti lalu kirim sebagai pembayaran manual.
  Future<bool> payManual({required String method, required String proofPath, String? note}) async {
    final order = _pendingOrder ?? await prepareOrder();
    if (order == null) return false;
    return _run(() async {
      final url = await _repo.uploadProof(proofPath);
      await _repo.submitManual(order.id, method: method, proofUrl: url, note: note);
      _finalize(PosResult(
        orderNumber: order.orderNumber,
        total: order.grandTotal,
        awaitingVerification: true,
      ));
    });
  }

  Future<bool> _run(Future<void> Function() op) async {
    submitting = true;
    checkoutError = null;
    notifyListeners();
    try {
      await op();
      submitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      checkoutError = e.toString();
      submitting = false;
      notifyListeners();
      return false;
    }
  }

  void _finalize(PosResult result) {
    lastResult = result;
    _cart.clear();
    _pendingOrder = null;
  }

  /// Batalkan pembayaran yang belum selesai — tutup order kosong di server.
  void cancelPending() {
    final order = _pendingOrder;
    _pendingOrder = null;
    checkoutError = null;
    if (order != null) _repo.closeOrder(order.id);
    notifyListeners();
  }

  void clearResult() {
    lastResult = null;
    notifyListeners();
  }
}
