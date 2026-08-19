import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../theme.dart';

/// Membuka halaman pembayaran hosted (Midtrans Snap / invoice Xendit) di dalam
/// app. Menutup otomatis & mengembalikan `true` saat WebView kembali ke halaman
/// sukses billing kita, atau saat gateway menandai pembayaran selesai. Caller
/// wajib me-refresh status langganan setelah pop (hasil bisa `true`/`false` —
/// keduanya memicu refresh karena status final ditentukan callback server).
class PaymentWebViewScreen extends StatefulWidget {
  final String url;
  const PaymentWebViewScreen({super.key, required this.url});

  @override
  State<PaymentWebViewScreen> createState() => _PaymentWebViewScreenState();
}

class _PaymentWebViewScreenState extends State<PaymentWebViewScreen> {
  late final WebViewController _web;
  bool _loading = true;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) {
          if (mounted) setState(() => _loading = true);
        },
        onPageFinished: (_) {
          if (mounted) setState(() => _loading = false);
        },
        onNavigationRequest: (req) {
          if (_isSuccessUrl(req.url)) {
            _finish();
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      ))
      ..loadRequest(Uri.parse(widget.url));
  }

  /// Deteksi kembali ke halaman sukses. Kita redirect gateway ke
  /// `/admin/settings/billing`; Midtrans/Xendit juga bisa mampir ke halaman
  /// status internal — cocokkan pola yang aman.
  bool _isSuccessUrl(String url) {
    final u = url.toLowerCase();
    return u.contains('settings/billing') ||
        u.contains('transaction_status=settlement') ||
        u.contains('status_code=200');
  }

  void _finish() {
    if (_done) return;
    _done = true;
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: BK.ink),
          onPressed: () => Navigator.of(context).pop(false),
        ),
        title: const Text('Pembayaran',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Selesai', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: Stack(children: [
        WebViewWidget(controller: _web),
        if (_loading)
          const Positioned.fill(
            child: ColoredBox(
              color: BK.bg,
              child: Center(child: CircularProgressIndicator(color: BK.accent)),
            ),
          ),
      ]),
    );
  }
}
