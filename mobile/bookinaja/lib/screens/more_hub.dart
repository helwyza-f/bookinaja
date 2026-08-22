import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/permissions.dart';
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
import 'owner_account_settings.dart';
import 'staff_access_screen.dart';
import 'staff_account_screen.dart';
import 'activity_log_screen.dart';

class MoreHubScreen extends StatelessWidget {
  const MoreHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final ws = auth.workspace;
    final owner = auth.isOwner;

    void go(Widget page) =>
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));

    // KELOLA — data harian, gated per mode + izin peran.
    final kelola = <Widget>[
      if (auth.bookingEnabled && auth.can(Perm.customersRead))
        _tile(context, Icons.people_outline, 'Customer', 'Profil & histori pelanggan',
            () => go(const CustomersScreen())),
      if (auth.bookingEnabled && auth.can(Perm.resourcesRead))
        _tile(context, Icons.storefront_outlined, 'Resource', 'Unit yang dibooking',
            () => go(const ResourcesScreen())),
      if (auth.kasirEnabled && auth.can(Perm.fnbRead))
        _tile(context, Icons.ramen_dining_outlined, 'Menu F&B', 'Kelola item & stok',
            () => go(const FnbMenuScreen())),
      if (auth.kasirEnabled && auth.can(Perm.posRead))
        _tile(context, Icons.shopping_cart_outlined, 'Kasir / Direct sale', 'Buat order walk-in',
            () => go(const KasirScreen())),
    ];

    // KEUANGAN — laporan & biaya, gated per izin.
    final keuangan = <Widget>[
      if (auth.canAny(const [Perm.reportsRead, Perm.analyticsRead]))
        _tile(context, Icons.bar_chart, 'Laporan', 'Pendapatan & transaksi',
            () => go(const ReportsScreen())),
      if (auth.can(Perm.expensesRead))
        _tile(context, Icons.payments_outlined, 'Biaya operasional', 'Catat pengeluaran',
            () => go(const ExpensesScreen())),
    ];

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          const Text('Lainnya', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
          const SizedBox(height: 4),
          Text('${auth.account?.name ?? ''} · ${ws?.name ?? ''} (${ws?.role ?? ''})', style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
          const SizedBox(height: 16),

          // Hero Langganan (billing) hanya untuk owner — staff tak punya akses.
          if (owner) ...[
            const LanggananHero(),
            const SizedBox(height: 18),
          ],

          if (kelola.isNotEmpty) ...[
            const _SectionLabel('KELOLA'),
            ...kelola,
            const SizedBox(height: 18),
          ],

          if (keuangan.isNotEmpty) ...[
            const _SectionLabel('KEUANGAN'),
            ...keuangan,
            const SizedBox(height: 18),
          ],

          // Staff: hanya akun sendiri (ganti password). Area owner disembunyikan.
          if (!owner) ...[
            const _SectionLabel('AKUN'),
            _tile(context, Icons.person_outline, 'Akun saya', 'Profil & ganti password',
                () => go(const StaffAccountScreen())),
            const SizedBox(height: 18),
          ],

          // AKUN & PENGATURAN — seluruh area owner-only (backend OwnerOnly).
          // Staff tak melihat sama sekali (kalau ditekan pun pasti 403).
          if (owner) ...[
            const _SectionLabel('AKUN & PENGATURAN'),
            _tile(context, Icons.storefront_outlined, 'Profil bisnis', 'Nama, kontak, tampilan',
                () => go(const BusinessProfileHubScreen())),
            _tile(context, Icons.person_outline, 'Akun owner', 'Password, email, linked accounts',
                () => go(const OwnerAccountSettingsScreen())),
            _tile(context, Icons.group_outlined, 'Staff & akses', 'Anggota tim & peran',
                () => go(const StaffAccessScreen())),
            _tile(context, Icons.history, 'Log aktivitas', 'Siapa mengubah apa & kapan',
                () => go(const ActivityLogScreen())),
            _tile(context, Icons.tune, 'Pengaturan lanjutan', 'Mode aplikasi, pembayaran, nota, promo',
                () => go(const SettingsHubScreen())),
            const SizedBox(height: 18),
          ],
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

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 9),
        child: Text(text,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
      );
}
