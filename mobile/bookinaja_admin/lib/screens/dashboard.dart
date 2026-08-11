import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../ui/toast.dart';
import '../data/sample_data.dart';
import '../models/booking.dart';
import '../state/auth_controller.dart';
import '../state/dashboard_controller.dart';
import 'booking_detail.dart';
import 'bookings.dart';
import 'create_booking.dart';
import 'kasir.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dash = context.watch<DashboardController>();
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () => context.read<DashboardController>().load(),
        child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
        children: [
          // header
          Builder(builder: (context) {
            final auth = context.watch<AuthController>();
            final name = auth.account?.name ?? 'Admin';
            final ws = auth.workspace?.name ?? '';
            return Row(children: [
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
                      Flexible(child: Text('$ws · ${_today()}', overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: BK.ink3))),
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
                  width: 44, height: 44, alignment: Alignment.center,
                  decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(14)),
                  child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'A',
                      style: const TextStyle(color: BK.accent, fontWeight: FontWeight.w800, fontSize: 18)),
                ),
              ),
            ]);
          }),
          const SizedBox(height: 16),

          // hero — perlu perhatian
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [BK.accent, Color(0xFF1C47C9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(BK.radius),
            ),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('PERLU PERHATIAN SEKARANG', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
                const SizedBox(height: 6),
                Text(dash.loading ? '…' : '${dash.needsAction} booking', style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, height: 1)),
                const SizedBox(height: 4),
                Text(dash.error != null
                    ? 'Gagal memuat — tarik untuk refresh'
                    : (dash.needsAction == 0 ? 'Semua beres, tidak ada antrean 🎉' : 'Perlu konfirmasi / verifikasi pembayaran'),
                    style: const TextStyle(color: Colors.white, fontSize: 12.5)),
              ])),
              const SizedBox(width: 12),
              Container(
                width: 46, height: 46, alignment: Alignment.center,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: .18), borderRadius: BorderRadius.circular(14)),
                child: Icon(dash.needsAction == 0 ? Icons.check_rounded : Icons.notifications_active_outlined, color: Colors.white, size: 24),
              ),
            ]),
          ),
          const SizedBox(height: 11),

          // stats
          Row(children: [
            Expanded(child: _Stat('Omzet', dash.loading ? '…' : 'Rp${_shortMoney(dash.omzet)}', Icons.payments_outlined, BK.live)),
            const SizedBox(width: 9),
            Expanded(child: _Stat('Booking', dash.loading ? '…' : '${dash.bookingsToday}', Icons.event_note_outlined, BK.accent)),
            const SizedBox(width: 9),
            Expanded(child: _Stat('Sesi aktif', dash.loading ? '…' : '${dash.activeCount}', Icons.sensors, BK.pend)),
          ]),
          const SizedBox(height: 16),

          const Text('AKSI CEPAT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(height: 9),
          Row(children: [
            _QA(Icons.add, 'Booking', BK.accent, onTap: () => _go(context, const CreateBookingScreen())),
            const SizedBox(width: 9),
            _QA(Icons.shopping_cart_outlined, 'Kasir', BK.live, onTap: () => _go(context, const KasirScreen())),
            const SizedBox(width: 9),
            _QA(Icons.payments_outlined, 'Biaya', BK.pend, onTap: () => _soon(context, 'Biaya')),
            const SizedBox(width: 9),
            _QA(Icons.bar_chart, 'Laporan', const Color(0xFF6366F1), onTap: () => _soon(context, 'Laporan')),
          ]),
          const SizedBox(height: 18),

          Row(children: [
            const Text('Sesi berjalan', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
            const SizedBox(width: 9),
            Text('${dash.live.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.live)),
            const SizedBox(width: 9),
            const Expanded(child: Divider(color: BK.line)),
          ]),
          const SizedBox(height: 4),
          if (dash.loading)
            const BKCard(padding: EdgeInsets.all(20), child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))))
          else if (dash.live.isEmpty)
            const BKCard(child: Text('Belum ada sesi berjalan.', style: TextStyle(fontSize: 12.5, color: BK.ink3)))
          else
            BKCard(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Column(
                children: [
                  for (int i = 0; i < dash.live.length; i++) ...[
                    _LiveRow(dash.live[i]),
                    if (i < dash.live.length - 1) const Divider(height: 1, color: BK.line),
                  ],
                ],
              ),
            ),

          // Berikutnya — beberapa booking yang akan datang (soonest first)
          if (!dash.loading && dash.upcoming.isNotEmpty) ...[
            const SizedBox(height: 18),
            Row(children: [
              const Text('Berikutnya', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
              const SizedBox(width: 9),
              Text('${dash.upcoming.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.accent)),
              const SizedBox(width: 9),
              const Expanded(child: Divider(color: BK.line)),
            ]),
            const SizedBox(height: 4),
            BKCard(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Column(children: [
                for (int i = 0; i < dash.upcoming.length; i++) ...[
                  _UpcomingRow(dash.upcoming[i]),
                  if (i < dash.upcoming.length - 1) const Divider(height: 1, color: BK.line),
                ],
              ]),
            ),
          ],
        ],
      ),
      ),
    );
  }
}

