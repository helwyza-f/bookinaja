import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../screens/paywall_screen.dart';
import '../state/auth_controller.dart';
import '../theme.dart';

/// Banner peringatan bertingkat saat langganan tenant non-aktif. Eskalasi
/// berbasis WAKTU (bukan jumlah), selaras access.GracePhase backend:
///   Fase 1 (soft): katalog beku; transaksi & fitur penuh jalan. Amber.
///   Fase 2 (friksi): kenyamanan (export/nota WA/analitik) dicabut + hitung
///     mundur menuju lock. Merah, nada mendesak.
///   Fase 3 (lock): transaksi/booking/order baru dikunci. Merah, nada kritis.
/// Tampil hanya saat [AuthController.graceActive].
class GraceBanner extends StatelessWidget {
  const GraceBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (!auth.graceActive) return const SizedBox.shrink();

    final phase = auth.gracePhase;
    final daysToLock = (auth.graceLockDay - auth.graceDays).clamp(0, 9999);

    final bool critical = phase >= 2;
    final Color accent = critical ? BK.crit : BK.pend;
    final Color soft = critical ? BK.critSoft : BK.pendSoft;
    final IconData icon = phase >= 3
        ? Icons.lock_outline
        : phase >= 2
            ? Icons.warning_amber_rounded
            : Icons.lock_clock_outlined;

    final String title = phase >= 3
        ? 'Operasi dikunci'
        : phase >= 2
            ? 'Fitur mulai dibatasi'
            : 'Langganan berakhir';

    final String message = phase >= 3
        ? 'Transaksi, booking, dan order baru dikunci karena langganan lama tidak aktif. Bayar untuk melanjutkan operasi.'
        : phase >= 2
            ? (daysToLock > 0
                ? 'Export laporan, nota WhatsApp, dan analitik dinonaktifkan. Transaksi masih jalan $daysToLock hari lagi sebelum operasi dikunci.'
                : 'Export laporan, nota WhatsApp, dan analitik dinonaktifkan. Operasi akan segera dikunci.')
            : 'Transaksi & booking tetap jalan, tapi menambah unit, promo, atau item baru dikunci sampai upgrade.';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: soft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: accent, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700, color: BK.ink, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  message,
                  style: const TextStyle(color: BK.ink2, fontSize: 12, height: 1.35),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Align(
            alignment: Alignment.center,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: accent,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              onPressed: () => PaywallScreen.show(context),
              child: Text(
                phase >= 3 ? 'Bayar' : 'Upgrade',
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Melacak fase interstitial yang sudah ditampilkan pada sesi app ini, agar
/// hanya muncul sekali per buka-app (bukan tiap rebuild). Reset saat proses
/// app dimulai ulang — sesuai desain "interstitial tiap buka app".
int _graceInterstitialShownPhase = -1;

/// Widget nol-ukuran yang, saat pertama dibangun pada sesi app, memunculkan
/// dialog paywall bila grace aktif (fase ≥ 1: soft/friksi/lock). Bisa ditutup. Letakkan di
/// pohon layar utama (mis. children ListView dashboard).
class GraceInterstitial extends StatefulWidget {
  const GraceInterstitial({super.key});

  @override
  State<GraceInterstitial> createState() => _GraceInterstitialState();
}

class _GraceInterstitialState extends State<GraceInterstitial> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeShow());
  }

  void _maybeShow() {
    if (!mounted) return;
    final auth = context.read<AuthController>();
    final phase = auth.gracePhase;
    // Muncul sejak fase Soft (≥1): tekanan lembut tapi konsisten tiap buka-app.
    if (phase < 1) return;
    if (_graceInterstitialShownPhase == phase) return;
    _graceInterstitialShownPhase = phase;

    // Paywall full-screen yang menyela — bisa ditutup. Menggantikan dialog kecil.
    PaywallScreen.show(context);
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

/// Helper: cek apakah tenant boleh membuat item baru. Bila tidak (grace aktif),
/// tampilkan snackbar penjelasan & kembalikan false — dipakai untuk mencegah
/// tap tombol "＋ Buat" mengirim request yang pasti ditolak backend (402).
bool guardCanCreate(BuildContext context, {String? item}) {
  final auth = context.read<AuthController>();
  if (auth.canCreate) return true;
  final label = item == null ? 'item baru' : '$item baru';
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        backgroundColor: BK.ink,
        content: Text('Langganan berakhir — upgrade untuk menambah $label.'),
        action: SnackBarAction(
          label: 'Upgrade',
          textColor: Colors.white,
          onPressed: () => PaywallScreen.show(context),
        ),
      ),
    );
  return false;
}

/// Helper: cek apakah tenant boleh membuat TRANSAKSI/booking/order baru. Hanya
/// false di fase lock (hari ke-15+). Mencegah tap tombol transaksi mengirim
/// request yang pasti ditolak backend (402 operations_locked).
bool guardCanTransact(BuildContext context, {String? action}) {
  final auth = context.read<AuthController>();
  if (auth.transactionsAllowed) return true;
  final label = action ?? 'transaksi baru';
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        backgroundColor: BK.crit,
        content: Text('Operasi dikunci — bayar langganan untuk melanjutkan $label.'),
        action: SnackBarAction(
          label: 'Bayar',
          textColor: Colors.white,
          onPressed: () => PaywallScreen.show(context),
        ),
      ),
    );
  return false;
}
