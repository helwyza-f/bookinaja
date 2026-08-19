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
        centerTitle: false,
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
        loading: () => const LoadingList(),
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
        _gallerySection(context, c, r),
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

  Widget _gallerySection(BuildContext context, ResourceDetailController c, AdminResource r) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Text('GALERI',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(20)),
            child: Text('${r.gallery.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
          ),
          const Spacer(),
          TextButton.icon(
            onPressed: c.saving ? null : () => _addGallery(context, c),
            style: TextButton.styleFrom(foregroundColor: BK.accent, padding: const EdgeInsets.symmetric(horizontal: 8)),
            icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
            label: const Text('Tambah', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          ),
        ]),
        const SizedBox(height: 2),
        const Text('Foto tambahan yang tampil di halaman resource untuk customer.',
            style: TextStyle(fontSize: 12, color: BK.ink3)),
        const SizedBox(height: 10),
        if (r.gallery.isEmpty)
          GestureDetector(
            onTap: c.saving ? null : () => _addGallery(context, c),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: BK.card,
                borderRadius: BorderRadius.circular(BK.radius),
                border: Border.all(color: BK.line),
              ),
              child: const Column(children: [
                Icon(Icons.photo_library_outlined, color: BK.ink3, size: 26),
                SizedBox(height: 8),
                Text('Belum ada foto galeri. Ketuk untuk menambah.',
                    textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: BK.ink3)),
              ]),
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [for (final url in r.gallery) _galleryThumb(context, c, url)],
          ),
      ],
    );
  }

  Widget _galleryThumb(BuildContext context, ResourceDetailController c, String url) {
    return SizedBox(
      width: 88,
      height: 88,
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(url, width: 88, height: 88, fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                      width: 88, height: 88,
                      color: BK.card2,
                      child: const Icon(Icons.broken_image_outlined, color: BK.ink3),
                    )),
          ),
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: c.saving ? null : () => _removeGallery(context, c, url),
              child: Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(color: Color(0xCC0D1526), shape: BoxShape.circle),
                child: const Icon(Icons.close, size: 15, color: Colors.white),
              ),
            ),
          ),
        ],
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
            _advancedRow('Fasilitas', r.description.isEmpty ? '—' : r.description),
            if (r.about.isNotEmpty) _advancedRow('Tentang', r.about),
            _advancedRow('Mode operasi', r.operatingMode.isEmpty ? 'Default' : r.operatingMode),
            const SizedBox(height: 14),
            const Divider(height: 1, color: BK.line),
            const SizedBox(height: 12),
            _dpOverrideSection(context, c, r),
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

  /// DP override section — toggle + percentage input untuk override global policy.
  Widget _dpOverrideSection(BuildContext context, ResourceDetailController c, AdminResource r) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Override DP', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink)),
                  Text('Gunakan % custom untuk resource ini', style: TextStyle(fontSize: 11, color: BK.ink3)),
                ],
              ),
            ),
            Transform.scale(
              scale: 0.8,
              child: Switch(
                value: r.dpEnabled,
                activeThumbColor: BK.live,
                onChanged: (v) => c.editResource(r.copyWith(dpEnabled: v)),
              ),
            ),
          ],
        ),
        if (r.dpEnabled) ...[
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: TextEditingController(text: r.dpPercentage == 0 ? '' : r.dpPercentage.toStringAsFixed(0)),
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: '0-100',
                    hintStyle: const TextStyle(color: BK.ink3),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onChanged: (v) {
                    final pct = double.tryParse(v) ?? 0;
                    c.editResource(r.copyWith(dpPercentage: pct.clamp(0, 100)));
                  },
                ),
              ),
              const SizedBox(width: 10),
              const Text('%', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
            ],
          ),
        ],
      ],
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

  Future<void> _addGallery(BuildContext context, ResourceDetailController c) async {
    final source = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _GallerySourceSheet(),
    );
    if (source == null || !context.mounted) return;

    final picker = ImagePicker();
    try {
      final List<String> paths;
      if (source == 'camera') {
        final x = await picker.pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 1600);
        if (x == null) return;
        paths = [x.path];
      } else if (source == 'single') {
        final x = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 1600);
        if (x == null) return;
        paths = [x.path];
      } else {
        final imgs = await picker.pickMultiImage(imageQuality: 80, maxWidth: 1600);
        if (imgs.isEmpty) return;
        paths = imgs.map((e) => e.path).toList();
      }
      if (!context.mounted) return;
      final t = BkToast.loading(context, 'Mengunggah ${paths.length} foto…');
      final ok = await c.addGalleryImages(paths);
      t.dismiss();
      if (!context.mounted) return;
      ok
          ? BkToast.success(context, paths.length > 1 ? '${paths.length} foto ditambahkan' : 'Foto ditambahkan')
          : BkToast.error(context, c.error ?? 'Gagal menambah foto');
    } catch (e) {
      if (!context.mounted) return;
      BkToast.error(context, 'Gagal upload foto', subtitle: '$e');
    }
  }

  Future<void> _removeGallery(BuildContext context, ResourceDetailController c, String url) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Hapus foto?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: const Text('Foto ini akan dihapus dari galeri resource.',
            style: TextStyle(fontSize: 13.5, color: BK.ink2)),
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
    if (yes != true || !context.mounted) return;
    final ok = await c.removeGalleryImage(url);
    if (!context.mounted) return;
    ok
        ? BkToast.success(context, 'Foto dihapus')
        : BkToast.error(context, c.error ?? 'Gagal menghapus foto');
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
      builder: (_) => _ItemFormSheet(
        isMain: isMain,
        existing: existing,
        repo: context.read<ResourceAdminRepository>(),
        currentResourceId: c.resource?.id ?? '',
      ),
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

