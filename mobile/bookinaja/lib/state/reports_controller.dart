import 'package:flutter/foundation.dart';
import '../models/report.dart';
import '../repositories/reports_repository.dart';
import 'async_value.dart';

/// Periode laporan yang bisa dipilih.
enum ReportPeriod { today, week, month }

extension ReportPeriodLabel on ReportPeriod {
  String get label => switch (this) {
        ReportPeriod.today => 'Hari ini',
        ReportPeriod.week => '7 hari',
        ReportPeriod.month => 'Bulan ini',
      };
}

/// State layar Laporan — pilih periode, muat bundel pendapatan+biaya.
class ReportsController extends ChangeNotifier {
  ReportsController(this._repo) {
    load();
  }
  final ReportsRepository _repo;

  ReportPeriod period = ReportPeriod.today;
  AsyncValue<ReportBundle> state = const AsyncValue.loading();

  ({DateTime from, DateTime to}) get _range {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return switch (period) {
      ReportPeriod.today => (from: today, to: today),
      ReportPeriod.week => (from: today.subtract(const Duration(days: 6)), to: today),
      ReportPeriod.month => (from: DateTime(now.year, now.month, 1), to: today),
    };
  }

  void setPeriod(ReportPeriod p) {
    if (p == period) return;
    period = p;
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      final r = _range;
      state = AsyncValue.data(await _repo.bundle(from: r.from, to: r.to));
    } catch (e) {
      state = AsyncValue.error(e);
    }
    notifyListeners();
  }
}
