import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../models/receipt_settings.dart';
import '../repositories/settings_repository.dart';
import '../services/thermal_printer.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Pengaturan nota/struk: branding (judul/subjudul/footer), template cetak,
/// preview, dan printer thermal Bluetooth (Android + iOS).
class ReceiptSettingsScreen extends StatefulWidget {
  const ReceiptSettingsScreen({super.key});

  @override
  State<ReceiptSettingsScreen> createState() => _ReceiptSettingsScreenState();
}

class _ReceiptSettingsScreenState extends State<ReceiptSettingsScreen> {
  late final SettingsRepository _repo;
  final _printer = ThermalPrinter.instance;

  ReceiptSettings _s = const ReceiptSettings();
  bool _loading = true;
  bool _saving = false;
  bool _locked = false; // plan tenant belum mendukung branding nota
  String? _error;
  bool _editingTemplate = false;
  bool _connecting = false;
  bool _printing = false;

  final _title = TextEditingController();
  final _subtitle = TextEditingController();
  final _footer = TextEditingController();
  final _waText = TextEditingController();
  final _template = TextEditingController();

  @override
  void initState() {
    super.initState();
    _repo = context.read<SettingsRepository>();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_title, _subtitle, _footer, _waText, _template]) {
      c.dispose();
    }
    super.dispose();
  }

  void _bind(ReceiptSettings s) {
    _s = s;
    _title.text = s.title;
    _subtitle.text = s.subtitle;
    _footer.text = s.footer;
    _waText.text = s.whatsappText;
    _template.text = s.template;
  }

  ReceiptSettings _collect() => _s.copyWith(
        title: _title.text,
        subtitle: _subtitle.text,
        footer: _footer.text,
        whatsappText: _waText.text,
        template: _template.text,
      );

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _locked = false;
    });
    try {
      final s = await _repo.getReceiptSettings();
      if (!mounted) return;
      setState(() {
        _bind(s);
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      // 403 = fitur branding nota belum aktif di plan tenant. Tetap tampilkan
      // default agar bisa lihat preview & atur printer secara lokal.
      if (e.statusCode == 403) {
        setState(() {
          _bind(const ReceiptSettings(
            title: 'Struk Bookinaja',
            subtitle: 'Bukti transaksi resmi',
            footer: 'Terima kasih sudah berkunjung',
            template: ReceiptSettings.defaultTemplate,
          ));
          _locked = true;
          _loading = false;
        });
      } else {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    if (_locked) {
      BkToast.warning(context, 'Belum tersedia di plan ini',
          subtitle: 'Upgrade untuk menyimpan branding nota. Printer tetap bisa dipakai.');
      return;
    }
    setState(() => _saving = true);
    try {
      final saved = await _repo.saveReceiptSettings(_collect());
      if (!mounted) return;
      setState(() {
        _bind(saved);
        _saving = false;
        _editingTemplate = false;
      });
      BkToast.success(context, 'Pengaturan nota disimpan');
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal menyimpan', subtitle: '$e');
    }
  }

  // --- Printer ---

  Future<void> _connectPrinter() async {
    setState(() => _connecting = true);
    try {
      final granted = await _printer.ensurePermissions();
      if (!granted) {
        if (mounted) BkToast.error(context, 'Izin Bluetooth ditolak', subtitle: 'Aktifkan izin di setelan HP.');
        return;
      }
      if (!await _printer.bluetoothEnabled) {
        if (mounted) BkToast.error(context, 'Bluetooth mati', subtitle: 'Nyalakan Bluetooth lalu coba lagi.');
        return;
      }
      final printers = await _printer.pairedPrinters();
      if (!mounted) return;
      if (printers.isEmpty) {
        BkToast.info(context, 'Belum ada printer paired',
            subtitle: 'Pasangkan printer di Setelan > Bluetooth dulu.');
        return;
      }
      final picked = await _pickPrinter(printers);
      if (picked == null) return;
      final ok = await _printer.connect(picked.mac);
      if (!mounted) return;
      if (ok) {
        setState(() => _s = _s.copyWith(
            printerEnabled: true, printerName: picked.name, printerStatus: 'connected'));
        BkToast.success(context, 'Printer terhubung', subtitle: picked.name);
        if (!_locked) await _save();
      } else {
        BkToast.error(context, 'Gagal menghubungkan', subtitle: picked.name);
      }
    } catch (e) {
      if (mounted) BkToast.error(context, 'Gagal koneksi printer', subtitle: '$e');
    } finally {
      if (mounted) setState(() => _connecting = false);
    }
  }

  Future<BtPrinter?> _pickPrinter(List<BtPrinter> printers) {
    return showModalBottomSheet<BtPrinter>(
      context: context,
      backgroundColor: BK.card,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 18, 20, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Pilih printer',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink)),
            ),
          ),
          ...printers.map((p) => ListTile(
                leading: const Icon(Icons.print_rounded, color: BK.accent),
                title: Text(p.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                subtitle: Text(p.mac, style: const TextStyle(fontSize: 11, color: BK.ink3)),
                onTap: () => Navigator.pop(ctx, p),
              )),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  Future<void> _printTest() async {
    setState(() => _printing = true);
    try {
      if (!await _printer.isConnected) {
        if (mounted) BkToast.error(context, 'Printer belum terhubung');
        return;
      }
      final s = _collect();
      final ok = await _printer.printReceipt(
          title: s.title, body: s.renderPreview(), footer: s.footer);
      if (!mounted) return;
      ok
          ? BkToast.success(context, 'Struk tes tercetak')
          : BkToast.error(context, 'Gagal mencetak');
    } catch (e) {
      if (mounted) BkToast.error(context, 'Gagal mencetak', subtitle: '$e');
    } finally {
      if (mounted) setState(() => _printing = false);
    }
  }

  Future<void> _disconnectPrinter() async {
    await _printer.disconnect();
    if (!mounted) return;
    setState(() => _s = _s.copyWith(printerEnabled: false, printerStatus: 'disconnected'));
    if (!_locked) await _save();
    if (mounted) BkToast.info(context, 'Printer diputus');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Nota / Struk',
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
                    if (_locked) _lockedBanner(),
                    _printerCard(),
                    const SizedBox(height: 16),
                    _label('BRANDING'),
                    _field('Judul nota', _title, hint: 'Struk Bookinaja', onChanged: _touch),
                    const SizedBox(height: 10),
                    _field('Subjudul', _subtitle, hint: 'Bukti transaksi resmi', onChanged: _touch),
                    const SizedBox(height: 10),
                    _field('Footer', _footer, hint: 'Terima kasih sudah berkunjung', onChanged: _touch),
                    const SizedBox(height: 10),
                    _field('Teks WhatsApp', _waText,
                        hint: 'Pesan pengiring saat struk dikirim via WhatsApp', maxLines: 2, onChanged: _touch),
                    const SizedBox(height: 18),
                    _templateSection(),
                    const SizedBox(height: 18),
                    _label('PREVIEW'),
                    _preview(),
                  ],
                ),
      bottomNavigationBar: _loading || _error != null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Simpan', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ),
    );
  }

  void _touch() => setState(() {}); // refresh preview live

  Widget _lockedBanner() => Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(color: BK.pendSoft, borderRadius: BorderRadius.circular(BK.radius)),
        child: Row(children: [
          const Icon(Icons.lock_outline_rounded, size: 18, color: BK.pend),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
                'Branding nota termasuk fitur plan lanjutan. Kamu tetap bisa atur & pakai printer; perubahan branding belum bisa disimpan sampai upgrade.',
                style: TextStyle(fontSize: 11.5, color: BK.pend, fontWeight: FontWeight.w600, height: 1.35)),
          ),
        ]),
      );

  Widget _printerCard() {
    final connected = _s.printerEnabled && _s.printerStatus == 'connected';
    return BKCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
                color: connected ? BK.liveSoft : BK.card2, borderRadius: BorderRadius.circular(12)),
            child: Icon(Icons.print_rounded, color: connected ? BK.live : BK.ink3),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(connected ? 'Printer terhubung' : 'Printer thermal',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: BK.ink)),
              const SizedBox(height: 2),
              Text(
                connected
                    ? (_s.printerName.isEmpty ? 'Siap mencetak' : _s.printerName)
                    : 'Hubungkan printer Bluetooth untuk cetak struk.',
                style: const TextStyle(fontSize: 11.5, color: BK.ink3),
              ),
            ]),
          ),
          if (connected) Pill.live('Aktif') else Pill.mut('Nonaktif'),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                  foregroundColor: BK.accent,
                  side: const BorderSide(color: BK.line),
                  padding: const EdgeInsets.symmetric(vertical: 11)),
              onPressed: _connecting ? null : _connectPrinter,
              icon: _connecting
                  ? const SizedBox(width: 15, height: 15, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.bluetooth_rounded, size: 17),
              label: Text(connected ? 'Ganti' : 'Hubungkan'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                  backgroundColor: connected ? BK.accent : BK.ink3,
                  padding: const EdgeInsets.symmetric(vertical: 11)),
              onPressed: connected && !_printing ? _printTest : null,
              icon: _printing
                  ? const SizedBox(
                      width: 15, height: 15,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.receipt_long_rounded, size: 17),
              label: const Text('Cetak tes'),
            ),
          ),
        ]),
        if (connected) ...[
          const SizedBox(height: 6),
          Row(children: [
            Expanded(
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                activeThumbColor: BK.accent,
                value: _s.printerAutoPrint,
                onChanged: (v) {
                  setState(() => _s = _s.copyWith(printerAutoPrint: v));
                  if (!_locked) _save();
                },
                title: const Text('Auto-print saat lunas',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink)),
                subtitle: const Text('Cetak struk otomatis setelah pembayaran lunas.',
                    style: TextStyle(fontSize: 11, color: BK.ink3)),
              ),
            ),
          ]),
          TextButton.icon(
            style: TextButton.styleFrom(foregroundColor: BK.crit, padding: EdgeInsets.zero),
            onPressed: _disconnectPrinter,
            icon: const Icon(Icons.link_off_rounded, size: 16),
            label: const Text('Putuskan printer'),
          ),
        ],
      ]),
    );
  }

  Widget _templateSection() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: _label('TEMPLATE CETAK')),
        TextButton.icon(
          style: TextButton.styleFrom(foregroundColor: BK.accent, padding: EdgeInsets.zero),
          onPressed: () => setState(() => _editingTemplate = !_editingTemplate),
          icon: Icon(_editingTemplate ? Icons.check_rounded : Icons.edit_outlined, size: 16),
          label: Text(_editingTemplate ? 'Selesai' : 'Edit'),
        ),
      ]),
      if (_editingTemplate) ...[
        TextField(
          controller: _template,
          maxLines: 12,
          onChanged: (_) => _touch(),
          style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: BK.ink),
          decoration: InputDecoration(
            isDense: true,
            filled: true,
            fillColor: BK.card2,
            contentPadding: const EdgeInsets.all(12),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Placeholder: {tenant_name} {receipt_title} {receipt_subtitle} {booking_id} '
          '{booking_time} {customer_name} {resource_name} {cashier_name} {line_items} '
          '{grand_total} {deposit_amount} {paid_amount} {balance_due} {payment_method} '
          '{payment_status} {receipt_footer}',
          style: TextStyle(fontSize: 10.5, color: BK.ink3, height: 1.4),
        ),
      ] else
        Text('Ketuk "Edit" untuk ubah tata letak baris struk.',
            style: TextStyle(fontSize: 12, color: BK.ink3)),
    ]);
  }

  Widget _preview() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: BK.line)),
      child: Text(
        _collect().renderPreview(),
        style: const TextStyle(fontSize: 11.5, fontFamily: 'monospace', color: BK.ink, height: 1.5),
      ),
    );
  }

  Widget _label(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8, left: 2),
        child: Text(t,
            style: const TextStyle(
                fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
      );

  Widget _field(String label, TextEditingController controller,
      {String? hint, int maxLines = 1, VoidCallback? onChanged}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
      const SizedBox(height: 5),
      TextField(
        controller: controller,
        maxLines: maxLines,
        onChanged: onChanged == null ? null : (_) => onChanged(),
        style: const TextStyle(fontSize: 13.5, color: BK.ink),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: BK.ink3, fontSize: 12.5),
          isDense: true,
          filled: true,
          fillColor: BK.card2,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
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
