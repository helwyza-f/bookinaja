import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_controller.dart';
import '../theme.dart';

/// Banner peringatan saat langganan tenant tidak aktif (trial habis / belum
/// bayar). Tenant masih bisa transaksi & rampungkan booking, tapi tak bisa
/// membuat item baru (unit/resource/promo/item F&B) — selaras middleware
/// backend RequireActiveSubscription. Tampil hanya saat [AuthController.graceActive].
class GraceBanner extends StatelessWidget {
  const GraceBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final grace = context.select<AuthController, bool>((a) => a.graceActive);
    if (!grace) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: BK.pendSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: BK.pend.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.lock_clock_outlined, color: BK.pend, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Langganan berakhir',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: BK.ink, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  'Transaksi & booking tetap jalan, tapi menambah unit, promo, atau item baru dikunci sampai upgrade.',
                  style: const TextStyle(color: BK.ink2, fontSize: 12, height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
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
      ),
    );
  return false;
}
