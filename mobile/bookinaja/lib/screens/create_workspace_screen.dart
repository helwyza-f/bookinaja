import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../state/auth_controller.dart';

/// Buat workspace baru — form minimal (nama saja). Slug, kategori, dan sisa
/// detail dilengkapi belakangan lewat Setup Bisnis (gerbang publikasi). Setelah
/// sukses, workspace langsung dipilih dan masuk dashboard.
class CreateWorkspaceScreen extends StatefulWidget {
  const CreateWorkspaceScreen({super.key});
  @override
  State<CreateWorkspaceScreen> createState() => _CreateWorkspaceScreenState();
}

class _CreateWorkspaceScreenState extends State<CreateWorkspaceScreen> {
  final _name = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Nama bisnis wajib diisi');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthController>().createWorkspace(name);
      if (mounted) Navigator.of(context).pop(); // root beralih ke dashboard sendiri
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = '$e'.replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Buat workspace', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            const Text('Nama bisnis',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink2)),
            const SizedBox(height: 8),
            TextField(
              controller: _name,
              autofocus: true,
              enabled: !_busy,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _busy ? null : _submit(),
              decoration: InputDecoration(
                hintText: 'Contoh: Kopi Senja',
                errorText: _error,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Detail lain (kategori, kontak, metode bayar) dilengkapi nanti di '
              'Setup Bisnis sebelum dipublikasikan ke pelanggan.',
              style: TextStyle(fontSize: 12, color: BK.ink3),
            ),
            const SizedBox(height: 20),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: BK.accent,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Buat & lanjut setup', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
    );
  }
}
