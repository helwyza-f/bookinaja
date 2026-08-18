import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../ui/toast.dart';
import '../state/auth_controller.dart';
import 'kasir.dart';
import 'customers.dart';
import 'settings_hub.dart';
import 'fnb_menu_screen.dart';
import 'expenses_screen.dart';
import 'reports_screen.dart';
import 'resources_screen.dart';

class MoreHubScreen extends StatelessWidget {
  const MoreHubScreen({super.key});

  void _soon(BuildContext c, String m) => BkToast.info(c, m, subtitle: 'Fitur ini segera hadir.');

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final ws = auth.workspace;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          const Text('Lainnya', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
          const SizedBox(height: 4),
          Text('${auth.account?.name ?? ''} · ${ws?.name ?? ''} (${ws?.role ?? ''})', style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
          const SizedBox(height: 16),
          const Text('OPERASIONAL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(height: 9),
          // Kasir disembunyikan total saat mode F&B "Matikan" — tenant itu
          // pakai app POS lain (mis. Majoo), Bookinaja fokus booking saja.
          if (auth.kasirEnabled)
            _tile(context, Icons.shopping_cart_outlined, 'Kasir / Direct sale', 'Buat order walk-in', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const KasirScreen()));
            }),
          _tile(context, Icons.people_outline, 'Customer', 'Profil & histori pelanggan', () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CustomersScreen()));
          }),
          if (auth.kasirEnabled)
            _tile(context, Icons.ramen_dining_outlined, 'Menu F&B', 'Kelola item & stok', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const FnbMenuScreen()));
            }),
          _tile(context, Icons.payments_outlined, 'Biaya operasional', 'Catat pengeluaran', () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ExpensesScreen()));
          }),
          _tile(context, Icons.bar_chart, 'Laporan', 'Pendapatan & transaksi', () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReportsScreen()));
          }),
          const SizedBox(height: 18),
          const Text('WORKSPACE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(height: 9),
          // Resource hanya relevan saat booking aktif. Kebijakan pembatalan
          // dipindah ke Settings hub (section BOOKING) agar tak duplikat.
          if (auth.bookingEnabled)
            _tile(context, Icons.storefront_outlined, 'Resource', 'Unit yang dibooking', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ResourcesScreen()));
            }),
          _tile(context, Icons.group_outlined, 'Staff & akses', 'Role & permission', () => _soon(context, 'Staff')),
          _tile(context, Icons.settings_outlined, 'Pengaturan lain', 'Bayar, promo, nota, staff', () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsHubScreen()));
          }),
          const SizedBox(height: 18),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: BK.ink, backgroundColor: BK.card, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(vertical: 14), minimumSize: const Size.fromHeight(0)),
            onPressed: () => context.read<AuthController>().switchWorkspace(),
            icon: const Icon(Icons.swap_horiz, size: 18),
            label: const Text('Ganti workspace', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 9),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(backgroundColor: BK.critSoft, foregroundColor: BK.crit, padding: const EdgeInsets.symmetric(vertical: 14)),
              onPressed: () => context.read<AuthController>().logout(),
              child: const Text('Keluar', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tile(BuildContext context, IconData icon, String title, String sub, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(BK.radius),
        onTap: onTap,
        child: BKCard(
          child: Row(children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(11)), child: Icon(icon, color: BK.accent, size: 20)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
              Text(sub, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ])),
            const Icon(Icons.chevron_right, color: BK.ink3),
          ]),
        ),
      ),
    );
  }
}
