import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../ui/toast.dart';
import '../../ui/error_text.dart';
import '../../models/customer_payment.dart';
import '../../repositories/customer_payment_repository.dart';
import '../../state/customer_shell_tab.dart';
import '../../state/my_bookings_controller.dart';

/// Pembayaran manual booking customer: pilih metode (transfer/QRIS), lihat
/// instruksi, upload bukti, kirim untuk diverifikasi admin.
class CustomerPaymentScreen extends StatefulWidget {
  final String bookingId;
  const CustomerPaymentScreen({super.key, required this.bookingId});

  @override
  State<CustomerPaymentScreen> createState() => _CustomerPaymentScreenState();
}

class _CustomerPaymentScreenState extends State<CustomerPaymentScreen> {
  final _picker = ImagePicker();
  final _note = TextEditingController();
  late Future<BookingPaymentInfo> _future;

  PayMethod? _method;
  String? _proofUrl;
  String? _proofLocalPath;
  bool _uploading = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _future = context.read<CustomerPaymentRepository>().info(widget.bookingId);
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  bool _needsProof(PayMethod m) {
    final c = '${m.category} ${m.code}'.toLowerCase();
    return c.contains('transfer') ||
        c.contains('bank') ||
        c.contains('va') ||
        c.contains('qr');
  }