/// Subjudul baris item: pola jual + durasi sesi + tanda batasan jam/hari.
String _itemSubtitle(ResourceItem item) {
  final parts = <String>[priceUnitLabel(item.priceUnit)];
  if (item.priceUnit.toLowerCase() == 'session' && item.unitDuration > 0) {
    final h = item.unitDuration ~/ 60;
    final m = item.unitDuration % 60;
    parts.add(h == 0 ? '$m mnt' : (m == 0 ? '$h jam' : '${h}j ${m}m'));
  }
  if (item.timeLock.enabled || item.dayLock.enabled) parts.add('terbatas');
  return parts.join(' · ');
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
              Text(item.name.isEmpty ? 'Tanpa nama' : item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
              const SizedBox(height: 4),
              Row(children: [
                Flexible(
                  child: Text(_itemSubtitle(item),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                ),
                if (item.isDefault) ...[
                  const SizedBox(width: 7),
                  Pill.acc('Default'),
                ],
              ]),
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
  late final TextEditingController _about;
  late final TextEditingController _dpPercentage;
  late bool _dpEnabled;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.resource.name);
    _category = TextEditingController(text: widget.resource.category);
    _desc = TextEditingController(text: widget.resource.description);
    _about = TextEditingController(text: widget.resource.about);
    _dpPercentage = TextEditingController(text: widget.resource.dpPercentage == 0 ? '' : widget.resource.dpPercentage.toStringAsFixed(0));
    _dpEnabled = widget.resource.dpEnabled;
  }

  @override
  void dispose() {
    _name.dispose();
    _category.dispose();
    _desc.dispose();
    _about.dispose();
    _dpPercentage.dispose();
    super.dispose();
  }

  void _submit() {
    final name = _name.text.trim().toUpperCase();
    if (name.isEmpty) {
      BkToast.warning(context, 'Nama wajib diisi');
      return;
    }
    final dpPct = double.tryParse(_dpPercentage.text) ?? 0;
    Navigator.of(context).pop(widget.resource.copyWith(
      name: name,
      category: _category.text.trim().toUpperCase(),
      description: _desc.text.trim(),
      about: _about.text.trim(),
      dpEnabled: _dpEnabled,
      dpPercentage: dpPct.clamp(0, 100),
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
                _field('Kategori', _category, hint: 'mis. RUANGAN / LAPANGAN'),
                const SizedBox(height: 5),
                const Text('Jadi chip filter di katalog. Otomatis dikapitalkan; samakan penulisan unit sejenis.',
                    style: TextStyle(fontSize: 11, color: BK.ink3, height: 1.3)),
                const SizedBox(height: 12),
                _field('Fasilitas', _desc, hint: 'mis. AC, Shower, Parkir luas', maxLines: 3),
                const SizedBox(height: 5),
                const Text('Pisahkan tiap fasilitas dengan koma. Tampil sebagai daftar & tagline singkat di halaman unit.',
                    style: TextStyle(fontSize: 11, color: BK.ink3, height: 1.3)),
                const SizedBox(height: 12),
                _field('Tentang unit ini (opsional)', _about, hint: 'Deskripsi naratif, bukan daftar', maxLines: 4),
                const SizedBox(height: 18),
                const Divider(height: 1, color: BK.line),
                const SizedBox(height: 12),
                // DP Override section
                Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Override DP', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink)),
                          Text('Gunakan % custom untuk unit ini', style: TextStyle(fontSize: 11, color: BK.ink3)),
                        ],
                      ),
                    ),
                    Transform.scale(
                      scale: 0.8,
                      child: Switch(
                        value: _dpEnabled,
                        activeThumbColor: BK.live,
                        onChanged: (v) => setState(() => _dpEnabled = v),
                      ),
                    ),
                  ],
                ),
                if (_dpEnabled) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _dpPercentage,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: '0-100',
                            hintStyle: const TextStyle(color: BK.ink3),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onChanged: (v) => setState(() {}),
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Text('%', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
                    ],
                  ),
                ],
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: BK.accent,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: _submit,
                    child: const Text('Simpan', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
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
  final ResourceAdminRepository? repo; // untuk saran "salin addon"
  final String currentResourceId;
  const _ItemFormSheet({
    required this.isMain,
    this.existing,
    this.repo,
    this.currentResourceId = '',
  });

  @override
  State<_ItemFormSheet> createState() => _ItemFormSheetState();
}

