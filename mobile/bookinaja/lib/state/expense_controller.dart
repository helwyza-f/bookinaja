import 'package:flutter/foundation.dart';
import '../models/expense.dart';
import '../repositories/expense_repository.dart';
import 'async_value.dart';

/// State layar Biaya Operasional — muat daftar + ringkasan dengan filter
/// (kategori & rentang tanggal), pencarian lokal, plus tambah/edit/hapus.
class ExpenseController extends ChangeNotifier {
  ExpenseController(this._repo) {
    final now = DateTime.now();
    from = DateTime(now.year, now.month, 1);
    to = DateTime(now.year, now.month, now.day);
    load();
  }
  final ExpenseRepository _repo;

  AsyncValue<List<Expense>> state = const AsyncValue.loading();
  ExpenseSummary summary = const ExpenseSummary();
  String query = '';
  String category = 'all';
  late DateTime from;
  late DateTime to;
  String? error;

  List<Expense> get items => state.data ?? const [];

  /// Filter pencarian lokal (judul/kategori/vendor/catatan), urut tanggal
  /// terbaru dulu.
  List<Expense> get filtered {
    final q = query.trim().toLowerCase();
    final list = q.isEmpty
        ? [...items]
        : items.where((e) {
            final hay = [e.title, e.category, e.vendor, e.notes].join(' ').toLowerCase();
            return hay.contains(q);
          }).toList();
    list.sort((a, b) => (b.expenseDate ?? DateTime(0)).compareTo(a.expenseDate ?? DateTime(0)));
    return list;
  }

  bool get isFilterActive =>
      query.trim().isNotEmpty || category != 'all' || !_isDefaultRange;

  bool get _isDefaultRange {
    final now = DateTime.now();
    final first = DateTime(now.year, now.month, 1);
    return from.year == first.year &&
        from.month == first.month &&
        from.day == first.day &&
        to.year == now.year &&
        to.month == now.month &&
        to.day == now.day;
  }

  void search(String q) {
    query = q;
    notifyListeners();
  }

  void setCategory(String c) {
    if (c == category) return;
    category = c;
    load();
  }

  void setRange(DateTime f, DateTime t) {
    from = f;
    to = t;
    load();
  }

  void resetFilters() {
    final now = DateTime.now();
    query = '';
    category = 'all';
    from = DateTime(now.year, now.month, 1);
    to = DateTime(now.year, now.month, now.day);
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      final list = await _repo.list(category: category, from: from, to: to);
      state = AsyncValue.data(list);
      // Ringkasan best-effort — kegagalan tak boleh mematikan daftar.
      try {
        summary = await _repo.summary(category: category, from: from, to: to);
      } catch (_) {
        summary = ExpenseSummary(
          total: list.fold(0, (a, e) => a + e.amount),
          entries: list.length,
        );
      }
    } catch (e) {
      state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  Future<bool> save(Expense e) async {
    error = null;
    try {
      if (e.id.isEmpty) {
        await _repo.create(e);
      } else {
        await _repo.update(e.id, e);
      }
      await load();
      return true;
    } catch (err) {
      error = err.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> remove(Expense e) async {
    error = null;
    try {
      await _repo.delete(e.id);
      await load();
      return true;
    } catch (err) {
      error = err.toString();
      notifyListeners();
      return false;
    }
  }

  Future<String> uploadReceipt(String filePath) => _repo.uploadReceipt(filePath);
}
