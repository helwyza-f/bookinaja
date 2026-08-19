import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../repositories/settings_repository.dart';
import '../theme.dart';
import '../ui/toast.dart';
import '../state/async_value.dart';

/// Owner account settings — password, email verification, linked accounts.
/// Endpoint owner-only: /admin/account, /admin/account/password/*, /admin/account/email/*
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
        data: (account) => _form(context, c, account),
      ),
    );
  }

  Widget _form(BuildContext context, OwnerAccountSettingsController c, OwnerAccount account) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        // Identitas owner
        const Text('IDENTITAS OWNER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
        const SizedBox(height: 8),
        BKCard(
          child: Column(
            children: [
              _row('Nama', account.name),
              const Divider(height: 12, color: BK.line),
              _row('Email', account.email),
              if (account.emailVerified) ...[
                const Divider(height: 12, color: BK.line),
                _row('Status Email', '✓ Terverifikasi'),
              ],
            ],
          ),
        ),
        const SizedBox(height: 18),

        // Password
        const Text('KEAMANAN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
        const SizedBox(height: 8),
        _tile(context, Icons.lock_outline, 'Ubah password',
            account.hasPassword ? 'Update password akun' : 'Setup password pertama kali', () {
          _showPasswordDialog(context, c, account);
        }),
        const SizedBox(height: 18),

        // Google Link
        const Text('AKUN TERHUBUNG', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
        const SizedBox(height: 8),
        BKCard(
          child: Row(
            children: [
              const Icon(Icons.security, color: Color(0xFF4285F4), size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Google', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
                    Text(account.googleLinked ? '${account.email} (terhubung)' : 'Belum terhubung',
                        style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                  ],
                ),
              ),
              if (!account.googleLinked)
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                  onPressed: c.saving ? null : () => _linkGoogle(context, c),
                  child: const Text('Hubungkan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
            ],
          ),
        ),
        const SizedBox(height: 18),

        // Danger zone
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: BK.critSoft,
            border: Border.all(color: BK.crit),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(children: [
                Icon(Icons.warning_rounded, size: 18, color: BK.crit),
                SizedBox(width: 8),
                Text('Zona Berbahaya', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: BK.crit)),
              ]),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: BK.crit,
                    side: const BorderSide(color: BK.crit),
                  ),
                  onPressed: () => _confirmDelete(context, c),
                  child: const Text('Hapus akun selamanya', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _row(String label, String value) {
    return Row(
      children: [
        Expanded(child: Text(label, style: const TextStyle(fontSize: 12.5, color: BK.ink3))),
        Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: BK.ink)),
      ],
    );
  }

  Widget _tile(BuildContext context, IconData icon, String title, String subtitle, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: BKCard(
        child: Row(
          children: [
            Icon(icon, color: BK.ink2, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
                  Text(subtitle, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 16, color: BK.ink3),
          ],
        ),
      ),
    );
  }

  Future<void> _showPasswordDialog(BuildContext context, OwnerAccountSettingsController c, OwnerAccount account) async {
    final oldPasswordCtrl = TextEditingController();
    final newPasswordCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();

    try {
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: BK.bg,
        title: const Text('Ubah Password', style: TextStyle(fontWeight: FontWeight.w800, color: BK.ink)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (account.hasPassword) ...[
                TextField(
                  controller: oldPasswordCtrl,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Password lama',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: newPasswordCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password baru (minimal 8 karakter)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Konfirmasi password',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: () async {
              if (newPasswordCtrl.text.isEmpty || newPasswordCtrl.text.length < 8) {
                BkToast.info(ctx, 'Password minimal 8 karakter');
                return;
              }
              if (newPasswordCtrl.text != confirmCtrl.text) {
                BkToast.info(ctx, 'Password tidak cocok');
                return;
              }
              final ok = await c.updatePassword(
                oldPassword: account.hasPassword ? oldPasswordCtrl.text : null,
                newPassword: newPasswordCtrl.text,
              );
              if (!context.mounted) return;
              Navigator.pop(ctx);
              if (ok) {
                BkToast.success(context, 'Password diperbarui');
              } else {
                BkToast.error(context, c.error ?? 'Gagal mengupdate password');
              }
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
    } finally {
      oldPasswordCtrl.dispose();
      newPasswordCtrl.dispose();
      confirmCtrl.dispose();
    }
  }

  Future<void> _linkGoogle(BuildContext context, OwnerAccountSettingsController c) async {
    final ok = await c.linkGoogle();
    if (!context.mounted) return;
    if (ok) {
      BkToast.success(context, 'Google berhasil dihubungkan');
    } else {
      BkToast.error(context, c.error ?? 'Gagal menghubungkan Google');
    }
  }

  Future<void> _confirmDelete(BuildContext context, OwnerAccountSettingsController c) async {
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: BK.bg,
        title: const Text('Hapus Akun?', style: TextStyle(fontWeight: FontWeight.w800, color: BK.crit)),
        content: const Text(
          'Tindakan ini TIDAK DAPAT dibatalkan. Semua data workspace, booking, transaksi akan dihapus selamanya.',
          style: TextStyle(fontSize: 13.5, color: BK.ink2, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.crit),
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await c.deleteAccount();
              if (!context.mounted) return;
              if (ok) {
                BkToast.success(context, 'Akun dihapus. Redirecting...');
                // Seharusnya auto-logout, tapi untuk sekarang just show message
              } else {
                BkToast.error(context, c.error ?? 'Gagal menghapus akun');
              }
            },
            child: const Text('Hapus Selamanya'),
          ),
        ],
      ),
    );
  }
}

