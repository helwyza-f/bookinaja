import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/sample_data.dart';
import '../models/booking.dart';
import '../models/report.dart';
import '../repositories/reports_repository.dart';
import '../state/async_value.dart';
import '../state/auth_controller.dart';
import '../state/dashboard_controller.dart';
import '../state/reports_controller.dart';
import '../theme.dart';
import 'booking_detail.dart';
import 'create_booking.dart';
import 'kasir.dart';
import 'kasir_open_orders.dart';
import 'reports_screen.dart';
import 'expenses_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dash = context.watch<DashboardController>();
    final auth = context.watch<AuthController>();
    // Mode kasir-saja: dashboard fokus omzet/transaksi kasir, tanpa booking.
    if (!auth.bookingEnabled) return const _KasirDashboard();
    return SafeArea(
      child: RefreshIndicator(
        color: BK.accent,
        onRefresh: () => context.read<DashboardController>().load(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const _Header(),
            const SizedBox(height: 14),
            _Hero(dash: dash),
            const SizedBox(height: 16),
            const _SectionLabel('AKSI CEPAT'),
            const SizedBox(height: 9),
            Row(
              children: [
                // Booking disembunyikan saat mode kasir-saja (pos_only).
                if (auth.bookingEnabled) ...[
                  _QuickAction(Icons.add, 'Booking', BK.accent, onTap: () => _go(context, const CreateBookingScreen())),
                  const SizedBox(width: 9),
                ],
                // Kasir selalu tampil sebagai quick action (bukan tab bottom
                // nav) agar letaknya konsisten di semua mode — kecuali saat
                // Kasir A dimatikan (kasirEnabled == false).
                if (auth.kasirEnabled) ...[
                  _QuickAction(Icons.shopping_cart_outlined, 'Kasir', BK.live, onTap: () => _go(context, const KasirScreen())),
                  const SizedBox(width: 9),
                ],
                _QuickAction(Icons.bar_chart, 'Laporan', const Color(0xFF6366F1), onTap: () => _go(context, const ReportsScreen())),
                const SizedBox(width: 9),
                _QuickAction(Icons.payments_outlined, 'Biaya', BK.crit, onTap: () => _go(context, const ExpensesScreen())),
              ],
            ),
            const SizedBox(height: 18),
            if (dash.error != null && !dash.loading)
              _ErrorCard(onRetry: () => context.read<DashboardController>().load())
            else ...[
              if (dash.loading) ...[
                const _SectionLabel('BERIKUTNYA'),
                const SizedBox(height: 9),
                const _ListSkeleton(),
              ] else ...[
                if (dash.live.isNotEmpty) ...[
                  _SectionLabel('SESI AKTIF', count: dash.live.length, countColor: BK.live),
                  const SizedBox(height: 9),
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
                  const SizedBox(height: 18),
                ],
                _SectionLabel('BERIKUTNYA', count: dash.upcoming.length),
                const SizedBox(height: 9),
                if (dash.upcoming.isEmpty)
                  const _EmptyCard('Belum ada agenda berikutnya', 'Booking mendatang akan tampil di sini.')
                else
                  BKCard(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Column(
                      children: [
                        for (int i = 0; i < dash.upcoming.length; i++) ...[
                          _UpcomingRow(dash.upcoming[i]),
                          if (i < dash.upcoming.length - 1) const Divider(height: 1, color: BK.line),
                        ],
                      ],
                    ),
                  ),
              ],
            ],
          ],
        ),
      ),
    );
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
                    '$ws · ${_today()}',
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
    final loading = dash.loading;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [BK.accent, Color(0xFF1C47C9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(BK.radius),
        boxShadow: const [BoxShadow(color: Color(0x332F6BFF), blurRadius: 18, offset: Offset(0, 8))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('RINGKASAN', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
                const SizedBox(height: 8),
                if (loading)
                  const _Pulse(child: _SkelBox(width: 150, height: 26, color: Colors.white24))
                else
                  Text(
                    '${dash.needsAction} perlu aksi',
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800, height: 1.05),
                  ),
                const SizedBox(height: 5),
                if (loading)
                  const _Pulse(child: _SkelBox(width: 90, height: 12, color: Colors.white24))
                else
                  Text(
                    dash.needsAction == 0 ? 'Semua beres 🎉' : 'Cek booking masuk',
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
              child: Icon(!loading && dash.needsAction == 0 ? Icons.check_rounded : Icons.notifications_active_outlined, color: Colors.white, size: 24),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(child: _miniStat('Booking', loading ? null : '${dash.bookingsToday}', 'hari ini')),
            const SizedBox(width: 8),
            Expanded(child: _miniStat('Aktif', loading ? null : '${dash.activeCount}', 'sesi')),
            const SizedBox(width: 8),
            Expanded(child: _miniStat('Omzet', loading ? null : 'Rp${rupiah(dash.omzet)}', 'hari ini')),
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

class _LiveRow extends StatelessWidget {
  final LiveSession s;
  const _LiveRow(this.s);
  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(11),
      onTap: s.id.isEmpty
          ? null
          : () async {
              final b = Booking(
                id: s.id,
                code: s.code,
                customer: s.customer,
                resource: s.resource,
                time: s.endsAt,
                status: BookingStatus.live,
                total: 0,
                paid: 0,
              );
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
            decoration: BoxDecoration(color: BK.liveSoft, borderRadius: BorderRadius.circular(11)),
            child: const Icon(Icons.play_arrow_rounded, color: BK.live, size: 22),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${s.resource} · ${s.customer}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
              const SizedBox(height: 1),
              Text('${s.remaining} · selesai ${s.endsAt}', style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          const SizedBox(width: 6),
          _statusPill(BookingStatus.live),
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
            decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(11)),
            child: Text(b.resource.trim().isNotEmpty ? b.resource.trim()[0].toUpperCase() : '?', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.accent)),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${b.resource} · ${b.customer}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
              const SizedBox(height: 1),
              Text('${_when(b.startAt)} · ${_rel(b.startAt)}', style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          const SizedBox(width: 6),
          _statusPill(b.status),
        ]),
      ),
    );
  }
}

