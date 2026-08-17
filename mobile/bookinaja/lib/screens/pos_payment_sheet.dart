import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../models/pos_order.dart';
import '../state/pos_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Hasil dari [PosPaymentSheet] saat pembayaran berhasil.
class PosPaymentOutcome {
  /// true = bon dibiarkan terbuka (prabayar); false = bayar & tutup.
  final bool keptOpen;
  const PosPaymentOutcome({required this.keptOpen});
}

/// Sheet pembayaran kasir — dipakai dua tempat dengan UI yang sama:
/// - dari **keranjang** ([orderId] == null): buat order lalu lunasi.
/// - dari **detail pesanan terbuka** ([orderId] != null): lunasi order yang ada.
///
/// Metode dibatasi ke tunai + manual (butuh/boleh bukti) — metode gateway
/// online tidak ditampilkan di kasir. Menyediakan uang-diterima (tunai) dan
/// unggah bukti (manual), plus switch "bon tetap terbuka" (prabayar).
///
/// Pop dengan [PosPaymentOutcome] saat sukses; null bila dibatalkan.
class PosPaymentSheet extends StatefulWidget {
  final int total;
  final List<PosPaymentMethod> methods;
  final String? orderId;
  const PosPaymentSheet({super.key, required this.total, required this.methods, this.orderId});

  @override
  State<PosPaymentSheet> createState() => _PosPaymentSheetState();
}

class _PosPaymentSheetState extends State<PosPaymentSheet> {
  PosPaymentMethod? _method;
  bool _keepOpen = false;
  bool _busy = false;
  final _cashCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  String? _proofPath;

  late final List<PosPaymentMethod> _methods = _buildMethods(widget.methods);

  @override
  void initState() {
    super.initState();
    _method = _methods.isNotEmpty ? _methods.first : null;
  }

