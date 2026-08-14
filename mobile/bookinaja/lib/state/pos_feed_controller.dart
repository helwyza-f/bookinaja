import 'dart:async';
import 'package:flutter/foundation.dart';

import '../models/pos_action_item.dart';
import '../realtime/realtime_bus.dart';
import '../realtime/realtime_channels.dart';
import '../realtime/realtime_client.dart';
import '../realtime/realtime_event.dart';
import '../repositories/pos_feed_repository.dart';
import 'async_value.dart';

/// State POS "action desk" — daftar transaksi (booking + sales-order) yang
/// perlu ditindak, beranchor **per transaksi**. Menggantikan pendekatan lama
/// yang beranchor per-resource (bug: 2 transaksi pada resource sama menyatu
/// jadi satu kartu).
class PosFeedController extends ChangeNotifier {
  PosFeedController(this._repo) {
    _realtimeSub = RealtimeBus.instance.events.listen(_onRealtimeEvent);
  }

  final PosFeedRepository _repo;

  /// Jendela "akan datang" untuk lane Siap (6 jam, samakan dengan POS web).
  static const int windowMinutes = 360;

  AsyncValue<List<PosActionItem>> _state = const AsyncValue.loading();
  AsyncValue<List<PosActionItem>> get state => _state;
  List<PosActionItem> get items => _state.data ?? const [];

  String _tenantSlug = '';
  StreamSubscription<RealtimeEvent>? _realtimeSub;
  Timer? _refreshDebounce;

  void bindTenant(String tenantSlug) {
    final slug = tenantSlug.trim();
    if (slug.isEmpty || slug == _tenantSlug) return;
    _tenantSlug = slug;
    RealtimeClient.instance.setChannels([
      tenantBookingsChannel(slug),
      tenantOrdersChannel(slug),
      tenantDashboardChannel(slug),
    ], source: 'pos');
  }

  /// Item setelah filter pencarian (customer / resource / no HP).
  List<PosActionItem> filtered(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return items;
    return items.where((it) {
      return it.customerName.toLowerCase().contains(q) ||
          it.resourceName.toLowerCase().contains(q) ||
          it.customerPhone.toLowerCase().contains(q);
    }).toList();
  }

  /// Kelompokkan item terfilter ke 4 lane, tiap lane tersortir prioritas→waktu.
  ({
    List<PosActionItem> prioritas,
    List<PosActionItem> live,
    List<PosActionItem> siap,
    List<PosActionItem> lainnya,
  }) lanes({String query = ''}) {
    final now = DateTime.now();
    final prioritas = <PosActionItem>[];
    final live = <PosActionItem>[];
    final siap = <PosActionItem>[];
    final lainnya = <PosActionItem>[];

    for (final it in filtered(query)) {
      switch (it.lane(now, windowMinutes)) {
        case PosActionLane.prioritas:
          prioritas.add(it);
        case PosActionLane.live:
          live.add(it);
        case PosActionLane.siap:
          siap.add(it);
        case PosActionLane.lainnya:
          lainnya.add(it);
      }
    }

    prioritas.sort(_compare);
    live.sort(_compare);
    siap.sort(_compare);
    lainnya.sort(_compare);
    return (prioritas: prioritas, live: live, siap: siap, lainnya: lainnya);
  }

  int _compare(PosActionItem a, PosActionItem b) {
    if (a.priority != b.priority) return a.priority.compareTo(b.priority);
    final ad = a.scheduledAt ?? a.endTime;
    final bd = b.scheduledAt ?? b.endTime;
    if (ad == null && bd == null) return 0;
    if (ad == null) return 1;
    if (bd == null) return -1;
    return ad.compareTo(bd);
  }

  Future<void> load() async {
    _state = const AsyncValue.loading();
    notifyListeners();
    try {
      _state = AsyncValue.data(await _repo.actionFeed(windowMinutes: windowMinutes));
    } catch (e) {
      _state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  void _onRealtimeEvent(RealtimeEvent event) {
    final type = event.type.toLowerCase();
    if (type.isEmpty) return;
    if (!_isRelevantEvent(type, event)) return;
    _scheduleReload();
  }

  bool _isRelevantEvent(String type, RealtimeEvent event) {
    if (type.startsWith('booking.') ||
        type.startsWith('payment.') ||
        type.startsWith('session.') ||
        type.startsWith('order.')) {
      return true;
    }
    final channel = (event.channel ?? '').toLowerCase();
    return channel.contains(':bookings') ||
        channel.contains(':orders') ||
        channel.contains(':dashboard');
  }

  void _scheduleReload() {
    _refreshDebounce?.cancel();
    _refreshDebounce = Timer(const Duration(milliseconds: 350), load);
  }

  @override
  void dispose() {
    _refreshDebounce?.cancel();
    _realtimeSub?.cancel();
    super.dispose();
  }
}
