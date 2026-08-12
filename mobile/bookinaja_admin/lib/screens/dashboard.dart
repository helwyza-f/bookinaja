import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/booking.dart';
import '../state/auth_controller.dart';
import '../state/dashboard_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';
import 'booking_detail.dart';
import 'create_booking.dart';
import 'kasir.dart';
import 'operations.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dash = context.watch<DashboardController>();
    final focusItems = _focusItems(dash);
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () => context.read<DashboardController>().load(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const _Header(),
            const SizedBox(height: 14),
            _Hero(dash: dash),
            const SizedBox(height: 14),
            const Text('AKSI CEPAT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
            const SizedBox(height: 9),
            Row(
              children: [
                _QuickAction(Icons.add, 'Booking', BK.accent, onTap: () => _go(context, const CreateBookingScreen())),
                const SizedBox(width: 9),
                _QuickAction(Icons.shopping_cart_outlined, 'Kasir', BK.live, onTap: () => _go(context, const KasirScreen())),
                const SizedBox(width: 9),
                _QuickAction(Icons.sensors, 'Ops', BK.pend, onTap: () => _go(context, const OperationsScreen())),
                const SizedBox(width: 9),
                _QuickAction(Icons.bar_chart, 'Laporan', const Color(0xFF6366F1), onTap: () => _soon(context, 'Laporan')),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Text('HARI INI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3, letterSpacing: 1)),
                const SizedBox(width: 9),
                Text('${dash.needsAction + dash.upcoming.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.accent)),
                const SizedBox(width: 9),
                const Expanded(child: Divider(color: BK.line)),
              ],
            ),
            const SizedBox(height: 4),
            if (dash.loading)
              const BKCard(
                padding: EdgeInsets.all(20),
                child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
              )
            else
              BKCard(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Column(
                  children: [
                    if (focusItems.isNotEmpty) ...[
                      for (int i = 0; i < focusItems.length; i++) ...[
                        _FocusRow(focusItems[i]),
                        if (i < focusItems.length - 1) const Divider(height: 1, color: BK.line),
                      ],
                    ] else
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Tidak ada item yang butuh perhatian.', style: TextStyle(fontSize: 12.5, color: BK.ink3)),
                        ),
                      ),
                    if (focusItems.isNotEmpty && dash.upcoming.isNotEmpty) const Divider(height: 1, color: BK.line),
                    if (dash.upcoming.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Text('Agenda', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
                          const SizedBox(width: 8),
                          Text('${dash.upcoming.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.accent)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      for (int i = 0; i < dash.upcoming.length; i++) ...[
                        _UpcomingRow(dash.upcoming[i]),
                        if (i < dash.upcoming.length - 1) const Divider(height: 1, color: BK.line),
                      ],
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  List<Booking> _focusItems(DashboardController dash) {
    final all = <Booking>[...dash.upcoming];
    all.sort((a, b) => a.startAt?.compareTo(b.startAt ?? DateTime.now()) ?? 0);
    return all.take(2).toList();
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final name = auth.account?.name ?? 'Admin';
    final ws = auth.workspace?.name ?? '';
    return Row(
      children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${_greeting()},', style: const TextStyle(fontSize: 12.5, color: BK.ink3, fontWeight: FontWeight.w500)),
            const SizedBox(height: 1),
            Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
            if (ws.isNotEmpty) ...[
              const SizedBox(height: 3),
              Row(children: [
                const Icon(Icons.storefront_outlined, size: 13, color: BK.ink3),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    '$ws Â· ${_today()}',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: BK.ink3),
                  ),
                ),
              ]),
            ],
          ]),
        ),
        const SizedBox(width: 10),
        PopupMenuButton<String>(
          onSelected: (v) {
            if (v == 'logout') context.read<AuthController>().logout();
            if (v == 'switch') context.read<AuthController>().switchWorkspace();
          },
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'switch', child: Text('Ganti workspace')),
            PopupMenuItem(value: 'logout', child: Text('Keluar')),
          ],
          child: Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(14)),
            child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'A', style: const TextStyle(color: BK.accent, fontWeight: FontWeight.w800, fontSize: 18)),
          ),
        ),
      ],
    );
  }
}

