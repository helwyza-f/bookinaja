import 'package:flutter/material.dart';

/// Bookinaja design tokens — sinyal, bukan dekorasi.
class BK {
  static const accent = Color(0xFF2F6BFF);
  static const accentSoft = Color(0xFFE7EFFF);
  static const live = Color(0xFF12B76A);
  static const liveSoft = Color(0xFFE2F6EC);
  static const pend = Color(0xFFF5A524);
  static const pendSoft = Color(0xFFFDF1DC);
  static const crit = Color(0xFFF04438);
  static const critSoft = Color(0xFFFDE5E3);

  static const bg = Color(0xFFEEF1F6);
  static const card = Color(0xFFFFFFFF);
  static const card2 = Color(0xFFF3F5F9);
  static const line = Color(0xFFE2E6EE);
  static const ink = Color(0xFF0D1526);
  static const ink2 = Color(0xFF475069);
  static const ink3 = Color(0xFF8A93A8);

  static const radius = 18.0;

  static ThemeData theme() {
    final base = ThemeData(useMaterial3: true, brightness: Brightness.light);
    return base.copyWith(
      scaffoldBackgroundColor: bg,
      colorScheme: base.colorScheme.copyWith(
        primary: accent,
        surface: card,
        error: crit,
      ),
      textTheme: base.textTheme.apply(
        bodyColor: ink,
        displayColor: ink,
        fontFamily: 'Roboto',
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: accentSoft,
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

/// Format angka jadi "1.234.000".
String rupiah(int v) {
  final s = v.abs().toString();
  final buf = StringBuffer(v < 0 ? '-' : '');
  for (int i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
    buf.write(s[i]);
  }
  return buf.toString();
}

/// Status pill kecil — bentuk + warna (aman untuk aksesibilitas).
class Pill extends StatelessWidget {
  final String label;
  final Color fg;
  final Color bg;
  final bool live;
  const Pill(this.label, {super.key, required this.fg, required this.bg, this.live = false});

  factory Pill.live(String l) => Pill(l, fg: BK.live, bg: BK.liveSoft, live: true);
  factory Pill.pend(String l) => Pill(l, fg: BK.pend, bg: BK.pendSoft);
  factory Pill.crit(String l) => Pill(l, fg: BK.crit, bg: BK.critSoft);
  factory Pill.acc(String l) => Pill(l, fg: BK.accent, bg: BK.accentSoft);
  factory Pill.mut(String l) => Pill(l, fg: BK.ink3, bg: BK.card2);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (live) ...[
          Container(width: 7, height: 7, decoration: BoxDecoration(color: fg, shape: BoxShape.circle)),
          const SizedBox(width: 5),
        ],
        Text(label, style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

/// Kartu standar.
class BKCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final Color? color;
  final Color? border;
  const BKCard({super.key, required this.child, this.padding = const EdgeInsets.all(14), this.color, this.border});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? BK.card,
        borderRadius: BorderRadius.circular(BK.radius),
        border: Border.all(color: border ?? BK.line),
      ),
      child: child,
    );
  }
}

/// Status kosong / error / loading yang seragam & branded.
class StateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? hint;
  final Color color;
  final Widget? action;
  const StateView({
    super.key,
    required this.icon,
    required this.title,
    this.hint,
    this.color = BK.accent,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(color: color.withValues(alpha: .12), borderRadius: BorderRadius.circular(16)),
            child: Icon(icon, color: color),
          ),
          const SizedBox(height: 14),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
          if (hint != null) ...[
            const SizedBox(height: 6),
            Text(hint!, textAlign: TextAlign.center, style: const TextStyle(color: BK.ink3, fontSize: 13)),
          ],
          if (action != null) ...[const SizedBox(height: 16), action!],
        ]),
      ),
    );
  }
}

/// Skeleton list saat loading.
class LoadingList extends StatelessWidget {
  final int count;
  const LoadingList({super.key, this.count = 5});
  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: count,
      separatorBuilder: (_, i) => const SizedBox(height: 10),
      itemBuilder: (_, i) => Container(
        height: 68,
        decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(BK.radius), border: Border.all(color: BK.line)),
        child: const Padding(
          padding: EdgeInsets.all(12),
          child: Row(children: [
            _Shimmer(w: 44, h: 44, r: 12),
            SizedBox(width: 11),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
              _Shimmer(w: 140, h: 12, r: 6), SizedBox(height: 8), _Shimmer(w: 90, h: 10, r: 6),
            ])),
          ]),
        ),
      ),
    );
  }
}

class _Shimmer extends StatelessWidget {
  final double w, h, r;
  const _Shimmer({required this.w, required this.h, required this.r});
  @override
  Widget build(BuildContext context) =>
      Container(width: w, height: h, decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(r)));
}
