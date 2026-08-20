import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../repositories/settings_repository.dart';
import '../state/async_value.dart';
import '../state/auth_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Akun Owner — identitas, keamanan (password), akun terhubung, & hapus akun.
/// Endpoint owner-only: /admin/account, /admin/account/password/*.
class OwnerAccountSettingsScreen extends StatelessWidget {
  const OwnerAccountSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => OwnerAccountSettingsController(ctx.read<SettingsRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<OwnerAccountSettingsController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Akun Owner', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
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
        data: (account) => _content(context, c, account),
      ),
    );
  }

  Widget _content(BuildContext context, OwnerAccountSettingsController c, OwnerAccount account) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
        _ProfileHeader(account: account),
        const SizedBox(height: 22),

        _label('KEAMANAN'),
        const SizedBox(height: 8),
        _NavTile(
          icon: Icons.lock_outline,
          title: account.hasPassword ? 'Ubah password' : 'Buat password',
          subtitle: account.hasPassword ? 'Ganti kata sandi akunmu' : 'Amankan akun dengan kata sandi',
          onTap: () async {
            final ok = await Navigator.of(context).push<bool>(MaterialPageRoute(
              builder: (_) => _ChangePasswordScreen(controller: c, hasPassword: account.hasPassword),
            ));
            if (ok == true && context.mounted) BkToast.success(context, 'Password diperbarui');
          },
        ),
        const SizedBox(height: 22),

        _label('AKUN TERHUBUNG'),
        const SizedBox(height: 8),
        _GoogleRow(account: account),
        const SizedBox(height: 28),

        _DangerZone(
          onDelete: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => _DeleteAccountScreen(controller: c, hasPassword: account.hasPassword),
          )),
        ),
      ],
    );
  }

  Widget _label(String t) => Text(t,
      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3));
}

class _ProfileHeader extends StatelessWidget {
  final OwnerAccount account;
  const _ProfileHeader({required this.account});

  @override
  Widget build(BuildContext context) {
    final initial = account.name.trim().isNotEmpty ? account.name.trim()[0].toUpperCase() : '?';
    return BKCard(
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Center(child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 24))),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(account.name.isEmpty ? 'Owner' : account.name,
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 3),
            Text(account.email, maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
            const SizedBox(height: 7),
            account.emailVerified
                ? Pill.live('Email terverifikasi')
                : Pill.pend('Email belum terverifikasi'),
          ]),
        ),
      ]),
    );
  }
}

class _GoogleRow extends StatelessWidget {
  final OwnerAccount account;
  const _GoogleRow({required this.account});

  @override
  Widget build(BuildContext context) {
    return BKCard(
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(11)),
          child: const Icon(Icons.g_mobiledata, color: Color(0xFF4285F4), size: 30),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Google', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
            Text(
              account.googleLinked ? 'Terhubung' : 'Belum terhubung · atur lewat web',
              style: const TextStyle(fontSize: 11.5, color: BK.ink3),
            ),
          ]),
        ),
        if (account.googleLinked)
          Pill.live('Terhubung')
        else
          const Icon(Icons.open_in_new, size: 16, color: BK.ink3),
      ]),
    );
  }
}

class _DangerZone extends StatelessWidget {
  final VoidCallback onDelete;
  const _DangerZone({required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: BK.critSoft,
        border: Border.all(color: BK.crit.withValues(alpha: 0.4)),
        borderRadius: BorderRadius.circular(BK.radius),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.warning_amber_rounded, size: 18, color: BK.crit),
          SizedBox(width: 8),
          Text('Zona berbahaya', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: BK.crit)),
        ]),
        const SizedBox(height: 6),
        const Text('Menghapus akun menghilangkan seluruh workspace, booking, dan transaksi — permanen.',
            style: TextStyle(fontSize: 12, color: BK.ink2, height: 1.4)),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: BK.crit,
              side: const BorderSide(color: BK.crit),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline, size: 18),
            label: const Text('Hapus akun', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      ]),
    );
  }
}

// ---------------------------------------------------------------------------
// Ubah / buat password — layar penuh (bukan modal).
// ---------------------------------------------------------------------------

class _ChangePasswordScreen extends StatefulWidget {
  final OwnerAccountSettingsController controller;
  final bool hasPassword;
  const _ChangePasswordScreen({required this.controller, required this.hasPassword});

