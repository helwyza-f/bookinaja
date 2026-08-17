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

  bool submitting = false; // sedang melunasi/mengirim bukti
  String? checkoutError;

  // Order yang sudah dibuat untuk cart saat ini tapi belum lunas (mis.
  // settle/submit gagal di tengah jalan). Dipakai ulang saat retry agar
  // tidak menumpuk order duplikat/orphan.
  String? _pendingOrderId;

  // Metode bayar tenant, dimuat sekali bersama menu (bukan dari order),
  // sehingga order hanya dibuat saat kasir menekan tombol bayar.
  List<PosPaymentMethod> paymentMethods = const [];

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

  void add(MenuItem item) {
    _discardPendingOrder();
    _cart.update(item.id, (l) {
      l.qty++;
      return l;
    }, ifAbsent: () => CartLine(item));
    notifyListeners();
  }

  void remove(MenuItem item) {
    final line = _cart[item.id];
    if (line == null) return;
    _discardPendingOrder();
    if (line.qty <= 1) {
      _cart.remove(item.id);
    } else {
      line.qty--;
    }
    notifyListeners();
  }

  void clearCart() {
    _cart.clear();
    _discardPendingOrder();
    notifyListeners();
  }

  /// Buat order untuk cart saat ini, atau pakai ulang order yang sudah
  /// dibuat sebelumnya (bila retry setelah settle/submit gagal).
  Future<String> _ensureOrder() async {
    final existing = _pendingOrderId;
    if (existing != null) return existing;
    final id = await _repo.createMenuOrder(cart);
    _pendingOrderId = id;
    return id;
  }

  /// Batalkan order pending (best-effort) tanpa memblokir UI.
  void _discardPendingOrder() {
    final id = _pendingOrderId;
    if (id == null) return;
    _pendingOrderId = null;
    _repo.cancelOrder(id).catchError((_) {});
  }

  Future<void> load() async {
    _menu = const AsyncValue.loading();
    notifyListeners();
    try {
      _menu = AsyncValue.data(await _repo.listMenu());
    } catch (e) {
      _menu = AsyncValue.error(e);
      notifyListeners();
      return;
    }
    // Metode bayar bersifat best-effort: kegagalan (mis. backend lama) tidak
    // boleh mematikan layar kasir — jatuh ke tunai saja.
    try {
      paymentMethods = await _repo.listPaymentMethods();
    } catch (_) {
      paymentMethods = const [];
    }
    notifyListeners();
  }

  /// Lunasi tunai: buat order lalu langsung settle dalam satu aksi, sehingga
  /// tidak ada order menggantung bila kasir mengubah keranjang atau membatalkan.
  /// [cashReceived] hanya untuk hitung kembalian di struk (opsional).
  Future<bool> payCash({String method = 'cash', int? cashReceived}) async {
    if (_cart.isEmpty) return false;
    return _run(() async {
      final id = await _ensureOrder();
      final order = await _repo.getOrder(id);
      await _repo.settleCash(id, method: method);
      _finalize(PosResult(
        orderNumber: order.orderNumber,
        total: order.grandTotal,
        cashReceived: cashReceived,
      ));
    });
  }

  /// Bayar non-tunai: buat order, (opsional) unggah bukti, lalu kirim sebagai
  /// pembayaran manual — semuanya dalam satu aksi konfirmasi.
  Future<bool> payManual({required String method, String? proofPath, String? note}) async {
    if (_cart.isEmpty) return false;
    return _run(() async {
      final id = await _ensureOrder();
      final order = await _repo.getOrder(id);
      String? url;
      if (proofPath != null && proofPath.trim().isNotEmpty) {
        url = await _repo.uploadProof(proofPath);
      }
      await _repo.submitManual(id, method: method, proofUrl: url, note: note);
      // Dicatat staff kasir → backend auto-verify, langsung dianggap lunas.
      _finalize(PosResult(
        orderNumber: order.orderNumber,
        total: order.grandTotal,
      ));
    });
  }

  /// Simpan keranjang sebagai **pesanan terbuka** (open) tanpa membayar —
  /// dipakai untuk bon berjalan (dine-in / self-order). Order dibiarkan open
  /// (tidak di-cancel) lalu keranjang dikosongkan.
  Future<bool> openOrder({String? notes}) async {
    if (_cart.isEmpty) return false;
    return _run(() async {
      if (_pendingOrderId == null) await _repo.createMenuOrder(cart, notes: notes);
      _pendingOrderId = null; // jangan dibatalkan — ini pesanan terbuka yang sah
      _cart.clear();
    });
  }

  /// Prabayar dari keranjang: buat order, lunasi (keep_open), lalu biarkan bon
  /// tetap terbuka. Keranjang dikosongkan; bon muncul di "Pesanan terbuka"
  /// dalam keadaan sudah dibayar (isPrepaidSettled). Tidak menampilkan struk.
  Future<bool> prepayCash({String method = 'cash'}) async {
    if (_cart.isEmpty) return false;
    return _run(() async {
      final id = await _ensureOrder();
      await _repo.settleCash(id, method: method, keepOpen: true);
      _pendingOrderId = null; // bon sah — jangan dibatalkan
      _cart.clear();
    });
  }

  /// Prabayar non-tunai (transfer/QRIS, dicatat kasir → auto-verified) lalu
  /// biarkan bon tetap terbuka.
  Future<bool> prepayManual({required String method, String? proofPath, String? note}) async {
    if (_cart.isEmpty) return false;
    return _run(() async {
      final id = await _ensureOrder();
      String? url;
      if (proofPath != null && proofPath.trim().isNotEmpty) {
        url = await _repo.uploadProof(proofPath);
      }
      await _repo.submitManual(id, method: method, proofUrl: url, note: note, keepOpen: true);
      _pendingOrderId = null;
      _cart.clear();
    });
  }

  /// Daftar pesanan terbuka.
  Future<List<PosOrder>> fetchOpenOrders() => _repo.listOpenOrders();

  /// Tambah beberapa item ke pesanan terbuka.
  Future<void> addItemsToOrder(String orderId, List<CartLine> lines) async {
    for (final l in lines) {
      await _repo.addItem(orderId, name: l.item.name, qty: l.qty, unitPrice: l.item.price);
    }
  }

  /// Bayar tunai pesanan terbuka. [keepOpen]=true → prabayar: catat pelunasan
  /// tapi bon tetap terbuka; false → auto-close (bayar & tutup).
  Future<void> settleOpenCash(String orderId, {bool keepOpen = false}) =>
      _repo.settleCash(orderId, keepOpen: keepOpen);

  /// Bayar non-tunai (dicatat kasir → auto-verified) pesanan terbuka.
  /// [keepOpen] sama seperti [settleOpenCash].
  Future<void> settleOpenManual(String orderId, {required String method, String? note, bool keepOpen = false}) =>
      _repo.submitManual(orderId, method: method, note: note, keepOpen: keepOpen);

  /// Tutup pesanan terbuka yang tagihannya sudah lunas (mis. prabayar).
  Future<void> closeOpenOrder(String orderId) => _repo.closeOrder(orderId);

  /// Riwayat transaksi kasir (untuk sheet riwayat).
  Future<List<PosOrder>> fetchHistory() => _repo.listRecentOrders();

  /// Detail satu order kasir.
  Future<PosOrder> fetchOrderDetail(String orderId) => _repo.getOrder(orderId);

  /// Batalkan order yang belum terbayar (mis. pembayaran manual ditolak).
  Future<void> cancelOrder(String orderId) => _repo.cancelOrder(orderId);

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
    _pendingOrderId = null;
    _cart.clear();
  }

  void clearResult() {
    lastResult = null;
    notifyListeners();
  }
}
