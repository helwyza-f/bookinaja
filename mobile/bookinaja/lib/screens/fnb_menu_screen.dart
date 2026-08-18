import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../models/fnb_item.dart';
import '../repositories/fnb_repository.dart';
import '../state/fnb_menu_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';
import '../utils/fnb_category.dart';

/// Layar admin: kelola menu F&B. Fokus operasional — toggle Ready/Habis cepat
/// per item, plus tambah/edit lewat form ringkas.
class FnbMenuScreen extends StatelessWidget {
  const FnbMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => FnbMenuController(ctx.read<FnbRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<FnbMenuController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Menu F&B',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      floatingActionButton: c.state.hasData
          ? FloatingActionButton.extended(
              backgroundColor: BK.accent,
              onPressed: () => _openForm(context, c),
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Tambah item',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            )
          : null,
      body: c.state.when(
        loading: () => const LoadingList(),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded,
          color: BK.crit,
          title: 'Gagal memuat menu',
          hint: '$e',
          action: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: c.load,
            child: const Text('Coba lagi'),
          ),
        ),
        data: (_) => _content(context, c),
      ),
    );
  }

  Widget _content(BuildContext context, FnbMenuController c) {
    final grouped = c.grouped;
    return Column(
      children: [
        _header(context, c),
        Expanded(
          child: c.items.isEmpty
              ? StateView(
                  icon: Icons.ramen_dining_outlined,
                  color: BK.ink3,
                  title: 'Belum ada menu',
                  hint: 'Tambahkan item pertama lewat tombol di bawah.',
                  action: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: BK.accent),
                    onPressed: () => _openForm(context, c),
                    icon: const Icon(Icons.add),
                    label: const Text('Tambah item'),
                  ),
                )
              : grouped.isEmpty
                  ? const StateView(
                      icon: Icons.search_off_rounded,
                      color: BK.ink3,
                      title: 'Tidak ada hasil',
                      hint: 'Coba kata kunci lain.')
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
                      children: [
                        for (final entry in grouped.entries) ...[
                          Padding(
                            padding: const EdgeInsets.fromLTRB(2, 14, 2, 8),
                            child: Row(children: [
                              Text(entry.key.toUpperCase(),
                                  style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 1,
                                      color: BK.ink3)),
                              const SizedBox(width: 8),
                              Text('${entry.value.length}',
                                  style: const TextStyle(
                                      fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
                            ]),
                          ),
                          BKCard(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            child: Column(children: [
                              for (int i = 0; i < entry.value.length; i++) ...[
                                _ItemRow(
                                  item: entry.value[i],
                                  onToggle: () => _toggle(context, c, entry.value[i]),
                                  onTap: () => _openForm(context, c, item: entry.value[i]),
                                ),
                                if (i < entry.value.length - 1)
                                  const Divider(height: 1, color: BK.line),
                              ],
                            ]),
                          ),
                        ],
                      ],
                    ),
        ),
      ],
    );
  }

  Widget _header(BuildContext context, FnbMenuController c) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            _stat('${c.total}', 'item'),
            const SizedBox(width: 10),
            _stat('${c.outOfStock}', 'habis', warn: c.outOfStock > 0),
          ]),
          const SizedBox(height: 12),
          TextField(
            onChanged: c.search,
            style: const TextStyle(fontSize: 14, color: BK.ink),
            decoration: InputDecoration(
              hintText: 'Cari menu…',
              hintStyle: const TextStyle(color: BK.ink3, fontSize: 14),
              prefixIcon: const Icon(Icons.search, color: BK.ink3, size: 20),
              isDense: true,
              filled: true,
              fillColor: BK.card,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: BK.line),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: BK.line),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: BK.accent),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String value, String label, {bool warn = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: warn ? BK.pendSoft : BK.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: warn ? BK.pend.withValues(alpha: .35) : BK.line),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(value,
            style: TextStyle(
                fontSize: 15, fontWeight: FontWeight.w800, color: warn ? BK.pend : BK.ink)),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(fontSize: 12, color: warn ? BK.pend : BK.ink3)),
      ]),
    );
  }

  Future<void> _toggle(BuildContext context, FnbMenuController c, FnbItem item) async {
    HapticFeedback.selectionClick();
    final ok = await c.toggleAvailability(item);
    if (!context.mounted) return;
    if (!ok) BkToast.error(context, c.error ?? 'Gagal mengubah status');
  }

  Future<void> _openForm(BuildContext context, FnbMenuController c, {FnbItem? item}) async {
    final result = await showModalBottomSheet<_FormResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ItemFormSheet(
        controller: c,
        existing: item,
      ),
    );
    if (result == null || !context.mounted) return;
    if (result.deleted) {
      final ok = await c.remove(item!);
      if (!context.mounted) return;
      ok
          ? BkToast.success(context, 'Item dihapus')
          : BkToast.error(context, c.error ?? 'Gagal menghapus');
      return;
    }
    final ok = await c.save(result.item!);
    if (!context.mounted) return;
    ok
        ? BkToast.success(context, item == null ? 'Item ditambahkan' : 'Item disimpan')
        : BkToast.error(context, c.error ?? 'Gagal menyimpan');
  }
}

