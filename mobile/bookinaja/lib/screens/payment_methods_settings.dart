import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../models/payment_method.dart';
import '../repositories/settings_repository.dart';
import '../state/settings_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Layar admin: kelola metode pembayaran tenant. Semua metode bisa
/// di-on/off-kan; metode manual (transfer/e-wallet/QRIS) juga bisa diedit
/// detail rekening & instruksinya.
class PaymentMethodsSettingsScreen extends StatelessWidget {
  const PaymentMethodsSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => PaymentMethodsController(ctx.read<SettingsRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<PaymentMethodsController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Metode Pembayaran',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: c.state.when(
        loading: () => const LoadingList(),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded,
          color: BK.crit,
          title: 'Gagal memuat',
          hint: '$e',
          action: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: c.load,
            child: const Text('Coba lagi'),
          ),
        ),
        data: (items) => items.isEmpty
            ? const StateView(
                icon: Icons.account_balance_wallet_outlined,
                color: BK.ink3,
                title: 'Belum ada metode',
                hint: 'Metode pembayaran akan muncul di sini.')
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                children: [
                  const Text(
                    'Aktifkan metode yang dipakai. Transfer/e-wallet isi detail rekening; QRIS unggah gambar QR agar tampil ke customer.',
                    style: TextStyle(fontSize: 12.5, color: BK.ink3, height: 1.35),
                  ),
                  const SizedBox(height: 14),
                  for (int i = 0; i < items.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _MethodCard(
                        key: ValueKey(items[i].id.isNotEmpty ? items[i].id : items[i].code),
                        method: items[i],
                        gatewayReady: c.gatewayReady,
                        onUpload: c.uploadImage,
                        onChanged: (m) => c.editAt(i, m),
                      ),
                    ),
                ],
              ),
      ),
      bottomNavigationBar: c.state.hasData
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                  onPressed: c.saving
                      ? null
                      : () async {
                          final ok = await c.save();
                          if (!context.mounted) return;
                          if (ok) {
                            BkToast.success(context, 'Metode pembayaran disimpan');
                          } else {
                            BkToast.error(context, c.error ?? 'Gagal menyimpan');
                          }
                        },
                  child: c.saving
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Simpan', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            )
          : null,
    );
  }
}

class _MethodCard extends StatefulWidget {
  final PaymentMethod method;
  final bool gatewayReady;
  final Future<String> Function(String path) onUpload;
  final ValueChanged<PaymentMethod> onChanged;
  const _MethodCard({
    super.key,
    required this.method,
    required this.gatewayReady,
    required this.onUpload,
    required this.onChanged,
  });

  @override
  State<_MethodCard> createState() => _MethodCardState();
}

class _MethodCardState extends State<_MethodCard> {
  final _picker = ImagePicker();
  late final TextEditingController _bank;
  late final TextEditingController _accName;
  late final TextEditingController _accNumber;
  late final TextEditingController _instructions;
  late String _qrUrl;
  String? _qrLocalPreview;
  bool _uploadingQr = false;

  /// Metode gateway terkunci bila gateway belum di-setup.
  bool get _locked => widget.method.isGateway && !widget.gatewayReady;

  @override
  void initState() {
    super.initState();
    final m = widget.method;
    _bank = TextEditingController(text: m.meta.bankName);
    _accName = TextEditingController(text: m.meta.accountName);
    _accNumber = TextEditingController(text: m.meta.accountNumber);
    _instructions = TextEditingController(text: m.instructions);
    _qrUrl = m.meta.qrImageUrl;
  }

  @override
  void dispose() {
    _bank.dispose();
    _accName.dispose();
    _accNumber.dispose();
    _instructions.dispose();
    super.dispose();
  }

  void _pushMeta() {
    widget.onChanged(widget.method.copyWith(
      instructions: _instructions.text,
      meta: widget.method.meta.copyWith(
        bankName: _bank.text,
        accountName: _accName.text,
        accountNumber: _accNumber.text,
        qrImageUrl: _qrUrl,
      ),
    ));
  }

