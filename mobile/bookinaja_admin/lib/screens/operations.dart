import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/booking.dart';
import '../models/resource_status.dart';
import '../state/auth_controller.dart';
import '../state/ops_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';
import 'booking_detail.dart';
import 'create_booking.dart';

class OperationsScreen extends StatefulWidget {
  const OperationsScreen({super.key});
  @override
  State<OperationsScreen> createState() => _OperationsScreenState();
}

class _OperationsScreenState extends State<OperationsScreen>
    with SingleTickerProviderStateMixin {
  String _query = '';
  late final TabController _tabController = TabController(
    length: 4,
    vsync: this,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => context.read<OpsController>().load(),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<OpsController>();
    final tenantSlug = context.watch<AuthController>().workspace?.slug ?? '';
    if (tenantSlug.isNotEmpty) ctrl.bindTenant(tenantSlug);

    final resources = ctrl.filteredResources(query: _query);
    final lanes = _buildLanes(resources);

    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text(
          'POS',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: BK.ink,
          ),
        ),
      ),
      body: ctrl.state.when(
        loading: () => const LoadingList(),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded,
          color: BK.crit,
          title: 'Gagal memuat POS',
          hint: '$e',
          action: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: ctrl.load,
            child: const Text('Coba lagi'),
          ),
        ),
        data: (_) => Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          child: Column(
            children: [
              _searchBar(),
              const SizedBox(height: 12),
              Expanded(
                child: _LaneTabs(
                  controller: _tabController,
                  lanes: lanes,
                  onOpen: (r) => _openResource(context, r),
                  refresh: ctrl.load,
                ),
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
        contentPadding: const EdgeInsets.symmetric(vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: BK.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: BK.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: BK.accent),
        ),
      ),
    );
  }

  ({
    List<ResourceStatus> prioritas,
    List<ResourceStatus> live,
    List<ResourceStatus> siap,
    List<ResourceStatus> lainnya,
  })
  _buildLanes(List<ResourceStatus> resources) {
    final prioritas = <ResourceStatus>[];
    final live = <ResourceStatus>[];
    final siap = <ResourceStatus>[];
    final lainnya = <ResourceStatus>[];

    for (final r in resources) {
      final note = (r.note ?? '').toLowerCase();
      final hasNext = (r.nextBookingCustomerName ?? '').isNotEmpty;
      final needsSettlement = _needsBookingSettlement(r);
      final isPriority =
          needsSettlement ||
          (r.state == ResourceState.live &&
          (note.contains('menunggu') ||
              note.contains('verifikasi') ||
              note.contains('perhatian') ||
              note.contains('urgent') ||
              note.contains('problem') ||
              note.contains('issue')));
      final isReadySoon = r.state == ResourceState.idle && hasNext;

      if (isPriority) {
        prioritas.add(r);
      } else if (r.state == ResourceState.live) {
        live.add(r);
      } else if (isReadySoon) {
        siap.add(r);
      } else {
        lainnya.add(r);
      }
    }

    prioritas.sort(_sortResource);
    live.sort(_sortResource);
    siap.sort(_sortResource);
    lainnya.sort(_sortResource);
    return (prioritas: prioritas, live: live, siap: siap, lainnya: lainnya);
  }

  bool _needsBookingSettlement(ResourceStatus resource) {
    final candidates = [...resource.todayTimeline];
    if (candidates.isEmpty) return false;
    candidates.sort((a, b) {
      final ad = DateTime.tryParse(a.endTime) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bd = DateTime.tryParse(b.endTime) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bd.compareTo(ad);
    });
    final latest = candidates.first;
    final status = latest.status.toLowerCase();
    final paymentStatus = latest.paymentStatus.toLowerCase();
    final needsPayment = [
      'pending',
      'partial_paid',
      'unpaid',
      'failed',
      'expired',
      'awaiting_verification',
    ].contains(paymentStatus);

    if (!needsPayment) return false;
    return status == 'completed' ||
        resource.state != ResourceState.live ||
        (resource.note ?? '').toLowerCase().contains('lewat');
  }

  int _sortResource(ResourceStatus a, ResourceStatus b) {
    final sa = _stateRank(a.state);
    final sb = _stateRank(b.state);
    if (sa != sb) return sa.compareTo(sb);
    return a.name.compareTo(b.name);
  }

  int _stateRank(ResourceState state) {
    return switch (state) {
      ResourceState.live => 0,
      ResourceState.idle => 1,
      ResourceState.off => 2,
    };
  }

  void _openResource(BuildContext context, ResourceStatus resource) {
    if (resource.state == ResourceState.live && resource.bookingId.isNotEmpty) {
      final booking = Booking(
        id: resource.bookingId,
        code: resource.bookingId.length > 8
            ? resource.bookingId.substring(0, 8).toUpperCase()
            : resource.bookingId,
        customer: resource.liveCustomerName ?? '',
        resource: resource.name,
        time: '',
        status: BookingStatus.live,
        total: 0,
        paid: 0,
      );
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => BookingDetailScreen(booking: booking),
        ),
      );
      return;
    }
    if (resource.state == ResourceState.idle) {
      final upcoming = _nextBookingFromTimeline(resource);
      if (upcoming != null) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => BookingDetailScreen(booking: upcoming),
          ),
        );
        return;
      }
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) =>
              CreateBookingScreen(initialResourceId: resource.resourceId),
        ),
      );
      return;
    }
    if (resource.state == ResourceState.off) {
      _activateResource(context, resource);
    }
  }

  Booking? _nextBookingFromTimeline(ResourceStatus resource) {
    if (resource.todayTimeline.isEmpty) return null;
    final now = DateTime.now();
    final upcoming = resource.todayTimeline.where((b) {
      final start = DateTime.tryParse(b.startTime);
      return start != null && !start.isBefore(now);
    }).toList();
    final candidates = upcoming.isNotEmpty ? upcoming : resource.todayTimeline;
    if (candidates.isEmpty) return null;
    final first = candidates.first;
    final start = DateTime.tryParse(first.startTime);
    return Booking(
      id: first.id,
      code: first.code.isNotEmpty
          ? first.code
          : (first.id.length > 8
                ? first.id.substring(0, 8).toUpperCase()
                : first.id),
      customer: first.customerName,
      resource: resource.name,
      time: first.startTime.isNotEmpty && first.endTime.isNotEmpty
          ? _timeLabel(first.startTime, first.endTime)
          : (first.startTime.isNotEmpty ? first.startTime : '-'),
      status: bookingStatusFrom(
        first.status,
        paymentStatus: first.paymentStatus,
      ),
      total: 0,
      paid: 0,
      startAt: start,
    );
  }

  String _timeLabel(String startIso, String endIso) {
    if (startIso.isEmpty || startIso.length < 16) return '-';
    final hhmm = startIso.substring(11, 16);
    final start = DateTime.tryParse(startIso);
    final end = DateTime.tryParse(endIso);
    if (start == null || end == null) return hhmm;
    final mins = end.difference(start).inMinutes;
    if (mins <= 0) return hhmm;
    final h = mins ~/ 60;
    final m = mins % 60;
    final dur = m == 0 ? '$h jam' : (h == 0 ? '$m mnt' : '${h}j ${m}m');
    return '$hhmm · $dur';
  }

  Future<void> _activateResource(
    BuildContext context,
    ResourceStatus resource,
  ) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Aktifkan resource?'),
        content: Text('${resource.name} akan diaktifkan kembali.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogCtx, true),
            child: const Text('Aktifkan'),
          ),
        ],
      ),
    );
    if (yes != true || !context.mounted) return;
    final ok = await context.read<OpsController>().setActive(
      resource.resourceId,
    );
    if (!context.mounted) return;
    if (ok) {
      BkToast.success(context, '${resource.name} diaktifkan');
    } else {
      BkToast.error(
        context,
        context.read<OpsController>().actionError ?? 'Gagal mengaktifkan',
      );
    }
  }
}

