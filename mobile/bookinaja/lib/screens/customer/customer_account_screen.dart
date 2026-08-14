import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../theme.dart';
import '../../ui/error_text.dart';
import '../../state/auth_controller.dart';

/// Kelola akun customer: edit profil (nama/email), ganti password, ganti nomor
/// WhatsApp (OTP). Semua aksi lewat [AuthController] yang membungkus repo auth.
class CustomerAccountScreen extends StatelessWidget {
  const CustomerAccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.watch<AuthController>().customer;
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.card,
        elevation: 0,
        title: const Text('Kelola akun', style: TextStyle(fontWeight: FontWeight.w800, color: BK.ink)),
        iconTheme: const IconThemeData(color: BK.ink),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _tile(
            icon: Icons.person_outline,
            title: 'Edit profil',
            subtitle: c?.name ?? '-',
            onTap: () => _editProfileSheet(context),
          ),
          const SizedBox(height: 10),
          _tile(
            icon: Icons.mail_outline,
            title: 'Email',
            subtitle: (c?.email.isNotEmpty ?? false) ? c!.email : 'Belum diisi',
            onTap: () => _editProfileSheet(context),
          ),
          const SizedBox(height: 10),
          _tile(
            icon: Icons.lock_outline,
            title: 'Ganti password',
            subtitle: 'Perbarui kata sandi akun',
            onTap: () => _changePasswordSheet(context),
          ),
          const SizedBox(height: 10),
          _tile(
            icon: Icons.smartphone,
            title: 'Ganti nomor WhatsApp',
            subtitle: c?.phone ?? '-',
            onTap: () => _changePhoneSheet(context),
          ),
          const SizedBox(height: 26),
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 8),
            child: Text('ZONA BAHAYA',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: BK.ink3)),
          ),
          Material(
            color: BK.critSoft,
            borderRadius: BorderRadius.circular(BK.radius),
            child: InkWell(
              borderRadius: BorderRadius.circular(BK.radius),
              onTap: () => _confirmDelete(context),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(BK.radius),
                  border: Border.all(color: BK.crit.withValues(alpha: 0.4)),
                ),
                child: Row(children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(color: BK.crit.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(11)),
                    child: const Icon(Icons.delete_forever_outlined, size: 19, color: BK.crit),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Hapus akun', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: BK.crit)),
                        SizedBox(height: 1),
                        Text('Permanen. Nomor & email bebas dipakai daftar akun baru.',
                            style: TextStyle(fontSize: 12, color: BK.ink3)),
                      ],
                    ),
                  ),
                ]),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- Hapus akun (ireversibel — konfirmasi ketik-ulang) ---
  void _confirmDelete(BuildContext context) {
    final auth = context.read<AuthController>();
    final confirmCtrl = TextEditingController();
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: BK.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        bool busy = false;
        String? err;
        return StatefulBuilder(
          builder: (ctx, setLocal) => Padding(
            padding: EdgeInsets.only(
              left: 20, right: 20, top: 18, bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Hapus akun?', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.crit)),
                const SizedBox(height: 8),
                const Text(
                  'Tindakan ini permanen dan tidak bisa dibatalkan. Profilmu dihapus dan '
                  'kamu keluar dari aplikasi. Nomor & email jadi bebas untuk mendaftar akun baru. '
                  'Riwayat transaksi tetap tercatat di tenant terkait.',
                  style: TextStyle(fontSize: 13, height: 1.5, color: BK.ink2),
                ),
                const SizedBox(height: 14),
                const Text('Ketik HAPUS untuk konfirmasi:',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink)),
                const SizedBox(height: 8),
                TextField(
                  controller: confirmCtrl,
                  textCapitalization: TextCapitalization.characters,
                  onChanged: (_) => setLocal(() => err = null),
                  style: const TextStyle(fontSize: 14, color: BK.ink),
                  decoration: InputDecoration(
                    hintText: 'HAPUS',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                if (err != null) ...[
                  const SizedBox(height: 10),
                  Text(err!, style: const TextStyle(color: BK.crit, fontSize: 12.5)),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: BK.crit, padding: const EdgeInsets.symmetric(vertical: 14), disabledBackgroundColor: BK.line),
                  onPressed: busy
                      ? null
                      : () async {
                          if (confirmCtrl.text.trim().toUpperCase() != 'HAPUS') {
                            setLocal(() => err = 'Ketik HAPUS persis untuk melanjutkan.');
                            return;
                          }
                          setLocal(() {
                            busy = true;
                            err = null;
                          });
                          try {
                            await auth.deleteCustomerAccount();
                            // Sukses → logout mengubah AuthGate; tutup sheet & layar.
                            if (ctx.mounted) Navigator.pop(ctx);
                          } catch (e) {
                            setLocal(() {
                              busy = false;
                              err = friendlyError(e);
                            });
                          }
                        },
                  child: Text(busy ? 'Menghapus…' : 'Hapus akun permanen',
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) =>
      Builder(
        builder: (context) => Material(
          color: BK.card,
          borderRadius: BorderRadius.circular(BK.radius),
          child: InkWell(
            borderRadius: BorderRadius.circular(BK.radius),
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(BK.radius),
                border: Border.all(color: BK.line),
              ),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(11)),
                    child: Icon(icon, size: 19, color: BK.accent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: BK.ink)),
                        const SizedBox(height: 1),
                        Text(subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: BK.ink3),
                ],
              ),
            ),
          ),
        ),
      );

  // --- Edit profil ---
  void _editProfileSheet(BuildContext context) {
    final auth = context.read<AuthController>();
    final c = auth.customer;
    final nameCtrl = TextEditingController(text: c?.name ?? '');
    final emailCtrl = TextEditingController(text: c?.email ?? '');
    _sheet(
      context,
      title: 'Edit profil',
      fields: [
        _field(nameCtrl, 'Nama'),
        _field(emailCtrl, 'Email', keyboard: TextInputType.emailAddress),
      ],
      onSubmit: () => auth.updateCustomerProfile(name: nameCtrl.text, email: emailCtrl.text),
      success: 'Profil diperbarui',
    );
  }

  // --- Ganti password ---
  void _changePasswordSheet(BuildContext context) {
    final auth = context.read<AuthController>();
    final curCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    _sheet(
      context,
      title: 'Ganti password',
      fields: [
        _field(curCtrl, 'Password saat ini', obscure: true),
        _field(newCtrl, 'Password baru', obscure: true),
      ],
      validate: () {
        if (curCtrl.text.isEmpty || newCtrl.text.isEmpty) return 'Kedua kolom wajib diisi.';
        if (newCtrl.text.length < 6) return 'Password baru minimal 6 karakter.';
        return null;
      },
      onSubmit: () => auth.updateCustomerPassword(current: curCtrl.text, next: newCtrl.text),
      success: 'Password diperbarui',
    );
  }

  // --- Ganti nomor WhatsApp (2 langkah: minta OTP → verifikasi) ---
  void _changePhoneSheet(BuildContext context) {
    final auth = context.read<AuthController>();
    final phoneCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    bool otpSent = false;

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: BK.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        bool busy = false;
        String? err;
        return StatefulBuilder(
          builder: (ctx, setLocal) => Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 18,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Ganti nomor WhatsApp',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
                const SizedBox(height: 4),
                Text(
                  otpSent
                      ? 'Masukkan kode OTP yang dikirim ke nomor baru.'
                      : 'Kami akan mengirim OTP ke nomor WhatsApp baru untuk verifikasi.',
                  style: const TextStyle(fontSize: 12.5, color: BK.ink3),
                ),
                const SizedBox(height: 14),
                _field(phoneCtrl, 'Nomor WhatsApp baru', keyboard: TextInputType.phone, enabled: !otpSent),
                if (otpSent) ...[
                  const SizedBox(height: 10),
                  _field(codeCtrl, 'Kode OTP', keyboard: TextInputType.number),
                ],
                if (err != null) ...[
                  const SizedBox(height: 10),
                  Text(err!, style: const TextStyle(color: BK.crit, fontSize: 12.5)),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                  onPressed: busy
                      ? null
                      : () async {
                          if (phoneCtrl.text.trim().isEmpty) {
                            setLocal(() => err = 'Nomor WhatsApp wajib diisi.');
                            return;
                          }
                          if (otpSent && codeCtrl.text.trim().isEmpty) {
                            setLocal(() => err = 'Kode OTP wajib diisi.');
                            return;
                          }
                          setLocal(() {
                            busy = true;
                            err = null;
                          });
                          try {
                            if (!otpSent) {
                              await auth.requestCustomerPhoneChange(phoneCtrl.text);
                              setLocal(() {
                                otpSent = true;
                                busy = false;
                              });
                            } else {
                              await auth.verifyCustomerPhoneChange(
                                  newPhone: phoneCtrl.text, code: codeCtrl.text);
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Nomor WhatsApp diperbarui')),
                                );
                              }
                            }
                          } catch (e) {
                            setLocal(() {
                              busy = false;
                              err = friendlyError(e);
                            });
                          }
                        },
                  child: Text(busy
                      ? 'Memproses…'
                      : otpSent
                          ? 'Verifikasi & simpan'
                          : 'Kirim OTP'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // --- Sheet form generik (edit profil / password) ---
  void _sheet(
    BuildContext context, {
    required String title,
    required List<Widget> fields,
    required Future<void> Function() onSubmit,
    required String success,
    String? Function()? validate,
  }) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: BK.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        bool busy = false;
        String? err;
        return StatefulBuilder(
          builder: (ctx, setLocal) => Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 18,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
                const SizedBox(height: 14),
                for (final f in fields) ...[f, const SizedBox(height: 10)],
                if (err != null) ...[
                  Text(err!, style: const TextStyle(color: BK.crit, fontSize: 12.5)),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: 4),
                FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                  onPressed: busy
                      ? null
                      : () async {
                          final v = validate?.call();
                          if (v != null) {
                            setLocal(() => err = v);
                            return;
                          }
                          setLocal(() {
                            busy = true;
                            err = null;
                          });
                          try {
                            await onSubmit();
                            if (ctx.mounted) Navigator.pop(ctx);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context)
                                  .showSnackBar(SnackBar(content: Text(success)));
                            }
                          } catch (e) {
                            setLocal(() {
                              busy = false;
                              err = friendlyError(e);
                            });
                          }
                        },
                  child: Text(busy ? 'Menyimpan…' : 'Simpan'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _field(
    TextEditingController ctrl,
    String label, {
    bool obscure = false,
    bool enabled = true,
    TextInputType? keyboard,
  }) =>
      TextField(
        controller: ctrl,
        obscureText: obscure,
        enabled: enabled,
        keyboardType: keyboard,
        style: const TextStyle(fontSize: 14, color: BK.ink),
        decoration: InputDecoration(
          labelText: label,
          isDense: true,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
}
