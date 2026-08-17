import '../api/api_client.dart';
import '../models/expense.dart';

String _d(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Kelola biaya operasional / pengeluaran tenant. Endpoint admin: /expenses
/// (permission expenses.*).
class ExpenseRepository {
  ExpenseRepository(this._api);
  final ApiClient _api;

  String _query({String category = 'all', DateTime? from, DateTime? to, int? limit}) {
    final q = <String>[];
    if (limit != null) q.add('limit=$limit');
    if (category.isNotEmpty && category != 'all') q.add('category=${Uri.encodeQueryComponent(category)}');
    if (from != null) q.add('from=${_d(from)}');
    if (to != null) q.add('to=${_d(to)}');
    return q.isEmpty ? '' : '?${q.join('&')}';
  }

  Future<List<Expense>> list({String category = 'all', DateTime? from, DateTime? to, int limit = 100}) async {
    final res = await _api.get('/expenses${_query(category: category, from: from, to: to, limit: limit)}');
    final list = res is List ? res : (res is Map && res['items'] is List ? res['items'] as List : const []);
    return list
        .whereType<Map>()
        .map((e) => Expense.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<ExpenseSummary> summary({String category = 'all', DateTime? from, DateTime? to}) async {
    final res = await _api.get('/expenses/summary${_query(category: category, from: from, to: to)}');
    return res is Map ? ExpenseSummary.fromJson(Map<String, dynamic>.from(res)) : const ExpenseSummary();
  }

  Future<Expense> create(Expense e) async {
    final res = await _api.post('/expenses', body: e.toInput());
    return res is Map ? Expense.fromJson(Map<String, dynamic>.from(res)) : e;
  }

  /// PUT hanya mengembalikan pesan sukses, bukan objek — pemanggil sebaiknya
  /// memuat ulang daftar.
  Future<void> update(String id, Expense e) async {
    await _api.put('/expenses/$id', body: e.toInput());
  }

  Future<void> delete(String id) async {
    await _api.delete('/expenses/$id');
  }

  /// Unggah foto struk → kembalikan URL publik.
  Future<String> uploadReceipt(String filePath) async {
    final res = await _api.uploadFile('/expenses/upload-receipt', filePath);
    if (res is Map && res['url'] != null) return '${res['url']}';
    if (res is Map && res['data'] is Map && (res['data'] as Map)['url'] != null) {
      return '${(res['data'] as Map)['url']}';
    }
    throw ApiException(0, 'Upload struk gagal: URL tidak diterima.');
  }
}
