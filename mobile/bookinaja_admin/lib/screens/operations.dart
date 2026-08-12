import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/booking.dart';
import '../models/resource_status.dart';
import '../realtime/realtime_bus.dart';
import '../state/ops_controller.dart';
import '../state/auth_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';
import 'booking_detail.dart';
import 'create_booking.dart';

class OperationsScreen extends StatefulWidget {
  const OperationsScreen({super.key});
  @override
  State<OperationsScreen> createState() => _OperationsScreenState();
}

class _OperationsScreenState extends State<OperationsScreen> {
  String _query = '';
  ResourceState? _filter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<OpsController>().load());
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<OpsController>();
    final tenantSlug = context.watch<AuthController>().workspace?.slug ?? '';
    if (tenantSlug.isNotEmpty) {
      ctrl.bindTenant(tenantSlug);
    }
    final list = ctrl.filteredResources(query: _query, stateFilter: _filter);
    return SafeArea(
      child: ctrl.state.when(
        loading: () => const LoadingList(),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded,
          color: BK.crit,
          title: 'Gagal memuat ops',
          hint: '$e',
          action: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: ctrl.load,
            child: const Text('Coba lagi'),
          ),
        ),
        data: (_) => RefreshIndicator(
          onRefresh: ctrl.load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('NERVE CENTER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
                        SizedBox(height: 2),
                        Text('Operasi', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
                        SizedBox(height: 5),
                        Text('Pantau live status dan slot berikutnya.', style: TextStyle(fontSize: 12.5, color: BK.ink2, height: 1.3)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Pill.live('${ctrl.liveCount} live'),
                      const SizedBox(height: 6),
                      StreamBuilder<RealtimeConnectionState>(
                        stream: RealtimeBus.instance.status,
                        initialData: RealtimeConnectionState.idle,
                        builder: (context, snap) {
                          final state = snap.data ?? RealtimeConnectionState.idle;
                          final label = switch (state) {
                            RealtimeConnectionState.connected => 'Realtime aktif',
                            RealtimeConnectionState.connecting => 'Menghubungkan',
                            RealtimeConnectionState.reconnecting => 'Menyambung ulang',
                            RealtimeConnectionState.idle => 'Offline',
                          };
                          final color = switch (state) {
                            RealtimeConnectionState.connected => BK.live,
                            RealtimeConnectionState.connecting => BK.pend,
                            RealtimeConnectionState.reconnecting => BK.pend,
                            RealtimeConnectionState.idle => BK.ink3,
                          };
                          return Pill(label, fg: color, bg: color.withValues(alpha: .12));
                        },
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _compactStats(ctrl),
              const SizedBox(height: 12),
              _searchBar(),
              const SizedBox(height: 10),
              _filterChips(),
              const SizedBox(height: 14),
              if (list.isEmpty)
                const BKCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Tidak ada resource cocok.', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
                      SizedBox(height: 4),
                      Text('Coba hapus filter atau cari dengan nama resource lain.', style: TextStyle(fontSize: 12, color: BK.ink3)),
                    ],
                  ),
                )
              else
                for (final r in list) Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _ResourceCard(resource: r),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _searchBar() {
    return TextField(
      onChanged: (v) => setState(() => _query = v),
      decoration: InputDecoration(
        hintText: 'Cari resource atau customer...',
        prefixIcon: const Icon(Icons.search, size: 20, color: BK.ink3),
        isDense: true,
        filled: true,
        fillColor: BK.card,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
      ),
    );
  }

  Widget _filterChips() {
    Widget chip(String label, ResourceState? filter, Color color, {bool selected = false}) {
      return GestureDetector(
        onTap: () => setState(() => _filter = filter),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? color : BK.card,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: selected ? color : BK.line),
          ),
          child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: selected ? Colors.white : BK.ink2)),
        ),
      );
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        chip('All', null, BK.accent, selected: _filter == null),
        chip('Live', ResourceState.live, BK.live, selected: _filter == ResourceState.live),
        chip('Ready', ResourceState.idle, BK.ink, selected: _filter == ResourceState.idle),
        chip('Off', ResourceState.off, BK.pend, selected: _filter == ResourceState.off),
      ],
    );
  }

  Widget _compactStats(OpsController ctrl) {
    return BKCard(
      padding: const EdgeInsets.all(12),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          _miniStat('Live', '${ctrl.liveCount}', BK.live),
          _miniStat('Ready', '${ctrl.idleCount}', BK.accent),
          _miniStat('Off', '${ctrl.offCount}', BK.pend),
          _miniStat('Today', '${ctrl.bookingsTodayCount}', BK.ink),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Container(
      width: 74,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: .18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: BK.ink3)),
        ],
      ),
    );
  }
}

