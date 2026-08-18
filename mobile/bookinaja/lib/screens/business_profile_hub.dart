import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../theme.dart';
import '../ui/toast.dart';
import '../repositories/settings_repository.dart';
import 'business_branding_screen.dart';
import 'business_identity_screen.dart';
import 'business_landing_screen.dart';
import 'business_theme_screen.dart';
import 'landing_preview_screen.dart';

/// Hub Profil Bisnis — pintu ke pengaturan presence tenant, disusun per *intent*
/// (bukan meniru section web). Di atas ada preview landing/booking site langsung.
class BusinessProfileHubScreen extends StatefulWidget {
  const BusinessProfileHubScreen({super.key});

  @override
  State<BusinessProfileHubScreen> createState() => _BusinessProfileHubScreenState();
}

class _BusinessProfileHubScreenState extends State<BusinessProfileHubScreen> {
  final _web = WebViewController()..setJavaScriptMode(JavaScriptMode.unrestricted);
  String _previewUrl = '';

  @override
  void initState() {
    super.initState();
    _loadPreview();
  }

  Future<void> _loadPreview() async {
    try {
      final s = await context.read<SettingsRepository>().getPageBuilder();
      final url = '${s['preview_url'] ?? ''}';
      if (url.isNotEmpty && mounted) {
        _web.loadRequest(Uri.parse(url));
        setState(() => _previewUrl = url);
      }
    } catch (_) {
      // Preview opsional — abaikan bila gagal.
    }
  }

  void _openFull() {
    if (_previewUrl.isEmpty) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => LandingPreviewScreen(url: _previewUrl),
      fullscreenDialog: true,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Profil Bisnis',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          const Padding(
            padding: EdgeInsets.only(left: 2, bottom: 12),
            child: Text('Atur bagaimana bisnismu tampil & ditemukan pelanggan.',
                style: TextStyle(fontSize: 13, color: BK.ink2, height: 1.4)),
          ),
          if (_previewUrl.isNotEmpty) ...[
            _previewCard(),
            const SizedBox(height: 16),
          ],
          _tile(
            context,
            icon: Icons.badge_outlined,
            title: 'Identitas & kontak',
            sub: 'Nama, slogan, WhatsApp, alamat, jam',
            onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BusinessIdentityScreen())),
          ),
          _tile(
            context,
            icon: Icons.palette_outlined,
            title: 'Branding',
            sub: 'Logo & banner',
            onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BusinessBrandingScreen())),
          ),
          _tile(
            context,
            icon: Icons.brush_outlined,
            title: 'Tema',
            sub: 'Preset, warna aksen, sudut tampilan',
            onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BusinessThemeScreen())),
          ),
          _tile(
            context,
            icon: Icons.dashboard_outlined,
            title: 'Halaman landing',
            sub: 'Susun & atur section booking site',
            onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BusinessLandingScreen())),
          ),
          // TODO: aktifkan (buang soon + wire ke BusinessDiscoveryScreen) begitu
          // feed Explore Bookinaja sudah berjalan. Layar sudah siap.
          _tile(
            context,
            icon: Icons.travel_explore_outlined,
            title: 'Biar ditemukan',
            sub: 'Headline discovery, tag, badge, sorotan',
            onTap: () => _soon(context, 'Discovery'),
            soon: true,
          ),
        ],
      ),
    );
  }

  Widget _previewCard() {
    return Container(
      height: 360,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BK.line),
      ),
      child: Stack(children: [
        // WebView interaktif (bisa di-scroll/klik) meski di dalam ListView.
        // EagerGestureRecognizer mengklaim semua gesture untuk WebView, jadi
        // scroll internal tetap jalan walau induknya ListView yang ikut mau
        // drag vertikal (VerticalDragGestureRecognizer saja tak konsisten di
        // sini). Scroll halaman tetap bisa lewat area di luar kartu preview.
        Positioned.fill(
          child: WebViewWidget(
            controller: _web,
            gestureRecognizers: {
              Factory<EagerGestureRecognizer>(() => EagerGestureRecognizer()),
            },
          ),
        ),
        Positioned(
          left: 10,
          top: 10,
          child: IgnorePointer(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(20)),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.visibility_outlined, size: 13, color: Colors.white),
                SizedBox(width: 5),
                Text('Preview langsung', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
              ]),
            ),
          ),
        ),
        Positioned(
          right: 10,
          bottom: 10,
          child: GestureDetector(
            onTap: _openFull,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
              decoration: BoxDecoration(color: BK.accent, borderRadius: BorderRadius.circular(20)),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.fullscreen_rounded, size: 15, color: Colors.white),
                SizedBox(width: 5),
                Text('Lihat penuh', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w800)),
              ]),
            ),
          ),
        ),
      ]),
    );
  }

  void _soon(BuildContext c, String m) => BkToast.info(c, m, subtitle: 'Fitur ini segera hadir.');

  Widget _tile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String sub,
    required VoidCallback onTap,
    bool soon = false,
  }) {
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
                width: 40,
                height: 40,
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