// ── Bagian kecil yang dipakai ulang ──────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  final int? count;
  final Color countColor;
  const _SectionLabel(this.text, {this.count, this.countColor = BK.accent});
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
      if (count != null && count! > 0) ...[
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
          decoration: BoxDecoration(color: countColor.withValues(alpha: .12), borderRadius: BorderRadius.circular(999)),
          child: Text('$count', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: countColor)),
        ),
      ],
      const SizedBox(width: 10),
      const Expanded(child: Divider(color: BK.line)),
    ]);
  }
}

class _EmptyCard extends StatelessWidget {
  final String title, hint;
  const _EmptyCard(this.title, this.hint);
  @override
  Widget build(BuildContext context) {
    return BKCard(
      child: Row(children: [
        Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(12)),
          child: const Icon(Icons.event_available_outlined, color: BK.ink3, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink)),
            const SizedBox(height: 2),
            Text(hint, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ]),
        ),
      ]),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorCard({required this.onRetry});
  @override
  Widget build(BuildContext context) {
    return BKCard(
      child: Column(children: [
        const Icon(Icons.wifi_off_rounded, color: BK.crit, size: 28),
        const SizedBox(height: 8),
        const Text('Gagal memuat dashboard', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
        const SizedBox(height: 2),
        const Text('Periksa koneksi lalu coba lagi.', style: TextStyle(fontSize: 11.5, color: BK.ink3)),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 12)),
            onPressed: onRetry,
            child: const Text('Coba lagi', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      ]),
    );
  }
}

