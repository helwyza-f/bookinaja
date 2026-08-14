import '../api/api_client.dart';
import '../config.dart';
import '../data/sample_data.dart';
import '../models/resource_status.dart';

/// Nerve center: gabungan daftar resource + sesi aktif.
/// Live  = resource punya sesi berjalan (dari /bookings/pos/active)
/// Off   = status resource maintenance/inactive
/// Idle  = selebihnya (siap dipakai)
class OpsRepository {
  OpsRepository(this._api);
  final ApiClient _api;

  Future<List<ResourceStatus>> resources() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return sampleResources;
    }

    // Daftar resource WAJIB berhasil.
    final resList = _asList(await _api.get('/resources-all'));

    // Sesi aktif OPSIONAL — kalau gagal (mis. permission), tetap tampilkan resource.
    List activeList = const [];
    try {
      activeList = _asList(await _api.get('/bookings/pos/active'));
    } catch (_) {
      activeList = const [];
    }

    List bookingsList = const [];
    try {
      bookingsList = _asList(await _api.get('/bookings'));
    } catch (_) {
      bookingsList = const [];
    }

    // resource_id → sesi aktif (customer + end_time)
    final activeByResource = <String, Map>{};
    for (final a in activeList.whereType<Map>()) {
      final rid = '${a['resource_id'] ?? ''}';
      if (rid.isNotEmpty) activeByResource[rid] = a;
    }

    final now = DateTime.now();
    final todayKey = _dateKey(now);
    final bookingRows = bookingsList.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList();
    final todayBookings = bookingRows.where((b) => _dateKey(DateTime.tryParse('${b['start_time'] ?? ''}')) == todayKey).toList();
    final bookingsByResourceName = <String, List<Map<String, dynamic>>>{};
    final bookingsByResourceId = <String, List<Map<String, dynamic>>>{};
    for (final b in bookingRows) {
      final rid = '${b['resource_id'] ?? ''}'.trim();
      final rn = '${b['resource_name'] ?? ''}'.trim().toLowerCase();
      if (rid.isNotEmpty) {
        bookingsByResourceId.putIfAbsent(rid, () => []).add(b);
      }
      if (rn.isNotEmpty) {
        bookingsByResourceName.putIfAbsent(rn, () => []).add(b);
      }
    }

    final out = <ResourceStatus>[];
    for (final r in resList.whereType<Map>()) {
      final rid = '${r['id'] ?? ''}';
      final name = '${r['name'] ?? '-'}';
      final status = '${r['status'] ?? ''}'.toLowerCase();
      final active = activeByResource[rid];
      final matches = <Map<String, dynamic>>[
        ...?bookingsByResourceId[rid],
        ...?bookingsByResourceName[name.toLowerCase()],
      ];
      matches.sort((a, b) {
        final ad = DateTime.tryParse('${a['start_time'] ?? ''}') ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bd = DateTime.tryParse('${b['start_time'] ?? ''}') ?? DateTime.fromMillisecondsSinceEpoch(0);
        return ad.compareTo(bd);
      });

      final live = active != null;
      final liveCount = live ? 1 : 0;
      Map<String, dynamic>? nextBooking;
      for (final b in matches) {
        final start = DateTime.tryParse('${b['start_time'] ?? ''}');
        if (start != null && start.isAfter(now)) {
          nextBooking = b;
          break;
        }
      }

      if (active != null) {
        out.add(ResourceStatus(
          name: name, resourceId: rid, bookingId: '${active['id'] ?? ''}',
          state: ResourceState.live,
          note: [
            '${active['customer_name'] ?? ''}',
            _remaining('${active['end_time'] ?? ''}'),
          ].where((s) => s.isNotEmpty).join(' · '),
          liveCustomerName: '${active['customer_name'] ?? ''}',
          liveEndsAt: '${active['end_time'] ?? ''}',
          liveRemainingMinutes: _remainingMinutes('${active['end_time'] ?? ''}'),
          bookingsToday: _countToday(todayBookings, rid, name),
          liveCountForResource: liveCount,
          nextBookingCustomerName: nextBooking == null ? null : '${nextBooking['customer_name'] ?? ''}',
          nextBookingTimeLabel: nextBooking == null ? null : _shortTime('${nextBooking['start_time'] ?? ''}') ,
          nextBookingStatus: nextBooking == null ? null : '${nextBooking['status'] ?? ''}',
          todayTimeline: _timelineFor(todayBookings, rid, name),
        ));
      } else if (status == 'maintenance' || status == 'inactive' || status == 'archived' || status == 'disabled') {
        out.add(ResourceStatus(
          name: name,
          resourceId: rid,
          state: ResourceState.off,
          note: status == 'maintenance' ? 'maintenance' : 'nonaktif',
          bookingsToday: _countToday(todayBookings, rid, name),
          liveCountForResource: liveCount,
          nextBookingCustomerName: nextBooking == null ? null : '${nextBooking['customer_name'] ?? ''}',
          nextBookingTimeLabel: nextBooking == null ? null : _shortTime('${nextBooking['start_time'] ?? ''}'),
          nextBookingStatus: nextBooking == null ? null : '${nextBooking['status'] ?? ''}',
          todayTimeline: _timelineFor(todayBookings, rid, name),
        ));
      } else {
        out.add(ResourceStatus(
          name: name,
          resourceId: rid,
          state: ResourceState.idle,
          note: 'siap dipakai',
          bookingsToday: _countToday(todayBookings, rid, name),
          liveCountForResource: liveCount,
          nextBookingCustomerName: nextBooking == null ? null : '${nextBooking['customer_name'] ?? ''}',
          nextBookingTimeLabel: nextBooking == null ? null : _shortTime('${nextBooking['start_time'] ?? ''}'),
          nextBookingStatus: nextBooking == null ? null : '${nextBooking['status'] ?? ''}',
          todayTimeline: _timelineFor(todayBookings, rid, name),
        ));
      }
    }
    return out;
  }

  /// Aktifkan resource (off → active). Fetch full object, ubah status, PUT balik
  /// (UpdateResource overwrite penuh — jaga field lain tetap utuh).
  Future<void> setResourceActive(String resourceId) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    final res = await _api.get('/resources-all/$resourceId');
    final map = (res is Map) ? Map<String, dynamic>.from(res) : <String, dynamic>{};
    map['status'] = 'active';
    await _api.put('/resources-all/$resourceId', body: map);
  }

  String _remaining(String endIso) {
    final end = DateTime.tryParse(endIso);
    if (end == null) return '';
    final mins = end.difference(DateTime.now()).inMinutes;
    if (mins <= 0) return 'lewat';
    if (mins < 60) return 'sisa ${mins}m';
    return 'sisa ${mins ~/ 60}j ${mins % 60}m';
  }

  List _asList(dynamic v) {
    if (v is List) return v;
    if (v is Map) {
      for (final k in ['resources', 'items', 'data']) {
        if (v[k] is List) return v[k] as List;
      }
    }
    return const [];
  }

  String _dateKey(DateTime? d) {
    if (d == null) return '';
    return '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  int _countToday(List<Map<String, dynamic>> items, String rid, String name) {
    final rn = name.trim().toLowerCase();
    return items.where((b) {
      final bid = '${b['resource_id'] ?? ''}'.trim();
      final brn = '${b['resource_name'] ?? ''}'.trim().toLowerCase();
      return (rid.isNotEmpty && bid == rid) || (rn.isNotEmpty && brn == rn);
    }).length;
  }

  List<ResourceBookingSummary> _timelineFor(List<Map<String, dynamic>> items, String rid, String name) {
    final rn = name.trim().toLowerCase();
    final list = items.where((b) {
      final bid = '${b['resource_id'] ?? ''}'.trim();
      final brn = '${b['resource_name'] ?? ''}'.trim().toLowerCase();
      return (rid.isNotEmpty && bid == rid) || (rn.isNotEmpty && brn == rn);
    }).map((b) {
      return ResourceBookingSummary(
        id: '${b['id'] ?? ''}',
        customerName: '${b['customer_name'] ?? 'Tanpa nama'}',
        startTime: '${b['start_time'] ?? ''}',
        endTime: '${b['end_time'] ?? ''}',
        status: '${b['status'] ?? ''}',
        paymentStatus: '${b['payment_status'] ?? ''}',
        code: '${b['booking_code'] ?? b['code'] ?? ''}',
      );
    }).toList();
    list.sort((a, b) {
      final ad = DateTime.tryParse(a.startTime) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bd = DateTime.tryParse(b.startTime) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return ad.compareTo(bd);
    });
    return list;
  }

  int _remainingMinutes(String endIso) {
    final end = DateTime.tryParse(endIso);
    if (end == null) return 0;
    final mins = end.difference(DateTime.now()).inMinutes;
    return mins > 0 ? mins : 0;
  }

  String _shortTime(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '';
    final l = d.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
  }
}
