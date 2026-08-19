import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/subscription_view.dart';
import '../screens/subscription_screen.dart';
import '../state/auth_controller.dart';
import '../theme.dart';

/// Hero langganan di puncak hub "Lainnya" — pintu utama ke [SubscriptionScreen].
/// Semua copy & state dari [SubView] (satu sumber kebenaran). Aktif = kartu
/// putih tenang; trial/non-aktif = hero berwarna (non-aktif merah, sisanya biru).
class LanggananHero extends StatelessWidget {
  const LanggananHero({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final v = auth.subView;

    void open() => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const SubscriptionScreen()));

    if (v.isActive) return _ActiveHero(view: v, onTap: open);

    // Warna kartu naik bertingkat sesuai fase grace (soft→friksi→lock).
    final Color bg = switch (v.tone) {
      SubTone.soft => BK.pend, // amber — langganan berakhir, fitur masih penuh
      SubTone.friction => const Color(0xFFEA6D24), // orange — kenyamanan dicabut
      SubTone.locked => BK.crit, // merah — operasi dikunci
      _ => BK.accent, // trial/unknown — biru netral
    };
    final IconData chipIcon = switch (v.tone) {
      SubTone.soft => Icons.lock_clock_outlined,
      SubTone.friction => Icons.warning_amber_rounded,
      SubTone.locked => Icons.lock_outline,
      _ => Icons.access_time,
    };

    return GestureDetector(
      onTap: open,
      child: Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(
              child: Text('LANGGANAN',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: Colors.white70)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(chipIcon, size: 12, color: Colors.white),
                const SizedBox(width: 4),
                Text(v.pill, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
              ]),
            ),
          ]),
          const SizedBox(height: 8),
          Text(v.headline, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
          if (v.countdown != null) ...[
            const SizedBox(height: 2),
            Text(v.countdown!, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white)),
          ],
          const SizedBox(height: 4),
          Text(v.meaning, style: const TextStyle(fontSize: 12.5, color: Colors.white, height: 1.4)),
          const SizedBox(height: 13),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: bg,
                padding: const EdgeInsets.symmetric(vertical: 11),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
              ),
              onPressed: open,
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(v.cta, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(width: 6),
                const Icon(Icons.arrow_forward, size: 16),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}

class _ActiveHero extends StatelessWidget {
  final SubView view;
  final VoidCallback onTap;
  const _ActiveHero({required this.view, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: BKCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(
              child: Text('LANGGANAN',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
            ),
            Pill.live('Aktif'),
          ]),
          const SizedBox(height: 8),
          Text(view.headline, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BK.ink)),
          if (view.countdown != null) ...[
            const SizedBox(height: 3),
            Text(view.countdown!, style: const TextStyle(fontSize: 12.5, color: BK.ink2)),
          ],
          const SizedBox(height: 13),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: BK.ink,
                backgroundColor: BK.card2,
                side: const BorderSide(color: BK.line),
                padding: const EdgeInsets.symmetric(vertical: 11),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
              ),
              onPressed: onTap,
              child: Text(view.cta, style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ]),
      ),
    );
  }
}