  @override
  State<_ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<_ChangePasswordScreen> {
  final _old = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscure = true;
  bool _saving = false;
  String? _err;

  @override
  void dispose() {
    _old.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final err = _validate();
    if (err != null) {
      setState(() => _err = err);
      return;
    }
    setState(() {
      _err = null;
      _saving = true;
    });
    final ok = await widget.controller.updatePassword(
      oldPassword: widget.hasPassword ? _old.text : null,
      newPassword: _new.text,
    );
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pop(true);
    } else {
      setState(() {
        _saving = false;
        _err = widget.controller.error ?? 'Gagal memperbarui password';
      });
    }
  }

  String? _validate() {
    if (widget.hasPassword && _old.text.isEmpty) return 'Masukkan password lama.';
    if (_new.text.length < 8) return 'Password baru minimal 8 karakter.';
    if (_new.text != _confirm.text) return 'Konfirmasi password tidak cocok.';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: Text(widget.hasPassword ? 'Ubah password' : 'Buat password',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (widget.hasPassword) ...[
            _field('Password lama', _old),
            const SizedBox(height: 14),
          ],
          _field('Password baru', _new, hint: 'Minimal 8 karakter'),
          const SizedBox(height: 14),
          _field('Konfirmasi password baru', _confirm),
          const SizedBox(height: 10),
          Row(children: [
            Checkbox(
              value: !_obscure,
              onChanged: (v) => setState(() => _obscure = !(v ?? false)),
              activeColor: BK.accent,
              visualDensity: VisualDensity.compact,
            ),
            const Text('Tampilkan password', style: TextStyle(fontSize: 12.5, color: BK.ink2)),
          ]),
          if (_err != null) ...[
            const SizedBox(height: 4),
            Text(_err!, style: const TextStyle(fontSize: 12.5, color: BK.crit, fontWeight: FontWeight.w600)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: BK.accent,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Simpan password', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl, {String? hint}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink2)),
      const SizedBox(height: 6),
      TextField(
        controller: ctrl,
        obscureText: _obscure,
        onChanged: (_) {
          if (_err != null) setState(() => _err = null);
        },
        decoration: InputDecoration(
          hintText: hint,
          filled: true,
          fillColor: BK.card,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent, width: 1.5)),
        ),
      ),
    ]);
  }
}

// ---------------------------------------------------------------------------
// Hapus akun — layar penuh, konfirmasi ketik slug + password.
// ---------------------------------------------------------------------------

class _DeleteAccountScreen extends StatefulWidget {
  final OwnerAccountSettingsController controller;
  final bool hasPassword;
  const _DeleteAccountScreen({required this.controller, required this.hasPassword});

