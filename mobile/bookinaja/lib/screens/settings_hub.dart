import 'package:flutter/material.dart';

import '../theme.dart';
import '../ui/toast.dart';
import 'cancellation_settings.dart';
import 'fnb_mode_settings.dart';
import 'payment_methods_settings.dart';

/// Hub pengaturan tenant — kumpulan setting dikelompokkan. Yang belum dibangun
/// menampilkan toast "segera hadir".
class SettingsHubScreen extends StatelessWidget {
  const SettingsHubScreen({super.key});

  void _soon(BuildContext c, String m) =>
      BkToast.info(c, m, subtitle: 'Fitur ini segera hadir.');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Pengaturan',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          _section('PEMBAYARAN'),
          _tile(context, Icons.account_balance_wallet_outlined, 'Metode pembayaran',
              'Transfer, e-wallet, QRIS, tunai', () {
            Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => const PaymentMethodsSettingsScreen()));
          }),
          _tile(context, Icons.vpn_key_outlined, 'Payment gateway',
              'Midtrans / Xendit otomatis', () => _soon(context, 'Payment gateway'), soon: true),
          _tile(context, Icons.receipt_long_outlined, 'Nota / struk',
              'Header, footer, printer', () => _soon(context, 'Nota'), soon: true),
          const SizedBox(height: 18),

          _section('BOOKING'),
          _tile(context, Icons.event_busy_outlined, 'Kebijakan pembatalan',
              'Cancel, cutoff, refund DP', () {
            Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => const CancellationSettingsScreen()));
          }),
          _tile(context, Icons.local_offer_outlined, 'Promo & voucher',
              'Diskon & kode promo', () => _soon(context, 'Promo'), soon: true),
          _tile(context, Icons.dashboard_customize_outlined, 'Mode Aplikasi',
              'Booking, kasir, atau keduanya', () {
            Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => const FnbModeSettingsScreen()));
          }),
          const SizedBox(height: 18),

          _section('TIM & USAHA'),
          _tile(context, Icons.group_outlined, 'Staff & akses',
              'Anggota tim & role', () => _soon(context, 'Staff'), soon: true),
          _tile(context, Icons.storefront_outlined, 'Profil bisnis',
              'Nama, kontak, tampilan', () => _soon(context, 'Profil bisnis'), soon: true),
        ],
      ),
    );
  }

  Widget _section(String label) => Padding(
        padding: const EdgeInsets.only(bottom: 9),
        child: Text(label,
            style: const TextStyle(
                fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
      );

  Widget _tile(BuildContext context, IconData icon, String title, String sub, VoidCallback onTap,
      {bool soon = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(BK.radius),
        onTap: onTap,
        child: Opacity(
          opacity: soon ? 0.6 : 1,
          child: BKCard(
            child: Row(children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                    color: soon ? BK.card2 : BK.accentSoft, borderRadius: BorderRadius.circular(11)),
                child: Icon(icon, color: soon ? BK.ink3 : BK.accent, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
                  Text(sub, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                ]),
              ),
              if (soon)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(20)),
                  child: const Text('Segera',
                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: BK.ink3)),
                )
              else
                const Icon(Icons.chevron_right, color: BK.ink3),
            ]),
          ),
        ),
      ),
    );
  }
}
