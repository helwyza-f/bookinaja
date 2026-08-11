import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../ui/toast.dart';
import '../state/auth_controller.dart';

/// Langkah 1: login account (email + password). Pilih workspace di layar berikutnya.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthController>();
    final ok = await auth.login(email: _email.text.trim(), password: _password.text);
    if (!ok && mounted) {
      BkToast.error(context, 'Gagal masuk', subtitle: auth.error ?? 'Cek email & password lalu coba lagi.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final submitting = context.watch<AuthController>().submitting;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(color: BK.accent, borderRadius: BorderRadius.circular(14)),
                  child: const Icon(Icons.hub, color: Colors.white),
                ),
                const SizedBox(height: 14),
                const Text('BOOKINAJA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.6, color: BK.ink3)),
                const SizedBox(height: 4),
                const Text('Masuk ke akun', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w800, color: BK.ink)),
                const SizedBox(height: 6),
                const Text('Pilih workspace setelah masuk', style: TextStyle(fontSize: 13, color: BK.ink3)),
                const SizedBox(height: 22),
                _field(_email, 'Email', Icons.mail_outline, keyboard: TextInputType.emailAddress),
                const SizedBox(height: 10),
                _field(_password, 'Password', Icons.lock_outline, obscure: _obscure, isPassword: true),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                    onPressed: submitting ? null : _submit,
                    child: submitting
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Masuk', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label, IconData icon,
      {bool obscure = false, bool isPassword = false, TextInputType? keyboard}) {
    return TextFormField(
      controller: c,
      obscureText: obscure,
      keyboardType: keyboard,
      validator: (v) => (v == null || v.trim().isEmpty) ? '$label wajib diisi' : null,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20, color: BK.ink3),
                onPressed: () => setState(() => _obscure = !_obscure),
                tooltip: obscure ? 'Tampilkan password' : 'Sembunyikan password',
              )
            : null,
        filled: true, fillColor: BK.card,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
      ),
    );
  }
}
