import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme.dart';
import '../ui/toast.dart';
import '../repositories/settings_repository.dart';

/// "Biar ditemukan" — copy discovery bisnis untuk feed Explore Bookinaja
/// (marketplace), beda dari Identitas & kontak (data resmi di halaman sendiri).
/// Mengedit subset field profil tenant lewat PUT /admin/profile (objek utuh),
/// jadi GET dulu, ubah, lalu kirim map balik.
class BusinessDiscoveryScreen extends StatefulWidget {
  const BusinessDiscoveryScreen({super.key});

  @override
  State<BusinessDiscoveryScreen> createState() => _BusinessDiscoveryScreenState();
}

class _BusinessDiscoveryScreenState extends State<BusinessDiscoveryScreen> {
  Map<String, dynamic>? _profile;
  bool _loading = true;
  bool _saving = false;
  bool _dirty = false;
  String? _error;

  final _headline = TextEditingController();
  final _highlight = TextEditingController();
  final _subheadline = TextEditingController();
  final _promoLabel = TextEditingController();
  List<String> _tags = [];
  List<String> _badges = [];

  // Read-only (dikontrol plan/admin) — hanya untuk info.
  bool _featured = false;
  bool _promoted = false;
  int _impressions = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_headline, _highlight, _subheadline, _promoLabel]) {
      c.dispose();
    }
    super.dispose();
  }

  List<String> _strList(dynamic v) => v is List
      ? v.map((e) => '$e').where((s) => s.trim().isNotEmpty).toList()
      : <String>[];

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final p = await context.read<SettingsRepository>().getProfile();
      String s(String k) => '${p[k] ?? ''}';
      int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
      _headline.text = s('discovery_headline');
      _highlight.text = s('highlight_copy');
      _subheadline.text = s('discovery_subheadline');
      _promoLabel.text = s('promo_label');
      setState(() {
        _profile = p;
        _tags = _strList(p['discovery_tags']);
        _badges = _strList(p['discovery_badges']);
        _featured = p['discovery_featured'] == true;
        _promoted = p['discovery_promoted'] == true;
        _impressions = money(p['discovery_impressions_30d']);
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
    final profile = _profile;
    if (profile == null) return;
    setState(() => _saving = true);
    profile['discovery_headline'] = _headline.text.trim();
    profile['highlight_copy'] = _highlight.text.trim();
    profile['discovery_subheadline'] = _subheadline.text.trim();
    profile['promo_label'] = _promoLabel.text.trim();
    profile['discovery_tags'] = _tags;
    profile['discovery_badges'] = _badges;
    try {
      await context.read<SettingsRepository>().saveProfile(profile);
      if (!mounted) return;
      _dirty = false;
      BkToast.success(context, 'Discovery disimpan');
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal menyimpan', subtitle: '$e');
    }
  }

  void _markDirty() {
    if (!_dirty) setState(() => _dirty = true);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final discard = await _confirmDiscard();
        if (!discard || !context.mounted) return;
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
        title: const Text('Biar ditemukan',
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
                    Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: BK.accentSoft,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: BK.accent.withValues(alpha: 0.25)),
                      ),
                      child: const Row(children: [
                        Icon(Icons.travel_explore_rounded, size: 18, color: BK.accent),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text('Ini tampil di feed Explore Bookinaja — bikin calon pelanggan yang belum kenal tertarik & mudah menemukanmu.',
                              style: TextStyle(fontSize: 12, color: BK.ink2, height: 1.35)),
                        ),
                      ]),
                    ),
                    _group('COPY DISCOVERY'),
                    _field('Judul singkat', _headline, hint: 'mis. Tempat main private yang gampang dipesan'),
                    _field('Sorotan', _highlight, hint: 'mis. Cocok buat malam, private room, rame-rame', maxLines: 2),
                    _field('Deskripsi', _subheadline, hint: 'Suasana, kegunaan, atau momen terbaik untuk booking', maxLines: 3),
                    _field('Label kecil', _promoLabel, hint: 'mis. Lagi ramai · Private room'),
                    const SizedBox(height: 8),
                    _group('KATA BANTU (PENCARIAN)'),
                    _chipEditor(
                      _tags,
                      hint: 'mis. Private Room, PS5',
                      onChanged: (v) => setState(() { _tags = v; _markDirty(); }),
                    ),
                    const SizedBox(height: 8),
                    _group('BADGE'),
                    _chipEditor(
                      _badges,
                      hint: 'mis. Buka Sampai Malam',
                      onChanged: (v) => setState(() { _badges = v; _markDirty(); }),
                    ),
                    const SizedBox(height: 8),
                    _statusCard(),
                  ],
                ),
      bottomNavigationBar: _loading || _error != null
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: _saving ? null : _save,
                child: Text(_saving ? 'Menyimpan…' : 'Simpan', style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
    );
  }

  Widget _group(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8, top: 4),
        child: Text(t,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
      );

  Widget _field(String label, TextEditingController c, {String? hint, int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 6),
        TextField(
          controller: c,
          maxLines: maxLines,
          onChanged: (_) => _markDirty(),
          style: const TextStyle(fontSize: 14, color: BK.ink),
          decoration: InputDecoration(
            hintText: hint,
            isDense: true,
            filled: true,
            fillColor: BK.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
          ),
        ),
      ]),
    );
  }

  /// Editor daftar chip (tags/badges): input + tambah, chip bisa dihapus.
  Widget _chipEditor(List<String> items, {required String hint, required ValueChanged<List<String>> onChanged}) {
    final ctrl = TextEditingController();
    void add() {
      final v = ctrl.text.trim();
      if (v.isEmpty) return;
      if (items.any((e) => e.toLowerCase() == v.toLowerCase())) {
        ctrl.clear();
        return;
      }
      onChanged([...items, v]);
      ctrl.clear();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (items.isNotEmpty) ...[
          Wrap(spacing: 7, runSpacing: 7, children: [
            for (final it in items)
              Container(
                padding: const EdgeInsets.fromLTRB(12, 7, 6, 7),
                decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(999), border: Border.all(color: BK.accent.withValues(alpha: 0.3))),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(it, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.accent)),
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => onChanged(items.where((e) => e != it).toList()),
                    child: const Icon(Icons.close_rounded, size: 15, color: BK.accent),
                  ),
                ]),
              ),
          ]),
          const SizedBox(height: 8),
        ],
        Row(children: [
          Expanded(
            child: TextField(
              controller: ctrl,
              onSubmitted: (_) => add(),
              textInputAction: TextInputAction.done,
              style: const TextStyle(fontSize: 14, color: BK.ink),
              decoration: InputDecoration(
                hintText: hint,
                isDense: true,
                filled: true,
                fillColor: BK.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            height: 44,
            child: FilledButton(
              style: FilledButton.styleFrom(backgroundColor: BK.accentSoft, foregroundColor: BK.accent, elevation: 0, padding: const EdgeInsets.symmetric(horizontal: 16)),
              onPressed: add,
              child: const Icon(Icons.add_rounded, size: 20),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _statusCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(14), border: Border.all(color: BK.line)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.insights_rounded, size: 16, color: BK.ink3),
          SizedBox(width: 8),
          Text('Status penonjolan', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: BK.ink)),
        ]),
        const SizedBox(height: 4),
        const Text('Dikontrol paket & tim Bookinaja — tak bisa diubah di sini.',
            style: TextStyle(fontSize: 11.5, color: BK.ink3)),
        const SizedBox(height: 12),
        _statusRow('Ditonjolkan (featured)', _featured),
        _statusRow('Dipromosikan (promoted)', _promoted),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Row(children: [
            const Expanded(child: Text('Muncul di feed (30 hari)', style: TextStyle(fontSize: 13, color: BK.ink2))),
            Text('${_impressions}x', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
          ]),
        ),
      ]),
    );
  }

  Widget _statusRow(String label, bool on) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13, color: BK.ink2))),
          Icon(on ? Icons.check_circle_rounded : Icons.remove_circle_outline_rounded,
              size: 18, color: on ? BK.live : BK.ink3),
          const SizedBox(width: 5),
          Text(on ? 'Aktif' : 'Nonaktif',
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: on ? BK.live : BK.ink3)),
        ]),
      );

  Future<bool> _confirmDiscard() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Buang perubahan?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: const Text('Perubahan discovery belum disimpan.', style: TextStyle(fontSize: 13.5, color: BK.ink2)),
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