  Future<void> _chooseProofSource() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: BK.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined, color: BK.accent),
              title: const Text('Foto struk (kamera)', style: TextStyle(fontWeight: FontWeight.w700, color: BK.ink)),
              onTap: () => Navigator.of(context).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: BK.accent),
              title: const Text('Pilih dari galeri', style: TextStyle(fontWeight: FontWeight.w700, color: BK.ink)),
              onTap: () => Navigator.of(context).pop(ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (source != null) await _pick(source);
  }

  Future<void> _pick(ImageSource source) async {
    final repo = context.read<CustomerPaymentRepository>();
    try {
      final x = await _picker.pickImage(
        source: source,
        imageQuality: 70,
        maxWidth: 1600,
      );
      if (x == null) return;
      if (!mounted) return;
      setState(() {
        _uploading = true;
        _proofLocalPath = x.path; // preview langsung, sebelum upload selesai
      });
      final url = await repo.uploadProof(widget.bookingId, x.path);
      if (!mounted) return;
      setState(() {
        _proofUrl = url;
        _uploading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _proofLocalPath = null;
      });
      BkToast.error(context, 'Gagal mengunggah bukti', subtitle: friendlyError(e));
    }
  }

  Future<void> _submit(BookingPaymentInfo info) async {
    final m = _method;
    if (m == null) {
      BkToast.error(context, 'Pilih metode pembayaran dulu');
      return;
    }
    if (_needsProof(m) && (_proofUrl == null || _proofUrl!.isEmpty)) {
      BkToast.error(context, 'Upload bukti transfer dulu');
      return;
    }
    setState(() => _submitting = true);
    final repo = context.read<CustomerPaymentRepository>();
    final myBookings = context.read<MyBookingsController>();
    try {
      await repo.submitManual(
        widget.bookingId,
        scope: info.scope,
        method: m.code,
        note: _note.text.trim(),
        proofUrl: _proofUrl ?? '',
      );
      if (!mounted) return;
      unawaited(myBookings.loadAll());
      BkToast.success(
        context,
        'Pembayaran terkirim',
        subtitle: 'Menunggu verifikasi admin. Cek status di "Booking Saya".',
      );
      // Tutup ke shell & langsung buka tab "Booking Saya" agar customer melihat
      // booking yang baru dibayar (bukan mendarat di Discover).
      CustomerShellTab.go(CustomerShellTab.bookings);
      Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      BkToast.error(context, 'Gagal mengirim pembayaran', subtitle: friendlyError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        foregroundColor: BK.ink,
        title: const Text(
          'Pembayaran',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
      ),
      body: FutureBuilder<BookingPaymentInfo>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: BK.accent),
            );
          }
          if (snap.hasError) {
            return SafeArea(
              child: StateView(
                icon: Icons.wifi_off_rounded,
                color: BK.crit,
                title: 'Gagal memuat pembayaran',
                hint: friendlyError(snap.error),
                action: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent),
                  onPressed: () => setState(
                    () => _future = context
                        .read<CustomerPaymentRepository>()
                        .info(widget.bookingId),
                  ),
                  child: const Text('Coba lagi'),
                ),
              ),
            );
          }
          final info = snap.data!;
          final methods = info.manualMethods;
          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  children: [
                    _amountCard(info),
                    const SizedBox(height: 18),
                    const Text(
                      'METODE PEMBAYARAN',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                        color: BK.ink3,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (methods.isEmpty)
                      const Text(
                        'Tenant belum mengaktifkan metode pembayaran manual. Hubungi tenant langsung.',
                        style: TextStyle(fontSize: 13, color: BK.ink3),
                      )
                    else
                      ...methods.map((m) => _methodTile(m)),
                    if (_method != null) ...[
                      const SizedBox(height: 8),
                      _instructionPanel(_method!),
                      if (_needsProof(_method!)) ...[
                        const SizedBox(height: 14),
                        _proofPicker(),
                      ],
                      const SizedBox(height: 12),
                      TextField(
                        controller: _note,
                        decoration: InputDecoration(
                          hintText: 'Catatan (opsional)',
                          isDense: true,
                          filled: true,
                          fillColor: BK.card,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: BK.line),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: BK.line),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (methods.isNotEmpty) _submitBar(info),
            ],
          );
        },
      ),
    );
  }

  Widget _amountCard(BookingPaymentInfo info) => BKCard(
    color: BK.ink,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          info.needsDeposit ? 'Bayar DP sekarang' : 'Total pembayaran',
          style: const TextStyle(fontSize: 12.5, color: Colors.white70),
        ),
        const SizedBox(height: 4),
        Text(
          'Rp${rupiah(info.amountDue)}',
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
        if (info.needsDeposit && info.grandTotal > info.depositAmount) ...[
          const SizedBox(height: 4),
          Text(
            'dari total Rp${rupiah(info.grandTotal)} · sisa dilunasi di lokasi',
            style: const TextStyle(fontSize: 11.5, color: Colors.white60),
          ),
        ],
      ],
    ),
  );

  Widget _methodTile(PayMethod m) {
    final on = _method?.code == m.code;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(BK.radius),
        onTap: () => setState(() => _method = m),
        child: BKCard(
          border: on ? BK.accent : BK.line,
          child: Row(
            children: [
              Icon(_methodIcon(m), size: 22, color: on ? BK.accent : BK.ink3),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  m.label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: on ? BK.ink : BK.ink2,
                  ),
                ),
              ),
              Icon(
                on ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                size: 20,
                color: on ? BK.accent : BK.ink3,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _instructionPanel(PayMethod m) {
    final lines = <String>[];
    if (m.bankName.isNotEmpty) lines.add('Bank: ${m.bankName}');
    if (m.accountNumber.isNotEmpty)
      lines.add('No. rekening: ${m.accountNumber}');
    if (m.accountName.isNotEmpty) lines.add('a.n. ${m.accountName}');
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: BK.accentSoft,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (m.qrImageUrl.isNotEmpty) ...[
            Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  m.qrImageUrl,
                  height: 200,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],
          for (final l in lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 3),
              child: Text(
                l,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: BK.ink,
                ),
              ),
            ),
          if (m.instructions.isNotEmpty) ...[
            if (lines.isNotEmpty) const SizedBox(height: 6),
            Text(
              m.instructions,
              style: const TextStyle(
                fontSize: 12.5,
                color: BK.ink2,
                height: 1.4,
              ),
            ),
          ],
          if (lines.isEmpty && m.instructions.isEmpty && m.qrImageUrl.isEmpty)
            Text(
              'Ikuti arahan pembayaran dari tenant, lalu upload bukti.',
              style: const TextStyle(fontSize: 12.5, color: BK.ink2),
            ),
        ],
      ),
    );
  }

  Widget _proofPicker() {
    if (_proofLocalPath != null) {
      // Preview thumbnail bukti + aksi ganti, agar customer yakin gambar benar.
      return Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.file(
              File(_proofLocalPath!),
              width: 56,
              height: 56,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                width: 56,
                height: 56,
                color: BK.card2,
                child: const Icon(Icons.image_outlined, color: BK.ink3),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Icon(
                      _uploading ? Icons.upload_rounded : Icons.check_circle,
                      size: 16,
                      color: _uploading ? BK.ink3 : BK.live,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _uploading ? 'Mengunggah…' : 'Bukti siap dikirim',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: _uploading ? BK.ink3 : BK.live,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                GestureDetector(
                  onTap: _uploading ? null : _chooseProofSource,
                  child: const Text(
                    'Ganti bukti',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: BK.accent),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: BK.accent,
              side: const BorderSide(color: BK.line),
              padding: const EdgeInsets.symmetric(vertical: 13),
            ),
            onPressed: _uploading ? null : _chooseProofSource,
            icon: _uploading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.upload_file, size: 18, color: BK.accent),
            label: Text(
              _uploading ? 'Mengunggah…' : 'Upload bukti transfer',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
          ),
        ),
      ],
    );
  }

  Widget _submitBar(BookingPaymentInfo info) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: BK.accent,
          padding: const EdgeInsets.symmetric(vertical: 15),
          disabledBackgroundColor: BK.line,
        ),
        onPressed: (_method == null || _submitting || _uploading)
            ? null
            : () => _submit(info),
        child: _submitting
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(
                'Kirim pembayaran · Rp${rupiah(info.amountDue)}',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
      ),
    ),
  );

  IconData _methodIcon(PayMethod m) {
    final c = '${m.category} ${m.code}'.toLowerCase();
    if (c.contains('qris') || c.contains('qr')) return Icons.qr_code_2;
    if (c.contains('wallet') ||
        c.contains('gopay') ||
        c.contains('ovo') ||
        c.contains('dana') ||
        c.contains('shopee'))
      return Icons.account_balance_wallet_outlined;
    if (c.contains('bank') || c.contains('transfer') || c.contains('va'))
      return Icons.account_balance_outlined;
    return Icons.payments_outlined;
  }
}
