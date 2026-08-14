import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../ui/toast.dart';
import '../../state/auth_controller.dart';

/// Auth pelanggan: WhatsApp OTP (utama) atau Email + Password. Daftar akun baru
/// lewat [CustomerRegisterScreen]. Sukses → kembali ke root; AuthGate akan
/// menampilkan CustomerHomeShell.
class CustomerAuthScreen extends StatefulWidget {
  const CustomerAuthScreen({super.key});
  @override
  State<CustomerAuthScreen> createState() => _CustomerAuthScreenState();
}

enum _Mode { whatsapp, email }

class _CustomerAuthScreenState extends State<CustomerAuthScreen> {
  _Mode _mode = _Mode.whatsapp;

  // WhatsApp OTP
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  bool _otpSent = false;
  bool _sendingOtp = false;

  // Email
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _popToRoot() => Navigator.of(context).popUntil((r) => r.isFirst);

  Future<void> _sendOtp() async {
    final phone = _phone.text.trim();
    if (phone.length < 8) {
      BkToast.error(context, 'Nomor WhatsApp belum benar');
      return;
    }
    setState(() => _sendingOtp = true);
    try {
      await context.read<AuthController>().requestCustomerLoginOtp(phone);
      if (!mounted) return;
      setState(() => _otpSent = true);
      BkToast.success(context, 'Kode OTP dikirim ke WhatsApp');
    } catch (e) {
      if (mounted) BkToast.error(context, 'Gagal mengirim OTP', subtitle: '$e');
    } finally {
      if (mounted) setState(() => _sendingOtp = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_otp.text.trim().length < 4) {
      BkToast.error(context, 'Kode OTP belum lengkap');
      return;
    }
    final auth = context.read<AuthController>();
    final ok = await auth.verifyCustomerOtp(phone: _phone.text.trim(), code: _otp.text.trim());
    if (!mounted) return;
    if (ok) {
      _popToRoot();
    } else {
      BkToast.error(context, 'Verifikasi gagal', subtitle: auth.error ?? 'Kode salah / kedaluwarsa.');
    }
  }

  Future<void> _loginEmail() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      BkToast.error(context, 'Email & password wajib diisi');
      return;
    }
    final auth = context.read<AuthController>();
    final ok = await auth.loginCustomerEmail(email: _email.text.trim(), password: _password.text);
    if (!mounted) return;
    if (ok) {
      _popToRoot();
    } else {
      BkToast.error(context, 'Gagal masuk', subtitle: auth.error ?? 'Cek email & password.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final submitting = context.watch<AuthController>().submitting;
    return Scaffold(
      appBar: AppBar(backgroundColor: BK.bg, elevation: 0, foregroundColor: BK.ink),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 4, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Masuk ke Bookinaja', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w800, color: BK.ink)),
              const SizedBox(height: 6),
              const Text('Pakai WhatsApp untuk masuk paling cepat.', style: TextStyle(fontSize: 13.5, color: BK.ink3)),
              const SizedBox(height: 20),
              _modeToggle(),
              const SizedBox(height: 18),
              if (_mode == _Mode.whatsapp) ..._whatsappForm(submitting) else ..._emailForm(submitting),
              const SizedBox(height: 22),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Belum punya akun?', style: TextStyle(color: BK.ink3, fontSize: 13)),
                  TextButton(
                    onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CustomerRegisterScreen())),
                    child: const Text('Daftar', style: TextStyle(fontWeight: FontWeight.w800, color: BK.accent)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _modeToggle() {
    Widget seg(String label, _Mode m, IconData icon) {
      final on = _mode == m;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() => _mode = m),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 11),
            decoration: BoxDecoration(color: on ? BK.card : Colors.transparent, borderRadius: BorderRadius.circular(11)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 17, color: on ? BK.accent : BK.ink3),
                const SizedBox(width: 7),
                Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: on ? BK.ink : BK.ink3)),
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(14)),
      child: Row(children: [seg('WhatsApp', _Mode.whatsapp, Icons.chat_rounded), seg('Email', _Mode.email, Icons.mail_outline)]),
    );
  }

  List<Widget> _whatsappForm(bool submitting) => [
        _field(_phone, 'Nomor WhatsApp', Icons.phone_outlined, keyboard: TextInputType.phone, enabled: !_otpSent),
        if (_otpSent) ...[
          const SizedBox(height: 10),
          _field(_otp, 'Kode OTP', Icons.password_outlined, keyboard: TextInputType.number),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: _sendingOtp ? null : _sendOtp,
              child: const Text('Kirim ulang kode', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
            ),
          ),
        ],
        const SizedBox(height: 14),
        _primaryButton(
          label: _otpSent ? 'Verifikasi & masuk' : 'Kirim OTP',
          loading: submitting || _sendingOtp,
          onTap: _otpSent ? _verifyOtp : _sendOtp,
        ),
        if (_otpSent)
          TextButton(
            onPressed: () => setState(() => _otpSent = false),
            child: const Text('Ganti nomor', style: TextStyle(fontSize: 12.5, color: BK.ink3)),
          ),
      ];

  List<Widget> _emailForm(bool submitting) => [
        _field(_email, 'Email', Icons.mail_outline, keyboard: TextInputType.emailAddress),
        const SizedBox(height: 10),
        _field(_password, 'Password', Icons.lock_outline, obscure: _obscure, isPassword: true),
        const SizedBox(height: 14),
        _primaryButton(label: 'Masuk', loading: submitting, onTap: _loginEmail),
      ];

  Widget _primaryButton({required String label, required bool loading, required VoidCallback onTap}) {
    return FilledButton(
      style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
      onPressed: loading ? null : onTap,
      child: loading
          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          : Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
    );
  }

  Widget _field(TextEditingController c, String label, IconData icon,
      {bool obscure = false, bool isPassword = false, bool enabled = true, TextInputType? keyboard}) {
    return TextField(
      controller: c,
      obscureText: obscure,
      enabled: enabled,
      keyboardType: keyboard,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20, color: BK.ink3),
                onPressed: () => setState(() => _obscure = !_obscure),
              )
            : null,
        filled: true,
        fillColor: BK.card,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
      ),
    );
  }
}

