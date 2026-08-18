import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/payment_gateway.dart';
import '../repositories/settings_repository.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Setup BYO payment gateway (Midtrans / Xendit). Kredensial server key tak
/// pernah ditarik balik dari server (hanya status ter-mask); biarkan kosong
/// bila tak ingin mengubahnya.
class PaymentGatewaySettingsScreen extends StatefulWidget {
  const PaymentGatewaySettingsScreen({super.key});

  @override
  State<PaymentGatewaySettingsScreen> createState() => _PaymentGatewaySettingsScreenState();
}

class _PaymentGatewaySettingsScreenState extends State<PaymentGatewaySettingsScreen> {
  late final SettingsRepository _repo;
  PaymentGateway _gw = const PaymentGateway();
  bool _loading = true;
  bool _saving = false;
  bool _testing = false;
  String? _error;

  String _provider = 'midtrans';
  String _environment = 'sandbox';
  final _serverKey = TextEditingController();
  final _clientKey = TextEditingController();
  final _callbackSecret = TextEditingController();

  @override
  void initState() {
    super.initState();
    _repo = context.read<SettingsRepository>();
    _load();
  }

  @override
  void dispose() {
    _serverKey.dispose();
    _clientKey.dispose();
    _callbackSecret.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final gw = await _repo.getPaymentGateway();
      if (!mounted) return;
      setState(() {
        _gw = gw;
        _provider = gw.provider.isNotEmpty ? gw.provider : 'midtrans';
        _environment = gw.environment.isNotEmpty ? gw.environment : 'sandbox';
        _clientKey.text = gw.clientKey;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    // Server key wajib bila belum pernah tersimpan.
    if (!_gw.serverKeySet && _serverKey.text.trim().isEmpty) {
      BkToast.error(context, 'Server key wajib diisi');
      return;
    }
    if (!_gw.callbackSecretSet && _callbackSecret.text.trim().isEmpty) {
      BkToast.error(context, 'Callback secret wajib diisi');
      return;
    }
    setState(() => _saving = true);
    try {
      final gw = await _repo.savePaymentGateway(
        provider: _provider,
        environment: _environment,
        serverKey: _serverKey.text.trim(),
        clientKey: _clientKey.text.trim(),
        callbackSecret: _callbackSecret.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _gw = gw;
        _saving = false;
        _serverKey.clear();
        _callbackSecret.clear();
      });
      BkToast.success(context, 'Gateway tersimpan',
          subtitle: gw.configured ? 'Metode online sudah bisa diaktifkan.' : null);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal menyimpan', subtitle: '$e');
    }
  }

  Future<void> _test() async {
    setState(() => _testing = true);
    try {
      await _repo.testPaymentGateway();
      if (!mounted) return;
      BkToast.success(context, 'Koneksi gateway OK');
    } catch (e) {
      if (!mounted) return;
      BkToast.error(context, 'Tes koneksi gagal', subtitle: '$e');
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  /// Nonaktifkan gateway. Backend hanya set status 'disabled' (kredensial tetap
  /// tersimpan agar bisa diaktifkan lagi tanpa isi ulang) — labelnya jujur
  /// "Nonaktifkan", bukan "Hapus".
  Future<void> _disable() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Nonaktifkan gateway?', style: TextStyle(fontSize: 16)),
        content: const Text(
            'Pembayaran online akan dimatikan. Kredensial tetap tersimpan, jadi '
            'bisa diaktifkan lagi tanpa isi ulang.',
            style: TextStyle(fontSize: 13.5, color: BK.ink2)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.crit),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Nonaktifkan'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _repo.deletePaymentGateway(); // endpoint DELETE = Disable di backend
      await _deactivateOnlineMethods(); // korelasi: online ikut mati & tersimpan
      if (!mounted) return;
      BkToast.success(context, 'Gateway dinonaktifkan',
          subtitle: 'Pembayaran online dimatikan.');
      _load();
    } catch (e) {
      if (!mounted) return;
      BkToast.error(context, 'Gagal menonaktifkan', subtitle: '$e');
    }
  }

  /// Aktifkan kembali gateway yang dinonaktifkan. Kredensial masih tersimpan;
  /// simpan ulang (server key kosong = pakai yang lama) mengembalikan status.
  Future<void> _enable() async {
    setState(() => _saving = true);
    try {
      final gw = await _repo.savePaymentGateway(
        provider: _provider,
        environment: _environment,
        serverKey: _serverKey.text.trim(), // kosong → backend pertahankan lama
        clientKey: _clientKey.text.trim(),
        callbackSecret: _callbackSecret.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _gw = gw;
        _saving = false;
      });
      BkToast.success(context, 'Gateway diaktifkan kembali');
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal mengaktifkan', subtitle: '$e');
    }
  }

