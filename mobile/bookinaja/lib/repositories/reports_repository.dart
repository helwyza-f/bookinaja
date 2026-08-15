import '../api/api_client.dart';
import '../models/report.dart';

/// Laporan tenant (owner). Endpoint: /reports/{revenue,expenses}.
/// Periode via query ?from=YYYY-MM-DD&to=YYYY-MM-DD (to inklusif per hari).
class ReportsRepository {
  ReportsRepository(this._api);
  final ApiClient _api;

  String _fmt(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Ambil laporan gabungan (pendapatan + biaya) untuk satu periode.
  Future<ReportBundle> bundle({required DateTime from, required DateTime to}) async {
    final range = 'from=${_fmt(from)}&to=${_fmt(to)}&page_size=100';
    final revenue = await _api.get('/reports/revenue?$range');
    final expenses = await _api.get('/reports/expenses?$range');

    final revSummary = revenue is Map ? revenue['summary'] : null;
    final expSummary = expenses is Map ? expenses['summary'] : null;

    return ReportBundle(
      omzet: ReportBundle.summaryInt(revSummary, 'total'),
      diterima: ReportBundle.summaryInt(revSummary, 'paid'),
      piutang: ReportBundle.summaryInt(revSummary, 'outstanding'),
      transaksi: ReportBundle.summaryInt(revSummary, 'entries'),
      biaya: ReportBundle.summaryInt(expSummary, 'total'),
      transactions: ReportBundle.parseTxns(revenue),
      expenses: ReportBundle.parseExpenses(expenses),
    );
  }
}