/// Pendaftaran pelanggan baru: nama + WhatsApp (email & password opsional).
/// Setelah daftar, backend kirim OTP aktivasi → verifikasi di layar ini juga.
class CustomerRegisterScreen extends StatefulWidget {
  const CustomerRegisterScreen({super.key});
  @override
  State<CustomerRegisterScreen> createState() => _CustomerRegisterScreenState();
}

class _CustomerRegisterScreenState extends State<CustomerRegisterScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _otp = TextEditingController();
  bool _obscure = true;
  bool _sent = false; // true setelah OTP aktivasi terkirim
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (_name.text.trim().isEmpty || _phone.text.trim().length < 8) {
      BkToast.error(context, 'Nama & nomor WhatsApp wajib diisi');
      return;
    }
    setState(() => _busy = true);
    try {
      await context.read<AuthController>().startCustomerRegistration(
            name: _name.text,
            phone: _phone.text,
            email: _email.text.trim().isEmpty ? null : _email.text,
            password: _password.text.isEmpty ? null : _password.text,
          );
      if (!mounted) return;
      setState(() => _sent = true);
      BkToast.success(context, 'Kode aktivasi dikirim ke WhatsApp');
    } catch (e) {
      if (mounted) BkToast.error(context, 'Gagal mendaftar', subtitle: '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    if (_otp.text.trim().length < 4) {
      BkToast.error(context, 'Kode OTP belum lengkap');
      return;
    }
    final auth = context.read<AuthController>();
    final ok = await auth.verifyCustomerOtp(phone: _phone.text.trim(), code: _otp.text.trim());
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).popUntil((r) => r.isFirst);
    } else {
      BkToast.error(context, 'Verifikasi gagal', subtitle: auth.error ?? 'Kode salah / kedaluwarsa.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final submitting = context.watch<AuthController>().submitting;
    return Scaffold(
      appBar: AppBar(backgroundColor: BK.bg, elevation: 0, foregroundColor: BK.ink, title: const Text('Daftar', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 4, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!_sent) ...[
                _field(_name, 'Nama lengkap', Icons.person_outline, keyboard: TextInputType.name),
                const SizedBox(height: 10),
                _field(_phone, 'Nomor WhatsApp', Icons.phone_outlined, keyboard: TextInputType.phone),
                const SizedBox(height: 10),
                _field(_email, 'Email (opsional)', Icons.mail_outline, keyboard: TextInputType.emailAddress),
                const SizedBox(height: 10),
                _field(_password, 'Password (opsional)', Icons.lock_outline, obscure: _obscure, isPassword: true),
                const SizedBox(height: 16),
                _primaryButton(label: 'Daftar & kirim OTP', loading: _busy, onTap: _register),
              ] else ...[
                Text('Masukkan kode OTP yang dikirim ke ${_phone.text.trim()}', style: const TextStyle(fontSize: 13.5, color: BK.ink2)),
                const SizedBox(height: 14),
                _field(_otp, 'Kode OTP', Icons.password_outlined, keyboard: TextInputType.number),
                const SizedBox(height: 16),
                _primaryButton(label: 'Verifikasi & masuk', loading: submitting, onTap: _verify),
                TextButton(
                  onPressed: _busy ? null : () => context.read<AuthController>().resendCustomerRegistrationOtp(_phone.text.trim()),
                  child: const Text('Kirim ulang kode', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _primaryButton({required String label, required bool loading, required VoidCallback onTap}) {
    return FilledButton(
      style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
      onPressed: loading ? null : onTap,
      child: loading
          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          : Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
    );
  }

  Widget _field(TextEditingController c, String label, IconData icon,
      {bool obscure = false, bool isPassword = false, TextInputType? keyboard}) {
    return TextField(
      controller: c,
      obscureText: obscure,
      keyboardType: keyboard,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20, color: BK.ink3),
                onPressed: () => setState(() => _obscure = !_obscure),
              )
            : null,
        filled: true,
        fillColor: BK.card,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
      ),
    );
  }
}
