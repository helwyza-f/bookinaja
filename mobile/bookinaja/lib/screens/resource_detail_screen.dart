import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../models/admin_resource.dart';
import '../repositories/resource_admin_repository.dart';
import '../state/resource_admin_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Detail/edit satu resource. Fokus: opsi harga (yang bikin resource bisa
/// dibooking) + addon. Pengaturan lain disembunyikan di panel lanjutan.
class ResourceDetailScreen extends StatelessWidget {
  final String resourceId;
  final bool promptAddOption;
  const ResourceDetailScreen({super.key, required this.resourceId, this.promptAddOption = false});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => ResourceDetailController(ctx.read<ResourceAdminRepository>(), resourceId),
      child: _View(promptAddOption: promptAddOption),
    );
  }
}

class _View extends StatefulWidget {
  final bool promptAddOption;
  const _View({required this.promptAddOption});

  @override
  State<_View> createState() => _ViewState();
}

class _ViewState extends State<_View> {
  bool _prompted = false;

  @override
  Widget build(BuildContext context) {
    final c = context.watch<ResourceDetailController>();

    // Dorong tambah opsi harga sekali, setelah resource baru dimuat & masih kosong.
    if (widget.promptAddOption && !_prompted && c.resource != null && c.resource!.mainOptions.isEmpty) {
      _prompted = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _openItemForm(context, c, isMain: true);
      });
    }

    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Detail resource',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
        actions: [
          if (c.resource != null)
            IconButton(
              icon: const Icon(Icons.edit_outlined, color: BK.ink2, size: 20),
              onPressed: () => _openBasics(context, c),
            ),
        ],
      ),
      body: c.state.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded,
          color: BK.crit,
          title: 'Gagal memuat',
          hint: '$e',
          action: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: c.load,
            child: const Text('Coba lagi'),
          ),
        ),
        data: (r) => _content(context, c, r),
      ),
    );
  }

  Widget _content(BuildContext context, ResourceDetailController c, AdminResource r) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
        _headerCard(context, c, r),
        const SizedBox(height: 20),
        _itemsSection(
          context, c,
          title: 'OPSI HARGA',
          hint: 'Paket/tarif yang bisa dibooking customer.',
          items: r.mainOptions,
          isMain: true,
        ),
        const SizedBox(height: 20),
        _itemsSection(
          context, c,
          title: 'ADDON',
          hint: 'Tambahan opsional saat booking.',
          items: r.addons,
          isMain: false,
        ),
        const SizedBox(height: 20),
        _advancedPanel(context, c, r),
      ],
    );
  }

  Widget _headerCard(BuildContext context, ResourceDetailController c, AdminResource r) {
    return BKCard(
      child: Row(
        children: [
          _cover(context, c, r),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.name.isEmpty ? 'Tanpa nama' : r.name,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: BK.ink)),
                const SizedBox(height: 3),
                Text(r.category.isEmpty ? 'Tanpa kategori' : r.category,
                    style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
                const SizedBox(height: 8),
                Row(children: [
                  r.isActive ? Pill.live('Aktif') : Pill.mut('Nonaktif'),
                  const Spacer(),
                  Transform.scale(
                    scale: 0.85,
                    child: Switch(
                      value: r.isActive,
                      activeThumbColor: BK.live,
                      onChanged: c.saving ? null : (_) => _toggleActive(context, c),
                    ),
                  ),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _cover(BuildContext context, ResourceDetailController c, AdminResource r) {
    Widget inner;
    if (r.imageUrl.isEmpty) {
      inner = const Icon(Icons.add_a_photo_outlined, color: BK.ink3);
    } else {
      inner = ClipRRect(
        borderRadius: BorderRadius.circular(13),
        child: Image.network(r.imageUrl, width: 72, height: 72, fit: BoxFit.cover,
            errorBuilder: (_, _, _) => const Icon(Icons.broken_image_outlined, color: BK.ink3)),
      );
    }
    return GestureDetector(
      onTap: () => _pickCover(context, c, r),
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(13), border: Border.all(color: BK.line)),
        child: inner,
      ),
    );
  }

  Widget _itemsSection(
    BuildContext context,
    ResourceDetailController c, {
    required String title,
    required String hint,
    required List<ResourceItem> items,
    required bool isMain,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Text(title,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(20)),
            child: Text('${items.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
          ),
          const Spacer(),
          TextButton.icon(
            onPressed: () => _openItemForm(context, c, isMain: isMain),
            style: TextButton.styleFrom(foregroundColor: BK.accent, padding: const EdgeInsets.symmetric(horizontal: 8)),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Tambah', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          ),
        ]),
        const SizedBox(height: 2),
        Text(hint, style: const TextStyle(fontSize: 12, color: BK.ink3)),
        const SizedBox(height: 10),
        if (items.isEmpty)
          _emptyItem(isMain)
        else
          BKCard(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            child: Column(children: [
              for (int i = 0; i < items.length; i++) ...[
                _ItemRow(
                  item: items[i],
                  onTap: () => _openItemForm(context, c, isMain: isMain, existing: items[i]),
                ),
                if (i < items.length - 1) const Divider(height: 1, color: BK.line),
              ],
            ]),
          ),
      ],
    );
  }

  Widget _emptyItem(bool isMain) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isMain ? BK.pendSoft : BK.card,
        borderRadius: BorderRadius.circular(BK.radius),
        border: Border.all(color: isMain ? BK.pend.withValues(alpha: .3) : BK.line),
      ),
      child: Row(children: [
        Icon(isMain ? Icons.priority_high_rounded : Icons.add_circle_outline,
            size: 18, color: isMain ? BK.pend : BK.ink3),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            isMain
                ? 'Wajib. Tambahkan minimal 1 opsi harga agar resource bisa dibooking.'
                : 'Belum ada addon. Opsional.',
            style: TextStyle(
                fontSize: 12.5,
                color: isMain ? BK.pend : BK.ink3,
                fontWeight: isMain ? FontWeight.w600 : FontWeight.w400),
          ),
        ),
      ]),
    );
  }

  Widget _advancedPanel(BuildContext context, ResourceDetailController c, AdminResource r) {
    return Container(
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(BK.radius),
        border: Border.all(color: BK.line),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
          leading: const Icon(Icons.tune_rounded, color: BK.ink2, size: 20),
          title: const Text('Pengaturan lanjutan',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
          subtitle: const Text('Deskripsi, mode operasi, hapus',
              style: TextStyle(fontSize: 11.5, color: BK.ink3)),
          children: [
            _advancedRow('Deskripsi', r.description.isEmpty ? '—' : r.description),
            _advancedRow('Mode operasi', r.operatingMode.isEmpty ? 'Default' : r.operatingMode),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: BK.ink,
                side: const BorderSide(color: BK.line),
                minimumSize: const Size.fromHeight(44),
              ),
              onPressed: () => _openBasics(context, c),
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Edit info dasar', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: BK.crit,
                side: const BorderSide(color: BK.critSoft),
                minimumSize: const Size.fromHeight(44),
              ),
              onPressed: () => _confirmDelete(context, c, r),
              icon: const Icon(Icons.delete_outline, size: 18),
              label: const Text('Hapus resource', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _advancedRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 110, child: Text(label, style: const TextStyle(fontSize: 12.5, color: BK.ink3))),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 12.5, color: BK.ink, fontWeight: FontWeight.w600))),
      ]),
    );
  }

  // --- actions ---

  Future<void> _toggleActive(BuildContext context, ResourceDetailController c) async {
    final ok = await c.toggleActive();
    if (!context.mounted) return;
    if (!ok) BkToast.error(context, c.error ?? 'Gagal mengubah status');
  }

  Future<void> _pickCover(BuildContext context, ResourceDetailController c, AdminResource r) async {
    final picker = ImagePicker();
    try {
      final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 78, maxWidth: 1600);
      if (x == null) return;
      final t = context.mounted ? BkToast.loading(context, 'Mengunggah foto…') : null;
      final url = await c.uploadCover(x.path);
      final ok = await c.saveBasics(r.copyWith(imageUrl: url));
      t?.dismiss();
      if (!context.mounted) return;
      ok ? BkToast.success(context, 'Foto diperbarui') : BkToast.error(context, c.error ?? 'Gagal menyimpan foto');
    } catch (e) {
      if (!context.mounted) return;
      BkToast.error(context, 'Gagal upload foto', subtitle: '$e');
    }
  }

  Future<void> _openBasics(BuildContext context, ResourceDetailController c) async {
    final r = c.resource;
    if (r == null) return;
    final updated = await showModalBottomSheet<AdminResource>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _BasicsSheet(resource: r),
    );
    if (updated == null || !context.mounted) return;
    final ok = await c.saveBasics(updated);
    if (!context.mounted) return;
    ok ? BkToast.success(context, 'Info tersimpan') : BkToast.error(context, c.error ?? 'Gagal menyimpan');
  }

  Future<void> _openItemForm(BuildContext context, ResourceDetailController c,
      {required bool isMain, ResourceItem? existing}) async {
    final result = await showModalBottomSheet<_ItemResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ItemFormSheet(isMain: isMain, existing: existing),
    );
    if (result == null || !context.mounted) return;
    if (result.deleted && existing != null) {
      final ok = await c.deleteItem(existing.id);
      if (!context.mounted) return;
      ok ? BkToast.success(context, 'Item dihapus') : BkToast.error(context, c.error ?? 'Gagal menghapus');
      return;
    }
    final ok = await c.saveItem(result.item!);
    if (!context.mounted) return;
    ok
        ? BkToast.success(context, existing == null ? 'Item ditambahkan' : 'Item disimpan')
        : BkToast.error(context, c.error ?? 'Gagal menyimpan');
  }

  Future<void> _confirmDelete(BuildContext context, ResourceDetailController c, AdminResource r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Hapus resource?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: Text('“${r.name}” beserta semua opsi harga & addon akan dihapus.',
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
    if (ok != true || !context.mounted) return;
    final removed = await c.deleteItemResource(context);
    if (removed && context.mounted) Navigator.of(context).pop();
  }
}