  @override
  void dispose() {
    _cashCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  // Kasir hanya menerima tunai + metode manual (butuh bukti). Pastikan tunai selalu ada.
  List<PosPaymentMethod> _buildMethods(List<PosPaymentMethod> source) {
    final list = source.where((m) => m.isCash || m.isManual).toList();
    if (!list.any((m) => m.isCash)) {
      list.insert(0, const PosPaymentMethod(code: 'cash', label: 'Tunai', category: 'cash', verificationType: 'cash'));
    }
    list.sort((a, b) => (a.isCash ? 0 : 1).compareTo(b.isCash ? 0 : 1));
    return list;
  }

  int get _cashReceived => int.tryParse(_cashCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
  int get _change => (_cashReceived - widget.total);

  bool get _canConfirm => _method != null;

  Future<void> _confirm() async {
    final ctrl = context.read<PosController>();
    final m = _method!;
    final orderId = widget.orderId;
    setState(() => _busy = true);
    bool ok = false;
    try {
      if (orderId != null) {
        // Settle order yang sudah ada (dari detail pesanan terbuka).
        if (m.isCash) {
          await ctrl.settleOpenCash(orderId, keepOpen: _keepOpen);
        } else {
          await ctrl.settleOpenManual(orderId, method: m.code, proofPath: _proofPath, note: _noteCtrl.text, keepOpen: _keepOpen);
        }
        ok = true;
      } else {
        // Dari keranjang: buat + lunasi (atau prabayar bila keepOpen).
        if (_keepOpen) {
          ok = m.isCash
              ? await ctrl.prepayCash(method: m.code)
              : await ctrl.prepayManual(method: m.code, proofPath: _proofPath, note: _noteCtrl.text);
        } else {
          ok = m.isCash
              ? await ctrl.payCash(method: m.code, cashReceived: _cashReceived > 0 ? _cashReceived : null)
              : await ctrl.payManual(method: m.code, proofPath: _proofPath, note: _noteCtrl.text);
        }
        if (!ok && mounted) BkToast.error(context, ctrl.checkoutError ?? 'Pembayaran gagal');
      }
    } catch (e) {
      if (mounted) BkToast.error(context, 'Pembayaran gagal', subtitle: '$e');
    }
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.of(context).pop(PosPaymentOutcome(keptOpen: _keepOpen));
  }

  @override
  Widget build(BuildContext context) {
    final m = _method;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 10),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
          const Padding(
            padding: EdgeInsets.fromLTRB(18, 14, 18, 10),
            child: Row(children: [
              Text('Pembayaran', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(14)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Total tagihan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: BK.ink2)),
                const SizedBox(height: 2),
                Text('Rp${rupiah(widget.total)}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: BK.ink)),
              ]),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('METODE PEMBAYARAN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3, letterSpacing: 0.4)),
              const SizedBox(height: 10),
              for (final method in _methods) _methodTile(method, method.code == m?.code),
              if (m != null && m.isCash) ...[const SizedBox(height: 16), ..._cashFields()],
              if (m != null && m.isManual) ...[const SizedBox(height: 16), ..._manualFields()],
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(color: BK.bg, borderRadius: BorderRadius.circular(12), border: Border.all(color: BK.line)),
                child: SwitchListTile(
                  value: _keepOpen,
                  activeThumbColor: BK.accent,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                  onChanged: (v) => setState(() => _keepOpen = v),
                  title: const Text('Bon tetap terbuka setelah bayar',
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
                  subtitle: Text(
                    _keepOpen
                        ? 'Prabayar — item masih bisa ditambah, tutup menyusul di Pesanan terbuka.'
                        : 'Bayar & tutup transaksi sekarang.',
                    style: const TextStyle(fontSize: 11.5, color: BK.ink3),
                  ),
                ),
              ),
            ]),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                  onPressed: (!_canConfirm || _busy) ? null : _confirm,
                  child: _busy
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(
                          _keepOpen
                              ? 'Bayar, bon tetap buka'
                              : (m != null && m.isManual ? 'Kirim bukti & selesai' : 'Terima pembayaran'),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _methodTile(PosPaymentMethod method, bool on) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: () => setState(() => _method = method),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          decoration: BoxDecoration(
            color: on ? BK.accentSoft : BK.bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: on ? BK.accent : BK.line, width: on ? 1.4 : 1),
          ),
          child: Row(children: [
            Icon(_iconFor(method), size: 20, color: on ? BK.accent : BK.ink2),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(method.label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: on ? BK.accent : BK.ink)),
                if (!method.isCash)
                  const Text('Bukti opsional · langsung lunas', style: TextStyle(fontSize: 11, color: BK.ink3)),
              ]),
            ),
            Icon(on ? Icons.check_circle_rounded : Icons.circle_outlined, size: 20, color: on ? BK.accent : BK.ink3),
          ]),
        ),
      ),
    );
  }

  IconData _iconFor(PosPaymentMethod m) {
    if (m.isCash) return Icons.payments_rounded;
    final key = '${m.category}${m.code}'.toLowerCase();
    if (key.contains('qris') || key.contains('qr')) return Icons.qr_code_rounded;
    if (key.contains('transfer') || key.contains('bank') || key.contains('va')) return Icons.account_balance_rounded;
    return Icons.receipt_long_rounded;
  }

  Future<void> _pickProof() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: BK.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetCtx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 12),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.photo_camera_rounded, color: BK.accent),
            title: const Text('Ambil foto', style: TextStyle(fontWeight: FontWeight.w700, color: BK.ink)),
            onTap: () => Navigator.pop(sheetCtx, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_rounded, color: BK.accent),
            title: const Text('Pilih dari galeri', style: TextStyle(fontWeight: FontWeight.w700, color: BK.ink)),
            onTap: () => Navigator.pop(sheetCtx, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
    if (source == null) return;
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 70, maxWidth: 1600);
    if (file == null) return;
    setState(() => _proofPath = file.path);
  }

  List<Widget> _cashFields() {
    final change = _change;
    return [
      TextField(
        controller: _cashCtrl,
        keyboardType: TextInputType.number,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        onChanged: (_) => setState(() {}),
        style: const TextStyle(fontSize: 15, color: BK.ink, fontWeight: FontWeight.w700),
        decoration: InputDecoration(
          isDense: true,
          labelText: 'Uang diterima (opsional)',
          prefixText: 'Rp ',
          filled: true,
          fillColor: BK.bg,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
        ),
      ),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [
        for (final v in _quickCash())
          ActionChip(
            label: Text('Rp${rupiah(v)}', style: const TextStyle(fontSize: 12)),
            backgroundColor: BK.bg,
            side: const BorderSide(color: BK.line),
            onPressed: () => setState(() => _cashCtrl.text = '$v'),
          ),
      ]),
      if (_cashReceived > 0) ...[
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: change >= 0 ? BK.bg : const Color(0x14D14D4D),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: change >= 0 ? BK.line : BK.crit),
          ),
          child: Row(children: [
            Text(change >= 0 ? 'Kembalian' : 'Uang kurang', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: BK.ink2)),
            const Spacer(),
            Text('Rp${rupiah(change.abs())}',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: change >= 0 ? BK.ink : BK.crit)),
          ]),
        ),
      ],
      const SizedBox(height: 6),
    ];
  }

  List<int> _quickCash() {
    final t = widget.total;
    final out = <int>{t};
    for (final step in [5000, 10000, 20000, 50000, 100000]) {
      final rounded = ((t / step).ceil()) * step;
      if (rounded > t) out.add(rounded);
    }
    final list = out.toList()..sort();
    return list.take(4).toList();
  }

  List<Widget> _manualFields() {
    return [
      GestureDetector(
        onTap: _pickProof,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: BK.bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _proofPath == null ? BK.line : BK.accent),
          ),
          child: _proofPath == null
              ? const Row(children: [
                  Icon(Icons.add_a_photo_rounded, size: 20, color: BK.ink3),
                  SizedBox(width: 10),
                  Text('Ambil foto bukti (opsional)', style: TextStyle(fontSize: 13.5, color: BK.ink2, fontWeight: FontWeight.w600)),
                ])
              : Row(children: [
                  ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.file(File(_proofPath!), width: 46, height: 46, fit: BoxFit.cover)),
                  const SizedBox(width: 10),
                  const Expanded(child: Text('Bukti terpilih. Ketuk untuk ganti.', style: TextStyle(fontSize: 13, color: BK.ink2))),
                  const Icon(Icons.check_circle_rounded, color: BK.accent, size: 20),
                ]),
        ),
      ),
      const SizedBox(height: 10),
      TextField(
        controller: _noteCtrl,
        style: const TextStyle(fontSize: 14, color: BK.ink),
        decoration: InputDecoration(
          isDense: true,
          hintText: 'Catatan (opsional)',
          filled: true,
          fillColor: BK.bg,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
        ),
      ),
      const SizedBox(height: 6),
    ];
  }
}
