import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../screens/paywall_screen.dart';
import '../state/auth_controller.dart';

/// Helper gating grace mode. UI grace kini ditampilkan sebagai chip mungil di
/// header dashboard (lihat _GraceChip), kartu langganan di hub Lainnya, dan
/// badge di picker — bukan banner sebalok. Paywall bersifat KONTEKSTUAL: hanya
/// muncul saat menekan aksi terkunci (bukan pop-up saat buka app).

/// Cek apakah tenant boleh membuat item baru. Bila tidak (grace aktif), buka
/// paywall & kembalikan false — mencegah tap "＋ Buat" mengirim request yang
/// pasti ditolak backend (402).
bool guardCanCreate(BuildContext context) {
  final auth = context.read<AuthController>();
  if (auth.canCreate) return true;
  PaywallScreen.show(context);
  return false;
}

/// Cek apakah tenant boleh membuat TRANSAKSI/booking/order baru. Hanya false di
/// fase lock (hari ke-15+). Buka paywall & cegah request yang pasti ditolak
/// backend (402 operations_locked).
bool guardCanTransact(BuildContext context, {String? action}) {
  final auth = context.read<AuthController>();
  if (auth.transactionsAllowed) return true;
  PaywallScreen.show(context);
  return false;
}
