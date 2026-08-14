import 'dart:async';
import 'package:flutter/foundation.dart';

import '../models/resource_status.dart';
import '../realtime/realtime_bus.dart';
import '../realtime/realtime_channels.dart';
import '../realtime/realtime_client.dart';
import '../realtime/realtime_event.dart';
import '../repositories/ops_repository.dart';
import 'async_value.dart';

class OpsController extends ChangeNotifier {
  OpsController(this._repo) {
    _realtimeSub = RealtimeBus.instance.events.listen(_onRealtimeEvent);
  }

  final OpsRepository _repo;

  AsyncValue<List<ResourceStatus>> _state = const AsyncValue.loading();
  AsyncValue<List<ResourceStatus>> get state => _state;

  bool acting = false;
  String? actionError;
  StreamSubscription<RealtimeEvent>? _realtimeSub;
  Timer? _refreshDebounce;
  String _tenantSlug = '';

  List<ResourceStatus> get resources => _state.data ?? const [];

  int get liveCount =>
      resources.where((r) => r.state == ResourceState.live).length;
  int get idleCount =>
      resources.where((r) => r.state == ResourceState.idle).length;
  int get offCount =>
      resources.where((r) => r.state == ResourceState.off).length;
  int get total => resources.length;
  int get bookingsTodayCount =>
      resources.fold(0, (sum, r) => sum + r.bookingsToday);

  ResourceStatus? get mostBusyResource {
    if (resources.isEmpty) return null;
    final sorted = [...resources]
      ..sort((a, b) => b.bookingsToday.compareTo(a.bookingsToday));
    return sorted.firstWhere(
      (r) => r.bookingsToday > 0,
      orElse: () => sorted.first,
    );
  }

  ({String resourceName, String customerName, String timeLabel})?
  get nextBookingSummary {
    final candidates = resources
        .where((r) => (r.nextBookingCustomerName ?? '').isNotEmpty)
        .toList();
    if (candidates.isEmpty) return null;
    candidates.sort((a, b) {
      final ap = a.nextBookingTimeLabel ?? '';
      final bp = b.nextBookingTimeLabel ?? '';
      return ap.compareTo(bp);
    });
    final first = candidates.first;
    return (
      resourceName: first.name,
      customerName: first.nextBookingCustomerName ?? '',
      timeLabel: first.nextBookingTimeLabel ?? '',
    );
  }

  List<ResourceStatus> filteredResources({
    String query = '',
    ResourceState? stateFilter,
  }) {
    final q = query.trim().toLowerCase();
    return resources.where((r) {
      if (stateFilter != null && r.state != stateFilter) return false;
      if (q.isEmpty) return true;
      return r.name.toLowerCase().contains(q) ||
          (r.note ?? '').toLowerCase().contains(q) ||
          (r.liveCustomerName ?? '').toLowerCase().contains(q) ||
          (r.nextBookingCustomerName ?? '').toLowerCase().contains(q);
    }).toList();
  }

  void bindTenant(String tenantSlug) {
    final slug = tenantSlug.trim();
    if (slug.isEmpty || slug == _tenantSlug) return;
    _tenantSlug = slug;
    RealtimeClient.instance.setChannels([
      tenantBookingsChannel(slug),
      tenantDashboardChannel(slug),
      tenantDevicesChannel(slug),
    ], source: 'ops');
  }

  void _onRealtimeEvent(RealtimeEvent event) {
    final type = event.type.toLowerCase();
    if (type.isEmpty) return;
    if (!_isRelevantEvent(type, event)) return;
    if (_patchLocal(event)) {
      notifyListeners();
      return;
    }
    _scheduleReload();
  }

  bool _isRelevantEvent(String type, RealtimeEvent event) {
    if (type.startsWith('booking.') ||
        type.startsWith('payment.') ||
        type.startsWith('session.'))
      return true;
    if (type.startsWith('resource.') || type.startsWith('device.')) return true;
    final channel = (event.channel ?? '').toLowerCase();
    return channel.contains(':bookings') ||
        channel.contains(':dashboard') ||
        channel.contains(':devices');
  }

  void _scheduleReload() {
    _refreshDebounce?.cancel();
    _refreshDebounce = Timer(const Duration(milliseconds: 350), () {
      load();
    });
  }

  bool _patchLocal(RealtimeEvent event) {
    final summary = event.summary;
    final refs = event.refs;
    final rid = _stringOf(refs['resource_id'] ?? summary['resource_id']);
    final bookingId = _stringOf(refs['booking_id'] ?? event.entityId);
    if (rid.isEmpty && bookingId.isEmpty) return false;

    final current = List<ResourceStatus>.from(resources);
    final idx = current.indexWhere(
      (r) =>
          (rid.isNotEmpty && r.resourceId == rid) ||
          (bookingId.isNotEmpty && r.bookingId == bookingId),
    );
    if (idx < 0) return false;

    final patched = _applyPatch(current[idx], event);
    if (patched == null) return false;
    current[idx] = patched;
    _state = AsyncValue.data(current);
    return true;
  }

