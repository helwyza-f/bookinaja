import 'package:flutter/foundation.dart';
import '../models/fnb_item.dart';
import '../repositories/fnb_repository.dart';
import 'async_value.dart';

/// State layar Menu F&B — muat, kelompokkan per kategori, toggle stok cepat,
/// tambah/edit/hapus item.
class FnbMenuController extends ChangeNotifier {
  FnbMenuController(this._repo) {
    load();
  }
  final FnbRepository _repo;

  AsyncValue<List<FnbItem>> state = const AsyncValue.loading();
  String query = '';
  String? error;

  List<FnbItem> get items => state.data ?? const [];

  /// Item terfilter berdasarkan pencarian lokal (nama/kategori).
  List<FnbItem> get filtered {
    if (query.trim().isEmpty) return items;
    final q = query.toLowerCase();
    return items
        .where((e) => e.name.toLowerCase().contains(q) || e.categoryLabel.toLowerCase().contains(q))
        .toList();
  }

  /// Item dikelompokkan per kategori (untuk section list). Urut kategori A-Z,
  /// item dalam kategori urut nama.
  Map<String, List<FnbItem>> get grouped {
    final map = <String, List<FnbItem>>{};
    for (final it in filtered) {
      map.putIfAbsent(it.categoryLabel, () => []).add(it);
    }
    final sortedKeys = map.keys.toList()..sort();
    return {
      for (final k in sortedKeys)
        k: (map[k]!..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()))),
    };
  }

  /// Daftar kategori unik (untuk saran di form).
  List<String> get categories {
    final set = <String>{};
    for (final it in items) {
      if (it.category.trim().isNotEmpty) set.add(it.category.trim());
    }
    final l = set.toList()..sort();
    return l;
  }

  int get total => items.length;
  int get outOfStock => items.where((e) => !e.isAvailable).length;

  void search(String q) {
    query = q;
    notifyListeners();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      state = AsyncValue.data(await _repo.list());
    } catch (e) {
      state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  /// Toggle Ready/Habis dengan update optimistik + rollback bila gagal.
  Future<bool> toggleAvailability(FnbItem item) async {
    final next = item.copyWith(isAvailable: !item.isAvailable);
    _replaceLocal(next);
    try {
      final saved = await _repo.update(item.id, next);
      _replaceLocal(saved);
      return true;
    } catch (e) {
      _replaceLocal(item); // rollback
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> save(FnbItem item) async {
    error = null;
    try {
      if (item.id.isEmpty) {
        final created = await _repo.create(item);
        state = AsyncValue.data([...items, created]);
      } else {
        final updated = await _repo.update(item.id, item);
        _replaceLocal(updated);
      }
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> remove(FnbItem item) async {
    error = null;
    try {
      await _repo.delete(item.id);
      state = AsyncValue.data(items.where((e) => e.id != item.id).toList());
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<String> uploadImage(String filePath) => _repo.uploadImage(filePath);

  void _replaceLocal(FnbItem item) {
    if (!state.hasData) return;
    state = AsyncValue.data([
      for (final e in items) if (e.id == item.id) item else e,
    ]);
    notifyListeners();
  }
}
