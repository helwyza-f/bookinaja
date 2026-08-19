import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/subscription.dart';
import '../state/auth_controller.dart';
import '../theme.dart';
import '../widgets/plan_cards.dart';
import '../widgets/subscription_actions.dart';

/// Paywall KONTEKSTUAL berupa bottom sheet — muncul saat menekan aksi terkunci
/// (buat item/booking/kasir) atau dari chip/kartu langganan. Header & nada ikut
/// fase grace. Bisa ditutup (transaksi di fase lock sudah diblokir backend;
/// paywall hanya penjelas + jalan upgrade). Berbagi [PlanCards] dengan
/// [SubscriptionScreen].
class PaywallScreen extends StatefulWidget {
  const PaywallScreen({super.key});

  /// Buka paywall sebagai bottom sheet modal di atas layar sekarang.
  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.45),
      builder: (_) => const PaywallScreen(),
    );
  }

  @override
  State<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends State<PaywallScreen> {
  BillingInterval _interval = BillingInterval.monthly;
  String? _busyPlan;

  Future<void> _select(String planKey) async {
    setState(() => _busyPlan = planKey);
    final paid = await runSubscriptionCheckout(context, planKey: planKey, interval: _interval);
    if (!mounted) return;
    setState(() => _busyPlan = null);
    // Kalau langganan sudah aktif kembali, tutup paywall.
    if (paid && !context.read<AuthController>().graceActive) {
      if (mounted) Navigator.of(context).maybePop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final phase = auth.gracePhase;
    final locked = phase >= 3;
    final daysToLock = (auth.graceLockDay - auth.graceDays).clamp(0, 9999);

    // Nada ikut fase: soft=amber, friksi/lock=merah.
    final Color accent = phase >= 2 ? BK.crit : BK.pend;
    final Color soft = phase >= 2 ? BK.critSoft : BK.pendSoft;
    final IconData icon = locked ? Icons.lock_outline : Icons.workspace_premium_outlined;

    final String title = locked
        ? 'Operasi terkunci'
        : phase >= 2
            ? 'Fitur mulai dibatasi'
            : 'Buka lagi semua fitur';

    final String message = locked
        ? 'Langganan sudah lama tidak aktif, jadi transaksi & booking baru dikunci. Upgrade untuk melanjutkan operasi.'
        : phase >= 2
            ? (daysToLock > 0
                ? 'Export laporan, nota WhatsApp, dan analitik dinonaktifkan. Transaksi masih jalan $daysToLock hari lagi sebelum operasi dikunci.'
                : 'Export laporan, nota WhatsApp, dan analitik dinonaktifkan. Operasi akan segera dikunci.')
            : 'Langgananmu berakhir. Aktifkan lagi untuk menambah unit, promo, dan item baru — plus buka gateway pembayaran otomatis.';

    // Tinggi sheet DIKUNCI ke porsi layar tetap agar tidak "naik-turun" saat
    // toggle Bulanan↔Tahunan (kartu tahunan menambah baris). Konten cukup
    // reflow di dalam area scroll yang sama.
    final sheetHeight = MediaQuery.of(context).size.height * 0.8;

    return Container(
      height: sheetHeight,
      decoration: const BoxDecoration(
        color: BK.bg,
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            // Grab handle.
            Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4)),
            ),
            // Header: ikon fase + judul + tombol tutup.
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 6, 10, 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(color: soft, borderRadius: BorderRadius.circular(13)),
                    child: Icon(icon, color: accent, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Text(title,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink, height: 1.2)),
                    ),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.close, color: BK.ink3, size: 22),
                    onPressed: () => Navigator.of(context).maybePop(),
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(18, 4, 18, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(message, style: const TextStyle(fontSize: 13.5, color: BK.ink2, height: 1.5)),
                    const SizedBox(height: 18),
                    if (!auth.isOwner)
                      _StaffPaywallNote(accent: accent)
                    else ...[
                      IntervalToggle(value: _interval, onChanged: (v) => setState(() => _interval = v)),
                      const SizedBox(height: 14),
                      PlanCards(
                        interval: _interval,
                        onSelect: _select,
                        busyPlan: _busyPlan,
                        selectCtaPrefix: locked ? 'Upgrade' : 'Pilih',
                      ),
                      const SizedBox(height: 6),
                      Center(
                        child: Text(
                          'Data & booking-mu tetap aman.',
                          style: TextStyle(fontSize: 11.5, color: BK.ink3),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StaffPaywallNote extends StatelessWidget {
  final Color accent;
  const _StaffPaywallNote({required this.accent});
  @override
  Widget build(BuildContext context) {
    return BKCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.info_outline, color: accent, size: 20),
          const SizedBox(width: 10),
          const Expanded(
            child: Text('Hanya owner yang bisa mengaktifkan langganan.',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
          ),
        ]),
        const SizedBox(height: 8),
        const Text('Sampaikan ke owner workspace untuk upgrade paket agar fitur kembali normal.',
            style: TextStyle(fontSize: 12.5, color: BK.ink2, height: 1.4)),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: BK.ink,
              backgroundColor: BK.card2,
              side: const BorderSide(color: BK.line),
              padding: const EdgeInsets.symmetric(vertical: 11),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.of(context).maybePop(),
            child: const Text('Mengerti', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      ]),
    );
  }
}