  ResourceStatus? _applyPatch(ResourceStatus item, RealtimeEvent event) {
    final type = event.type.toLowerCase();
    final summary = event.summary;
    final statusRaw = _stringOf(summary['status']);
    final customerName = _stringOf(
      summary['customer_name'] ?? summary['customer'],
      item.liveCustomerName ?? '',
    );
    final resourceName = _stringOf(
      summary['resource_name'] ?? summary['resource'],
      item.name,
    );
    final bookingId = _stringOf(
      event.refs['booking_id'] ?? event.entityId,
      item.bookingId,
    );
    final endTime = _stringOf(summary['end_time'], item.liveEndsAt ?? '');
    final bookingsToday = _intOf(
      summary['bookings_today'] ?? summary['bookings_count'],
      item.bookingsToday,
    );
    final nextCustomer = _stringOf(
      summary['next_booking_customer_name'],
      item.nextBookingCustomerName ?? '',
    );
    final nextTime = _stringOf(
      summary['next_booking_time_label'],
      item.nextBookingTimeLabel ?? '',
    );
    final nextStatus = _stringOf(
      summary['next_booking_status'],
      item.nextBookingStatus ?? '',
    );

    final timelineRaw = summary['today_timeline'];
    final timeline = timelineRaw is List
        ? timelineRaw
              .whereType<Map>()
              .map(
                (e) => ResourceBookingSummary(
                  id: '${e['id'] ?? ''}',
                  customerName: '${e['customer_name'] ?? 'Tanpa nama'}',
                  startTime: '${e['start_time'] ?? ''}',
                  endTime: '${e['end_time'] ?? ''}',
                  status: '${e['status'] ?? ''}',
                  paymentStatus: '${e['payment_status'] ?? ''}',
                  code: '${e['code'] ?? e['booking_code'] ?? ''}',
                ),
              )
              .toList()
        : item.todayTimeline;

    final state = _deriveState(
      item.state,
      type,
      statusRaw,
      endTime,
      customerName,
    );
    final note = _buildNote(state, customerName, endTime, item.note);

    return ResourceStatus(
      name: resourceName,
      state: state,
      note: note,
      resourceId: item.resourceId,
      bookingId: bookingId,
      liveCustomerName: customerName.isNotEmpty
          ? customerName
          : item.liveCustomerName,
      liveEndsAt: endTime.isNotEmpty ? endTime : item.liveEndsAt,
      liveRemainingMinutes: endTime.isNotEmpty
          ? _remainingMinutes(endTime)
          : item.liveRemainingMinutes,
      bookingsToday: bookingsToday,
      liveCountForResource: state == ResourceState.live ? 1 : 0,
      nextBookingCustomerName: nextCustomer.isNotEmpty
          ? nextCustomer
          : item.nextBookingCustomerName,
      nextBookingTimeLabel: nextTime.isNotEmpty
          ? nextTime
          : item.nextBookingTimeLabel,
      nextBookingStatus: nextStatus.isNotEmpty
          ? nextStatus
          : item.nextBookingStatus,
      todayTimeline: timeline,
    );
  }

  ResourceState _deriveState(
    ResourceState current,
    String type,
    String statusRaw,
    String endTime,
    String customerName,
  ) {
    if (type.startsWith('device.') ||
        statusRaw == 'inactive' ||
        statusRaw == 'maintenance' ||
        statusRaw == 'archived' ||
        statusRaw == 'disabled') {
      return ResourceState.off;
    }
    if (statusRaw == 'pending' ||
        statusRaw == 'confirmed' ||
        statusRaw == 'waiting' ||
        statusRaw == 'scheduled' ||
        statusRaw == 'queued') {
      return ResourceState.idle;
    }
    if (type.startsWith('session.') ||
        statusRaw == 'active' ||
        statusRaw == 'ongoing') {
      return ResourceState.live;
    }
    if (customerName.isNotEmpty || endTime.isNotEmpty) {
      return ResourceState.live;
    }
    if (statusRaw == 'off') return ResourceState.off;
    return current;
  }

  String? _buildNote(
    ResourceState state,
    String customerName,
    String endTime,
    String? fallback,
  ) {
    if (state == ResourceState.live) {
      final parts = <String>[];
      if (customerName.isNotEmpty) parts.add(customerName);
      final remaining = endTime.isNotEmpty ? _remainingMinutes(endTime) : 0;
      if (remaining > 0) {
        parts.add(
          remaining < 60
              ? 'sisa ${remaining}m'
              : 'sisa ${remaining ~/ 60}j ${remaining % 60}m',
        );
      }
      if (parts.isNotEmpty) return parts.join(' · ');
    }
    return fallback;
  }

  /// Aktifkan resource off → active, lalu muat ulang.
  Future<bool> setActive(String resourceId) async {
    acting = true;
    actionError = null;
    notifyListeners();
    try {
      await _repo.setResourceActive(resourceId);
      await load();
      acting = false;
      notifyListeners();
      return true;
    } catch (e) {
      actionError = e.toString();
      acting = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> load() async {
    _state = const AsyncValue.loading();
    notifyListeners();
    try {
      _state = AsyncValue.data(await _repo.resources());
    } catch (e) {
      _state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  int _remainingMinutes(String endIso) {
    final end = DateTime.tryParse(endIso);
    if (end == null) return 0;
    final mins = end.difference(DateTime.now()).inMinutes;
    return mins > 0 ? mins : 0;
  }

  String _stringOf(dynamic value, [String fallback = '']) {
    final s = '${value ?? ''}'.trim();
    return s.isEmpty ? fallback : s;
  }

  int _intOf(dynamic value, int fallback) {
    if (value is num) return value.round();
    return int.tryParse('$value') ?? fallback;
  }

  @override
  void dispose() {
    _refreshDebounce?.cancel();
    _realtimeSub?.cancel();
    super.dispose();
  }
}