class _LaneTabs extends StatelessWidget {
  final TabController controller;
  final ({
    List<ResourceStatus> prioritas,
    List<ResourceStatus> live,
    List<ResourceStatus> siap,
    List<ResourceStatus> lainnya,
  })
  lanes;
  final void Function(ResourceStatus) onOpen;
  final Future<void> Function() refresh;

  const _LaneTabs({
    required this.controller,
    required this.lanes,
    required this.onOpen,
    required this.refresh,
  });

  @override
  Widget build(BuildContext context) {
    final tabs =
        <
          ({
            String label,
            List<ResourceStatus> items,
            Color accent,
            String emptyTitle,
            String emptyHint,
            LaneKind kind,
          })
        >[
          (
            label: 'Prioritas',
            items: lanes.prioritas,
            accent: BK.pend,
            emptyTitle: 'Tidak ada prioritas',
            emptyHint: 'Semua resource aman.',
            kind: LaneKind.prioritas,
          ),
          (
            label: 'Live',
            items: lanes.live,
            accent: BK.live,
            emptyTitle: 'Belum ada sesi aktif',
            emptyHint: 'Session live akan muncul di sini.',
            kind: LaneKind.live,
          ),
          (
            label: 'Siap',
            items: lanes.siap,
            accent: BK.accent,
            emptyTitle: 'Tidak ada booking dekat',
            emptyHint: 'Booking terjadwal akan muncul otomatis.',
            kind: LaneKind.siap,
          ),
          (
            label: 'Lainnya',
            items: lanes.lainnya,
            accent: BK.ink3,
            emptyTitle: 'Kosong',
            emptyHint: 'Tidak ada item tambahan.',
            kind: LaneKind.lainnya,
          ),
        ];

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: BK.ink,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFF0A1020)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x180D1526),
                blurRadius: 16,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: TabBar(
            controller: controller,
            isScrollable: false,
            indicatorSize: TabBarIndicatorSize.tab,
            labelPadding: EdgeInsets.zero,
            padding: EdgeInsets.zero,
            dividerColor: Colors.transparent,
            indicatorColor: Colors.transparent,
            splashFactory: NoSplash.splashFactory,
            overlayColor: const WidgetStatePropertyAll(Colors.transparent),
            indicator: BoxDecoration(
              color: BK.accent,
              borderRadius: BorderRadius.circular(18),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x22000000),
                  blurRadius: 10,
                  offset: Offset(0, 3),
                ),
              ],
            ),
            labelColor: Colors.white,
            unselectedLabelColor: const Color(0xFFB8C2DA),
            labelStyle: const TextStyle(
              fontSize: 12.8,
              fontWeight: FontWeight.w800,
            ),
            unselectedLabelStyle: const TextStyle(
              fontSize: 12.8,
              fontWeight: FontWeight.w800,
            ),
            tabs: [
              _TabLabel(
                label: 'Prioritas',
                count: lanes.prioritas.length,
                activeColor: BK.pend,
              ),
              _TabLabel(
                label: 'Live',
                count: lanes.live.length,
                activeColor: BK.live,
              ),
              _TabLabel(
                label: 'Siap',
                count: lanes.siap.length,
                activeColor: BK.accent,
              ),
              _TabLabel(
                label: 'Lainnya',
                count: lanes.lainnya.length,
                activeColor: BK.ink3,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: TabBarView(
            controller: controller,
            children: [
              for (final tab in tabs)
                _LanePanel(
                  accent: tab.accent,
                  emptyTitle: tab.emptyTitle,
                  emptyHint: tab.emptyHint,
                  items: tab.items,
                  kind: tab.kind,
                  onOpen: onOpen,
                  refresh: refresh,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TabLabel extends StatelessWidget {
  final String label;
  final int count;
  final Color activeColor;
  const _TabLabel({
    required this.label,
    required this.count,
    required this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    return Tab(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.max,
        children: [
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(letterSpacing: -0.1),
            ),
          ),
          if (count > 0 && label != 'Lainnya') ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: activeColor.withValues(alpha: .18),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: activeColor,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

enum LaneKind { prioritas, live, siap, lainnya }

class _LanePanel extends StatelessWidget {
  final Color accent;
  final String emptyTitle;
  final String emptyHint;
  final List<ResourceStatus> items;
  final LaneKind kind;
  final void Function(ResourceStatus) onOpen;
  final Future<void> Function() refresh;

  const _LanePanel({
    required this.accent,
    required this.emptyTitle,
    required this.emptyHint,
    required this.items,
    required this.kind,
    required this.onOpen,
    required this.refresh,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: refresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          children: [
            const SizedBox(height: 72),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 86,
                    height: 86,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: .10),
                      borderRadius: BorderRadius.circular(26),
                    ),
                    child: Icon(
                      kind == LaneKind.live
                          ? Icons.play_circle_outline_rounded
                          : kind == LaneKind.siap
                          ? Icons.schedule_rounded
                          : kind == LaneKind.prioritas
                          ? Icons.priority_high_rounded
                          : Icons.inbox_outlined,
                      size: 40,
                      color: accent,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    emptyTitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: BK.ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    emptyHint,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: BK.ink3,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        padding: const EdgeInsets.only(bottom: 18),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _OpsLaneCard(
          resource: items[i],
          accent: accent,
          kind: kind,
          onTap: () => onOpen(items[i]),
        ),
      ),
    );
  }
}

class _OpsLaneCard extends StatelessWidget {
  final ResourceStatus resource;
  final Color accent;
  final LaneKind kind;
  final VoidCallback onTap;
  const _OpsLaneCard({
    required this.resource,
    required this.accent,
    required this.kind,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isOff = resource.state == ResourceState.off;
    final hasNext = (resource.nextBookingCustomerName ?? '').isNotEmpty;
    final note = (resource.note ?? '').trim();
    final stateLabel = switch (kind) {
      LaneKind.prioritas => 'PERLU CEK',
      LaneKind.live => 'LIVE',
      LaneKind.siap => 'SIAP',
      LaneKind.lainnya => isOff ? 'OFF' : 'LAINNYA',
    };

    final mainText = switch (kind) {
      LaneKind.prioritas =>
        (resource.liveCustomerName ?? '').isNotEmpty
            ? resource.liveCustomerName!
            : (note.isNotEmpty ? note : 'Butuh tindakan sekarang'),
      LaneKind.live =>
        (resource.liveCustomerName ?? '').isNotEmpty
            ? resource.liveCustomerName!
            : 'Sedang berjalan',
      LaneKind.siap =>
        (resource.nextBookingCustomerName ?? '').isNotEmpty
            ? resource.nextBookingCustomerName!
            : 'Booking berikutnya',
      LaneKind.lainnya =>
        note.isNotEmpty
            ? note
            : (isOff ? 'Resource nonaktif' : 'Belum perlu ditindak'),
    };

    final secondary = switch (kind) {
      LaneKind.prioritas => isOff ? 'Resource off' : 'Butuh perhatian sekarang',
      LaneKind.live =>
        resource.liveRemainingMinutes > 0
            ? 'Sisa ${resource.liveRemainingMinutes} menit'
            : 'Berjalan saat ini',
      LaneKind.siap =>
        hasNext
            ? '${resource.nextBookingTimeLabel ?? ''}${(resource.nextBookingStatus ?? '').isNotEmpty ? ' · ${resource.nextBookingStatus}' : ''}'
            : 'Menunggu jadwal',
      LaneKind.lainnya =>
        resource.bookingsToday > 0
            ? '${resource.bookingsToday} booking hari ini'
            : 'Tidak ada aktivitas berarti',
    };

    final actionLabel = switch (kind) {
      LaneKind.prioritas => isOff ? 'Aktifkan' : 'Buka',
      LaneKind.live => 'Lihat',
      LaneKind.siap => 'Buka',
      LaneKind.lainnya => isOff ? 'Aktifkan' : 'Buka',
    };

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE6EAF2)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A0D1526),
              blurRadius: 16,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(
                    kind == LaneKind.live
                        ? Icons.play_circle_fill_rounded
                        : kind == LaneKind.siap
                        ? Icons.schedule_rounded
                        : isOff
                        ? Icons.power_settings_new_rounded
                        : Icons.radio_button_checked_rounded,
                    color: accent,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        resource.name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: BK.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        mainText,
                        style: const TextStyle(fontSize: 11.6, color: BK.ink2),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    stateLabel,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: accent,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 11),
            if (kind == LaneKind.prioritas && note.isNotEmpty) ...[
              Text(
                note,
                style: const TextStyle(
                  fontSize: 11.6,
                  color: BK.ink3,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 10),
            ],
            Row(
              children: [
                Expanded(
                  child: Text(
                    secondary,
                    style: const TextStyle(
                      fontSize: 11.3,
                      color: BK.ink3,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .10),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    actionLabel,
                    style: TextStyle(
                      fontSize: 11.3,
                      color: accent,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