class _ResourceCard extends StatelessWidget {
  final ResourceStatus resource;
  const _ResourceCard({required this.resource});

  @override
  Widget build(BuildContext context) {
    final stateMeta = switch (resource.state) {
      ResourceState.live => (pill: Pill.live('Live'), color: BK.live, label: 'Buka detail live'),
      ResourceState.idle => (pill: Pill.mut('Idle'), color: BK.accent, label: 'Mulai booking'),
      ResourceState.off => (pill: Pill.crit('Off'), color: BK.pend, label: 'Aktifkan'),
    };
    final infoRows = <Widget>[
      _infoChip(Icons.event_available_outlined, '${resource.bookingsToday} booking hari ini'),
      if (resource.liveCustomerName != null && resource.liveCustomerName!.isNotEmpty)
        _infoChip(Icons.person_outline, resource.liveCustomerName!),
      if (resource.liveRemainingMinutes > 0)
        _infoChip(Icons.timer_outlined, _formatRemaining(resource.liveRemainingMinutes)),
      if (resource.nextBookingCustomerName != null && resource.nextBookingCustomerName!.isNotEmpty)
        _infoChip(Icons.schedule_outlined, 'Next: ${resource.nextBookingCustomerName!}${resource.nextBookingTimeLabel != null && resource.nextBookingTimeLabel!.isNotEmpty ? ' · ${resource.nextBookingTimeLabel}' : ''}'),
    ];

    return BKCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              stateMeta.pill,
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(resource.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: BK.ink)),
                        ),
                        _statusBadge(resource.state),
                      ],
                    ),
                    if (resource.note != null) ...[
                      const SizedBox(height: 3),
                      Text(resource.note!, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: infoRows),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: BK.ink,
                    backgroundColor: BK.card,
                    side: const BorderSide(color: BK.line),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => _openResourceSchedule(context, resource),
                  child: const Text('Lihat schedule', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: stateMeta.color,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => _onPrimaryAction(context, resource),
                  child: Text(stateMeta.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statusBadge(ResourceState state) {
    final (text, color) = switch (state) {
      ResourceState.live => ('LIVE', BK.live),
      ResourceState.idle => ('READY', BK.accent),
      ResourceState.off => ('OFF', BK.pend),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: .1), borderRadius: BorderRadius.circular(999)),
      child: Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color, letterSpacing: .3)),
    );
  }

  Widget _infoChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(12), border: Border.all(color: BK.line)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: BK.ink3),
          const SizedBox(width: 6),
          Text(text, style: const TextStyle(fontSize: 11.5, color: BK.ink2, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  static String _formatRemaining(int minutes) {
    if (minutes <= 0) return 'lewat';
    if (minutes < 60) return 'sisa ${minutes}m';
    return 'sisa ${minutes ~/ 60}j ${minutes % 60}m';
  }

  void _openResourceSchedule(BuildContext context, ResourceStatus resource) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: BK.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _ResourceScheduleSheet(resource: resource),
    );
  }

  void _onPrimaryAction(BuildContext context, ResourceStatus resource) async {
    switch (resource.state) {
      case ResourceState.live:
        if (resource.bookingId.isEmpty) {
          BkToast.warning(context, 'Booking live tidak ditemukan');
          return;
        }
        final booking = Booking(
          id: resource.bookingId,
          code: resource.bookingId.length > 8 ? resource.bookingId.substring(0, 8).toUpperCase() : resource.bookingId,
          customer: resource.liveCustomerName ?? '',
          resource: resource.name,
          time: '',
          status: BookingStatus.live,
          total: 0,
          paid: 0,
        );
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: booking)));
        if (context.mounted) context.read<OpsController>().load();
        break;
      case ResourceState.idle:
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => CreateBookingScreen(initialResourceId: resource.resourceId)));
        if (context.mounted) context.read<OpsController>().load();
        break;
      case ResourceState.off:
        final yes = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Aktifkan resource?'),
            content: Text('${resource.name} akan diaktifkan kembali.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Aktifkan')),
            ],
          ),
        );
        if (yes == true && context.mounted) {
          final ok = await context.read<OpsController>().setActive(resource.resourceId);
          if (context.mounted) {
            if (ok) {
              BkToast.success(context, '${resource.name} diaktifkan');
            } else {
              BkToast.error(context, context.read<OpsController>().actionError ?? 'Gagal mengaktifkan');
            }
          }
        }
        break;
    }
  }
}

