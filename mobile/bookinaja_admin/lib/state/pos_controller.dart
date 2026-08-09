import 'package:flutter/foundation.dart';
import '../models/menu_item.dart';
import '../repositories/pos_repository.dart';
import 'async_value.dart';

/// Kasir/POS: memuat menu, kelola keranjang, checkout.
class PosController extends ChangeNotifier {
  PosController(this._repo);
  final PosRepository _repo;

  AsyncValue<List<MenuItem>> _menu = const AsyncValue.loading();
  AsyncValue<List<MenuItem>> get menu => _menu;

  final Map<String, CartLine> _cart = {};
  String category = 'Semua';
  bool submitting = false;
  String? lastOrderNumber;
  String? checkoutError;

  List<String> get categories {
    final set = {'Semua', ...(_menu.data ?? const []).map((m) => m.category)};
    return set.toList();
  }

  List<MenuItem> get visibleMenu {
    final all = _menu.data ?? const [];
    if (category == 'Semua') return all;
    return all.where((m) => m.category == category).toList();
  }

  List<CartLine> get cart => _cart.values.toList();
  int qtyOf(String id) => _cart[id]?.qty ?? 0;
  int get cartCount => _cart.values.fold(0, (a, l) => a + l.qty);
  int get cartTotal => _cart.values.fold(0, (a, l) => a + l.subtotal);

  void setCategory(String c) {
    category = c;
    notifyListeners();
  }

  void add(MenuItem item) {
    _cart.update(item.id, (l) {
      l.qty++;
      return l;
    }, ifAbsent: () => CartLine(item));
    notifyListeners();
  }

  void remove(MenuItem item) {
    final line = _cart[item.id];
    if (line == null) return;
    if (line.qty <= 1) {
      _cart.remove(item.id);
    } else {
      line.qty--;
    }
    notifyListeners();
  }

  void clearCart() {
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

  Future<bool> checkout() async {
    if (_cart.isEmpty) return false;
    submitting = true;
    checkoutError = null;
    notifyListeners();
    try {
      lastOrderNumber = await _repo.checkoutCash(cart);
      _cart.clear();
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
}