class _ItemRow extends StatelessWidget {
  final FnbItem item;
  final VoidCallback onToggle;
  final VoidCallback onTap;
  const _ItemRow({required this.item, required this.onToggle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final ready = item.isAvailable;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(children: [
          _thumb(),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: ready ? BK.ink : BK.ink3,
                    decoration: ready ? null : TextDecoration.lineThrough,
                    decorationColor: BK.ink3,
                  )),
              const SizedBox(height: 2),
              Text('Rp ${rupiah(item.price)}',
                  style: const TextStyle(fontSize: 12.5, color: BK.ink2, fontWeight: FontWeight.w600)),
            ]),
          ),
          const SizedBox(width: 8),
          Column(mainAxisSize: MainAxisSize.min, children: [
            Switch(
              value: ready,
              activeThumbColor: BK.live,
              onChanged: (_) => onToggle(),
            ),
            Text(ready ? 'Ready' : 'Habis',
                style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: ready ? BK.live : BK.pend)),
          ]),
        ]),
      ),
    );
  }

  Widget _thumb() {
    final url = item.imageUrl;
    if (url == null || url.isEmpty) {
      return Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(11)),
        child: const Icon(Icons.ramen_dining_outlined, color: BK.ink3, size: 20),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(11),
      child: Image.network(url, width: 44, height: 44, fit: BoxFit.cover,
          errorBuilder: (_, _, _) => Container(
                width: 44,
                height: 44,
                color: BK.card2,
                child: const Icon(Icons.broken_image_outlined, color: BK.ink3, size: 20),
              )),
    );
  }
}

class _FormResult {
  final FnbItem? item;
  final bool deleted;
  const _FormResult({this.item, this.deleted = false});
}

class _ItemFormSheet extends StatefulWidget {
  final FnbMenuController controller;
  final FnbItem? existing;
  const _ItemFormSheet({required this.controller, this.existing});

  @override
  State<_ItemFormSheet> createState() => _ItemFormSheetState();
}

