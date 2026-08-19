import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_client.dart';
import '../models/subscription.dart';
import '../repositories/billing_repository.dart';
import '../screens/payment_webview_screen.dart';
import '../state/auth_controller.dart';
import '../ui/toast.dart';

/// Jalankan checkout langganan untuk [planKey] pada [interval]:
///   1. POST /billing/checkout → dapat halaman pembayaran
///   2. buka WebView pembayaran
///   3. refresh status langganan setelah kembali
/// Mengembalikan `true` bila alur pembayaran diselesaikan (perlu refresh UI).
/// Hanya owner yang boleh — staff diberi info untuk minta owner.
Future<bool> runSubscriptionCheckout(
  BuildContext context, {
  required String planKey,
  required BillingInterval interval,
}) async {
  final auth = context.read<AuthController>();
  if (!auth.isOwner) {
    if (context.mounted) {
      BkToast.info(context, 'Perlu owner',
          subtitle: 'Hanya owner workspace yang bisa mengaktifkan langganan.');
    }
    return false;
  }

  final billing = context.read<BillingRepository>();
  try {
    final res = await billing.checkout(plan: planKey, interval: interval);
    if (!context.mounted) return false;
    if (!res.hasPaymentPage) {
      BkToast.info(context, 'Gagal menyiapkan pembayaran',
          subtitle: 'Coba lagi sebentar.');
      return false;
    }
    final paid = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => PaymentWebViewScreen(url: res.redirectUrl)),
    );
    // Apa pun hasilnya, muat ulang bootstrap: status final ditentukan callback
    // gateway → server, bukan UI.
    await auth.refreshAppMode();
    return paid == true;
  } on ApiException catch (e) {
    if (context.mounted) {
      BkToast.info(context, 'Gagal checkout', subtitle: e.message);
    }
    return false;
  } catch (_) {
    if (context.mounted) {
      BkToast.info(context, 'Gagal checkout', subtitle: 'Cek koneksi lalu coba lagi.');
    }
    return false;
  }
}

/// Buka halaman konsultasi Scale (paket enterprise) di browser.
Future<void> openScaleConsult(BuildContext context) async {
  final uri = Uri.parse('https://bookinaja.com/pricing/scale');
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    if (context.mounted) {
      BkToast.info(context, 'Tak bisa membuka tautan',
          subtitle: 'Hubungi kami di bookinaja.com.');
    }
  }
}
