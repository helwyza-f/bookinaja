import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme.dart';
import '../ui/toast.dart';
import '../repositories/settings_repository.dart';
import '../state/auth_controller.dart';

/// Pengaturan **Mode Aplikasi** (owner). Menentukan apakah app menjalankan
/// booking, kasir, atau keduanya. Tersimpan di profil tenant pada
/// `booking_form_config` sebagai `app_mode` + `pos_standalone`/`pos_on_session`.
///
/// - `booking_pos`  → booking + kasir. Dua toggle mengatur dua jenis kasir:
///   Kasir A (walk-in/customer, berdiri sendiri) & Kasir B (F&B nempel ke sesi).
/// - `booking_only` → hanya booking; kedua kasir mati.
/// - `pos_only`     → hanya kasir; booking hilang dari aplikasi.
///
/// Nilai `fnb_mode` legacy tetap ditulis untuk backend lama yang membaca field
/// itu di bootstrap (`integrated`/`standalone`/`off`).
class FnbModeSettingsScreen extends StatefulWidget {
  const FnbModeSettingsScreen({super.key});

  @override
  State<FnbModeSettingsScreen> createState() => _FnbModeSettingsScreenState();
}

class _FnbModeSettingsScreenState extends State<FnbModeSettingsScreen> {
  static const _options = [
    (
      value: 'booking_pos',
      label: 'Reservasi + Kasir',
      desc: 'Booking dan kasir jalan bersamaan.',
      icon: Icons.dashboard_customize_rounded,
    ),
    (
      value: 'booking_only',
      label: 'Reservasi saja',
      desc: 'Hanya booking. Semua kasir dimatikan.',
      icon: Icons.event_available_rounded,
    ),
    (
      value: 'pos_only',
      label: 'Kasir saja',
      desc: 'Hanya kasir/POS. Booking hilang dari aplikasi.',
      icon: Icons.point_of_sale_rounded,
    ),
  ];

  Map<String, dynamic>? _profile; // objek Tenant mentah (untuk PUT utuh)
  String _mode = 'booking_pos';
  bool _posStandalone = true; // Kasir A
  bool _posOnSession = true; // Kasir B
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final p = await context.read<SettingsRepository>().getProfile();
      final cfg = p['booking_form_config'];
      final map = (cfg is Map) ? cfg : const {};
      var mode = '${map['app_mode'] ?? ''}';
      var standalone = map['pos_standalone'] != false;
      var onSession = map['pos_on_session'] != false;
      // Fallback ke fnb_mode legacy bila app_mode belum ada.
      if (mode != 'booking_pos' && mode != 'booking_only' && mode != 'pos_only') {
        switch ('${map['fnb_mode'] ?? ''}') {
          case 'standalone':
            mode = 'booking_pos';
            standalone = true;
            onSession = false;
          case 'off':
            mode = 'booking_only';
            standalone = false;
            onSession = false;
          default: // integrated / kosong
            mode = 'booking_pos';
            standalone = true;
            onSession = true;
        }
      }
      setState(() {
        _profile = p;
        _mode = mode;
        _posStandalone = standalone;
        _posOnSession = onSession;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  /// Turunkan `fnb_mode` legacy dari state agar backend lama tetap konsisten.
  String get _legacyFnbMode {
    if (_mode == 'booking_only') return 'off';
    if (_mode == 'pos_only') return 'standalone'; // kasir aktif, tanpa booking
    return _posOnSession ? 'integrated' : 'standalone';
  }

  Future<void> _save() async {
    final profile = _profile;
    if (profile == null) return;
    setState(() => _saving = true);
    // Merge ke booking_form_config tanpa membuang field lain.
    final cfg = (profile['booking_form_config'] is Map)
        ? Map<String, dynamic>.from(profile['booking_form_config'] as Map)
        : <String, dynamic>{};
    cfg['app_mode'] = _mode;
    cfg['pos_standalone'] = _posStandalone;
    cfg['pos_on_session'] = _posOnSession;
    cfg['fnb_mode'] = _legacyFnbMode; // backward-compat
    profile['booking_form_config'] = cfg;
    try {
      await context.read<SettingsRepository>().saveProfile(profile);
      if (!mounted) return;
      // Segarkan gating booking/kasir/nav agar perubahan langsung terasa.
      await context.read<AuthController>().refreshAppMode();
      if (!mounted) return;
      BkToast.success(context, 'Mode aplikasi disimpan');
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal menyimpan', subtitle: '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Mode Aplikasi',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: BK.crit)),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _load, child: const Text('Coba lagi')),
                    ]),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                  children: [
                    const Text('Pilih bagaimana aplikasi bekerja. Kamu bisa nyalakan booking, kasir, atau keduanya.',
                        style: TextStyle(fontSize: 13, color: BK.ink2, height: 1.4)),
                    const SizedBox(height: 16),
                    for (final o in _options) ...[
                      _optionCard(o),
                      const SizedBox(height: 10),
                    ],
                  ],
                ),
      bottomNavigationBar: _loading || _error != null
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: _saving ? null : _save,
                child: Text(_saving ? 'Menyimpan…' : 'Simpan', style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
    );
  }

  Widget _optionCard(({String value, String label, String desc, IconData icon}) o) {
    final on = _mode == o.value;
    final showToggles = on && o.value == 'booking_pos';
    return GestureDetector(
      onTap: () => setState(() => _mode = o.value),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: on ? BK.accentSoft : BK.card,
          borderRadius: BorderRadius.circular(BK.radius),
          border: Border.all(color: on ? BK.accent : BK.line, width: on ? 1.5 : 1),
        ),
        child: Column(children: [
          Row(children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                  color: on ? BK.accent : BK.card2, borderRadius: BorderRadius.circular(11)),
              child: Icon(o.icon, size: 20, color: on ? Colors.white : BK.ink3),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(o.label,
                    style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: on ? BK.accent : BK.ink)),
                const SizedBox(height: 2),
                Text(o.desc, style: const TextStyle(fontSize: 12, color: BK.ink3, height: 1.35)),
              ]),
            ),
            const SizedBox(width: 8),
            Icon(on ? Icons.radio_button_checked : Icons.radio_button_off,
                size: 20, color: on ? BK.accent : BK.ink3),
          ]),
          if (showToggles) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, color: BK.line),
            const SizedBox(height: 4),
            _toggleRow(
              title: 'Kasir walk-in / customer',
              subtitle: 'Transaksi kasir berdiri sendiri',
              value: _posStandalone,
              onChanged: (v) => setState(() => _posStandalone = v),
            ),
            _toggleRow(
              title: 'Kasir nempel ke sesi',
              subtitle: 'Tombol “Tambah F&B” di detail booking',
              value: _posOnSession,
              onChanged: (v) => setState(() => _posOnSession = v),
            ),
          ],
        ]),
      ),
    );
  }

  Widget _toggleRow({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink)),
            const SizedBox(height: 1),
            Text(subtitle, style: const TextStyle(fontSize: 11, color: BK.ink3, height: 1.3)),
          ]),
        ),
        const SizedBox(width: 8),
        Switch.adaptive(
          value: value,
          activeThumbColor: BK.accent,
          onChanged: onChanged,
        ),
      ]),
    );
  }
}