class _ResourceScheduleSheet extends StatelessWidget {
  final ResourceStatus resource;
  const _ResourceScheduleSheet({required this.resource});

  @override
  Widget build(BuildContext context) {
    final timeline = resource.todayTimeline;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(width: 42, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(3))),
            ),
            const SizedBox(height: 14),
            Text(resource.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 4),
            Text(
              'Booking hari ini ${resource.bookingsToday} item · ${resource.state == ResourceState.live ? 'sedang live' : resource.state == ResourceState.off ? 'off' : 'siap dipakai'}',
              style: const TextStyle(fontSize: 12.5, color: BK.ink3),
            ),
            const SizedBox(height: 14),
            if (resource.liveCustomerName != null && resource.liveCustomerName!.isNotEmpty)
              _detailRow('Aktif', resource.liveCustomerName!),
            if ((resource.liveEndsAt ?? '').isNotEmpty)
              _detailRow('Selesai', _formatDateTime(resource.liveEndsAt!)),
            if (resource.nextBookingCustomerName != null && resource.nextBookingCustomerName!.isNotEmpty)
              _detailRow('Berikutnya', '${resource.nextBookingCustomerName!}${resource.nextBookingTimeLabel != null && resource.nextBookingTimeLabel!.isNotEmpty ? ' · ${resource.nextBookingTimeLabel}' : ''}'),
            const SizedBox(height: 14),
            const Text('Timeline hari ini', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1, color: BK.ink3)),
            const SizedBox(height: 8),
            if (timeline.isEmpty)
              const BKCard(
                child: Text(
                  'Belum ada booking hari ini untuk resource ini.',
                  style: TextStyle(fontSize: 12.5, color: BK.ink2),
                ),
              )
            else
              ...timeline.asMap().entries.map((entry) {
                final i = entry.key;
                final item = entry.value;
                final isLive = item.status.toLowerCase() == 'active' || item.status.toLowerCase() == 'ongoing';
                final next = i < timeline.length - 1 ? timeline[i + 1] : null;
                return Padding(
                  padding: EdgeInsets.only(bottom: i == timeline.length - 1 ? 0 : 10),
                  child: BKCard(
                    border: isLive ? BK.live : BK.line,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(color: isLive ? BK.live : BK.accent, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                item.customerName,
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink),
                              ),
                            ),
                            Text(
                              _rangeLabel(item.startTime, item.endTime),
                              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: isLive ? BK.live : BK.ink3),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${_shortTime(item.startTime)} - ${_shortTime(item.endTime)}${item.code.isNotEmpty ? ' · ${item.code}' : ''}',
                          style: const TextStyle(fontSize: 12, color: BK.ink2),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.status.toLowerCase(),
                          style: const TextStyle(fontSize: 11.5, color: BK.ink3),
                        ),
                        if (next != null) ...[
                          const SizedBox(height: 10),
                          const Divider(height: 1, color: BK.line),
                          const SizedBox(height: 8),
                          Text(
                            'Next slot: ${next.customerName} · ${_shortTime(next.startTime)}',
                            style: const TextStyle(fontSize: 12, color: BK.ink3, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 88,
            child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: BK.ink3)),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: BK.ink))),
        ],
      ),
    );
  }

  static String _shortTime(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '-';
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  static String _formatDateTime(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '-';
    return '${d.day.toString().padLeft(2, '0')} ${_mon(d.month)} ${d.year} ${_shortTime(iso)}';
  }

  static String _mon(int m) {
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return mon[(m - 1).clamp(0, 11)];
  }

  static String _rangeLabel(String startIso, String endIso) {
    final s = DateTime.tryParse(startIso);
    final e = DateTime.tryParse(endIso);
    if (s == null || e == null) return 'slot';
    final mins = e.difference(s).inMinutes;
    if (mins <= 0) return 'slot';
    if (mins < 60) return '${mins}m';
    return '${mins ~/ 60}j ${mins % 60}m';
  }
}

