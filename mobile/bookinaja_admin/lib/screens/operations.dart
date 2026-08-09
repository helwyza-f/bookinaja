import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/resource_status.dart';
import '../models/booking.dart';
import '../state/ops_controller.dart';
import 'booking_detail.dart';
import 'create_booking.dart';

class OperationsScreen extends StatefulWidget {
  const OperationsScreen({super.key});
  @override
  State<OperationsScreen> createState() => _OperationsScreenState();
}

class _OperationsScreenState extends State<OperationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<OpsController>().load());
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<OpsController>();
    return SafeArea(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
          child: Row(children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
              Text('NERVE CENTER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
              SizedBox(height: 2),
              Text('Operasi', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
            ]),
            const Spacer(),
            if (ctrl.state.hasData) Pill.live('${ctrl.liveCount} live'),
          ]),
        ),
        Expanded(
          child: ctrl.state.when(
            loading: () => const LoadingList(),
            error: (e) => StateView(
              icon: Icons.wifi_off_rounded, color: BK.crit, title: 'Gagal memuat', hint: '$e',
              action: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: BK.accent),
                onPressed: ctrl.load, child: const Text('Coba lagi')),
            ),
            data: (list) => RefreshIndicator(
              onRefresh: ctrl.load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                children: [
                  Row(children: [
                    Expanded(child: _stat('Dipakai', '${ctrl.liveCount}', BK.live)),
                    const SizedBox(width: 10),
                    Expanded(child: _stat('Total resource', '${ctrl.total}', BK.accent)),
                  ]),
                  const SizedBox(height: 14),
                  const Text('Status resource', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
                  const SizedBox(height: 8),
                  if (list.isEmpty)
                    BKCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
                      Text('Tidak ada resource dimuat.', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink)),
                      SizedBox(height: 4),
                      Text('Endpoint /resources-all balik kosong untuk workspace ini, atau konteks tenant belum ke-set. Tarik untuk refresh.', style: TextStyle(fontSize: 12, color: BK.ink3)),
                    ]))
                  else
                    for (final r in list) Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _ResourceCard(r),
                    ),
                ],
              ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _stat(String k, String v, Color c) => BKCard(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(k, style: const TextStyle(fontSize: 11.5, color: BK.ink3, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(v, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: c)),
        ]),
      );
}

class _ResourceCard extends StatelessWidget {
  final ResourceStatus r;
  const _ResourceCard(this.r);

  @override
  Widget build(BuildContext context) {
    final (pill, actionLabel, actionColor) = switch (r.state) {
      ResourceState.live => (Pill.live('Live'), 'Kelola', BK.card2),
      ResourceState.idle => (Pill.mut('Idle'), 'Mulai', BK.accent),
      ResourceState.off => (Pill.crit('Off'), 'Aktifkan', BK.card2),
    };
    final primary = r.state == ResourceState.idle;
    return BKCard(
      child: Row(children: [
        pill,
        const SizedBox(width: 11),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(r.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
            if (r.note != null) Text(r.note!, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ]),
        ),
        primary
            ? FilledButton(
                style: FilledButton.styleFrom(backgroundColor: actionColor, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8)),
                onPressed: () => _onAction(context, r),
                child: Text(actionLabel, style: const TextStyle(fontSize: 13)))
            : OutlinedButton(
                style: OutlinedButton.styleFrom(foregroundColor: BK.ink, backgroundColor: actionColor, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8)),
                onPressed: () => _onAction(context, r),
                child: Text(actionLabel, style: const TextStyle(fontSize: 13))),
      ]),
    );
  }

  void _onAction(BuildContext context, ResourceStatus r) async {
    switch (r.state) {
      case ResourceState.live:
        // Kelola → buka detail sesi aktif.
        if (r.bookingId.isEmpty) return;
        final b = Booking(id: r.bookingId, code: r.bookingId.length > 8 ? r.bookingId.substring(0, 8).toUpperCase() : r.bookingId,
            customer: '', resource: r.name, time: '', status: BookingStatus.live, total: 0, paid: 0);
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: b)));
        if (context.mounted) context.read<OpsController>().load();
      case ResourceState.idle:
        // Mulai → buat booking dengan resource ini sudah terpilih.
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => CreateBookingScreen(initialResourceId: r.resourceId)));
        if (context.mounted) context.read<OpsController>().load();
      case ResourceState.off:
        // Aktifkan → konfirmasi lalu set active.
        final yes = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Aktifkan resource?'),
            content: Text('${r.name} akan diaktifkan kembali (dari nonaktif/maintenance).'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Aktifkan')),
            ],
          ),
        );
        if (yes == true && context.mounted) {
          final ctrl = context.read<OpsController>();
          final ok = await ctrl.setActive(r.resourceId);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(ok ? '${r.name} diaktifkan' : (ctrl.actionError ?? 'Gagal mengaktifkan')),
              behavior: SnackBarBehavior.floating, backgroundColor: ok ? BK.live : BK.crit,
            ));
          }
        }
    }
  }
}
