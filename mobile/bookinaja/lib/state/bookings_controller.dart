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

  String query = ''; // cari nama / kode
  // Filter lanjutan (client-side, kecuali rentang tanggal yang server-side):
  Set<BookingStatus> statuses = {}; // kosong = semua status
  String? resourceFilter; // null = semua resource
  DateTime? fromDate; // rentang tanggal (server-side) — null = tak dibatasi
  DateTime? toDate;
  int sort = 0; // 0 = terbaru (urutan server), 1 = jadwal terdekat (startAt asc)
  StreamSubscription<RealtimeEvent>? _realtimeSub;
  Timer? _refreshDebounce;

  List<Booking> get filtered {
    Iterable<Booking> list = _state.data ?? const [];
    if (statuses.isNotEmpty) list = list.where((b) => statuses.contains(b.status));
    if (resourceFilter != null) list = list.where((b) => b.resource == resourceFilter);
    final q = query.trim().toLowerCase();
    if (q.isNotEmpty) {
      list = list.where((b) => b.customer.toLowerCase().contains(q) || b.code.toLowerCase().contains(q));
    }
    final out = list.toList();
    if (sort == 1) {
      out.sort((a, b) => (a.startAt ?? DateTime(9999)).compareTo(b.startAt ?? DateTime(9999)));
    }
    return out;
  }

  /// Nama resource unik dari data (untuk dropdown filter).
  List<String> get resourceOptions {
    final set = <String>{};
    for (final b in (_state.data ?? const <Booking>[])) {
      if (b.resource.trim().isNotEmpty && b.resource != '-') set.add(b.resource);
    }
    final list = set.toList()..sort();
    return list;
  }

  /// Jumlah filter aktif (untuk badge di tombol Filter).
  int get activeFilterCount =>
      statuses.length +
      (resourceFilter != null ? 1 : 0) +
      ((fromDate != null || toDate != null) ? 1 : 0) +
      (sort != 0 ? 1 : 0);

  /// Terapkan filter dari sheet. Rentang tanggal memicu reload server bila
  /// berubah; sisanya cukup notify (client-side).
  void applyFilters({
    required Set<BookingStatus> statuses,
    required String? resource,
    required int sort,
    required DateTime? from,
    required DateTime? to,
  }) {
    this.statuses = statuses;
    resourceFilter = resource;
    this.sort = sort;
    final rangeChanged = from != fromDate || to != toDate;
    fromDate = from;
    toDate = to;
    if (rangeChanged) {
      load();
    } else {
      notifyListeners();
    }
  }

  void resetFilters() {
    final hadRange = fromDate != null || toDate != null;
    statuses = {};
    resourceFilter = null;
    sort = 0;
    fromDate = null;
    toDate = null;
    if (hadRange) {
      load();
    } else {
      notifyListeners();
    }
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

  String? _ymd(DateTime? d) {
    if (d == null) return null;
    return '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  Future<void> load() async {
    _state = const AsyncValue.loading();
    notifyListeners();
    try {
      _state = AsyncValue.data(await _repo.listAll(from: _ymd(fromDate), to: _ymd(toDate)));
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
