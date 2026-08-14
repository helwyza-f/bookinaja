import 'package:flutter/material.dart';
import '../theme.dart';
import 'login_screen.dart';
import 'customer/customer_auth_screen.dart';

/// Pintu masuk aplikasi sebelum login. Default ke jalur pelanggan (volume jauh
/// lebih besar); jalur staff tenant hanya link kecil di bawah.
class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(color: BK.accent, borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Icons.calendar_month_rounded, color: Colors.white, size: 30),
                  ),
                ),
                const SizedBox(height: 18),
                const Text('BOOKINAJA', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.8, color: BK.ink3)),
                const SizedBox(height: 6),
                const Text('Booking tempat & layanan\nfavoritmu, sekali ketuk', textAlign: TextAlign.center, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1.25, color: BK.ink)),
                const SizedBox(height: 8),
                const Text('Temukan tenant, pesan slot, bayar — semua dari sini.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13.5, color: BK.ink3)),
                const SizedBox(height: 30),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 16)),
                  onPressed: () => _goCustomer(context),
                  child: const Text('Mulai sebagai pelanggan', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: BK.ink2,
                    side: const BorderSide(color: BK.line),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                  ),
                  onPressed: () => _goCustomer(context),
                  child: const Text('Masuk dengan WhatsApp / Email', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                ),
                const SizedBox(height: 26),
                const Divider(color: BK.line, height: 1),
                const SizedBox(height: 14),
                TextButton.icon(
                  style: TextButton.styleFrom(foregroundColor: BK.ink3),
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen())),
                  icon: const Icon(Icons.store_mall_directory_outlined, size: 18),
                  label: const Text('Masuk sebagai tenant staff', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _goCustomer(BuildContext context) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CustomerAuthScreen()));
  }
}