class _Hero extends StatelessWidget {
  final DashboardController dash;
  const _Hero({required this.dash});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [BK.accent, Color(0xFF1C47C9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(BK.radius),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('RINGKASAN', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
                const SizedBox(height: 6),
                Text(
                  dash.loading ? 'â€¦' : '${dash.needsAction} perlu aksi',
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800, height: 1.05),
                ),
                const SizedBox(height: 4),
                Text(
                  dash.error != null ? 'Gagal memuat' : (dash.needsAction == 0 ? 'Semua beres' : 'Cek booking masuk'),
                  style: const TextStyle(color: Colors.white, fontSize: 12.5),
                ),
              ]),
            ),
            const SizedBox(width: 12),
            Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: .18), borderRadius: BorderRadius.circular(14)),
              child: Icon(dash.needsAction == 0 ? Icons.check_rounded : Icons.notifications_active_outlined, color: Colors.white, size: 24),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(child: _miniStat('Booking', '${dash.bookingsToday}', 'hari ini')),
            const SizedBox(width: 8),
            Expanded(child: _miniStat('Aktif', '${dash.activeCount}', 'sesi')),
          ],
        ),
      ]),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;
  const _QuickAction(this.icon, this.label, this.color, {this.onTap});
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(15),
        onTap: onTap,
        child: BKCard(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
          child: Column(children: [
            Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: color.withValues(alpha: .12), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, size: 19, color: color),
            ),
            const SizedBox(height: 7),
            Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: BK.ink2)),
          ]),
        ),
      ),
    );
  }
}

class _FocusRow extends StatelessWidget {
  final Booking b;
  const _FocusRow(this.b);
  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(11),
      onTap: () async {
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: b)));
        if (context.mounted) context.read<DashboardController>().load();
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 11),
        child: Row(children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(11)),
            child: Text(b.resource.trim().isNotEmpty ? b.resource.trim()[0].toUpperCase() : '?', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.accent)),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${b.resource} Â· ${b.customer}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
              const SizedBox(height: 1),
              Text(_when(b.startAt), style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          const SizedBox(width: 6),
          _statusPill(b.status),
        ]),
      ),
    );
  }
}

class _UpcomingRow extends StatelessWidget {
  final Booking b;
  const _UpcomingRow(this.b);
  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(11),
      onTap: () async {
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: b)));
        if (context.mounted) context.read<DashboardController>().load();
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 11),
        child: Row(children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(11)),
            child: Text(b.resource.trim().isNotEmpty ? b.resource.trim()[0].toUpperCase() : '?', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.accent)),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${b.resource} Â· ${b.customer}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
              const SizedBox(height: 1),
              Text('${_when(b.startAt)} Â· ${_rel(b.startAt)}', style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          const SizedBox(width: 6),
          _statusPill(b.status),
        ]),
      ),
    );
  }
}

String _greeting() {
  final h = DateTime.now().hour;
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

String _today() {
  final d = DateTime.now();
  const dow = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return '${dow[d.weekday - 1]}, ${d.day} ${mon[d.month - 1]}';
}

String _when(DateTime? d) {
  if (d == null) return '-';
  final hm = '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  final now = DateTime.now();
  if (d.year == now.year && d.month == now.month && d.day == now.day) return hm;
  const dow = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  return '${dow[d.weekday - 1]} ${d.day} Â· $hm';
}

String _rel(DateTime? d) {
  if (d == null) return '';
  final mins = d.difference(DateTime.now()).inMinutes;
  if (mins < 60) return 'dalam ${mins < 1 ? 1 : mins}m';
  if (mins < 24 * 60) return 'dalam ${mins ~/ 60}j';
  return 'dalam ${mins ~/ (24 * 60)} hari';
}

Widget _miniStat(String label, String value, String unit) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: .12), borderRadius: BorderRadius.circular(14)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label.toUpperCase(), style: const TextStyle(fontSize: 9.5, color: Colors.white70, fontWeight: FontWeight.w700, letterSpacing: .6)),
      const SizedBox(height: 3),
      Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white, height: 1)),
        const SizedBox(width: 4),
        Padding(
          padding: const EdgeInsets.only(bottom: 1),
          child: Text(unit, style: const TextStyle(fontSize: 10.5, color: Colors.white70, fontWeight: FontWeight.w600)),
        ),
      ]),
    ]),
  );
}

Widget _statusPill(BookingStatus status) {
  final (label, fg, bg) = switch (status) {
    BookingStatus.live => ('Live', BK.live, BK.liveSoft),
    BookingStatus.review => ('Review', BK.pend, BK.pendSoft),
    BookingStatus.dp => ('DP', BK.accent, BK.accentSoft),
    BookingStatus.paid => ('Lunas', BK.live, BK.liveSoft),
    BookingStatus.cancelled => ('Batal', BK.crit, BK.critSoft),
    BookingStatus.pending => ('Pending', BK.ink3, BK.card2),
  };
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
    child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: fg, letterSpacing: .3)),
  );
}

void _go(BuildContext c, Widget page) => Navigator.of(c).push(MaterialPageRoute(builder: (_) => page));
void _soon(BuildContext c, String m) => BkToast.info(c, m, subtitle: 'Fitur ini segera hadir.');
