import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../theme.dart';
import '../ui/toast.dart';
import '../repositories/settings_repository.dart';
import 'landing_preview_screen.dart';

/// Pengaturan Tema landing (owner). Bagian dari page-builder (`theme`), jadi
/// disimpan lewat PUT /admin/page-builder — page & booking_form dipertahankan
/// apa adanya. Paritas penuh dengan web: preset (menerapkan bundle) + warna
/// utama/aksen + surface + font + radius (LandingThemeConfig 6 field).
class BusinessThemeScreen extends StatefulWidget {
  const BusinessThemeScreen({super.key});

  @override
  State<BusinessThemeScreen> createState() => _BusinessThemeScreenState();
}

class _BusinessThemeScreenState extends State<BusinessThemeScreen> {
  // Bundle preset 1:1 dengan web (THEME_PRESET_VALUES). Pilih preset menerapkan
  // primary + accent + surface + font + radius sekaligus. Dot = warna primary.
  static const _presets = [
    (value: 'bookinaja-classic', label: 'Klasik', primary: '#2563EB', accent: '#0F1F4A', surface: 'soft', font: 'bold', radius: 'rounded'),
    (value: 'boutique', label: 'Boutique', primary: '#0F766E', accent: '#1F2937', surface: 'layered', font: 'elegant', radius: 'soft'),
    (value: 'sunset-glow', label: 'Sunset', primary: '#EA580C', accent: '#7C2D12', surface: 'layered', font: 'elegant', radius: 'soft'),
    (value: 'playful', label: 'Playful', primary: '#16A34A', accent: '#14532D', surface: 'bright', font: 'playful', radius: 'rounded'),
    (value: 'mono-luxe', label: 'Mono Luxe', primary: '#111827', accent: '#475569', surface: 'contrast', font: 'minimal', radius: 'square'),
    (value: 'dark-pro', label: 'Dark Pro', primary: '#7C3AED', accent: '#111827', surface: 'contrast', font: 'modern', radius: 'square'),
  ];
  static const _palette = [
    '#2563EB', '#0F766E', '#16A34A', '#EA580C', '#F04438',
    '#7C3AED', '#EE46BC', '#111827', '#475569', '#0F1F4A',
  ];
  // Sumbu lanjutan (nilai 1:1 web); label Bahasa Indonesia.
  static const _surfaces = [
    (value: 'soft', label: 'Lembut'),
    (value: 'bright', label: 'Cerah'),
    (value: 'layered', label: 'Berlapis'),
    (value: 'contrast', label: 'Kontras'),
  ];
  static const _fonts = [
    (value: 'bold', label: 'Tebal'),
    (value: 'modern', label: 'Modern'),
    (value: 'elegant', label: 'Elegan'),
    (value: 'playful', label: 'Playful'),
    (value: 'minimal', label: 'Minimal'),
  ];
  static const _radii = [
    (value: 'rounded', label: 'Bulat'),
    (value: 'soft', label: 'Lembut'),
    (value: 'square', label: 'Kotak'),
  ];

  final _web = WebViewController()..setJavaScriptMode(JavaScriptMode.unrestricted);

