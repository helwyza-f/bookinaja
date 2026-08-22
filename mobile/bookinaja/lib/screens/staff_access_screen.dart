import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/staff.dart';
import '../repositories/settings_repository.dart';
import '../state/auth_controller.dart';
import '../state/staff_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Staff & akses — kelola anggota tim dan peran (kumpulan izin). Desain native
/// mobile: satu layar dengan dua segmen (Tim / Peran), FAB kontekstual, form
/// full-screen. Bukan cermin tabel web.
class StaffAccessScreen extends StatelessWidget {
  const StaffAccessScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => StaffController(ctx.read<SettingsRepository>()),
      child: const _StaffView(),
    );
  }
}

class _StaffView extends StatefulWidget {
  const _StaffView();
  @override
  State<_StaffView> createState() => _StaffViewState();
}

class _StaffViewState extends State<_StaffView> {
  int _tab = 0; // 0 = Tim, 1 = Peran

  @override
  Widget build(BuildContext context) {
    final c = context.watch<StaffController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('Staff & akses',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      floatingActionButton: (c.loading || c.locked || c.error != null)
          ? null
          : FloatingActionButton.extended(
              backgroundColor: BK.accent,
              onPressed: c.busy ? null : () => _onAdd(context, c),
              icon: const Icon(Icons.add, color: Colors.white),
              label: Text(_tab == 0 ? 'Tambah staff' : 'Peran baru',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
      body: SafeArea(
        child: c.locked
            ? _locked()
            : c.error != null
                ? _error(c)
                : Column(
                    children: [
                      _segment(),
                      Expanded(
                        child: c.loading
                            ? const Center(child: CircularProgressIndicator(color: BK.accent))
                            : (_tab == 0 ? _staffList(context, c) : _roleList(context, c)),
                      ),
                    ],
                  ),
      ),
    );
  }

  void _onAdd(BuildContext context, StaffController c) {
    if (_tab == 0) {
      if (c.roles.isEmpty) {
        BkToast.info(context, 'Buat peran dulu', subtitle: 'Staff harus punya peran sebelum ditambahkan.');
        setState(() => _tab = 1);
        return;
      }
      _openStaffForm(context, c, null);
    } else {
      _openRoleEditor(context, c, null);
    }
  }

  // ── Segmented control (Tim / Peran) ────────────────────────────────────────
  Widget _segment() {
    Widget seg(int i, String label, IconData icon) {
      final on = _tab == i;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() => _tab = i),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(vertical: 9),
            decoration: BoxDecoration(
              color: on ? BK.card : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              boxShadow: on ? [BoxShadow(color: BK.ink.withValues(alpha: .06), blurRadius: 6, offset: const Offset(0, 2))] : null,
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(icon, size: 16, color: on ? BK.accent : BK.ink3),
              const SizedBox(width: 6),
              Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: on ? BK.ink : BK.ink3)),
            ]),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          seg(0, 'Tim', Icons.people_outline),
          seg(1, 'Peran', Icons.shield_outlined),
        ]),
      ),
    );
  }

  // ── Daftar staff ────────────────────────────────────────────────────────────
  Widget _staffList(BuildContext context, StaffController c) {
    if (c.staff.isEmpty) {
      return _empty(Icons.people_outline, 'Belum ada staff', 'Tambahkan anggota tim dan beri peran aksesnya.');
    }
    return RefreshIndicator(
      color: BK.accent,
      onRefresh: c.load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: c.staff.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final s = c.staff[i];
          final owner = s.role.toLowerCase() == 'owner';
          return InkWell(
            borderRadius: BorderRadius.circular(BK.radius),
            onTap: owner ? null : () => _openStaffForm(context, c, s),
            child: BKCard(
              child: Row(children: [
                Container(
                  width: 42, height: 42,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)]),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Text(s.initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(s.name.isEmpty ? '(tanpa nama)' : s.name,
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: BK.ink)),
                    const SizedBox(height: 2),
                    Text(s.email, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: BK.ink3)),
                    const SizedBox(height: 7),
                    owner ? Pill.acc('Owner') : Pill.mut(s.role.isEmpty ? 'Tanpa peran' : s.role),
                  ]),
                ),
                if (!owner) const Icon(Icons.chevron_right, color: BK.ink3),
              ]),
            ),
          );
        },
      ),
    );
  }

  // ── Daftar peran ────────────────────────────────────────────────────────────
  Widget _roleList(BuildContext context, StaffController c) {
    if (c.roles.isEmpty) {
      return _empty(Icons.shield_outlined, 'Belum ada peran', 'Buat peran seperti "Kasir" atau "Manajer" lalu atur izinnya.');
    }
    return RefreshIndicator(
      color: BK.accent,
      onRefresh: c.load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: c.roles.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final r = c.roles[i];
          final count = r.permissionKeys.where((k) => !k.contains('.manage') && k != 'bookings.write').length;
          return InkWell(
            borderRadius: BorderRadius.circular(BK.radius),
            onTap: () => _openRoleEditor(context, c, r),
            child: BKCard(
              child: Row(children: [
                Container(
                  width: 42, height: 42,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(13)),
                  child: const Icon(Icons.shield_outlined, color: BK.accent, size: 21),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Flexible(
                        child: Text(r.name.isEmpty ? '(tanpa nama)' : r.name,
                            maxLines: 1, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: BK.ink)),
                      ),
                      if (r.isDefault) ...[const SizedBox(width: 8), Pill.acc('Default')],
                    ]),
                    const SizedBox(height: 2),
                    Text(r.description.isEmpty ? '$count izin diaktifkan' : r.description,
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: BK.ink3)),
                  ]),
                ),
                const Icon(Icons.chevron_right, color: BK.ink3),
              ]),
            ),
          );
        },
      ),
    );
  }

  // ── Navigasi ke form (dengan meneruskan controller lewat provider.value) ────
  void _openStaffForm(BuildContext context, StaffController c, StaffMember? s) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ChangeNotifierProvider.value(value: c, child: _StaffFormScreen(existing: s)),
    ));
  }

  void _openRoleEditor(BuildContext context, StaffController c, StaffRole? r) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ChangeNotifierProvider.value(value: c, child: _RoleEditorScreen(existing: r)),
    ));
  }

  // ── State helpers ────────────────────────────────────────────────────────────
  Widget _empty(IconData icon, String title, String hint) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(20)),
              child: Icon(icon, color: BK.ink3, size: 30),
            ),
            const SizedBox(height: 14),
            Text(title, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 4),
            Text(hint, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12.5, color: BK.ink3, height: 1.4)),
          ]),
        ),
      );

  Widget _error(StaffController c) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.wifi_off_rounded, color: BK.crit, size: 30),
            const SizedBox(height: 10),
            const Text('Gagal memuat', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 4),
            Text('${c.error}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: BK.accent),
              onPressed: c.load,
              child: const Text('Coba lagi'),
            ),
          ]),
        ),
      );

  Widget _locked() => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(color: BK.pendSoft, borderRadius: BorderRadius.circular(20)),
              child: const Icon(Icons.lock_outline_rounded, color: BK.pend, size: 30),
            ),
            const SizedBox(height: 14),
            const Text('Fitur paket lebih tinggi',
                style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 4),
            const Text('Staff & akses (multi-user + peran) tersedia di paket berbayar. Upgrade untuk mengelola tim.',
                textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: BK.ink3, height: 1.4)),
          ]),
        ),
      );
}

