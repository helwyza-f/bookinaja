import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/booking.dart';
import '../realtime/realtime_bus.dart';
import '../realtime/realtime_event.dart';
import '../repositories/booking_repository.dart';
import 'async_value.dart';

/// Memuat & menyaring daftar booking.
class BookingsController extends ChangeNotifier {
  BookingsController(this._repo) {
    _realtimeSub = RealtimeBus.instance.events.listen(_onRealtimeEvent);
  }
  final BookingRepository _repo;

  AsyncValue<List<Booking>> _state = const AsyncValue.loading();
  AsyncValue<List<Booking>> get state => _state;

  int filter = 0; // 0 semua, 1 aktif, 2 lunas
  String query = ''; // cari nama / kode
  StreamSubscription<RealtimeEvent>? _realtimeSub;
  Timer? _refreshDebounce;

  List<Booking> get filtered {
    final all = _state.data ?? const [];
    final byFilter = switch (filter) {
      1 => all.where((b) => b.status == BookingStatus.live),
      2 => all.where((b) => b.status == BookingStatus.paid),
      _ => all,
    };
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return byFilter.toList();
    return byFilter
        .where((b) => b.customer.toLowerCase().contains(q) || b.code.toLowerCase().contains(q))
        .toList();
  }

  void setFilter(int f) {
    filter = f;
    notifyListeners();
  }

  void setQuery(String q) {
    query = q;
    notifyListeners();
  }

  /// Sisipkan booking baru di atas daftar (dipakai flow buat booking / demo).
  void addLocal(Booking b) {
    final current = List<Booking>.from(_state.data ?? const []);
    current.insert(0, b);
    _state = AsyncValue.data(current);
    notifyListeners();
  }

  void _onRealtimeEvent(RealtimeEvent event) {
    final type = event.type.toLowerCase();
    if (type.isEmpty) return;
    if (!(type.startsWith('booking.') || type.startsWith('payment.') || type.startsWith('session.') || type.startsWith('order.'))) return;
    final patched = _patchLocal(event);
    if (patched) {
      notifyListeners();
      return;
    }
    _scheduleReload();
  }

  bool _patchLocal(RealtimeEvent event) {
    final id = '${event.refs['booking_id'] ?? event.entityId ?? ''}'.trim();
    if (id.isEmpty || _state.data == null) return false;

    final summary = event.summary;
    final code = '${summary['booking_code'] ?? summary['code'] ?? ''}'.trim();
    final customer = '${summary['customer_name'] ?? summary['customer'] ?? ''}'.trim();
    final resource = '${summary['resource_name'] ?? summary['resource'] ?? ''}'.trim();
    final statusRaw = '${summary['status'] ?? ''}'.trim().toLowerCase();
    final paymentStatus = '${summary['payment_status'] ?? ''}'.trim().toLowerCase();
    final total = _intOrNull(summary['grand_total'] ?? summary['total']);
    final paid = _intOrNull(summary['paid_amount'] ?? summary['paid']);
    final startTime = _dateOf(summary['start_time']);

    final current = List<Booking>.from(_state.data ?? const []);
    var changed = false;
    final next = <Booking>[];
    for (final item in current) {
      if (item.id != id) {
        next.add(item);
        continue;
      }
      changed = true;
      final patched = item.copyWith(
        code: code.isNotEmpty ? code : null,
        customer: customer.isNotEmpty ? customer : null,
        resource: resource.isNotEmpty ? resource : null,
        status: _bookingStatusFromEvent(item, statusRaw, paymentStatus),
        total: (total != null && total > 0) ? total : null,
        paid: paid,
        startAt: startTime ?? item.startAt,
      );
      next.add(patched);
    }
    if (!changed) return false;
    _state = AsyncValue.data(next);
    return true;
  }

  BookingStatus _bookingStatusFromEvent(Booking current, String statusRaw, String paymentStatus) {
    if (statusRaw.isNotEmpty) {
      return bookingStatusFrom(statusRaw, paymentStatus: paymentStatus.isNotEmpty ? paymentStatus : null);
    }
    return current.status;
  }

  int? _intOrNull(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.round();
    return int.tryParse('$v');
  }
  DateTime? _dateOf(dynamic v) => DateTime.tryParse('${v ?? ''}')?.toLocal();

  void _scheduleReload() {
    _refreshDebounce?.cancel();
    _refreshDebounce = Timer(const Duration(milliseconds: 350), () {
      load();
    });
  }

  Future<void> load() async {
    _state = const AsyncValue.loading();
    notifyListeners();
    try {
      _state = AsyncValue.data(await _repo.listAll());
    } catch (e) {
      _state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _refreshDebounce?.cancel();
    _realtimeSub?.cancel();
    super.dispose();
  }
}