  /// Matikan metode pembayaran online yang masih aktif & simpan — agar korelasi
  /// "gateway nonaktif ⇒ online off" ikut tersimpan, bukan cuma tampilan.
  Future<void> _deactivateOnlineMethods() async {
    try {
      final methods = await _repo.getPaymentMethods();
      if (methods.any((m) => m.isGateway && m.isActive)) {
        final updated = [
          for (final m in methods) (m.isGateway && m.isActive) ? m.copyWith(isActive: false) : m,
        ];
        await _repo.savePaymentMethods(updated);
      }
    } catch (_) {
      // Non-fatal: tampilan tetap ter-gate lewat status gateway.
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
        title: const Text('Payment Gateway',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: _loading
          ? const LoadingList()
          : _error != null
              ? StateView(
                  icon: Icons.wifi_off_rounded,
                  color: BK.crit,
                  title: 'Gagal memuat',
                  hint: _error,
                  action: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: BK.accent),
                    onPressed: _load,
                    child: const Text('Coba lagi'),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  children: [
                    _statusCard(),
                    const SizedBox(height: 14),
                    _section('PROVIDER'),
                    _segmented(
                      value: _provider,
                      options: const {'midtrans': 'Midtrans', 'xendit': 'Xendit'},
                      onChanged: (v) => setState(() => _provider = v),
                    ),
                    const SizedBox(height: 14),
                    _section('LINGKUNGAN'),
                    _segmented(
                      value: _environment,
                      options: const {'sandbox': 'Sandbox (uji)', 'production': 'Produksi'},
                      onChanged: (v) => setState(() => _environment = v),
                    ),
                    const SizedBox(height: 14),
                    _section('KREDENSIAL'),
                    _field('Server key', _serverKey,
                        hint: _gw.serverKeySet ? '•••• tersimpan — isi untuk ganti' : 'Server key dari dashboard gateway',
                        obscure: true),
                    const SizedBox(height: 10),
                    _field('Client key', _clientKey, hint: 'Client key (publik)'),
                    const SizedBox(height: 10),
                    _field('Callback / webhook secret', _callbackSecret,
                        hint: _gw.callbackSecretSet ? '•••• tersimpan — isi untuk ganti' : 'Secret verifikasi webhook',
                        obscure: true),
                    const SizedBox(height: 20),
                    FilledButton(
                      style: FilledButton.styleFrom(
                          backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(
                              width: 18, height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(_gw.hasCredentials ? 'Perbarui kredensial' : 'Simpan kredensial',
                              style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    // Gateway nonaktif tapi kredensial masih ada → tawarkan aktif lagi.
                    if (_gw.isDisabled) ...[
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                            foregroundColor: BK.live,
                            side: const BorderSide(color: BK.line),
                            padding: const EdgeInsets.symmetric(vertical: 13)),
                        onPressed: _saving ? null : _enable,
                        icon: const Icon(Icons.power_settings_new_rounded, size: 18),
                        label: const Text('Aktifkan kembali'),
                      ),
                    ],
                    // Gateway aktif → boleh tes koneksi & nonaktifkan.
                    if (_gw.configured) ...[
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                            foregroundColor: BK.accent,
                            side: const BorderSide(color: BK.line),
                            padding: const EdgeInsets.symmetric(vertical: 13)),
                        onPressed: _testing ? null : _test,
                        icon: _testing
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.wifi_tethering_rounded, size: 18),
                        label: const Text('Tes koneksi'),
                      ),
                      const SizedBox(height: 10),
                      TextButton.icon(
                        style: TextButton.styleFrom(foregroundColor: BK.crit),
                        onPressed: _disable,
                        icon: const Icon(Icons.power_off_rounded, size: 18),
                        label: const Text('Nonaktifkan gateway'),
                      ),
                    ],
                  ],
                ),
    );
  }

  Widget _statusCard() {
    final active = _gw.configured; // kredensial ada & tidak disabled
    final disabled = _gw.isDisabled;
    final Color color = active ? BK.live : (disabled ? BK.pend : BK.ink3);
    final Color soft = active ? BK.liveSoft : (disabled ? BK.pendSoft : BK.card2);
    final IconData icon =
        active ? Icons.verified_rounded : (disabled ? Icons.pause_circle_outline_rounded : Icons.vpn_key_outlined);

    return BKCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: soft, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_gw.stateLabel,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: BK.ink)),
              const SizedBox(height: 2),
              Text(
                !_gw.hasCredentials
                    ? 'Isi kredensial untuk mengaktifkan pembayaran online.'
                    : disabled
                        ? 'Kredensial masih tersimpan. Aktifkan lagi kapan saja.'
                        : 'Pembayaran online bisa diaktifkan di Metode Pembayaran.',
                style: const TextStyle(fontSize: 11.5, color: BK.ink3, height: 1.3),
              ),
            ]),
          ),
        ]),
        // Rincian: apa yang sudah terisi (biar jelas isinya apa).
        if (_gw.hasCredentials) ...[
          const SizedBox(height: 12),
          const Divider(height: 1, color: BK.line),
          const SizedBox(height: 10),
          _detailRow('Provider', _gw.provider == 'xendit' ? 'Xendit' : 'Midtrans'),
          _detailRow('Lingkungan', _gw.environment == 'production' ? 'Produksi' : 'Sandbox'),
          _detailRow('Server key', _gw.serverKeySet ? (_gw.serverKeyMasked.isNotEmpty ? _gw.serverKeyMasked : 'Terisi') : 'Belum diisi',
              ok: _gw.serverKeySet),
          _detailRow('Client key', _gw.clientKey.isNotEmpty ? _gw.clientKey : 'Belum diisi', ok: _gw.clientKey.isNotEmpty),
          _detailRow('Callback secret', _gw.callbackSecretSet ? 'Terisi' : 'Belum diisi', ok: _gw.callbackSecretSet),
          if (_gw.lastError.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(_gw.lastError, style: const TextStyle(fontSize: 11, color: BK.crit)),
          ],
        ],
      ]),
    );
  }

  Widget _detailRow(String label, String value, {bool ok = true}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Icon(ok ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
              size: 15, color: ok ? BK.live : BK.ink3),
          const SizedBox(width: 8),
          SizedBox(
            width: 108,
            child: Text(label, style: const TextStyle(fontSize: 12, color: BK.ink3)),
          ),
          Expanded(
            child: Text(value,
                textAlign: TextAlign.right,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: BK.ink2)),
          ),
        ]),
      );

  Widget _section(String label) => Padding(
        padding: const EdgeInsets.only(bottom: 9, left: 2),
        child: Text(label,
            style: const TextStyle(
                fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
      );

  Widget _segmented({
    required String value,
    required Map<String, String> options,
    required ValueChanged<String> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: options.entries.map((e) {
          final sel = e.key == value;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(e.key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: sel ? BK.card : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: sel
                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 1))]
                      : null,
                ),
                child: Text(e.value,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: sel ? BK.ink : BK.ink3)),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _field(String label, TextEditingController controller,
      {String? hint, bool obscure = false}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
      const SizedBox(height: 5),
      TextField(
        controller: controller,
        obscureText: obscure,
        style: const TextStyle(fontSize: 13.5, color: BK.ink),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: BK.ink3, fontSize: 12.5),
          isDense: true,
          filled: true,
          fillColor: BK.card2,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
        ),
      ),
    ]);
  }
}