class _ItemFormSheetState extends State<_ItemFormSheet> {
  final _picker = ImagePicker();
  late final TextEditingController _name;
  late final TextEditingController _price;
  late final TextEditingController _desc;
  late String _category;
  String? _imageUrl;
  String? _localPreview;
  bool _available = true;
  bool _uploading = false;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?.name ?? '');
    _price = TextEditingController(text: e != null && e.price > 0 ? rupiah(e.price) : '');
    _category = _initialCategory(e?.category);
    _desc = TextEditingController(text: e?.description ?? '');
    _imageUrl = e?.imageUrl;
    _available = e?.isAvailable ?? true;
  }

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final x = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 75, maxWidth: 1400);
      if (x == null) return;
      setState(() {
        _uploading = true;
        _localPreview = x.path;
      });
      final url = await widget.controller.uploadImage(x.path);
      if (!mounted) return;
      setState(() {
        _imageUrl = url;
        _uploading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _uploading = false);
      BkToast.error(context, 'Gagal upload foto', subtitle: '$e');
    }
  }

  void _submit() {
    final name = _name.text.trim();
    if (name.isEmpty) {
      BkToast.warning(context, 'Nama item wajib diisi');
      return;
    }
    final price = int.tryParse(_price.text.trim().replaceAll('.', '')) ?? 0;
    if (price <= 0) {
      BkToast.warning(context, 'Harga harus lebih dari 0');
      return;
    }
    setState(() => _saving = true);
    final base = widget.existing ?? const FnbItem(id: '');
    final item = base.copyWith(
      name: name,
      price: price,
      category: _category,
      description: _desc.text.trim(),
      imageUrl: _imageUrl,
      isAvailable: _available,
    );
    Navigator.of(context).pop(_FormResult(item: item));
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Hapus item?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: Text('“${widget.existing!.name}” akan dihapus permanen dari menu.',
            style: const TextStyle(fontSize: 13.5, color: BK.ink2)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx, false), child: const Text('Batal')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.crit),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (ok == true && mounted) Navigator.of(context).pop(const _FormResult(deleted: true));
  }

  void _onPriceChanged(String v) {
    final digits = v.replaceAll(RegExp(r'[^0-9]'), '');
    final formatted = digits.isEmpty ? '' : rupiah(int.parse(digits));
    if (formatted == _price.text) return;
    _price.value = TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final maxHeight = MediaQuery.of(context).size.height * 0.92;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: Container(
          decoration: const BoxDecoration(
            color: BK.bg,
            borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
          ),
          child: SafeArea(
            top: false,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              // ── Header tetap ──
              const SizedBox(height: 10),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(2))),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 12, 8, 8),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(_isEdit ? 'Edit item' : 'Tambah item',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
                      const SizedBox(height: 1),
                      const Text('Menu F&B', style: TextStyle(fontSize: 11.5, color: BK.ink3)),
                    ]),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, color: BK.ink3),
                  ),
                ]),
              ),
              const Divider(height: 1, color: BK.line),
              // ── Konten scroll ──
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      _imagePicker(),
                      const SizedBox(width: 14),
                      Expanded(child: _field('Nama item', _name, hint: 'mis. Nasi Goreng Spesial')),
                    ]),
                    const SizedBox(height: 14),
                    _field('Harga (Rp)', _price, hint: '25.000', keyboard: TextInputType.number, onChanged: _onPriceChanged),
                    const SizedBox(height: 14),
                    _categorySelector(),
                    const SizedBox(height: 14),
                    _field('Deskripsi (opsional)', _desc, hint: 'Catatan singkat menu', maxLines: 2),
                    const SizedBox(height: 14),
                    _availabilityToggle(),
                  ]),
                ),
              ),
              // ── Footer aksi sticky ──
              Container(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 12),
                decoration: const BoxDecoration(color: BK.bg, border: Border(top: BorderSide(color: BK.line))),
                child: Row(children: [
                  if (_isEdit) ...[
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: BK.crit,
                        side: const BorderSide(color: BK.critSoft),
                        padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 16),
                      ),
                      onPressed: _saving ? null : _confirmDelete,
                      child: const Icon(Icons.delete_outline, size: 20),
                    ),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                          backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                      onPressed: (_saving || _uploading) ? null : _submit,
                      child: _saving
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(_isEdit ? 'Simpan perubahan' : 'Tambah item',
                              style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ]),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _imagePicker() {
    final preview = _localPreview;
    Widget inner;
    if (_uploading) {
      inner = const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)));
    } else if (preview != null) {
      inner = ClipRRect(borderRadius: BorderRadius.circular(13), child: Image.file(File(preview), fit: BoxFit.cover, width: 64, height: 64));
    } else if (_imageUrl != null && _imageUrl!.isNotEmpty) {
      inner = ClipRRect(
          borderRadius: BorderRadius.circular(13),
          child: Image.network(_imageUrl!, fit: BoxFit.cover, width: 64, height: 64,
              errorBuilder: (_, _, _) => const Icon(Icons.add_a_photo_outlined, color: BK.ink3)));
    } else {
      inner = const Icon(Icons.add_a_photo_outlined, color: BK.ink3);
    }
    return GestureDetector(
      onTap: _uploading ? null : _pickImage,
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: BK.card,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: BK.line),
        ),
        child: inner,
      ),
    );
  }

  /// Kategori awal: item baru default "Makanan"; edit → ternormalisasi.
  String _initialCategory(String? raw) =>
      (raw ?? '').trim().isEmpty ? 'Makanan' : normalizeFnbCategory(raw);

  /// Opsi chip = 3 kanonik + kategori item saat ini bila di luar daftar
  /// (mempertahankan data lama saat edit).
  List<String> get _categoryOptions {
    final opts = [...fnbCategories];
    if (!opts.contains(_category)) opts.add(_category);
    return opts;
  }

  Widget _categorySelector() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Kategori', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
      const SizedBox(height: 7),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final cat in _categoryOptions) _categoryChip(cat),
      ]),
    ]);
  }

  Widget _categoryChip(String cat) {
    final on = _category == cat;
    return GestureDetector(
      onTap: () => setState(() => _category = cat),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
        decoration: BoxDecoration(
          color: on ? BK.accent : BK.card,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: on ? BK.accent : BK.line),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (on) ...[
            const Icon(Icons.check_rounded, size: 15, color: Colors.white),
            const SizedBox(width: 5),
          ],
          Text(cat,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                letterSpacing: .3,
                color: on ? Colors.white : BK.ink2,
              )),
        ]),
      ),
    );
  }

  Widget _availabilityToggle() {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 6, 8, 6),
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: BK.line),
      ),
      child: Row(children: [
        Icon(_available ? Icons.check_circle_outline : Icons.remove_circle_outline,
            size: 20, color: _available ? BK.live : BK.pend),
        const SizedBox(width: 10),
        Expanded(
          child: Text(_available ? 'Ready — tersedia dijual' : 'Habis — disembunyikan dari kasir',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: BK.ink)),
        ),
        Switch(
          value: _available,
          activeThumbColor: BK.live,
          onChanged: (v) => setState(() => _available = v),
        ),
      ]),
    );
  }

  Widget _field(String label, TextEditingController controller,
      {String? hint, int maxLines = 1, TextInputType? keyboard, ValueChanged<String>? onChanged}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboard,
          onChanged: onChanged,
          style: const TextStyle(fontSize: 13.5, color: BK.ink),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: BK.ink3, fontSize: 13),
            isDense: true,
            filled: true,
            fillColor: BK.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: BK.line),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: BK.line),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: BK.accent),
            ),
          ),
        ),
      ],
    );
  }
}