extension on ResourceDetailController {
  /// Hapus resource ini lewat repo list. Ditaruh di sini agar dialog rapi.
  Future<bool> deleteItemResource(BuildContext context) async {
    final repo = context.read<ResourceAdminRepository>();
    final r = resource;
    if (r == null) return false;
    try {
      await repo.delete(r.id);
      if (context.mounted) BkToast.success(context, 'Resource dihapus');
      return true;
    } catch (e) {
      if (context.mounted) BkToast.error(context, 'Gagal menghapus', subtitle: '$e');
      return false;
    }
  }
}

class _ItemRow extends StatelessWidget {
  final ResourceItem item;
  final VoidCallback onTap;
  const _ItemRow({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 11),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(
                  child: Text(item.name.isEmpty ? 'Tanpa nama' : item.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
                ),
                if (item.isDefault) ...[
                  const SizedBox(width: 7),
                  Pill.acc('Default'),
                ],
              ]),
              const SizedBox(height: 3),
              Text('${priceUnitLabel(item.priceUnit)}${item.unitDuration > 1 ? ' · ${item.unitDuration} unit' : ''}',
                  style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          const SizedBox(width: 8),
          Text('Rp ${rupiah(item.price)}',
              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right, color: BK.ink3, size: 20),
        ]),
      ),
    );
  }
}

