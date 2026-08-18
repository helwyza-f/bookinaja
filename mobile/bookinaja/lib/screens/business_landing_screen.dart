import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../theme.dart';
import '../ui/toast.dart';
import '../repositories/settings_repository.dart';
import 'landing_preview_screen.dart';

/// Halaman landing (page builder) versi mobile. Kanvas drag-drop web
/// diterjemahkan jadi **daftar section yang bisa diurutkan & di-toggle** +
/// **preview WebView** dari landing/booking site tenant yang asli.
///
/// v3: reorder + enable/disable (operasi paling sering & paling bernilai).
/// Edit konten per-section (props/variant) menyusul di iterasi berikutnya.
class BusinessLandingScreen extends StatefulWidget {
  const BusinessLandingScreen({super.key});

  @override
  State<BusinessLandingScreen> createState() => _BusinessLandingScreenState();
}

class _BusinessLandingScreenState extends State<BusinessLandingScreen> {
  final _web = WebViewController()..setJavaScriptMode(JavaScriptMode.unrestricted);

  List<_Section> _sections = [];
  int _version = 1;
  dynamic _theme; // dipertahankan apa adanya saat simpan
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
      final page = (s['page'] is Map) ? Map<String, dynamic>.from(s['page'] as Map) : <String, dynamic>{};
      final rawSections = (page['sections'] is List) ? page['sections'] as List : const [];
      final sections = rawSections
          .whereType<Map>()
          .map((e) => _Section.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      final url = '${s['preview_url'] ?? ''}';
      if (url.isNotEmpty) _web.loadRequest(Uri.parse(url));
      setState(() {
        _sections = sections;
        _version = (page['version'] is num) ? (page['version'] as num).toInt() : 1;
        _theme = s['theme'];
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

  Future<void> _save() async {
    setState(() => _saving = true);
    final page = {
      'version': _version,
      'sections': _sections.map((s) => s.toJson()).toList(),
    };
    try {
      await context.read<SettingsRepository>().savePageBuilder(page: page, theme: _theme, bookingForm: _form);
      if (!mounted) return;
      setState(() {
        _saving = false;
        _dirty = false;
      });
      BkToast.success(context, 'Halaman disimpan');
      if (_previewUrl.isNotEmpty) _web.reload(); // preview ikut segar
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal menyimpan', subtitle: '$e');
    }
  }

  // onReorderItem sudah menyesuaikan newIndex untuk item yang terangkat, jadi
  // tak perlu koreksi manual "-1".
  void _reorder(int oldIndex, int newIndex) {
    setState(() {
      final s = _sections.removeAt(oldIndex);
      _sections.insert(newIndex, s);
      _dirty = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Halaman landing',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
        actions: [
          if (!_loading && _error == null && _previewUrl.isNotEmpty)
            IconButton(
              onPressed: () => _web.reload(),
              icon: const Icon(Icons.refresh_rounded, color: BK.ink2),
              tooltip: 'Segarkan preview',
            ),
        ],
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
              : Column(children: [
                  _previewCard(),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                    child: Row(children: [
                      const Text('SECTION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
                      const SizedBox(width: 8),
                      Text('Tahan & geser untuk urutkan', style: TextStyle(fontSize: 11, color: BK.ink3.withValues(alpha: 0.8))),
                    ]),
                  ),
                  Expanded(
                    child: _sections.isEmpty
                        ? const Center(child: Text('Belum ada section.', style: TextStyle(color: BK.ink3)))
                        : ReorderableListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                            itemCount: _sections.length,
                            onReorderItem: _reorder,
                            itemBuilder: (_, i) => _sectionCard(_sections[i], i),
                          ),
                  ),
                ]),
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

  void _openFullPreview() {
    if (_previewUrl.isEmpty) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => LandingPreviewScreen(url: _previewUrl),
      fullscreenDialog: true,
    ));
  }

  Widget _previewCard() {
    return Container(
      height: 320,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BK.line),
      ),
      child: Stack(children: [
        Positioned.fill(child: WebViewWidget(controller: _web)),
        Positioned(
          left: 10,
          top: 10,
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
        // Tombol perbesar → preview full-screen yang bisa di-scroll penuh.
        Positioned(
          right: 10,
          top: 10,
          child: Material(
            color: Colors.black.withValues(alpha: 0.55),
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: _openFullPreview,
              child: const Padding(
                padding: EdgeInsets.all(7),
                child: Icon(Icons.fullscreen_rounded, size: 20, color: Colors.white),
              ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _sectionCard(_Section s, int i) {
    return Padding(
      key: ValueKey(s.id.isEmpty ? '$i-${s.type}' : s.id),
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
        decoration: BoxDecoration(
          color: BK.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: BK.line),
        ),
        child: Row(children: [
          ReorderableDragStartListener(
            index: i,
            child: const Padding(
              padding: EdgeInsets.only(right: 10),
              child: Icon(Icons.drag_indicator_rounded, color: BK.ink3, size: 22),
            ),
          ),
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
                color: s.enabled ? BK.accentSoft : BK.card2, borderRadius: BorderRadius.circular(9)),
            child: Icon(_iconFor(s.type), size: 17, color: s.enabled ? BK.accent : BK.ink3),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.displayLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: s.enabled ? BK.ink : BK.ink3)),
              if (s.variant.isNotEmpty)
                Text('Gaya: ${s.variant}', style: const TextStyle(fontSize: 11, color: BK.ink3)),
            ]),
          ),
          Switch.adaptive(
            value: s.enabled,
            activeThumbColor: BK.accent,
            onChanged: (v) => setState(() {
              s.enabled = v;
              _dirty = true;
            }),
          ),
        ]),
      ),
    );
  }

  IconData _iconFor(String type) {
    switch (type.toLowerCase()) {
      case 'hero':
        return Icons.wallpaper_rounded;
      case 'about':
      case 'about_us':
        return Icons.info_outline_rounded;
      case 'gallery':
        return Icons.photo_library_outlined;
      case 'resources':
      case 'services':
      case 'catalog':
        return Icons.grid_view_rounded;
      case 'menu':
        return Icons.restaurant_menu_rounded;
      case 'testimonials':
      case 'reviews':
        return Icons.format_quote_rounded;
      case 'faq':
        return Icons.help_outline_rounded;
      case 'contact':
      case 'location':
      case 'map':
        return Icons.place_outlined;
      case 'cta':
      case 'booking':
        return Icons.touch_app_outlined;
      case 'hours':
        return Icons.schedule_rounded;
      case 'promo':
        return Icons.local_offer_outlined;
      default:
        return Icons.view_agenda_outlined;
    }
  }
}

/// Section landing ringan (mirror LandingBuilderSection backend). `props`/`variant`
/// dipertahankan utuh agar tak hilang saat disimpan balik.
class _Section {
  final String id;
  final String type;
  final String label;
  final String variant;
  bool enabled;
  final Map<String, dynamic> props;

  _Section({
    required this.id,
    required this.type,
    required this.label,
    required this.variant,
    required this.enabled,
    required this.props,
  });

  factory _Section.fromJson(Map<String, dynamic> j) => _Section(
        id: '${j['id'] ?? ''}',
        type: '${j['type'] ?? ''}',
        label: '${j['label'] ?? ''}',
        variant: '${j['variant'] ?? ''}',
        enabled: j['enabled'] != false,
        props: (j['props'] is Map) ? Map<String, dynamic>.from(j['props'] as Map) : <String, dynamic>{},
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'label': label,
        'variant': variant,
        'enabled': enabled,
        if (props.isNotEmpty) 'props': props,
      };

  /// Label tampil: pakai label eksplisit, jika kosong humanisasi dari type.
  String get displayLabel {
    if (label.trim().isNotEmpty) return label;
    final t = type.replaceAll('_', ' ').trim();
    if (t.isEmpty) return 'Section';
    return t[0].toUpperCase() + t.substring(1);
  }
}