class _ListSkeleton extends StatelessWidget {
  const _ListSkeleton();
  @override
  Widget build(BuildContext context) {
    return _Pulse(
      child: BKCard(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        child: Column(
          children: [
            for (int i = 0; i < 3; i++) ...[
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 11),
                child: Row(children: [
                  const _SkelBox(width: 38, height: 38, radius: 11),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
                      _SkelBox(width: 160, height: 12),
                      SizedBox(height: 6),
                      _SkelBox(width: 90, height: 10),
                    ]),
                  ),
                  const SizedBox(width: 6),
                  const _SkelBox(width: 46, height: 18, radius: 999),
                ]),
              ),
              if (i < 2) const Divider(height: 1, color: BK.line),
            ],
          ],
        ),
      ),
    );
  }
}

class _SkelBox extends StatelessWidget {
  final double width, height, radius;
  final Color? color;
  const _SkelBox({required this.width, required this.height, this.radius = 7, this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(color: color ?? BK.card2, borderRadius: BorderRadius.circular(radius)),
    );
  }
}

/// Efek denyut halus untuk placeholder loading.
class _Pulse extends StatefulWidget {
  final Widget child;
  const _Pulse({required this.child});
  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);
  late final Animation<double> _a = Tween(begin: .45, end: 1.0).animate(CurvedAnimation(parent: _c, curve: Curves.easeInOut));

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(opacity: _a, child: widget.child);
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
  return '${dow[d.weekday - 1]} ${d.day} · $hm';
}

String _rel(DateTime? d) {
  if (d == null) return '';
  final mins = d.difference(DateTime.now()).inMinutes;
  if (mins < 60) return 'dalam ${mins < 1 ? 1 : mins}m';
  if (mins < 24 * 60) return 'dalam ${mins ~/ 60}j';
  return 'dalam ${mins ~/ (24 * 60)} hari';
}

Widget _miniStat(String label, String? value, String unit) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: .12), borderRadius: BorderRadius.circular(14)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label.toUpperCase(), style: const TextStyle(fontSize: 9.5, color: Colors.white70, fontWeight: FontWeight.w700, letterSpacing: .6)),
      const SizedBox(height: 5),
      if (value == null)
        const _Pulse(child: _SkelBox(width: 40, height: 16, color: Colors.white24))
      else
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.white, height: 1)),
            const SizedBox(width: 4),
            Padding(
              padding: const EdgeInsets.only(bottom: 1),
              child: Text(unit, style: const TextStyle(fontSize: 10, color: Colors.white70, fontWeight: FontWeight.w600)),
            ),
          ]),
        ),
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
    BookingStatus.noShow => ('No-show', BK.ink3, BK.card2),
    BookingStatus.pending => ('Pending', BK.ink3, BK.card2),
  };
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
    child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: fg, letterSpacing: .3)),
  );
}

void _go(BuildContext c, Widget page) => Navigator.of(c).push(MaterialPageRoute(builder: (_) => page));

// ============================================================================
// Dashboard mode kasir-saja (pos_only): fokus omzet/transaksi kasir, tanpa
// apa pun berbau booking. Sumber data = ReportsController (bundle hari ini).
// ============================================================================

class _KasirDashboard extends StatelessWidget {
  const _KasirDashboard();
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => ReportsController(ctx.read<ReportsRepository>()),
      child: const _KasirDashboardView(),
    );
  }
}

