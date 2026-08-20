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
  void initState() {
    super.initState();
    _name.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  /// Preview slug — cerminan dari yang backend hasilkan dari nama.
  String get _slug {
    final s = _name.text
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .trim()
        .replaceAll(RegExp(r'[\s-]+'), '-');
    return s;
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
    final hasName = _name.text.trim().isNotEmpty;
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: BK.ink,
        title: const Text('Workspace baru', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            // Hero
            Center(
              child: Container(
                width: 76, height: 76,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [BoxShadow(color: BK.accent.withValues(alpha: .3), blurRadius: 20, offset: const Offset(0, 8))],
                ),
                child: const Icon(Icons.add_business_rounded, color: Colors.white, size: 38),
              ),
            ),
            const SizedBox(height: 18),
            const Text('Beri nama bisnismu', textAlign: TextAlign.center,
                style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 6),
            const Text('Cukup nama dulu — sisanya bisa kamu lengkapi nanti sebelum tayang ke pelanggan.',
                textAlign: TextAlign.center, style: TextStyle(color: BK.ink3, fontSize: 13.5, height: 1.4)),
            const SizedBox(height: 28),

            const Text('NAMA BISNIS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1, color: BK.ink3)),
            const SizedBox(height: 8),
            TextField(
              controller: _name,
              autofocus: true,
              enabled: !_busy,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _busy ? null : _submit(),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: BK.ink),
              decoration: InputDecoration(
                hintText: 'Contoh: Kopi Senja',
                hintStyle: const TextStyle(color: BK.ink3, fontWeight: FontWeight.w500),
                errorText: _error,
                filled: true,
                fillColor: BK.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: BK.line)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: BK.accent, width: 1.6)),
                errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: BK.crit)),
                focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: BK.crit, width: 1.6)),
              ),
            ),

            // Live slug preview — bikin terasa "pintar".
            AnimatedSize(
              duration: const Duration(milliseconds: 180),
              child: hasName
                  ? Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Row(children: [
                        const Icon(Icons.link_rounded, size: 15, color: BK.ink3),
                        const SizedBox(width: 6),
                        const Text('Alamat: ', style: TextStyle(fontSize: 12.5, color: BK.ink3)),
                        Flexible(
                          child: Text('$_slug.bookinaja.com',
                              maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.accent)),
                        ),
                      ]),
                    )
                  : const SizedBox.shrink(),
            ),

            const SizedBox(height: 22),
            // Info: langkah lanjutan.
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(14)),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.auto_awesome_rounded, size: 18, color: BK.accent),
                const SizedBox(width: 10),
                Expanded(
                  child: RichText(
                    text: const TextSpan(
                      style: TextStyle(fontSize: 12.5, color: BK.ink2, height: 1.45),
                      children: [
                        TextSpan(text: 'Setelah dibuat, kamu masuk ke '),
                        TextSpan(text: 'Setup Bisnis', style: TextStyle(fontWeight: FontWeight.w800, color: BK.ink)),
                        TextSpan(text: ' untuk melengkapi kategori, kontak, resource, dan metode bayar — lalu terbitkan.'),
                      ],
                    ),
                  ),
                ),
              ]),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 8, 20, 16),
        child: FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: hasName ? BK.accent : BK.ink3,
            disabledBackgroundColor: BK.line,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          onPressed: (_busy || !hasName) ? null : _submit,
          child: _busy
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
              : const Text('Buat & lanjut setup', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
        ),
      ),
    );
  }
}
