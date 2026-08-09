import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/resource_status.dart';
import '../state/ops_controller.dart';

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
                onPressed: () => _snack(context, '${r.name}: $actionLabel'),
                child: Text(actionLabel, style: const TextStyle(fontSize: 13)))
            : OutlinedButton(
                style: OutlinedButton.styleFrom(foregroundColor: BK.ink, backgroundColor: actionColor, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8)),
                onPressed: () => _snack(context, '${r.name}: $actionLabel'),
                child: Text(actionLabel, style: const TextStyle(fontSize: 13))),
      ]),
    );
  }
}

void _snack(BuildContext c, String m) =>
    ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(m), behavior: SnackBarBehavior.floating));