const _sessionPresets = [60, 90, 120, 180];

class _ItemFormSheetState extends State<_ItemFormSheet> {
  late final TextEditingController _name;
  late final TextEditingController _price;
  late final TextEditingController _customDur; // menit, saat "Durasi lain"
  late String _unit;
  late bool _isDefault;
  late int _durationMinutes;
  late bool _customDuration;

  // Batasi jam / hari (metadata) — hanya untuk paket utama.
  late bool _lockEnabled;
  late String _lockFrom;
  late String _lockTo;
  late bool _dayLockEnabled;
  late List<int> _lockDays;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?.name ?? '');
    _price = TextEditingController(text: e != null && e.price > 0 ? '${e.price}' : '');
    // Addon selalu per-pcs (mengikuti web); hanya paket utama yang punya pola jual.
    _unit = e?.priceUnit ?? (widget.isMain ? 'hour' : 'pcs');
    _isDefault = e?.isDefault ?? false;
    _durationMinutes = (e != null && e.unitDuration > 0) ? e.unitDuration : defaultUnitMinutes(_unit);
    _customDuration = _unit == 'session' && !_sessionPresets.contains(_durationMinutes);
    _customDur = TextEditingController(text: _customDuration ? '$_durationMinutes' : '');

    final tl = e?.timeLock ?? const ItemTimeLock();
    _lockEnabled = tl.enabled;
    _lockFrom = tl.from;
    _lockTo = tl.to;
    final dl = e?.dayLock ?? const ItemDayLock();
    _dayLockEnabled = dl.enabled;
    _lockDays = [...dl.days];

    // Saran "salin addon" — hanya untuk addon baru.
    if (!widget.isMain && !_isEdit && widget.repo != null) {
      _loadSuggestions();
    }
  }

  List<AddonSuggestion> _suggestions = const [];
  bool _loadingSuggestions = false;

  Future<void> _loadSuggestions() async {
    setState(() => _loadingSuggestions = true);
    try {
      final list = await widget.repo!.addonCatalog(excludeResourceId: widget.currentResourceId);
      if (mounted) setState(() => _suggestions = list);
    } catch (_) {
      // Diam saja — saran bersifat opsional.
    } finally {
      if (mounted) setState(() => _loadingSuggestions = false);
    }
  }

  void _applySuggestion(AddonSuggestion s) {
    setState(() {
      _name.text = s.name;
      _price.text = s.price > 0 ? '${s.price}' : '';
      _unit = 'pcs';
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _customDur.dispose();
    super.dispose();
  }

  void _selectUnit(String u) {
    setState(() {
      _unit = u;
      _durationMinutes = defaultUnitMinutes(u);
      _customDuration = false;
      _customDur.text = '';
    });
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
    var dur = _durationMinutes;
    if (_unit == 'session' && _customDuration) {
      dur = int.tryParse(_customDur.text.trim()) ?? 0;
      if (dur < 1) {
        BkToast.warning(context, 'Durasi harus lebih dari 0 menit');
        return;
      }
    }
    if (widget.isMain && _dayLockEnabled && _lockDays.isEmpty) {
      BkToast.warning(context, 'Pilih minimal satu hari, atau matikan batasi hari');
      return;
    }
    final base = widget.existing ?? ResourceItem(itemType: widget.isMain ? kItemMain : kItemAddon);
    Navigator.of(context).pop(_ItemResult(
      item: base.copyWith(
        name: name,
        price: price,
        priceUnit: _unit,
        unitDuration: dur < 1 ? defaultUnitMinutes(_unit) : dur,
        itemType: widget.isMain ? kItemMain : kItemAddon,
        isDefault: widget.isMain ? _isDefault : false,
        timeLock: ItemTimeLock(enabled: widget.isMain && _lockEnabled, from: _lockFrom, to: _lockTo),
        dayLock: ItemDayLock(enabled: widget.isMain && _dayLockEnabled, days: _lockDays),
      ),
    ));
  }

  Future<void> _pickTime(bool isFrom) async {
    final parts = (isFrom ? _lockFrom : _lockTo).split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts.first) ?? 8,
      minute: parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0,
    );
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked == null) return;
    final str = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    setState(() => isFrom ? _lockFrom = str : _lockTo = str);
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
                if (!widget.isMain && !_isEdit) _addonSuggestions(),
                _LabeledField(
                    label: 'Nama',
                    controller: _name,
                    hint: widget.isMain ? 'mis. 1 Jam / Paket 3 Jam' : 'mis. Tambahan bola / Sewa stik'),
                const SizedBox(height: 12),
                _LabeledField(label: 'Harga (Rp)', controller: _price, hint: '50000', keyboard: TextInputType.number),
                if (!widget.isMain) ...[
                  const SizedBox(height: 8),
                  const Text('Addon dihitung per pcs (per item). Customer memilih jumlahnya saat booking.',
                      style: TextStyle(fontSize: 11, color: BK.ink3, height: 1.3)),
                ],
                if (widget.isMain) ...[
                  const SizedBox(height: 14),
                  const Text('Pola jual', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
                  const SizedBox(height: 7),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final u in kPriceUnits) _unitChip(u),
                  ]),
                  const SizedBox(height: 14),
                  _durationSection(),
                  const SizedBox(height: 14),
                  _defaultToggle(),
                  const SizedBox(height: 14),
                  _lockCard(
                    title: 'Batasi jam paket ini',
                    subtitle: 'Default tersedia semua jam. Aktifkan agar paket hanya bisa dipesan pada rentang jam tertentu.',
                    value: _lockEnabled,
                    onChanged: (v) => setState(() => _lockEnabled = v),
                    child: _timeLockBody(),
                  ),
                  const SizedBox(height: 10),
                  _lockCard(
                    title: 'Batasi hari paket ini',
                    subtitle: 'Default tersedia semua hari. Aktifkan untuk paket khusus hari tertentu (mis. weekend).',
                    value: _dayLockEnabled,
                    onChanged: (v) => setState(() => _dayLockEnabled = v),
                    child: _dayLockBody(),
                  ),
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
      onTap: () => _selectUnit(u),
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

  /// Durasi satu unit. Untuk "sesi" bisa dipilih preset/kustom; unit lain
  /// durasinya tetap (60 mnt/jam, 1440/hari, dst.) dan cukup ditampilkan.
  Widget _durationSection() {
    if (_unit != 'session') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(11), border: Border.all(color: BK.line)),
        child: Text.rich(TextSpan(children: [
          TextSpan(
            text: '1 ${_unitWord(_unit)} per unit. ',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: BK.ink),
          ),
          const TextSpan(
            text: 'Customer memilih jumlahnya saat booking.',
            style: TextStyle(fontSize: 12, color: BK.ink3),
          ),
        ])),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Durasi per sesi', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 7),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final m in _sessionPresets) _durChip(_durLabel(m), !_customDuration && _durationMinutes == m, () {
            setState(() {
              _customDuration = false;
              _durationMinutes = m;
            });
          }),
          _durChip('Durasi lain', _customDuration, () => setState(() => _customDuration = true)),
        ]),
        if (_customDuration) ...[
          const SizedBox(height: 10),
          Row(children: [
            SizedBox(
              width: 110,
              child: TextField(
                controller: _customDur,
                keyboardType: TextInputType.number,
                onChanged: (v) => setState(() => _durationMinutes = int.tryParse(v.trim()) ?? 0),
                style: const TextStyle(fontSize: 13.5, color: BK.ink),
                decoration: InputDecoration(
                  hintText: '90',
                  isDense: true,
                  filled: true, fillColor: BK.card,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text('menit${_durationMinutes > 0 ? ' · ${_durLabel(_durationMinutes)}' : ''}',
                style: const TextStyle(fontSize: 12, color: BK.ink3, fontWeight: FontWeight.w600)),
          ]),
        ],
      ],
    );
  }

  Widget _durChip(String label, bool on, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
        decoration: BoxDecoration(
          color: on ? BK.accentSoft : BK.card,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: on ? BK.accent : BK.line),
        ),
        child: Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: on ? BK.accent : BK.ink2)),
      ),
    );
  }

  Widget _lockCard({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: BK.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: BK.ink)),
                const SizedBox(height: 3),
                Text(subtitle, style: const TextStyle(fontSize: 11, color: BK.ink3, height: 1.3)),
              ]),
            ),
            const SizedBox(width: 8),
            Switch(value: value, activeThumbColor: BK.accent, onChanged: onChanged),
          ]),
          if (value) ...[const SizedBox(height: 10), child],
        ],
      ),
    );
  }

  Widget _timeLockBody() {
    return Row(children: [
      Expanded(child: _timeField('Dari jam', _lockFrom, () => _pickTime(true))),
      const SizedBox(width: 10),
      Expanded(child: _timeField('Sampai jam', _lockTo, () => _pickTime(false))),
    ]);
  }

  Widget _timeField(String label, String value, VoidCallback onTap) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: BK.ink3)),
        const SizedBox(height: 5),
        GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(11), border: Border.all(color: BK.line)),
            child: Row(children: [
              const Icon(Icons.schedule_rounded, size: 16, color: BK.ink3),
              const SizedBox(width: 8),
              Text(value, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _dayLockBody() {
    const labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    return Wrap(spacing: 7, runSpacing: 7, children: [
      for (int d = 1; d <= 7; d++)
        GestureDetector(
          onTap: () => setState(() {
            _lockDays.contains(d) ? _lockDays.remove(d) : _lockDays.add(d);
          }),
          child: Container(
            width: 42,
            padding: const EdgeInsets.symmetric(vertical: 9),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _lockDays.contains(d) ? BK.accent : BK.card2,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: _lockDays.contains(d) ? BK.accent : BK.line),
            ),
            child: Text(labels[d - 1],
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _lockDays.contains(d) ? Colors.white : BK.ink2)),
          ),
        ),
    ]);
  }

  String _unitWord(String u) {
    switch (u.toLowerCase()) {
      case 'day':
        return 'hari';
      case 'week':
        return 'minggu';
      case 'month':
        return 'bulan';
      case 'year':
        return 'tahun';
      default:
        return 'jam';
    }
  }

  String _durLabel(int minutes) {
    if (minutes <= 0) return '';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h == 0) return '$m menit';
    if (m == 0) return '$h jam';
    return '$h jam $m menit';
  }

  /// Tombol ringkas "salin dari addon lain" — buka picker terpisah agar form
  /// tetap lega. Disembunyikan saat loading / tak ada saran.
  Widget _addonSuggestions() {
    if (_loadingSuggestions || _suggestions.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: InkWell(
        onTap: _openCopyPicker,
        borderRadius: BorderRadius.circular(13),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: BK.accentSoft,
            borderRadius: BorderRadius.circular(13),
          ),
          child: Row(children: [
            const Icon(Icons.content_copy_rounded, size: 18, color: BK.accent),
            const SizedBox(width: 11),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Salin dari addon lain',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: BK.accent)),
                const SizedBox(height: 2),
                Text('${_suggestions.length} addon dari resource lain',
                    style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
              ]),
            ),
            const Icon(Icons.chevron_right, size: 20, color: BK.accent),
          ]),
        ),
      ),
    );
  }

  Future<void> _openCopyPicker() async {
    final picked = await showModalBottomSheet<AddonSuggestion>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddonCopySheet(suggestions: _suggestions),
    );
    if (picked != null) _applySuggestion(picked);
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