class _KasirDashboardView extends StatelessWidget {
  const _KasirDashboardView();
  @override
  Widget build(BuildContext context) {
    final reports = context.watch<ReportsController>();
    final state = reports.stateFor(ReportPeriod.today);
    return SafeArea(
      child: RefreshIndicator(
        color: BK.accent,
        onRefresh: () => reports.refresh(ReportPeriod.today),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const _Header(),
            const SizedBox(height: 14),
            _KasirHero(state: state),
            const SizedBox(height: 16),
            const _SectionLabel('AKSI CEPAT'),
            const SizedBox(height: 9),
            Row(children: [
              _QuickAction(Icons.shopping_cart_outlined, 'Kasir', BK.live, onTap: () => _go(context, const KasirScreen())),
              const SizedBox(width: 9),
              _QuickAction(Icons.receipt_long_outlined, 'Order', BK.accent, onTap: () => _go(context, const KasirOpenOrdersScreen())),
              const SizedBox(width: 9),
              _QuickAction(Icons.bar_chart, 'Laporan', const Color(0xFF6366F1), onTap: () => _go(context, const ReportsScreen())),
              const SizedBox(width: 9),
              _QuickAction(Icons.payments_outlined, 'Biaya', BK.crit, onTap: () => _go(context, const ExpensesScreen())),
            ]),
            const SizedBox(height: 18),
            state.when(
              loading: () => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: const [
                _SectionLabel('TRANSAKSI TERAKHIR'),
                SizedBox(height: 9),
                _ListSkeleton(),
              ]),
              error: (e) => _ErrorCard(onRetry: () => reports.refresh(ReportPeriod.today)),
              data: (b) {
                final txns = b.transactions.where((t) => t.type == 'pos').toList();
                return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  _SectionLabel('TRANSAKSI TERAKHIR', count: txns.length),
                  const SizedBox(height: 9),
                  if (txns.isEmpty)
                    const _EmptyCard('Belum ada transaksi', 'Transaksi kasir hari ini akan tampil di sini.')
                  else
                    BKCard(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Column(children: [
                        for (int i = 0; i < txns.length && i < 8; i++) ...[
                          _KasirTxnRow(txns[i]),
                          if (i < txns.length - 1 && i < 7) const Divider(height: 1, color: BK.line),
                        ],
                      ]),
                    ),
                ]);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _KasirHero extends StatelessWidget {
  final AsyncValue<ReportBundle> state;
  const _KasirHero({required this.state});
  @override
  Widget build(BuildContext context) {
    final b = state.data;
    final loading = state.isLoading;
    final ready = !loading && b != null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [BK.accent, Color(0xFF1C47C9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(BK.radius),
        boxShadow: const [BoxShadow(color: Color(0x332F6BFF), blurRadius: 18, offset: Offset(0, 8))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('OMZET HARI INI', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
              const SizedBox(height: 8),
              if (!ready)
                const _Pulse(child: _SkelBox(width: 150, height: 26, color: Colors.white24))
              else
                Text('Rp${rupiah(b.omzet)}', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800, height: 1.05)),
            ]),
          ),
          const SizedBox(width: 12),
          Container(
            width: 46,
            height: 46,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: .18), borderRadius: BorderRadius.circular(14)),
            child: const Icon(Icons.point_of_sale_rounded, color: Colors.white, size: 24),
          ),
        ]),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: _miniStat('Transaksi', ready ? '${b.transaksi}' : null, 'hari ini')),
          const SizedBox(width: 8),
          Expanded(child: _miniStat('Diterima', ready ? 'Rp${rupiah(b.diterima)}' : null, 'masuk')),
          const SizedBox(width: 8),
          Expanded(child: _miniStat('Piutang', ready ? 'Rp${rupiah(b.piutang)}' : null, 'sisa')),
        ]),
      ]),
    );
  }
}

class _KasirTxnRow extends StatelessWidget {
  final TxnRow txn;
  const _KasirTxnRow(this.txn);
  @override
  Widget build(BuildContext context) {
    final title = txn.ref.isNotEmpty ? txn.ref : (txn.customer.isNotEmpty ? txn.customer : 'Transaksi');
    final sub = [
      if (txn.paymentMethod.isNotEmpty) txn.paymentMethod,
      if (txn.date != null) _clock(txn.date!),
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
            if (sub.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(sub, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ],
          ]),
        ),
        const SizedBox(width: 8),
        Text('Rp${rupiah(txn.total)}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
      ]),
    );
  }

  String _clock(DateTime d) {
    final l = d.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}.${l.minute.toString().padLeft(2, '0')}';
  }
}
