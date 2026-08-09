import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../data/sample_data.dart';
import '../state/auth_controller.dart';
import 'create_booking.dart';
import 'kasir.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
        children: [
          // header
          Builder(builder: (context) {
            final auth = context.watch<AuthController>();
            final name = auth.account?.name ?? 'Admin';
            final ws = (auth.workspace?.name ?? '').toUpperCase();
            final role = (auth.workspace?.role ?? '').toUpperCase();
            return Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text([if (ws.isNotEmpty) ws, if (role.isNotEmpty) role].join(' · '),
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
                  const SizedBox(height: 2),
                  Text('Halo, $name', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
                ]),
              ),
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
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)]),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'A',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
                ),
              ),
            ]);
          }),
          const SizedBox(height: 16),

          // hero
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [BK.accent, Color(0xFF1C47C9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(BK.radius),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
              Text('PERLU PERHATIAN SEKARANG', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
              SizedBox(height: 4),
              Text('3 booking', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
              SizedBox(height: 2),
              Text('2 nunggu konfirmasi · 1 verifikasi transfer', style: TextStyle(color: Colors.white, fontSize: 12.5)),
            ]),
          ),
          const SizedBox(height: 11),

          // stats
          Row(children: const [
            Expanded(child: _Stat('Omzet hari ini', 'Rp1,24jt')),
            SizedBox(width: 10),
            Expanded(child: _Stat('Sesi aktif', '6 / 12')),
          ]),
          const SizedBox(height: 16),

          const Text('AKSI CEPAT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(height: 9),
          Row(children: [
            _QA(Icons.add, 'Booking', onTap: () => _go(context, const CreateBookingScreen())),
            const SizedBox(width: 9),
            _QA(Icons.shopping_cart_outlined, 'Kasir', onTap: () => _go(context, const KasirScreen())),
            const SizedBox(width: 9),
            _QA(Icons.payments_outlined, 'Biaya', onTap: () => _soon(context, 'Biaya')),
            const SizedBox(width: 9),
            _QA(Icons.bar_chart, 'Laporan', onTap: () => _soon(context, 'Laporan')),
          ]),
          const SizedBox(height: 18),

          Row(children: const [
            Text('Sesi berjalan', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
            SizedBox(width: 9),
            Expanded(child: Divider(color: BK.line)),
          ]),
          const SizedBox(height: 4),
          BKCard(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Column(
              children: [
                for (int i = 0; i < sampleLive.length; i++) ...[
                  _LiveRow(sampleLive[i]),
                  if (i < sampleLive.length - 1) const Divider(height: 1, color: BK.line),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String k, v;
  const _Stat(this.k, this.v);
  @override
  Widget build(BuildContext context) {
    return BKCard(
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(fontSize: 11.5, color: BK.ink3, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(v, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BK.ink)),
      ]),
    );
  }
}

void _go(BuildContext c, Widget page) => Navigator.of(c).push(MaterialPageRoute(builder: (_) => page));
void _soon(BuildContext c, String m) =>
    ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text('$m — segera'), behavior: SnackBarBehavior.floating));

class _QA extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  const _QA(this.icon, this.label, {this.onTap});
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
            width: 34, height: 34,
            decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(11)),
            child: Icon(icon, size: 17, color: BK.accent),
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(children: [
        Pill.live(''),
        const SizedBox(width: 11),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${s.resource} · ${s.customer}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
          Text(s.remaining, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
        ]),
        const Spacer(),
        Text(s.endsAt, style: const TextStyle(color: BK.live, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}