/// Format angka jadi kompak: 1.240.000 → "1,24jt".
String _shortMoney(int v) {
  if (v >= 1000000) {
    final jt = v / 1000000;
    return '${jt.toStringAsFixed(jt >= 10 ? 0 : 2).replaceAll('.', ',')}jt';
  }
  if (v >= 1000) return '${(v / 1000).round()}rb';
  return '$v';
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

class _Stat extends StatelessWidget {
  final String k, v;
  final IconData icon;
  final Color color;
  const _Stat(this.k, this.v, this.icon, this.color);
  @override
  Widget build(BuildContext context) {
    return BKCard(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 28, height: 28, alignment: Alignment.center,
          decoration: BoxDecoration(color: color.withValues(alpha: .12), borderRadius: BorderRadius.circular(9)),
          child: Icon(icon, size: 15, color: color),
        ),
        const SizedBox(height: 9),
        Text(v, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
        const SizedBox(height: 1),
        Text(k, style: const TextStyle(fontSize: 11, color: BK.ink3, fontWeight: FontWeight.w600)),
      ]),
    );
  }
}

void _go(BuildContext c, Widget page) => Navigator.of(c).push(MaterialPageRoute(builder: (_) => page));
void _soon(BuildContext c, String m) => BkToast.info(c, m, subtitle: 'Fitur ini segera hadir.');

class _QA extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;
  const _QA(this.icon, this.label, this.color, {this.onTap});
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
              width: 38, height: 38, alignment: Alignment.center,
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

class _UpcomingRow extends StatelessWidget {
  final Booking b;
  const _UpcomingRow(this.b);

  // "14:00" kalau hari ini, "Sel 11 · 14:00" kalau lain hari.
  String _when() {
    final d = b.startAt;
    if (d == null) return '';
    final hm = '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    final now = DateTime.now();
    if (d.year == now.year && d.month == now.month && d.day == now.day) return hm;
    const dow = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    return '${dow[d.weekday - 1]} ${d.day} · $hm';
  }

  String _rel() {
    final d = b.startAt;
    if (d == null) return '';
    final mins = d.difference(DateTime.now()).inMinutes;
    if (mins < 60) return 'dalam ${mins < 1 ? 1 : mins}m';
    if (mins < 24 * 60) return 'dalam ${mins ~/ 60}j';
    return 'dalam ${mins ~/ (24 * 60)} hari';
  }

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
            width: 38, height: 38, alignment: Alignment.center,
            decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(11)),
            child: Text(b.resource.trim().isNotEmpty ? b.resource.trim()[0].toUpperCase() : '?',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.accent)),
          ),
          const SizedBox(width: 11),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${b.resource} · ${b.customer}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
            const SizedBox(height: 1),
            Text('${_when()} · ${_rel()}', style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ])),
          const SizedBox(width: 6),
          statusPill(b.status),
        ]),
      ),
    );
  }
}

class _LiveRow extends StatelessWidget {
  final LiveSession s;
  const _LiveRow(this.s);

  Future<void> _open(BuildContext context) async {
    if (s.id.isEmpty) return;
    final b = Booking(
      id: s.id, code: s.code, customer: s.customer, resource: s.resource,
      time: '', status: BookingStatus.live, total: 0, paid: 0,
    );
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: b)));
    if (context.mounted) context.read<DashboardController>().load();
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(11),
      onTap: () => _open(context),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 11),
        child: Row(children: [
        Container(
          width: 38, height: 38, alignment: Alignment.center,
          decoration: BoxDecoration(color: BK.liveSoft, borderRadius: BorderRadius.circular(11)),
          child: Text(s.resource.trim().isNotEmpty ? s.resource.trim()[0].toUpperCase() : '?',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.live)),
        ),
        const SizedBox(width: 11),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${s.resource} · ${s.customer}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
          const SizedBox(height: 1),
          Text(s.remaining, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
        ])),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(s.endsAt, style: const TextStyle(color: BK.live, fontWeight: FontWeight.w800, fontSize: 14)),
          const Text('selesai', style: TextStyle(color: BK.ink3, fontSize: 10)),
        ]),
        const SizedBox(width: 4),
        const Icon(Icons.chevron_right, size: 18, color: BK.ink3),
        ]),
      ),
    );
  }
}