// --- Models ---

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

  factory OwnerAccount.fromJson(Map json) {
    return OwnerAccount(
      name: '${json['name'] ?? ''}',
      email: '${json['email'] ?? ''}',
      emailVerified: json['email_verified'] == true,
      hasPassword: json['has_password'] != false,
      googleLinked: json['google_linked'] == true,
    );
  }
}

// --- Controller ---

class OwnerAccountSettingsController extends ChangeNotifier {
  final SettingsRepository _repo;
  AsyncValue<OwnerAccount> state = const AsyncValue.loading();
  bool saving = false;
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
    saving = true;
    error = null;
    notifyListeners();
    try {
      await _repo.updateOwnerPassword(oldPassword: oldPassword, newPassword: newPassword);
      saving = false;
      notifyListeners();
      return true;
    } catch (e) {
      error = '$e';
      saving = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> linkGoogle() async {
    saving = true;
    error = null;
    notifyListeners();
    try {
      await _repo.linkOwnerGoogle();
      final res = await _repo.getOwnerAccount();
      state = AsyncValue.data(OwnerAccount.fromJson(res));
      saving = false;
      notifyListeners();
      return true;
    } catch (e) {
      error = '$e';
      saving = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteAccount() async {
    saving = true;
    error = null;
    notifyListeners();
    try {
      await _repo.deleteOwnerAccount();
      saving = false;
      notifyListeners();
      return true;
    } catch (e) {
      error = '$e';
      saving = false;
      notifyListeners();
      return false;
    }
  }
}

// --- UI Components ---

class LoadingList extends StatelessWidget {
  const LoadingList({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        for (int i = 0; i < 3; i++) ...[
          const BKSkeleton(height: 80, radius: 12),
          const SizedBox(height: 10),
        ]
      ],
    );
  }
}

class StateView extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String hint;
  final Widget? action;

  const StateView({super.key, required this.icon, required this.color, required this.title, required this.hint, this.action});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 48, color: color),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
          const SizedBox(height: 6),
          Text(hint, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: BK.ink3)),
          if (action != null) ...[
            const SizedBox(height: 16),
            action!,
          ]
        ],
      ),
    );
  }
}