/// Picker untuk menyalin addon yang sudah ada di resource lain.
class _AddonCopySheet extends StatefulWidget {
  final List<AddonSuggestion> suggestions;
  const _AddonCopySheet({required this.suggestions});

  @override
  State<_AddonCopySheet> createState() => _AddonCopySheetState();
}

class _AddonCopySheetState extends State<_AddonCopySheet> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final q = _q.trim().toLowerCase();
    final list = q.isEmpty
        ? widget.suggestions
        : widget.suggestions.where((s) =>
            s.name.toLowerCase().contains(q) || s.resourceName.toLowerCase().contains(q)).toList();
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
        decoration: const BoxDecoration(color: BK.bg, borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 14),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 18),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Salin addon', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: TextField(
                  onChanged: (v) => setState(() => _q = v),
                  decoration: InputDecoration(
                    hintText: 'Cari addon / resource…',
                    prefixIcon: const Icon(Icons.search, size: 20, color: BK.ink3),
                    isDense: true,
                    filled: true, fillColor: BK.card,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Flexible(
                child: list.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(28),
                        child: Text('Tidak ada addon cocok.', textAlign: TextAlign.center, style: TextStyle(color: BK.ink3)),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                        itemCount: list.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final s = list[i];
                          return InkWell(
                            borderRadius: BorderRadius.circular(BK.radius),
                            onTap: () => Navigator.of(context).pop(s),
                            child: BKCard(
                              child: Row(children: [
                                Container(
                                  width: 38, height: 38,
                                  decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(10)),
                                  child: const Icon(Icons.add_circle_outline, size: 19, color: BK.accent),
                                ),
                                const SizedBox(width: 11),
                                Expanded(
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(s.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
                                    const SizedBox(height: 2),
                                    Text(s.resourceName.isEmpty ? 'pcs' : 'dari ${s.resourceName}',
                                        maxLines: 1, overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                                  ]),
                                ),
                                const SizedBox(width: 8),
                                Text('Rp ${rupiah(s.price)}',
                                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
                              ]),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Sheet pilihan sumber foto galeri: kamera, satu dari galeri, atau beberapa.
class _GallerySourceSheet extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(color: BK.bg, borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 14),
              const Text('Tambah foto galeri', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
              const SizedBox(height: 12),
              _option(context, Icons.photo_camera_outlined, 'Ambil dari kamera', 'Potret satu foto langsung', 'camera'),
              _option(context, Icons.image_outlined, 'Satu dari galeri', 'Pilih satu foto', 'single'),
              _option(context, Icons.photo_library_outlined, 'Pilih beberapa', 'Pilih banyak foto sekaligus', 'multi'),
              const SizedBox(height: 6),
            ],
          ),
        ),
      ),
    );
  }

  Widget _option(BuildContext context, IconData icon, String title, String sub, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(BK.radius),
        onTap: () => Navigator.of(context).pop(value),
        child: BKCard(
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(11)),
              child: Icon(icon, color: BK.accent, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.ink)),
                Text(sub, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
              ]),
            ),
            const Icon(Icons.chevron_right, color: BK.ink3),
          ]),
        ),
      ),
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