  Future<void> _pickQr() async {
    try {
      final x = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85, maxWidth: 1200);
      if (x == null) return;
      setState(() {
        _uploadingQr = true;
        _qrLocalPreview = x.path;
      });
      final url = await widget.onUpload(x.path);
      if (!mounted) return;
      setState(() {
        _qrUrl = url;
        _uploadingQr = false;
      });
      _pushMeta();
    } catch (e) {
      if (!mounted) return;
      setState(() => _uploadingQr = false);
      BkToast.error(context, 'Gagal upload QR', subtitle: '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final m = widget.method;
    final active = m.isActive;
    return BKCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: active ? BK.accentSoft : BK.card2,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(_iconFor(m), size: 20, color: active ? BK.accent : BK.ink3),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m.displayName.isNotEmpty ? m.displayName : m.code,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: BK.ink),
                    ),
                    const SizedBox(height: 2),
                    Text(_typeLabel(m),
                        style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                  ],
                ),
              ),
              Switch(
                value: active && !_locked,
                activeThumbColor: BK.accent,
                onChanged: _locked ? null : (v) => widget.onChanged(m.copyWith(isActive: v)),
              ),
            ],
          ),
          if (_locked) ...[
            const SizedBox(height: 10),
            _lockedNotice(),
          ],
          if (m.isManual && active) ...[
            const SizedBox(height: 6),
            Divider(height: 1, color: BK.line),
            const SizedBox(height: 12),
            ..._manualFields(m),
          ],
        ],
      ),
    );
  }

  /// Field detail sesuai subtipe manual (transfer / e-wallet / QRIS).
  List<Widget> _manualFields(PaymentMethod m) {
    switch (m.manualKind) {
      case PaymentManualKind.qris:
        return [
          _qrPicker(),
          const SizedBox(height: 10),
          _field('Nama merchant (opsional)', _accName, hint: 'Nama yang tertera di QR'),
          const SizedBox(height: 10),
          _field('Instruksi (opsional)', _instructions, hint: 'mis. Scan pakai aplikasi apa pun', maxLines: 2),
        ];
      case PaymentManualKind.ewallet:
        return [
          _field('Penyedia', _bank, hint: 'mis. DANA, GoPay, OVO, ShopeePay'),
          const SizedBox(height: 10),
          _field('Nama pemilik', _accName, hint: 'Nama sesuai akun e-wallet'),
          const SizedBox(height: 10),
          _field('Nomor HP terdaftar', _accNumber, hint: '08xxxxxxxxxx', keyboard: TextInputType.phone),
          const SizedBox(height: 10),
          _field('Instruksi (opsional)', _instructions, hint: 'Catatan untuk customer', maxLines: 2),
        ];
      case PaymentManualKind.transfer:
        return [
          _field('Nama bank', _bank, hint: 'mis. BCA, Mandiri, BNI'),
          const SizedBox(height: 10),
          _field('Nama pemilik rekening', _accName, hint: 'Nama sesuai rekening'),
          const SizedBox(height: 10),
          _field('Nomor rekening', _accNumber, hint: 'Nomor tujuan transfer', keyboard: TextInputType.number),
          const SizedBox(height: 10),
          _field('Instruksi (opsional)', _instructions, hint: 'Catatan untuk customer', maxLines: 2),
        ];
    }
  }

  Widget _lockedNotice() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: BK.pendSoft,
        borderRadius: BorderRadius.circular(11),
      ),
      child: Row(children: [
        const Icon(Icons.lock_outline_rounded, size: 16, color: BK.pend),
        const SizedBox(width: 8),
        const Expanded(
          child: Text('Aktifkan payment gateway dulu untuk memakai metode ini.',
              style: TextStyle(fontSize: 11.5, color: BK.pend, fontWeight: FontWeight.w600, height: 1.3)),
        ),
      ]),
    );
  }

  Widget _qrPicker() {
    Widget inner;
    if (_uploadingQr) {
      inner = const Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)));
    } else if (_qrLocalPreview != null) {
      inner = ClipRRect(borderRadius: BorderRadius.circular(11), child: Image.file(File(_qrLocalPreview!), fit: BoxFit.cover));
    } else if (_qrUrl.isNotEmpty) {
      inner = ClipRRect(
          borderRadius: BorderRadius.circular(11),
          child: Image.network(_qrUrl, fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _qrPlaceholder()));
    } else {
      inner = _qrPlaceholder();
    }
    final hasQr = _qrUrl.isNotEmpty || _qrLocalPreview != null;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Gambar QR (QRIS)', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
      const SizedBox(height: 6),
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        GestureDetector(
          onTap: _uploadingQr ? null : _pickQr,
          child: Container(
            width: 96, height: 96,
            decoration: BoxDecoration(
              color: BK.card2,
              borderRadius: BorderRadius.circular(11),
              border: Border.all(color: BK.line),
            ),
            child: inner,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(hasQr ? 'QR terpasang. Ketuk gambar untuk ganti.' : 'Unggah QR statis dari galeri.',
                style: const TextStyle(fontSize: 12, color: BK.ink3, height: 1.35)),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: BK.accent,
                side: const BorderSide(color: BK.line),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              onPressed: _uploadingQr ? null : _pickQr,
              icon: const Icon(Icons.upload_rounded, size: 16),
              label: Text(hasQr ? 'Ganti QR' : 'Unggah QR'),
            ),
          ]),
        ),
      ]),
    ]);
  }

  Widget _qrPlaceholder() => const Center(child: Icon(Icons.qr_code_2_rounded, color: BK.ink3, size: 34));

  Widget _field(String label, TextEditingController controller,
      {String? hint, int maxLines = 1, TextInputType? keyboard}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboard,
          onChanged: (_) => _pushMeta(),
          style: const TextStyle(fontSize: 13.5, color: BK.ink),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: BK.ink3, fontSize: 13),
            isDense: true,
            filled: true,
            fillColor: BK.card2,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: BK.line),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: BK.line),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: BK.accent),
            ),
          ),
        ),
      ],
    );
  }

  IconData _iconFor(PaymentMethod m) {
    final c = m.category.toLowerCase();
    final code = m.code.toLowerCase();
    if (c.contains('cash') || code.contains('cash')) return Icons.payments_outlined;
    if (c.contains('qris') || code.contains('qris')) return Icons.qr_code_2_rounded;
    if (c.contains('ewallet') || c.contains('wallet')) return Icons.account_balance_wallet_outlined;
    if (m.verificationType.toLowerCase() == 'gateway') return Icons.credit_card_rounded;
    if (c.contains('transfer') || c.contains('bank')) return Icons.account_balance_outlined;
    return Icons.payment_rounded;
  }

  String _typeLabel(PaymentMethod m) {
    switch (m.verificationType.toLowerCase()) {
      case 'manual':
        return 'Verifikasi manual · bukti transfer';
      case 'gateway':
        return 'Otomatis · ${m.provider.isNotEmpty ? m.provider : 'payment gateway'}';
      case 'cash':
        return 'Tunai di kasir';
      default:
        return m.category.isNotEmpty ? m.category : m.verificationType;
    }
  }
}
