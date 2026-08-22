import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Akun saya (staff) — profil ringkas + ganti password sendiri. Staff tak punya
/// akses ke "Akun owner" (area owner), jadi ini pintu satu-satunya untuk
/// mengelola kredensial login mereka.
class StaffAccountScreen extends StatefulWidget {
  const StaffAccountScreen({super.key});
  @override
  State<StaffAccountScreen> createState() => _StaffAccountScreenState();
}

class _StaffAccountScreenState extends State<StaffAccountScreen> {
  final _old = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  bool _obOld = true, _obNew = true;
  bool _busy = false;

  @override
  void dispose() {
    _old.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_old.text.isEmpty) return BkToast.error(context, 'Isi password lama');
    if (_new.text.length < 6) return BkToast.error(context, 'Password baru minimal 6 karakter');
    if (_new.text != _confirm.text) return BkToast.error(context, 'Konfirmasi password tidak cocok');

    setState(() => _busy = true);
    try {
      await context.read<AuthController>().changeAccountPassword(
            oldPassword: _old.text,
            newPassword: _new.text,
          );
      if (!mounted) return;
      BkToast.success(context, 'Password diperbarui');
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      BkToast.error(context, 'Gagal', subtitle: '$e'.replaceFirst('Exception: ', ''));
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final acc = auth.account;
    final ws = auth.workspace;
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('Akun saya', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            // Identitas ringkas
            BKCard(
              child: Row(children: [
                Container(
                  width: 52, height: 52,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)]),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Text((acc?.name ?? '?').trim().isNotEmpty ? acc!.name.trim()[0].toUpperCase() : '?',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 22)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(acc?.name ?? '-',
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
                    const SizedBox(height: 2),
                    Text(acc?.email ?? '-',
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
                    if (ws != null) ...[
                      const SizedBox(height: 6),
                      Pill.mut('${ws.name} · ${ws.role}'),
                    ],
                  ]),
                ),
              ]),
            ),
            const SizedBox(height: 22),
            const Text('GANTI PASSWORD',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1, color: BK.ink3)),
            const SizedBox(height: 10),
            _field(_old, 'Password lama', obscure: _obOld, onToggle: () => setState(() => _obOld = !_obOld)),
            const SizedBox(height: 12),
            _field(_new, 'Password baru (min. 6)', obscure: _obNew, onToggle: () => setState(() => _obNew = !_obNew)),
            const SizedBox(height: 12),
            _field(_confirm, 'Ulangi password baru', obscure: _obNew),
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
          onPressed: _busy ? null : _save,
          child: _busy
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
              : const Text('Simpan password', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String hint, {bool obscure = false, VoidCallback? onToggle}) {
    return TextField(
      controller: ctrl,
      obscureText: obscure,
      enabled: !_busy,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: BK.ink),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: BK.ink3, fontWeight: FontWeight.w500),
        filled: true,
        fillColor: BK.card,
        suffixIcon: onToggle == null
            ? null
            : IconButton(
                icon: Icon(obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    size: 20, color: BK.ink3),
                onPressed: onToggle,
              ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.accent, width: 1.6)),
        disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
      ),
    );
  }
}