  Map<String, dynamic> _theme = {};
  dynamic _page;
  dynamic _form;
  String _previewUrl = '';
  bool _loading = true;
  bool _saving = false;
  bool _dirty = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final s = await context.read<SettingsRepository>().getPageBuilder();
      final theme = (s['theme'] is Map) ? Map<String, dynamic>.from(s['theme'] as Map) : <String, dynamic>{};
      final url = '${s['preview_url'] ?? ''}';
      if (url.isNotEmpty) _web.loadRequest(Uri.parse(url));
      setState(() {
        _theme = theme;
        _page = s['page'];
        _form = s['booking_form'];
        _previewUrl = url;
        _dirty = false;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  String _s(String k, String fallback) {
    final v = '${_theme[k] ?? ''}'.trim();
    return v.isEmpty ? fallback : v;
  }

  void _set(String k, String v) => setState(() {
        _theme[k] = v;
        _dirty = true;
      });

  /// Pilih preset → terapkan seluruh bundle (mirror web THEME_PRESET_VALUES).
  void _applyPreset(({String value, String label, String primary, String accent, String surface, String font, String radius}) p) {
    setState(() {
      _theme['preset'] = p.value;
      _theme['primary_color'] = p.primary;
      _theme['accent_color'] = p.accent;
      _theme['surface_style'] = p.surface;
      _theme['font_style'] = p.font;
      _theme['radius_style'] = p.radius;
      _dirty = true;
    });
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await context.read<SettingsRepository>().savePageBuilder(page: _page, theme: _theme, bookingForm: _form);
      if (!mounted) return;
      setState(() {
        _saving = false;
        _dirty = false;
      });
      BkToast.success(context, 'Tema disimpan');
      if (_previewUrl.isNotEmpty) _web.reload();
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal menyimpan', subtitle: '$e');
    }
  }

  Color _hex(String s) {
    var h = s.replaceAll('#', '').trim();
    if (h.length == 6) h = 'FF$h';
    return Color(int.tryParse(h, radix: 16) ?? 0xFF2F6BFF);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Tema', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: BK.crit)),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _load, child: const Text('Coba lagi')),
                    ]),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  children: [
                    if (_previewUrl.isNotEmpty) _previewCard(),
                    const SizedBox(height: 16),
                    _group('PRESET'),
                    _presetGrid(),
                    const SizedBox(height: 18),
                    _group('WARNA UTAMA'),
                    _swatches('primary_color', '#3B82F6'),
                    const SizedBox(height: 18),
                    _group('WARNA AKSEN'),
                    _swatches('accent_color', '#0F1F4A'),
                    const SizedBox(height: 18),
                    _group('PERMUKAAN'),
                    _optionChips('surface_style', _surfaces, 'soft'),
                    const SizedBox(height: 18),
                    _group('FONT'),
                    _optionChips('font_style', _fonts, 'bold'),
                    const SizedBox(height: 18),
                    _group('SUDUT'),
                    _optionChips('radius_style', _radii, 'rounded'),
                  ],
                ),
      bottomNavigationBar: _loading || _error != null
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: FilledButton(
                style: FilledButton.styleFrom(
                    backgroundColor: _dirty ? BK.accent : BK.line,
                    padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: (_saving || !_dirty) ? null : _save,
                child: Text(_saving ? 'Menyimpan…' : (_dirty ? 'Simpan perubahan' : 'Tersimpan'),
                    style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
    );
  }

  void _openFull() {
    if (_previewUrl.isEmpty) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => LandingPreviewScreen(url: _previewUrl),
      fullscreenDialog: true,
    ));
  }

  Widget _previewCard() => Container(
        height: 320,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: BK.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: BK.line),
        ),
        child: Stack(children: [
          Positioned.fill(
            child: WebViewWidget(
              controller: _web,
              gestureRecognizers: {
                Factory<VerticalDragGestureRecognizer>(() => VerticalDragGestureRecognizer()),
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
                child: const Text('Preview · perbarui saat disimpan',
                    style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ),
          ),
          Positioned(
            right: 10,
            top: 10,
            child: Material(
              color: Colors.black.withValues(alpha: 0.55),
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: _openFull,
                child: const Padding(
                  padding: EdgeInsets.all(7),
                  child: Icon(Icons.fullscreen_rounded, size: 20, color: Colors.white),
                ),
              ),
            ),
          ),
        ]),
      );

  Widget _group(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(t,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
      );

  Widget _presetGrid() {
    final current = _s('preset', 'bookinaja-classic');
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        for (final p in _presets)
          GestureDetector(
            onTap: () => _applyPreset(p),
            child: Container(
              width: (MediaQuery.of(context).size.width - 32 - 20) / 3,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
              decoration: BoxDecoration(
                color: current == p.value ? BK.accentSoft : BK.card,
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: current == p.value ? BK.accent : BK.line, width: current == p.value ? 1.5 : 1),
              ),
              child: Column(children: [
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(color: _hex(p.primary), shape: BoxShape.circle),
                ),
                const SizedBox(height: 8),
                Text(p.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700, color: current == p.value ? BK.accent : BK.ink)),
              ]),
            ),
          ),
      ],
    );
  }

  Widget _swatches(String key, String fallback) {
    final current = _s(key, fallback).toUpperCase();
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        for (final hex in _palette)
          GestureDetector(
            onTap: () => _set(key, hex),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _hex(hex),
                shape: BoxShape.circle,
                border: Border.all(color: current == hex.toUpperCase() ? BK.ink : Colors.transparent, width: 3),
              ),
              child: current == hex.toUpperCase()
                  ? const Icon(Icons.check_rounded, color: Colors.white, size: 20)
                  : null,
            ),
          ),
      ],
    );
  }

  /// Chip pilihan tunggal untuk sumbu tema (surface/font/radius).
  Widget _optionChips(String key, List<({String value, String label})> opts, String fallback) {
    final current = _s(key, fallback);
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final o in opts)
          GestureDetector(
            onTap: () => _set(key, o.value),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 120),
              padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
              decoration: BoxDecoration(
                color: current == o.value ? BK.accent : BK.card,
                borderRadius: BorderRadius.circular(11),
                border: Border.all(color: current == o.value ? BK.accent : BK.line),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                if (current == o.value) ...[
                  const Icon(Icons.check_rounded, size: 14, color: Colors.white),
                  const SizedBox(width: 5),
                ],
                Text(o.label,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: current == o.value ? Colors.white : BK.ink2,
                    )),
              ]),
            ),
          ),
      ],
    );
  }
}
