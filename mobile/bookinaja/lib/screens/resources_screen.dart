import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../models/admin_resource.dart';
import '../repositories/resource_admin_repository.dart';
import '../state/resource_admin_controller.dart';
import '../state/auth_controller.dart';
import '../models/permissions.dart';
import '../theme.dart';
import '../ui/toast.dart';
import 'resource_detail_screen.dart';

/// Layar admin: daftar resource (unit/tempat yang dibooking). Kartu ringkas
/// dengan toggle Aktif/Nonaktif + badge jumlah opsi & addon. Buat baru cukup
/// nama, lalu langsung diarahkan menambah opsi harga.
class ResourcesScreen extends StatelessWidget {
  const ResourcesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => ResourcesController(ctx.read<ResourceAdminRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<ResourcesController>();
    final canCreate = context.watch<AuthController>().can(Perm.resourcesCreate);
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Resource',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      floatingActionButton: (c.state.hasData && canCreate)
          ? FloatingActionButton.extended(
              backgroundColor: BK.accent,
              onPressed: () => _create(context, c),
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Buat resource',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            )
          : null,
      body: c.state.when(
        loading: () => const LoadingList(),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded,
          color: BK.crit,
          title: 'Gagal memuat resource',
          hint: '$e',
          action: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: c.load,
            child: const Text('Coba lagi'),
          ),
        ),
        data: (items) => items.isEmpty
            ? StateView(
                icon: Icons.storefront_outlined,
                color: BK.ink3,
                title: 'Belum ada resource',
                hint: 'Resource adalah unit/tempat yang dibooking — mis. ruangan, lapangan, atau konsol.',
                action: canCreate
                    ? FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: BK.accent),
                        onPressed: () => _create(context, c),
                        icon: const Icon(Icons.add),
                        label: const Text('Buat resource'),
                      )
                    : null,
              )
            : Column(
                children: [
                  if (c.categories.isNotEmpty) _categoryChips(c),
                  Expanded(
                    child: RefreshIndicator(
                      color: BK.accent,
                      onRefresh: c.load,
                      child: ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                        itemCount: c.filtered.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (_, i) {
                          final item = c.filtered[i];
                          return _ResourceCard(
                            item: item,
                            busy: c.isBusy(item.id),
                            onToggle: () => _toggle(context, c, item),
                            onTap: () => _openDetail(context, c, item.id),
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Future<void> _toggle(BuildContext context, ResourcesController c, ResourceListItem item) async {
    HapticFeedback.selectionClick();
    final ok = await c.toggleStatus(item);
    if (!context.mounted) return;
    if (!ok) BkToast.error(context, c.error ?? 'Gagal mengubah status');
  }

  Future<void> _openDetail(BuildContext context, ResourcesController c, String id) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ResourceDetailScreen(resourceId: id)),
    );
    if (context.mounted) c.load(); // segarkan count opsi/addon setelah kembali
  }

  Widget _categoryChips(ResourcesController c) {
    final cats = c.categories;
    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        children: [
          _chip('Semua', c.categoryFilter.isEmpty, () => c.setCategory('')),
          for (final cat in cats) ...[
            const SizedBox(width: 7),
            _chip(cat, c.categoryFilter.toLowerCase() == cat.toLowerCase(), () => c.setCategory(cat)),
          ],
        ],
      ),
    );
  }

  Widget _chip(String label, bool on, VoidCallback onTap) {
    return Center(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: on ? BK.ink : BK.card,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: on ? BK.ink : BK.line),
          ),
          child: Text(label,
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: on ? Colors.white : BK.ink2)),
        ),
      ),
    );
  }

  Future<void> _create(BuildContext context, ResourcesController c) async {
    final created = await showModalBottomSheet<AdminResource>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateSheet(repo: context.read<ResourceAdminRepository>()),
    );
    if (created == null || !context.mounted) return;
    c.load();
    // Langsung buka detail dengan dorongan menambah opsi harga.
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ResourceDetailScreen(resourceId: created.id, promptAddOption: true),
      ),
    );
    if (context.mounted) c.load();
  }
}

