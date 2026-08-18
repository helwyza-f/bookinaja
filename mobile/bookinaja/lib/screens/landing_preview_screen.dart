import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../theme.dart';

/// Preview full-screen landing/booking site tenant — WebView tinggi penuh,
/// bisa di-scroll seluruh halaman. Dipakai dari hub Profil Bisnis & Halaman
/// landing.
class LandingPreviewScreen extends StatefulWidget {
  final String url;
  const LandingPreviewScreen({super.key, required this.url});

  @override
  State<LandingPreviewScreen> createState() => _LandingPreviewScreenState();
}

class _LandingPreviewScreenState extends State<LandingPreviewScreen> {
  late final WebViewController _c;

  @override
  void initState() {
    super.initState();
    _c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Preview', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
        actions: [
          IconButton(
            onPressed: () => _c.reload(),
            icon: const Icon(Icons.refresh_rounded, color: BK.ink2),
            tooltip: 'Segarkan',
          ),
        ],
      ),
      body: WebViewWidget(controller: _c),
    );
  }
}
