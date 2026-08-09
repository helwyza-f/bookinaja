import 'package:flutter/foundation.dart';
import '../data/sample_data.dart';
import '../models/booking.dart';
import '../repositories/booking_repository.dart';

/// Ringkasan dashboard: omzet hari ini, sesi aktif, booking perlu perhatian.
class DashboardController extends ChangeNotifier {
  DashboardController(this._repo);
  final BookingRepository _repo;

  bool loading = true;
  String? error;

  int omzet = 0;
  int bookingsToday = 0;
  int needsAction = 0;
  int activeCount = 0;
  List<LiveSession> live = const [];

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final r = await Future.wait([
        _repo.summaryToday(),
        _repo.activeSessions(),
        _repo.listAll(),
      ]);
      final s = r[0] as ({int omzet, int bookingsToday});
      omzet = s.omzet;
      bookingsToday = s.bookingsToday;
      live = r[1] as List<LiveSession>;
      activeCount = live.length;
      final bookings = r[2] as List<Booking>;
      needsAction = bookings.where((b) =>
          b.status == BookingStatus.pending ||
          b.status == BookingStatus.review ||
          b.status == BookingStatus.dp).length;
    } catch (e) {
      error = e.toString();
    }
    loading = false;
    notifyListeners();
  }
}
