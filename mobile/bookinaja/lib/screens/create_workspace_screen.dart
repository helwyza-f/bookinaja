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
  // Mode Aplikasi awal — menentukan apakah workspace jalan booking, kasir, atau
  // keduanya. Nilai ini dikirim ke backend & dipakai untuk menyesuaikan setup +
  // onboarding. Sama dengan opsi di AppModeSettingsScreen; bisa diubah nanti.
  static const _modes = [
    (
      value: 'booking_pos',
      label: 'Reservasi + Kasir',
      desc: 'Booking dan kasir jalan bersamaan.',
      icon: Icons.dashboard_customize_rounded,
    ),
    (
      value: 'booking_only',
      label: 'Reservasi saja',
      desc: 'Booking murni — tanpa kasir atau F&B.',
      icon: Icons.event_available_rounded,
    ),
    (
      value: 'pos_only',
      label: 'Kasir saja',
      desc: 'Hanya kasir/POS. Tanpa booking.',
      icon: Icons.point_of_sale_rounded,
    ),
  ];

  final _name = TextEditingController();
  String _mode = 'booking_pos';
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
      await context.read<AuthController>().createWorkspace(name, appMode: _mode);
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

  Widget _modeCard(({String value, String label, String desc, IconData icon}) m) {
    final on = _mode == m.value;
    return GestureDetector(
      onTap: _busy ? null : () => setState(() => _mode = m.value),
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: on ? BK.accentSoft : BK.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: on ? BK.accent : BK.line, width: on ? 1.5 : 1),
        ),
        child: Row(children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: on ? BK.accent : BK.card2, borderRadius: BorderRadius.circular(10)),
            child: Icon(m.icon, size: 19, color: on ? Colors.white : BK.ink3),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(m.label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: on ? BK.accent : BK.ink)),
              const SizedBox(height: 2),
              Text(m.desc, style: const TextStyle(fontSize: 11.5, color: BK.ink3, height: 1.3)),
            ]),
          ),
          const SizedBox(width: 8),
          Icon(on ? Icons.radio_button_checked : Icons.radio_button_off, size: 20, color: on ? BK.accent : BK.ink3),
        ]),
      ),
    );
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
            const Text('Buat workspace baru', textAlign: TextAlign.center,
                style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 6),
            const Text('Pilih mode aplikasi dan beri nama — sisanya bisa dilengkapi nanti sebelum tayang.',
                textAlign: TextAlign.center, style: TextStyle(color: BK.ink3, fontSize: 13.5, height: 1.4)),
            const SizedBox(height: 26),

            const Text('MODE APLIKASI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1, color: BK.ink3)),
            const SizedBox(height: 4),
            const Text('Pilih cara kerja aplikasi. Setup & langkah persiapan menyesuaikan pilihan ini — bisa diubah nanti di Pengaturan.',
                style: TextStyle(color: BK.ink3, fontSize: 12, height: 1.35)),
            const SizedBox(height: 10),
            for (final m in _modes) ...[
              _modeCard(m),
              const SizedBox(height: 8),
            ],

            const SizedBox(height: 18),
            const Text('NAMA BISNIS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1, color: BK.ink3)),
            const SizedBox(height: 8),
            TextField(
              controller: _name,
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