// ══════════════════════════════════════════════════════════════════════════
// Form staff (tambah / ubah)
// ══════════════════════════════════════════════════════════════════════════

class _StaffFormScreen extends StatefulWidget {
  final StaffMember? existing;
  const _StaffFormScreen({this.existing});
  @override
  State<_StaffFormScreen> createState() => _StaffFormScreenState();
}

class _StaffFormScreenState extends State<_StaffFormScreen> {
  late final TextEditingController _name;
  late final TextEditingController _email;
  final _password = TextEditingController();
  String? _roleId;
  bool _obscure = true;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?.name ?? '');
    _email = TextEditingController(text: e?.email ?? '');
    _roleId = e?.roleId;
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _save(StaffController c) async {
    final name = _name.text.trim();
    final email = _email.text.trim();
    if (name.isEmpty) return BkToast.error(context, 'Nama wajib diisi');
    if (!email.contains('@')) return BkToast.error(context, 'Email tidak valid');
    if (_roleId == null) return BkToast.error(context, 'Pilih peran');
    if (!_isEdit && _password.text.length < 6) {
      return BkToast.error(context, 'Password minimal 6 karakter');
    }

    final err = _isEdit
        ? await c.updateStaff(id: widget.existing!.id, name: name, email: email, roleId: _roleId!)
        : await c.createStaff(name: name, email: email, password: _password.text, roleId: _roleId!);
    if (!mounted) return;
    if (err == null) {
      BkToast.success(context, _isEdit ? 'Staff diperbarui' : 'Staff ditambahkan');
      Navigator.of(context).pop();
    } else {
      BkToast.error(context, 'Gagal menyimpan', subtitle: err);
    }
  }

  Future<void> _delete(StaffController c) async {
    final yes = await _confirm(context, 'Hapus staff?',
        '${widget.existing!.name} tak akan bisa login lagi. Tindakan ini tak bisa dibatalkan.');
    if (yes != true || !mounted) return;
    final err = await c.deleteStaff(widget.existing!.id);
    if (!mounted) return;
    if (err == null) {
      BkToast.info(context, 'Staff dihapus');
      Navigator.of(context).pop();
    } else {
      BkToast.error(context, 'Gagal menghapus', subtitle: err);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.watch<StaffController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(_isEdit ? 'Ubah staff' : 'Tambah staff',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
        actions: [
          if (_isEdit)
            IconButton(
              onPressed: c.busy ? null : () => _delete(c),
              icon: const Icon(Icons.delete_outline_rounded, color: BK.crit),
            ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            _label('NAMA'),
            _field(_name, 'Nama lengkap', textInputAction: TextInputAction.next),
            const SizedBox(height: 16),
            _label('EMAIL'),
            _field(_email, 'email@contoh.com',
                keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next),
            if (!_isEdit) ...[
              const SizedBox(height: 16),
              _label('PASSWORD'),
              _field(_password, 'Minimal 6 karakter',
                  obscure: _obscure,
                  suffix: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 20, color: BK.ink3),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  )),
            ],
            const SizedBox(height: 16),
            _label('PERAN'),
            _roleSelector(c),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: BK.accent,
            padding: const EdgeInsets.symmetric(vertical: 15),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          onPressed: c.busy ? null : () => _save(c),
          child: c.busy
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
              : Text(_isEdit ? 'Simpan perubahan' : 'Tambah staff',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
        ),
      ),
    );
  }

  Widget _roleSelector(StaffController c) {
    return Column(
      children: [
        for (final r in c.roles) ...[
          GestureDetector(
            onTap: () => setState(() => _roleId = r.id),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: _roleId == r.id ? BK.accentSoft : BK.card,
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: _roleId == r.id ? BK.accent : BK.line, width: _roleId == r.id ? 1.5 : 1),
              ),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(r.name, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _roleId == r.id ? BK.accent : BK.ink)),
                    if (r.description.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(r.description, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                    ],
                  ]),
                ),
                Icon(_roleId == r.id ? Icons.radio_button_checked : Icons.radio_button_off,
                    size: 20, color: _roleId == r.id ? BK.accent : BK.ink3),
              ]),
            ),
          ),
        ],
      ],
    );
  }

  Widget _label(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(t, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1, color: BK.ink3)),
      );

  Widget _field(TextEditingController ctrl, String hint,
      {bool obscure = false, TextInputType? keyboardType, TextInputAction? textInputAction, Widget? suffix}) {
    return TextField(
      controller: ctrl,
      obscureText: obscure,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: BK.ink),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: BK.ink3, fontWeight: FontWeight.w500),
        filled: true,
        fillColor: BK.card,
        suffixIcon: suffix,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.accent, width: 1.6)),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Editor peran (tambah / ubah) — izin dikelompokkan & bertoggle
