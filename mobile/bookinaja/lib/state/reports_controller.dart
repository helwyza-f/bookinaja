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

/// State layar Laporan — bundel pendapatan+biaya per periode. Tiap periode
/// di-cache sendiri agar pindah tab tak perlu fetch ulang (tak ada kedip):
/// kunjungan pertama memuat, berikutnya instan dari cache.
class ReportsController extends ChangeNotifier {
  ReportsController(this._repo) {
    ensureLoaded(period);
  }
  final ReportsRepository _repo;

  ReportPeriod period = ReportPeriod.today;
  final Map<ReportPeriod, AsyncValue<ReportBundle>> _cache = {};

  /// State untuk satu periode (loading bila belum pernah dimuat).
  AsyncValue<ReportBundle> stateFor(ReportPeriod p) =>
      _cache[p] ?? const AsyncValue.loading();

  ({DateTime from, DateTime to}) _rangeFor(ReportPeriod p) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return switch (p) {
      ReportPeriod.today => (from: today, to: today),
      ReportPeriod.week => (
        from: today.subtract(const Duration(days: 6)),
        to: today,
      ),
      ReportPeriod.month => (from: DateTime(now.year, now.month, 1), to: today),
    };
  }

  void setPeriod(ReportPeriod p) {
    if (p == period) return;
    period = p;
    ensureLoaded(p);
    notifyListeners();
  }

  /// Muat sekali bila belum ada data ter-cache untuk [p].
  Future<void> ensureLoaded(ReportPeriod p) async {
    if (_cache[p]?.hasData == true) return;
    await _fetch(p);
  }

  /// Pull-to-refresh satu periode — tak menjatuhkan ke skeleton bila sudah ada
  /// data (hindari kedip), data lama dipertahankan sampai yang baru datang.
  Future<void> refresh(ReportPeriod p) => _fetch(p, keepWhileLoading: true);

  Future<void> _fetch(ReportPeriod p, {bool keepWhileLoading = false}) async {
    if (!keepWhileLoading || _cache[p] == null) {
      _cache[p] = const AsyncValue.loading();
      notifyListeners();
    }
    try {
      final r = _rangeFor(p);
      _cache[p] = AsyncValue.data(await _repo.bundle(from: r.from, to: r.to));
    } catch (e) {
      _cache[p] = AsyncValue.error(e);
    }
    notifyListeners();
  }
}