// --- Basics edit sheet (nama, kategori, deskripsi, mode) ---

class _BasicsSheet extends StatefulWidget {
  final AdminResource resource;
  const _BasicsSheet({required this.resource});

  @override
  State<_BasicsSheet> createState() => _BasicsSheetState();
}

class _BasicsSheetState extends State<_BasicsSheet> {
  late final TextEditingController _name;
  late final TextEditingController _category;
  late final TextEditingController _desc;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.resource.name);
    _category = TextEditingController(text: widget.resource.category);
    _desc = TextEditingController(text: widget.resource.description);
  }

  @override
  void dispose() {
    _name.dispose();
    _category.dispose();
    _desc.dispose();
    super.dispose();
  }

  void _submit() {
    final name = _name.text.trim();
    if (name.isEmpty) {
      BkToast.warning(context, 'Nama wajib diisi');
      return;
    }
    Navigator.of(context).pop(widget.resource.copyWith(
      name: name,
      category: _category.text.trim(),
      description: _desc.text.trim(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(color: BK.bg, borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 14),
                const Text('Edit info', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
                const SizedBox(height: 16),
                _field('Nama resource', _name),
                const SizedBox(height: 12),
                _field('Kategori', _category, hint: 'mis. Ruangan / Lapangan'),
                const SizedBox(height: 12),
                _field('Deskripsi', _desc, hint: 'Ditampilkan ke customer', maxLines: 3),
                const SizedBox(height: 18),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                  onPressed: _submit,
                  child: const Text('Simpan', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController controller, {String? hint, int maxLines = 1}) =>
      _LabeledField(label: label, controller: controller, hint: hint, maxLines: maxLines);
}

// --- Item form sheet (opsi harga / addon) ---

class _ItemResult {
  final ResourceItem? item;
  final bool deleted;
  const _ItemResult({this.item, this.deleted = false});
}

class _ItemFormSheet extends StatefulWidget {
  final bool isMain;
  final ResourceItem? existing;
  const _ItemFormSheet({required this.isMain, this.existing});

  @override
  State<_ItemFormSheet> createState() => _ItemFormSheetState();
}

class _ItemFormSheetState extends State<_ItemFormSheet> {
  late final TextEditingController _name;
  late final TextEditingController _price;
  late final TextEditingController _duration;
  late String _unit;
  late bool _isDefault;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?.name ?? '');
    _price = TextEditingController(text: e != null && e.price > 0 ? '${e.price}' : '');
    _duration = TextEditingController(text: '${e?.unitDuration ?? 1}');
    _unit = e?.priceUnit ?? (widget.isMain ? 'hour' : 'session');
    _isDefault = e?.isDefault ?? false;
  }

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _duration.dispose();
    super.dispose();
  }

  void _submit() {
    final name = _name.text.trim();
    if (name.isEmpty) {
      BkToast.warning(context, 'Nama wajib diisi');
      return;
    }
    final price = int.tryParse(_price.text.trim().replaceAll('.', '')) ?? 0;
    if (price <= 0) {
      BkToast.warning(context, 'Harga harus lebih dari 0');
      return;
    }
    final dur = int.tryParse(_duration.text.trim()) ?? 1;
    final base = widget.existing ?? ResourceItem(itemType: widget.isMain ? kItemMain : kItemAddon);
    Navigator.of(context).pop(_ItemResult(
      item: base.copyWith(
        name: name,
        price: price,
        priceUnit: _unit,
        unitDuration: dur < 1 ? 1 : dur,
        itemType: widget.isMain ? kItemMain : kItemAddon,
        isDefault: widget.isMain ? _isDefault : false,
      ),
    ));
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Hapus item?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: Text('“${widget.existing!.name}” akan dihapus.',
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
    if (ok == true && mounted) Navigator.of(context).pop(const _ItemResult(deleted: true));
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final title = widget.isMain
        ? (_isEdit ? 'Edit opsi harga' : 'Tambah opsi harga')
        : (_isEdit ? 'Edit addon' : 'Tambah addon');
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(color: BK.bg, borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 14),
                Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
                const SizedBox(height: 16),
                _LabeledField(
                    label: 'Nama',
                    controller: _name,
                    hint: widget.isMain ? 'mis. 1 Jam / Paket 3 Jam' : 'mis. Tambahan bola / Sewa stik'),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: _LabeledField(label: 'Harga (Rp)', controller: _price, hint: '50000', keyboard: TextInputType.number)),
                  const SizedBox(width: 12),
                  Expanded(child: _LabeledField(label: 'Jumlah unit', controller: _duration, hint: '1', keyboard: TextInputType.number)),
                ]),
                const SizedBox(height: 14),
                const Text('Satuan', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
                const SizedBox(height: 7),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  for (final u in kPriceUnits) _unitChip(u),
                ]),
                if (widget.isMain) ...[
                  const SizedBox(height: 14),
                  _defaultToggle(),
                ],
                const SizedBox(height: 18),
                Row(children: [
                  if (_isEdit) ...[
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: BK.crit,
                        side: const BorderSide(color: BK.critSoft),
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                      ),
                      onPressed: _confirmDelete,
                      child: const Icon(Icons.delete_outline, size: 20),
                    ),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                      onPressed: _submit,
                      child: Text(_isEdit ? 'Simpan' : 'Tambah', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _unitChip(String u) {
    final on = _unit == u;
    return GestureDetector(
      onTap: () => setState(() => _unit = u),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
        decoration: BoxDecoration(
          color: on ? BK.accent : BK.card,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: on ? BK.accent : BK.line),
        ),
        child: Text(priceUnitLabel(u),
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: on ? Colors.white : BK.ink2)),
      ),
    );
  }

  Widget _defaultToggle() {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 4, 8, 4),
      decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(13), border: Border.all(color: BK.line)),
      child: Row(children: [
        const Icon(Icons.star_outline_rounded, size: 19, color: BK.accent),
        const SizedBox(width: 10),
        const Expanded(
          child: Text('Jadikan opsi default (dipilih otomatis saat booking)',
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: BK.ink)),
        ),
        Switch(value: _isDefault, activeThumbColor: BK.accent, onChanged: (v) => setState(() => _isDefault = v)),
      ]),
    );
  }
}

/// Field berlabel yang dipakai berulang di sheet.
class _LabeledField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String? hint;
  final int maxLines;
  final TextInputType? keyboard;
  const _LabeledField({
    required this.label,
    required this.controller,
    this.hint,
    this.maxLines = 1,
    this.keyboard,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboard,
          style: const TextStyle(fontSize: 13.5, color: BK.ink),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: BK.ink3, fontSize: 13),
            isDense: true,
            filled: true,
            fillColor: BK.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
          ),
        ),
      ],
    );
  }
}
