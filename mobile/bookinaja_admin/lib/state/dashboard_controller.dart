import 'dart:async';
import 'package:flutter/foundation.dart';
import '../data/sample_data.dart';
import '../models/booking.dart';
import '../realtime/realtime_bus.dart';
import '../realtime/realtime_event.dart';
import '../repositories/booking_repository.dart';

/// Ringkasan dashboard: omzet hari ini, sesi aktif, booking perlu perhatian.
class DashboardController extends ChangeNotifier {
  DashboardController(this._repo) {
    _realtimeSub = RealtimeBus.instance.events.listen(_onRealtimeEvent);
  }
  final BookingRepository _repo;

  bool loading = true;
  String? error;

  int omzet = 0;
  int bookingsToday = 0;
  int needsAction = 0;
  int activeCount = 0;
  List<LiveSession> live = const [];
  List<Booking> upcoming = const []; // beberapa booking berikutnya (soonest first)
  StreamSubscription<RealtimeEvent>? _realtimeSub;
  Timer? _refreshDebounce;

  void _onRealtimeEvent(RealtimeEvent event) {
    final type = event.type.toLowerCase();
    if (type.isEmpty) return;
    if (!(type.startsWith('booking.') || type.startsWith('payment.') || type.startsWith('session.') || type.startsWith('order.') || type.startsWith('device.'))) return;
    if (_patchLocal(event)) {
      notifyListeners();
      return;
    }
    _scheduleReload();
  }

  bool _patchLocal(RealtimeEvent event) {
    final type = event.type.toLowerCase();
    final summary = event.summary;

    if (type.startsWith('booking.') || type.startsWith('payment.') || type.startsWith('session.')) {
      final id = '${event.refs['booking_id'] ?? event.entityId ?? ''}'.trim();
      if (id.isEmpty) return false;
      final current = List<Booking>.from(upcoming);
      final idx = current.indexWhere((b) => b.id == id);
      if (idx >= 0) {
        current[idx] = current[idx].copyWith(
          customer: _stringOf(summary['customer_name'], current[idx].customer),
          resource: _stringOf(summary['resource_name'], current[idx].resource),
          status: _statusFrom(summary, current[idx].status),
          total: _intOf(summary['grand_total'], current[idx].total),
          paid: _intOf(summary['paid_amount'], current[idx].paid),
          startAt: _dateOf(summary['start_time']) ?? current[idx].startAt,
        );
        upcoming
          ..clear()
          ..addAll(current);
        return true;
      }
      return false;
    }
    return false;
  }

  BookingStatus _statusFrom(Map<String, dynamic> summary, BookingStatus fallback) {
    final raw = '${summary['status'] ?? ''}'.trim();
    final pay = '${summary['payment_status'] ?? ''}'.trim();
    if (raw.isEmpty && pay.isEmpty) return fallback;
    return bookingStatusFrom(raw, paymentStatus: pay.isEmpty ? null : pay);
  }

  int _intOf(dynamic value, int fallback) => value is num ? value.round() : int.tryParse(value?.toString() ?? '') ?? fallback;
  String _stringOf(dynamic value, String fallback) {
    final s = value?.toString().trim() ?? '';
    return s.isEmpty ? fallback : s;
  }
  DateTime? _dateOf(dynamic value) => DateTime.tryParse(value?.toString() ?? '')?.toLocal();

  void _scheduleReload() {
    _refreshDebounce?.cancel();
    _refreshDebounce = Timer(const Duration(milliseconds: 350), () {
      load();
    });
  }

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
      // "Akan datang": belum mulai (start > now), bukan sesi live / batal.
      // Ambil beberapa yang paling dekat saja — home cuma glance.
      final now = DateTime.now();
      upcoming = bookings
          .where((b) => b.startAt != null && b.startAt!.isAfter(now) &&
              b.status != BookingStatus.live && b.status != BookingStatus.cancelled)
          .toList()
        ..sort((a, b) => a.startAt!.compareTo(b.startAt!));
      if (upcoming.length > 3) upcoming = upcoming.sublist(0, 3);
    } catch (e) {
      error = e.toString();
    }
    loading = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _refreshDebounce?.cancel();
    _realtimeSub?.cancel();
    super.dispose();
  }
}
