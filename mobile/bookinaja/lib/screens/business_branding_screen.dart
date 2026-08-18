import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../theme.dart';
import '../ui/toast.dart';
import '../repositories/settings_repository.dart';

/// Branding bisnis (owner): logo & banner. Disimpan lewat PUT /admin/profile;
/// gambar di-upload dulu via /admin/upload-media (reuse
/// [SettingsRepository.uploadImage]) untuk dapat URL.
///
/// Warna landing diatur di layar **Tema** (page-builder theme) — satu sumber,
/// agar tak bentrok dengan warna di sini.
class BusinessBrandingScreen extends StatefulWidget {
  const BusinessBrandingScreen({super.key});

  @override
  State<BusinessBrandingScreen> createState() => _BusinessBrandingScreenState();
}

class _BusinessBrandingScreenState extends State<BusinessBrandingScreen> {
  final _picker = ImagePicker();
  Map<String, dynamic>? _profile;
  String _logoUrl = '';
  String _bannerUrl = '';
  bool _loading = true;
  bool _saving = false;
  bool _dirty = false;
  bool _uploadingLogo = false;
  bool _uploadingBanner = false;
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
      final p = await context.read<SettingsRepository>().getProfile();
      setState(() {
        _profile = p;
        _logoUrl = '${p['logo_url'] ?? ''}';
        _bannerUrl = '${p['banner_url'] ?? ''}';
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Future<void> _pickImage(bool logo) async {
    final repo = context.read<SettingsRepository>();
    final source = await _sourceSheet();
    if (source == null) return;
    try {
      final x = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: logo ? 800 : 1600);
      if (x == null) return;
      setState(() => logo ? _uploadingLogo = true : _uploadingBanner = true);
      final url = await repo.uploadImage(x.path);
      if (!mounted) return;
      setState(() {
        if (logo) {
          _logoUrl = url;
          _uploadingLogo = false;
        } else {
          _bannerUrl = url;
          _uploadingBanner = false;
        }
        _dirty = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploadingLogo = false;
        _uploadingBanner = false;
      });
      BkToast.error(context, 'Gagal mengunggah gambar', subtitle: '$e');
    }
  }

  Future<ImageSource?> _sourceSheet() {
    return showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: BK.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined, color: BK.accent),
            title: const Text('Pilih dari galeri'),
            onTap: () => Navigator.pop(ctx, ImageSource.gallery),
          ),
          ListTile(
            leading: const Icon(Icons.camera_alt_outlined, color: BK.accent),
            title: const Text('Ambil foto'),
            onTap: () => Navigator.pop(ctx, ImageSource.camera),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  Future<void> _save() async {
    final profile = _profile;
    if (profile == null) return;
    setState(() => _saving = true);
    profile['logo_url'] = _logoUrl;
    profile['banner_url'] = _bannerUrl;
    try {
      await context.read<SettingsRepository>().saveProfile(profile);
      if (!mounted) return;
      _dirty = false;
      BkToast.success(context, 'Branding disimpan');
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal menyimpan', subtitle: '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final discard = await _confirmDiscard();
        if (!discard) return;
        if (!context.mounted) return;
        Navigator.of(context).pop();
      },
      child: _scaffold(context),
    );
  }

  Widget _scaffold(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Branding',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
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
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                  children: [
                    _group('LOGO'),
                    _logoPicker(),
                    const SizedBox(height: 16),
                    _group('BANNER'),
                    _bannerPicker(),
                  ],
                ),
      bottomNavigationBar: _loading || _error != null
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: (_saving || _uploadingLogo || _uploadingBanner) ? null : _save,
                child: Text(_saving ? 'Menyimpan…' : 'Simpan', style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
    );
  }

  Widget _group(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(t,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
      );

  Widget _logoPicker() {
    return Row(children: [
      GestureDetector(
        onTap: _uploadingLogo ? null : () => _pickImage(true),
        child: Container(
          width: 84,
          height: 84,
          decoration: BoxDecoration(
            color: BK.card,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: BK.line),
            image: (!_uploadingLogo && _logoUrl.isNotEmpty)
                ? DecorationImage(image: NetworkImage(_logoUrl), fit: BoxFit.cover)
                : null,
          ),
          child: _uploadingLogo
              ? const Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5)))
              : _logoUrl.isEmpty
                  ? const Icon(Icons.add_a_photo_outlined, color: BK.ink3, size: 26)
                  : null,
        ),
      ),
      const SizedBox(width: 14),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Logo bisnis', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
          const SizedBox(height: 3),
          const Text('Tampil di header & profil. Rasio persegi paling pas.',
              style: TextStyle(fontSize: 11.5, color: BK.ink3, height: 1.35)),
          const SizedBox(height: 6),
          TextButton(
            onPressed: _uploadingLogo ? null : () => _pickImage(true),
            style: TextButton.styleFrom(foregroundColor: BK.accent, padding: EdgeInsets.zero, minimumSize: const Size(0, 0)),
            child: Text(_logoUrl.isEmpty ? 'Unggah logo' : 'Ganti logo', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          ),
        ]),
      ),
    ]);
  }

  Widget _bannerPicker() {
    return GestureDetector(
      onTap: _uploadingBanner ? null : () => _pickImage(false),
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: BK.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: BK.line),
          image: (!_uploadingBanner && _bannerUrl.isNotEmpty)
              ? DecorationImage(image: NetworkImage(_bannerUrl), fit: BoxFit.cover)
              : null,
        ),
        child: _uploadingBanner
            ? const Center(child: CircularProgressIndicator(strokeWidth: 2.5))
            : _bannerUrl.isEmpty
                ? const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.add_photo_alternate_outlined, color: BK.ink3, size: 30),
                    SizedBox(height: 6),
                    Text('Unggah banner', style: TextStyle(fontSize: 12.5, color: BK.ink3, fontWeight: FontWeight.w600)),
                  ])
                : Align(
                    alignment: Alignment.bottomRight,
                    child: Container(
                      margin: const EdgeInsets.all(8),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(20)),
                      child: const Text('Ganti', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700)),
                    ),
                  ),
      ),
    );
  }

  Future<bool> _confirmDiscard() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Buang perubahan?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: const Text('Perubahan branding belum disimpan.', style: TextStyle(fontSize: 13.5, color: BK.ink2)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx, false), child: const Text('Lanjut edit')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.crit),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Buang'),
          ),
        ],
      ),
    );
    return ok ?? false;
  }
}