class _ResourceCard extends StatelessWidget {
  final ResourceListItem item;
  final bool busy;
  final VoidCallback onToggle;
  final VoidCallback onTap;
  const _ResourceCard({
    required this.item,
    required this.busy,
    required this.onToggle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final active = item.isActive;
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: onTap,
      child: BKCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _thumb(),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.name.isEmpty ? 'Tanpa nama' : item.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: BK.ink)),
                      const SizedBox(height: 3),
                      Text(item.category.isEmpty ? 'Tanpa kategori' : item.category,
                          style: const TextStyle(fontSize: 12, color: BK.ink3)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                busy
                    ? const SizedBox(width: 40, height: 24, child: Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))))
                    : Switch(value: active, activeThumbColor: BK.live, onChanged: (_) => onToggle()),
              ],
            ),
            const SizedBox(height: 4),
            Row(children: [
              active ? Pill.live('Aktif') : Pill.mut('Nonaktif'),
              const SizedBox(width: 8),
              _countChip(Icons.sell_outlined, '${item.mainOptionCount} opsi',
                  warn: item.mainOptionCount == 0),
              const SizedBox(width: 8),
              _countChip(Icons.add_circle_outline, '${item.addonCount} addon'),
              const Spacer(),
              const Icon(Icons.chevron_right, color: BK.ink3),
            ]),
            if (item.mainOptionCount == 0) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(color: BK.pendSoft, borderRadius: BorderRadius.circular(9)),
                child: Row(children: const [
                  Icon(Icons.info_outline, size: 15, color: BK.pend),
                  SizedBox(width: 7),
                  Expanded(
                    child: Text('Belum bisa dibooking — tambahkan minimal 1 opsi harga.',
                        style: TextStyle(fontSize: 11.5, color: BK.pend, fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _countChip(IconData icon, String label, {bool warn = false}) {
    final color = warn ? BK.pend : BK.ink3;
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 14, color: color),
      const SizedBox(width: 4),
      Text(label, style: TextStyle(fontSize: 11.5, color: color, fontWeight: FontWeight.w600)),
    ]);
  }

  Widget _thumb() {
    if (item.imageUrl.isEmpty) {
      return Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(12)),
        child: const Icon(Icons.storefront_outlined, color: BK.ink3, size: 22),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Image.network(item.imageUrl, width: 46, height: 46, fit: BoxFit.cover,
          errorBuilder: (_, _, _) => Container(
                width: 46,
                height: 46,
                color: BK.card2,
                child: const Icon(Icons.broken_image_outlined, color: BK.ink3, size: 20),
              )),
    );
  }
}

/// Sheet buat resource — sengaja minimal: nama wajib, kategori opsional.
class _CreateSheet extends StatefulWidget {
  final ResourceAdminRepository repo;
  const _CreateSheet({required this.repo});

  @override
  State<_CreateSheet> createState() => _CreateSheetState();
}

class _CreateSheetState extends State<_CreateSheet> {
  final _name = TextEditingController();
  final _category = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _category.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _name.text.trim().toUpperCase();
    if (name.isEmpty) {
      BkToast.warning(context, 'Nama resource wajib diisi');
      return;
    }
    setState(() => _saving = true);
    try {
      // Nama & kategori dinormalkan kapital agar konsisten (hindari "Badminton"
      // vs "BADMINTON" jadi dua kategori berbeda).
      final res = await widget.repo.create(name: name, category: _category.text.trim().toUpperCase());
      if (!mounted) return;
      Navigator.of(context).pop(res);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal membuat resource', subtitle: '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(
          color: BK.bg,
          borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 14),
                const Text('Buat resource',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
                const SizedBox(height: 4),
                const Text('Unit/tempat yang dibooking. Cukup nama dulu — opsi harga ditambah di langkah berikutnya.',
                    style: TextStyle(fontSize: 12.5, color: BK.ink3, height: 1.35)),
                const SizedBox(height: 16),
                _field('Nama resource', _name, hint: 'mis. Ruang Meeting A / Lapangan 1 / PS5 #2'),
                const SizedBox(height: 12),
                _field('Kategori (opsional)', _category, hint: 'mis. Ruangan / Lapangan / Konsol'),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: BK.accent,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: _saving ? null : _submit,
                    child: _saving
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Lanjut — tambah opsi harga', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController controller, {String? hint}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          style: const TextStyle(fontSize: 13.5, color: BK.ink),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: BK.ink3, fontSize: 13),
            isDense: true,
            filled: true,
            fillColor: BK.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
          ),
        ),
      ],
    );
  }
}
