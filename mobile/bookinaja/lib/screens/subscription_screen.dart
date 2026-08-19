import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/subscription.dart';
import '../models/subscription_view.dart';
import '../repositories/billing_repository.dart';
import '../state/auth_controller.dart';
import '../theme.dart';
import '../widgets/plan_cards.dart';
import '../widgets/subscription_actions.dart';

/// Layar "Kelola langganan" (dari hero Setelan). Tenang & informatif: status
/// paket aktif + hitung mundur, lalu pilih paket berbayar. Berbagi [PlanCards]
/// dengan paywall.
class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  BillingInterval _interval = BillingInterval.monthly;
  SubscriptionInfo? _sub;
  bool _loading = true;
  String? _busyPlan;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final sub = await context.read<BillingRepository>().getSubscription();
      if (mounted) setState(() => _sub = sub);
    } catch (_) {
      // Biarkan _sub null → fallback ke status dari AuthController.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _select(String planKey) async {
    setState(() => _busyPlan = planKey);
    await runSubscriptionCheckout(context, planKey: planKey, interval: _interval);
    if (mounted) {
      setState(() => _busyPlan = null);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Langganan',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: RefreshIndicator(
        color: BK.accent,
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SubscriptionStatusCard(sub: _sub, auth: auth, loading: _loading),
            const SizedBox(height: 18),
            if (!auth.isOwner)
              const _StaffNote()
            else ...[
              const Text('Pilih paket',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
              const SizedBox(height: 10),
              IntervalToggle(value: _interval, onChanged: (v) => setState(() => _interval = v)),
              const SizedBox(height: 12),
              PlanCards(interval: _interval, onSelect: _select, busyPlan: _busyPlan),
              ScaleConsultRow(onTap: () => openScaleConsult(context)),
            ],
          ],
        ),
      ),
    );
  }
}

class _StaffNote extends StatelessWidget {
  const _StaffNote();
  @override
  Widget build(BuildContext context) {
    return BKCard(
      color: BK.accentSoft,
      border: BK.accentSoft,
      child: Row(children: const [
        Icon(Icons.info_outline, color: BK.accent, size: 20),
        SizedBox(width: 10),
        Expanded(
          child: Text('Hanya owner workspace yang bisa mengubah langganan. Minta owner untuk mengaktifkan atau upgrade paket.',
              style: TextStyle(fontSize: 12.5, color: BK.ink2, height: 1.35)),
        ),
      ]),
    );
  }
}

/// Kartu status paket aktif — pill status + hitung mundur, dipakai di layar
/// langganan (juga bisa dipakai ulang di tempat lain).
class SubscriptionStatusCard extends StatelessWidget {
  final SubscriptionInfo? sub;
  final AuthController auth;
  final bool loading;
  const SubscriptionStatusCard({super.key, required this.sub, required this.auth, this.loading = false});

  @override
  Widget build(BuildContext context) {
    // Gabungkan data /billing/subscription (lebih otoritatif) dengan bootstrap.
    final status = (sub?.status.isNotEmpty == true ? sub!.status : auth.subscriptionStatus);
    final plan = (sub?.plan.isNotEmpty == true ? sub!.plan : auth.plan);
    final periodEnd = sub?.currentPeriodEnd ?? auth.periodEnd;
    final int? trialLeft = (status.toLowerCase() == 'trial' && periodEnd != null)
        ? (periodEnd.difference(DateTime.now()).inDays).clamp(0, 1 << 30).toInt()
        : auth.trialDaysLeft;

    final v = SubView.of(
      grace: auth.graceActive,
      status: status,
      plan: plan,
      trialDaysLeft: trialLeft,
      periodEnd: periodEnd,
    );

    final Widget pill = switch (v.kind) {
      SubKind.inactive => Pill.crit(v.pill),
      SubKind.trial => Pill.pend(v.pill),
      SubKind.active => Pill.live(v.pill),
      SubKind.unknown => Pill.mut(v.pill),
    };

    return BKCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Expanded(
            child: Text('PAKET AKTIF',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          ),
          if (loading) const BKSkeleton(width: 70, height: 20, radius: 20) else pill,
        ]),
        const SizedBox(height: 8),
        Text(v.headline, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BK.ink)),
        if (v.countdown != null) ...[
          const SizedBox(height: 3),
          Text(v.countdown!, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink2)),
        ],
        const SizedBox(height: 5),
        Text(v.meaning, style: const TextStyle(fontSize: 12.5, color: BK.ink2, height: 1.4)),
      ]),
    );
  }
}