// ══════════════════════════════════════════════════════════════════════════

class _RoleEditorScreen extends StatefulWidget {
  final StaffRole? existing;
  const _RoleEditorScreen({this.existing});
  @override
  State<_RoleEditorScreen> createState() => _RoleEditorScreenState();
}

class _RoleEditorScreenState extends State<_RoleEditorScreen> {
  late final TextEditingController _name;
  late final TextEditingController _desc;
  late final Set<String> _perms;
  bool _isDefault = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?.name ?? '');
    _desc = TextEditingController(text: e?.description ?? '');
    _perms = {...?e?.permissionKeys};
    _isDefault = e?.isDefault ?? false;
  }

  @override
  void dispose() {
    _name.dispose();
    _desc.dispose();
    super.dispose();
  }

  int _selectedCount(List<PermissionGroup> cat) =>
      cat.expand((g) => g.perms).where((p) => _perms.contains(p.key)).length;

  Future<void> _save(StaffController c) async {
    final name = _name.text.trim();
    if (name.isEmpty) return BkToast.error(context, 'Nama peran wajib diisi');
    // Kirim hanya key dari katalog penuh (buang legacy). Tetap pertahankan izin
    // lintas-mode yang mungkin sudah ada di peran ini walau grupnya tak tampil.
    final catalogKeys = kPermissionCatalog.expand((g) => g.perms).map((p) => p.key).toSet();
    final keys = _perms.where(catalogKeys.contains).toList();
    final role = StaffRole(
      id: widget.existing?.id ?? '',
      name: name,
      description: _desc.text.trim(),
      permissionKeys: keys,
      isDefault: _isDefault,
    );
    final err = await c.saveRole(role);
    if (!mounted) return;
    if (err == null) {
      BkToast.success(context, _isEdit ? 'Peran diperbarui' : 'Peran dibuat');
      Navigator.of(context).pop();
    } else {
      BkToast.error(context, 'Gagal menyimpan', subtitle: err);
    }
  }

  Future<void> _delete(StaffController c) async {
    final yes = await _confirm(context, 'Hapus peran?',
        'Peran "${widget.existing!.name}" akan dihapus. Staff dengan peran ini bisa kehilangan akses.');
    if (yes != true || !mounted) return;
    final err = await c.deleteRole(widget.existing!.id);
    if (!mounted) return;
    if (err == null) {
      BkToast.info(context, 'Peran dihapus');
      Navigator.of(context).pop();
    } else {
      BkToast.error(context, 'Gagal menghapus', subtitle: err);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.watch<StaffController>();
    final auth = context.watch<AuthController>();
    // Katalog izin disaring sesuai mode workspace: booking-only sembunyikan
    // grup kasir, pos-only sembunyikan grup booking/sesi/resource/pelanggan.
    final cat = permissionCatalogFor(booking: auth.bookingEnabled, kasir: auth.kasirEnabled);
    final catTotal = cat.fold<int>(0, (s, g) => s + g.perms.length);
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(_isEdit ? 'Ubah peran' : 'Peran baru',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
        actions: [
          if (_isEdit)
            IconButton(
              onPressed: c.busy ? null : () => _delete(c),
              icon: const Icon(Icons.delete_outline_rounded, color: BK.crit),
            ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            _label('NAMA PERAN'),
            _field(_name, 'Contoh: Kasir'),
            const SizedBox(height: 16),
            _label('DESKRIPSI (OPSIONAL)'),
            _field(_desc, 'Ringkas tugas peran ini'),
            const SizedBox(height: 14),
            // Toggle default
            GestureDetector(
              onTap: () => setState(() => _isDefault = !_isDefault),
              child: BKCard(
                child: Row(children: [
                  const Icon(Icons.star_outline_rounded, size: 20, color: BK.accent),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Jadikan peran default', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
                      SizedBox(height: 1),
                      Text('Dipilih otomatis saat menambah staff baru', style: TextStyle(fontSize: 11.5, color: BK.ink3)),
                    ]),
                  ),
                  Switch(
                    value: _isDefault,
                    activeThumbColor: Colors.white,
                    activeTrackColor: BK.accent,
                    onChanged: (v) => setState(() => _isDefault = v),
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 20),
            Row(children: [
              _label('IZIN AKSES'),
              const Spacer(),
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text('${_selectedCount(cat)}/$catTotal',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: BK.ink3)),
              ),
            ]),
            for (final g in cat) _permGroup(g),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: BK.accent,
            padding: const EdgeInsets.symmetric(vertical: 15),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          onPressed: c.busy ? null : () => _save(c),
          child: c.busy
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
              : Text(_isEdit ? 'Simpan peran' : 'Buat peran',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
        ),
      ),
    );
  }

  Widget _permGroup(PermissionGroup g) {
    final groupKeys = g.perms.map((p) => p.key).toList();
    final allOn = groupKeys.every(_perms.contains);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(BK.radius),
        border: Border.all(color: BK.line),
      ),
      child: Column(children: [
        // Header grup + toggle "semua"
        InkWell(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(BK.radius)),
          onTap: () => setState(() {
            if (allOn) {
              _perms.removeAll(groupKeys);
            } else {
              _perms.addAll(groupKeys);
            }
          }),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Row(children: [
              Icon(g.icon, size: 18, color: BK.accent),
              const SizedBox(width: 10),
              Expanded(child: Text(g.title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink))),
              Text(allOn ? 'Semua' : 'Pilih semua',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: allOn ? BK.accent : BK.ink3)),
            ]),
          ),
        ),
        const Divider(height: 1, color: BK.line),
        for (final p in g.perms)
          InkWell(
            onTap: () => setState(() => _perms.contains(p.key) ? _perms.remove(p.key) : _perms.add(p.key)),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              child: Row(children: [
                Expanded(child: Text(p.label, style: const TextStyle(fontSize: 13, color: BK.ink2))),
                Switch(
                  value: _perms.contains(p.key),
                  activeThumbColor: Colors.white,
                  activeTrackColor: BK.accent,
                  onChanged: (v) => setState(() => v ? _perms.add(p.key) : _perms.remove(p.key)),
                ),
              ]),
            ),
          ),
      ]),
    );
  }

  Widget _label(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(t, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1, color: BK.ink3)),
      );

  Widget _field(TextEditingController ctrl, String hint) {
    return TextField(
      controller: ctrl,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: BK.ink),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: BK.ink3, fontWeight: FontWeight.w500),
        filled: true,
        fillColor: BK.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.accent, width: 1.6)),
      ),
    );
  }
}

// ── Dialog konfirmasi bersama ──────────────────────────────────────────────
Future<bool?> _confirm(BuildContext context, String title, String body) {
  return showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: BK.card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, color: BK.ink, fontSize: 16)),
      content: Text(body, style: const TextStyle(fontSize: 13, color: BK.ink2, height: 1.4)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal', style: TextStyle(color: BK.ink2))),
        TextButton(
          style: TextButton.styleFrom(foregroundColor: BK.crit),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Hapus', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
      ],
    ),
  );
}