  @override
  State<_DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<_DeleteAccountScreen> {
  final _confirm = TextEditingController();
  final _password = TextEditingController();
  bool _deleting = false;
  String? _err;

  @override
  void dispose() {
    _confirm.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit(String slug) async {
    if (_confirm.text.trim() != slug) {
      setState(() => _err = 'Ketik "$slug" persis untuk mengonfirmasi.');
      return;
    }
    if (widget.hasPassword && _password.text.isEmpty) {
      setState(() => _err = 'Masukkan password untuk mengonfirmasi.');
      return;
    }
    setState(() {
      _err = null;
      _deleting = true;
    });
    final ok = await widget.controller.deleteAccount(
      confirmText: _confirm.text.trim(),
      currentPassword: widget.hasPassword ? _password.text : null,
    );
    if (!mounted) return;
    if (ok) {
      BkToast.success(context, 'Akun dihapus');
      Navigator.of(context).popUntil((r) => r.isFirst);
      context.read<AuthController>().logout();
    } else {
      setState(() {
        _deleting = false;
        _err = widget.controller.error ?? 'Gagal menghapus akun';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final slug = context.read<AuthController>().workspace?.slug ?? '';
    final canDelete = _confirm.text.trim() == slug && slug.isNotEmpty && (!widget.hasPassword || _password.text.isNotEmpty);

    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Hapus akun', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.crit)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: BK.critSoft,
              borderRadius: BorderRadius.circular(BK.radius),
              border: Border.all(color: BK.crit.withValues(alpha: 0.4)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
              Text('Ini permanen', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: BK.crit)),
              SizedBox(height: 6),
              Text('Seluruh workspace, booking, transaksi, dan pengaturan akan dihapus dan tidak bisa dipulihkan. Pastikan semua staff sudah dihapus terlebih dahulu.',
                  style: TextStyle(fontSize: 12.5, color: BK.ink2, height: 1.45)),
            ]),
          ),
          const SizedBox(height: 20),
          RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 12.5, color: BK.ink2),
              children: [
                const TextSpan(text: 'Ketik slug workspace '),
                TextSpan(text: slug.isEmpty ? '(tidak diketahui)' : slug, style: const TextStyle(fontWeight: FontWeight.w800, color: BK.ink)),
                const TextSpan(text: ' untuk mengonfirmasi.'),
              ],
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _confirm,
            onChanged: (_) => setState(() => _err = null),
            decoration: _dec(hint: slug),
          ),
          if (widget.hasPassword) ...[
            const SizedBox(height: 14),
            const Text('Password', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink2)),
            const SizedBox(height: 6),
            TextField(
              controller: _password,
              obscureText: true,
              onChanged: (_) => setState(() => _err = null),
              decoration: _dec(),
            ),
          ],
          if (_err != null) ...[
            const SizedBox(height: 10),
            Text(_err!, style: const TextStyle(fontSize: 12.5, color: BK.crit, fontWeight: FontWeight.w600)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: canDelete ? BK.crit : BK.ink3,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _deleting || !canDelete ? null : () => _submit(slug),
              child: _deleting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Hapus akun selamanya', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _dec({String? hint}) => InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: BK.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.crit, width: 1.5)),
      );
}

// ---------------------------------------------------------------------------
// Tile navigasi generik.
// ---------------------------------------------------------------------------

class _NavTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _NavTile({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: onTap,
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
              Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: BK.ink)),
              Text(subtitle, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          const Icon(Icons.chevron_right, color: BK.ink3),
        ]),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Model & controller.
// ---------------------------------------------------------------------------

class OwnerAccount {
  final String name;
  final String email;
  final bool emailVerified;
  final bool hasPassword;
  final bool googleLinked;

  const OwnerAccount({
    required this.name,
    required this.email,
    this.emailVerified = false,
    this.hasPassword = true,
    this.googleLinked = false,
  });

  /// Backend (tenant.OwnerAccountSettingsResponse) bersarang: {user{name,email,
  /// email_verified_at}, tenant{...}, auth{google_linked, has_password,
  /// email_verified}}. Baca dari sub-objek yang benar.
  factory OwnerAccount.fromJson(Map json) {
    final user = (json['user'] is Map) ? json['user'] as Map : const {};
    final auth = (json['auth'] is Map) ? json['auth'] as Map : const {};
    return OwnerAccount(
      name: '${user['name'] ?? json['name'] ?? ''}',
      email: '${user['email'] ?? json['email'] ?? ''}',
      emailVerified: auth['email_verified'] == true || user['email_verified_at'] != null,
      hasPassword: auth['has_password'] != false,
      googleLinked: auth['google_linked'] == true,
    );
  }
}

class OwnerAccountSettingsController extends ChangeNotifier {
  final SettingsRepository _repo;
  AsyncValue<OwnerAccount> state = const AsyncValue.loading();
  String? error;

  OwnerAccountSettingsController(this._repo) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      final res = await _repo.getOwnerAccount();
      state = AsyncValue.data(OwnerAccount.fromJson(res));
    } catch (e) {
      state = AsyncValue.error(e.toString());
    }
    notifyListeners();
  }

  Future<bool> updatePassword({String? oldPassword, required String newPassword}) async {
    error = null;
    try {
      await _repo.updateOwnerPassword(oldPassword: oldPassword, newPassword: newPassword);
      // Refresh agar hasPassword ikut update (mis. setup pertama kali).
      await load();
      return true;
    } catch (e) {
      error = '$e';
      return false;
    }
  }

  Future<bool> deleteAccount({required String confirmText, String? currentPassword}) async {
    error = null;
    try {
      await _repo.deleteOwnerAccount(confirmText: confirmText, currentPassword: currentPassword);
      return true;
    } catch (e) {
      error = '$e';
      return false;
    }
  }
}
