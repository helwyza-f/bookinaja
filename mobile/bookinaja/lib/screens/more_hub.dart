import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../ui/toast.dart';
import '../state/auth_controller.dart';
import '../widgets/langganan_hero.dart';
import 'kasir.dart';
import 'customers.dart';
import 'settings_hub.dart';
import 'business_profile_hub.dart';
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

          // Hero Langganan di puncak — status akun paling bernilai, dipindah ke
          // sini dari Setelan agar tak terkubur satu tap lebih dalam.
          const LanggananHero(),
          const SizedBox(height: 18),

          // KELOLA = objek & alat bisnis harian (data yang dikelola). Resource
          // dulu salah kamar di "WORKSPACE"; sekarang sekamar dg Customer/Menu.
          const Text('KELOLA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(height: 9),
          // Customer (CRM admin) berbasis booking — riwayatnya menarik dari
          // tabel bookings, bukan sales_order. Di pos_only (booking mati) tile
          // ini disembunyikan; walk-in POS tak memakai CRM ini.
          if (auth.bookingEnabled)
            _tile(context, Icons.people_outline, 'Customer', 'Profil & histori pelanggan', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CustomersScreen()));
            }),
          // Resource hanya relevan saat booking aktif.
          if (auth.bookingEnabled)
            _tile(context, Icons.storefront_outlined, 'Resource', 'Unit yang dibooking', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ResourcesScreen()));
            }),
          // Kasir disembunyikan total saat mode F&B "Matikan" — tenant itu
          // pakai app POS lain (mis. Majoo), Bookinaja fokus booking saja.
          if (auth.kasirEnabled)
            _tile(context, Icons.ramen_dining_outlined, 'Menu F&B', 'Kelola item & stok', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const FnbMenuScreen()));
            }),
          if (auth.kasirEnabled)
            _tile(context, Icons.shopping_cart_outlined, 'Kasir / Direct sale', 'Buat order walk-in', () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const KasirScreen()));
            }),
          const SizedBox(height: 18),

          // KEUANGAN = insight & uang, kelompok mental sendiri.
          const Text('KEUANGAN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(height: 9),
          _tile(context, Icons.bar_chart, 'Laporan', 'Pendapatan & transaksi', () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReportsScreen()));
          }),
          _tile(context, Icons.payments_outlined, 'Biaya operasional', 'Catat pengeluaran', () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ExpensesScreen()));
          }),
          const SizedBox(height: 18),

          // AKUN & PENGATURAN = yang sering disentuh naik ke permukaan; config
          // sekali-atur diringkas jadi "Pengaturan lanjutan".
          const Text('AKUN & PENGATURAN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(height: 9),
          _tile(context, Icons.storefront_outlined, 'Profil bisnis', 'Nama, kontak, tampilan', () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const BusinessProfileHubScreen()));
          }),
          _tile(context, Icons.group_outlined, 'Staff & akses', 'Role & permission', () => _soon(context, 'Staff')),
          _tile(context, Icons.tune, 'Pengaturan lanjutan', 'Mode aplikasi, pembayaran, nota, promo', () {
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
