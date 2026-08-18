import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/booking.dart';
import '../models/booking_detail.dart';
import '../models/menu_item.dart';
import '../models/catalog.dart';
import '../repositories/booking_repository.dart';
import '../repositories/pos_repository.dart';
import '../repositories/catalog_repository.dart';
import '../state/booking_detail_controller.dart';
import '../state/auth_controller.dart';
import '../ui/session_widgets.dart';
import '../ui/toast.dart';

class BookingDetailScreen extends StatelessWidget {
  final Booking booking;
  const BookingDetailScreen({super.key, required this.booking});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => BookingDetailController(ctx.read<BookingRepository>(), booking.id),
      child: _DetailView(fallback: booking),
    );
  }
}

class _DetailView extends StatelessWidget {
  final Booking fallback;
  const _DetailView({required this.fallback});

  // Lihat bukti bayar penuh (bisa zoom/pan).
  void _showProof(BuildContext context, String url) {
    showDialog<void>(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(children: [
          InteractiveViewer(minScale: 0.8, maxScale: 4, child: Center(child: Image.network(url, fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const Padding(padding: EdgeInsets.all(24), child: Text('Gagal memuat bukti bayar', style: TextStyle(color: Colors.white)))))),
          Positioned(top: 4, right: 4, child: IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context))),
        ]),
      ),
    );
  }

  Future<void> _run(BuildContext context, Future<bool> Function() action, String okMsg) async {
    final c = context.read<BookingDetailController>();
    final toast = BkToast.loading(context, 'Memproses…');
    final ok = await action();
    if (ok) {
      toast.success(okMsg);
    } else {
      toast.error(c.actionError ?? 'Aksi gagal');
    }
  }

  /// Bottom sheet konfirmasi + alasan. Kalau alasan opsional (required=false),
  /// field disembunyikan di balik toggle "Tambah alasan" → kurangi friction.
  /// Balik: null = batal; string (bisa kosong) = lanjut.
  Future<String?> _askReason(
    BuildContext context,
    String title,
    String label, {
    bool required = false,
    String? description,
    String hint = '',
    String confirmLabel = 'Lanjut',
    Color confirmColor = BK.accent,
  }) async {
    final ctrl = TextEditingController();
    bool expanded = required; // wajib → langsung tampil
    final result = await showModalBottomSheet<String?>(
      context: context,
      backgroundColor: BK.bg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSt) => SafeArea(
          child: Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + MediaQuery.of(ctx).viewInsets.bottom),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(3)))),
              const SizedBox(height: 16),
              Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
              if (description != null) ...[
                const SizedBox(height: 6),
                Text(description, style: const TextStyle(fontSize: 13, color: BK.ink2, height: 1.4)),
              ],
              const SizedBox(height: 16),
              if (!required && !expanded)
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(foregroundColor: BK.ink2, backgroundColor: BK.card, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9)),
                    onPressed: () => setSt(() => expanded = true),
                    icon: const Icon(Icons.edit_note_rounded, size: 18),
                    label: const Text('Tambah alasan (opsional)'),
                  ),
                )
              else ...[
                Text(label.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
                const SizedBox(height: 8),
                TextField(
                  controller: ctrl,
                  autofocus: true,
                  maxLines: 3,
                  minLines: 2,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(
                    hintText: hint,
                    isDense: true,
                    filled: true,
                    fillColor: BK.card,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: OutlinedButton(
                  style: OutlinedButton.styleFrom(foregroundColor: BK.ink2, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(vertical: 13)),
                  onPressed: () => Navigator.pop(ctx, null),
                  child: const Text('Batal', style: TextStyle(fontWeight: FontWeight.w700)),
                )),
                const SizedBox(width: 10),
                Expanded(child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: confirmColor, padding: const EdgeInsets.symmetric(vertical: 13)),
                  onPressed: () {
                    final t = ctrl.text.trim();
                    if (required && t.isEmpty) return; // wajib isi
                    Navigator.pop(ctx, t);
                  },
                  child: Text(confirmLabel, style: const TextStyle(fontWeight: FontWeight.w800)),
                )),
              ]),
            ]),
          ),
        ),
      ),
    );
    ctrl.dispose();
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.watch<BookingDetailController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg, elevation: 0,
        title: Text('#${fallback.code}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: BK.ink)),
        actions: [
          if (c.acting) const Padding(padding: EdgeInsets.only(right: 16), child: Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)))),
        ],
      ),
      body: c.state.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded, color: BK.crit, title: 'Gagal memuat detail', hint: '$e',
          action: FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.accent), onPressed: c.load, child: const Text('Coba lagi')),
        ),
        data: (d) => _body(context, d),
      ),
    );
  }

  Widget _body(BuildContext context, BookingDetail d) {
    final c = context.read<BookingDetailController>();
    final disabled = c.acting;
    // Tarik-untuk-refresh: ambil status terbaru (mis. bukti bayar baru dari
    // customer) selama app belum punya push realtime.
    return RefreshIndicator(onRefresh: c.load, child: ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        // hero + dua pill status
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [BK.accent, Color(0xFF1C47C9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(BK.radius),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 8, runSpacing: 8, children: [
              _heroPill(Icons.sensors, d.sessionLabel),
              _heroPill(Icons.payments_outlined, d.paymentLabel),
            ]),
            const SizedBox(height: 12),
            Text(d.customerName, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text('${d.resourceName}${d.customerPhone.isNotEmpty ? ' · ${d.customerPhone}' : ''}', style: const TextStyle(color: Colors.white, fontSize: 12.5)),
            if (d.hasSchedule) ...[
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: _heroTile(Icons.event_outlined, 'Tanggal', d.dateLabel)),
                const SizedBox(width: 8),
                Expanded(child: _heroTile(Icons.schedule, 'Jam', d.timeRangeLabel)),
              ]),
            ],
            if (d.isActive && d.endTime.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: .15), borderRadius: BorderRadius.circular(12)),
                child: SessionTimer(endIso: d.endTime),
              ),
            ],
          ]),
        ),
        const SizedBox(height: 16),

        // Verifikasi bukti transfer
        if (d.hasPendingVerification) ...[
          const Text('PERLU VERIFIKASI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.crit)),
          const SizedBox(height: 8),
          for (final a in d.pendingAttempts)
            BKCard(
              border: BK.pend,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(Icons.receipt_long, size: 18, color: BK.pend),
                  const SizedBox(width: 8),
                  Expanded(child: Text('${a.methodLabel} · Rp${rupiah(a.amount)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink))),
                ]),
                if (a.referenceCode.isNotEmpty || a.payerNote.isNotEmpty)
                  Padding(padding: const EdgeInsets.only(top: 4), child: Text([if (a.referenceCode.isNotEmpty) 'Ref ${a.referenceCode}', if (a.payerNote.isNotEmpty) a.payerNote].join(' · '), style: const TextStyle(fontSize: 11.5, color: BK.ink3))),
                // Bukti bayar yang diupload customer — tap untuk lihat penuh.
                if (a.proofUrl.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  GestureDetector(
                    onTap: () => _showProof(context, a.proofUrl),
                    child: ClipRRect(borderRadius: BorderRadius.circular(10), child: Image.network(a.proofUrl, height: 170, width: double.infinity, fit: BoxFit.cover,
                        loadingBuilder: (ctx, child, prog) => prog == null ? child : Container(height: 170, alignment: Alignment.center, color: BK.card2, child: const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))),
                        errorBuilder: (_, _, _) => Container(height: 70, alignment: Alignment.center, color: BK.card2, child: const Text('Gagal memuat bukti bayar', style: TextStyle(fontSize: 12, color: BK.ink3))))),
                  ),
                ],
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: BK.live, padding: const EdgeInsets.symmetric(vertical: 11)),
                    onPressed: disabled ? null : () => _run(context, () => c.verifyAttempt(a.id), 'Pembayaran diverifikasi'),
                    child: const Text('✓ Verifikasi', style: TextStyle(fontWeight: FontWeight.w700)))),
                  const SizedBox(width: 9),
                  Expanded(child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: BK.critSoft, foregroundColor: BK.crit, padding: const EdgeInsets.symmetric(vertical: 11)),
                    onPressed: disabled ? null : () async {
                      final reason = await _askReason(context, 'Tolak bukti?', 'Alasan penolakan',
                          description: 'Bukti pembayaran ditolak dan customer perlu mengunggah ulang.',
                          hint: 'mis. nominal tidak sesuai, bukti buram',
                          confirmLabel: 'Tolak bukti', confirmColor: BK.crit);
                      if (reason != null && context.mounted) await _run(context, () => c.rejectAttempt(a.id, reason: reason), 'Bukti ditolak');
                    },
                    child: const Text('Tolak', style: TextStyle(fontWeight: FontWeight.w700)))),
                ]),
              ]),
            ),
          const SizedBox(height: 14),
        ],

        if (d.isFinal)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(BK.radius), border: Border.all(color: BK.line)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(d.statusRaw == 'completed' ? Icons.check_circle_outline : Icons.cancel_outlined, color: d.statusRaw == 'completed' ? BK.live : BK.crit),
                const SizedBox(width: 10),
                Text(d.statusRaw == 'completed' ? 'Booking selesai' : 'Booking dibatalkan', style: const TextStyle(fontWeight: FontWeight.w700, color: BK.ink)),
              ]),
              if (d.statusRaw == 'cancelled' && d.cancellationReason.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('Alasan: ${d.cancellationReason}', style: const TextStyle(fontSize: 12.5, color: BK.ink2)),
              ],
              if (d.statusRaw == 'completed' && d.hasBalance) ...[
                const SizedBox(height: 8),
                Text('Masih ada sisa tagihan Rp${rupiah(d.balanceDue)} — lunasi di bawah.', style: const TextStyle(fontSize: 12.5, color: BK.pend, fontWeight: FontWeight.w600)),
              ],
            ]),
          ),
        // Konteks: booking sedang menunggu DP dari customer.
        if (d.canRecordDeposit) _waitingDpBanner(d),

        // === SESI: konfirmasi, mulai, akhiri, perpanjang, F&B/add-on ===
        if (!d.isFinal)
          Builder(builder: (_) {
            final acts = <Widget>[
              if (d.canConfirm)
                _primary('Konfirmasi booking', BK.accent, disabled ? null : () => _run(context, c.confirm, 'Booking dikonfirmasi')),
              if (d.canStart)
                _primary('▶ Mulai sesi', BK.live, disabled ? null : () => _run(context, c.start, 'Sesi dimulai')),
              if (d.canComplete)
                _primary('■ Akhiri sesi', BK.accent, disabled ? null : () => _run(context, c.end, 'Sesi diakhiri')),
              if (d.isActive)
                _primary('＋ Perpanjang sesi', BK.accent, disabled ? null : () => _extendSheet(context, d), outline: true),
              if (d.isActive && (d.enableFnb || d.enableAddons))
                _catalogButtons(context, d, disabled),
              if (d.canOverrideDeposit) _overrideLink(context, disabled),
              if (d.canReschedule)
                _primary('Jadwalkan ulang', BK.accent, disabled ? null : () => _rescheduleSheet(context, d), outline: true),
              if (d.canMarkNoShow)
                _primary('Tandai tidak hadir', BK.crit, disabled ? null : () => _confirmNoShow(context), outline: true),
            ];
            if (acts.isEmpty) return const SizedBox.shrink();
            return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [_groupLabel('Sesi'), ...acts]);
          }),

        // === PEMBAYARAN: satu tombol per tahap; metode (cash/transfer) dipilih di sheet ===
        Builder(builder: (_) {
          final pays = <Widget>[
            if (d.canRecordDeposit)
              _primary('Catat ${d.depositTerm}', BK.pend, disabled ? null : () => _payDeposit(context, d)),
            if (d.canSettle)
              _primary('Lunasi · Rp${rupiah(d.balanceDue)}', BK.pend, disabled ? null : () => _paySettle(context, d)),
            if (d.canSendReceipt)
              _primary('Kirim nota (WhatsApp)', BK.ink, disabled ? null : () => _run(context, c.sendReceipt, 'Nota dikirim'), outline: true),
          ];
          if (pays.isEmpty) return const SizedBox.shrink();
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [_groupLabel('Pembayaran'), ...pays]);
        }),

        _sectionLabel('Ringkasan pembayaran'),
        BKCard(child: Column(children: [
          _line('Total tagihan', 'Rp${rupiah(d.grandTotal)}'),
          _line('Sudah dibayar', 'Rp${rupiah(d.paidAmount)}', color: BK.live),
          if (d.depositOverrideActive) _line('Status DP', 'Di-override (tanpa DP)', color: BK.pend),
          const Divider(height: 18, color: BK.line),
          Row(children: [
            const Text('Sisa', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: BK.ink)),
            const Spacer(),
            Text('Rp${rupiah(d.balanceDue)}', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: d.hasBalance ? BK.pend : BK.live)),
          ]),
          if (d.depositOverrideActive && (d.depositOverrideReason.isNotEmpty || d.depositOverrideBy.isNotEmpty)) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: BK.pendSoft, borderRadius: BorderRadius.circular(10)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Override DP', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: BK.pend)),
                const SizedBox(height: 3),
                Text([
                  if (d.depositOverrideReason.isNotEmpty) d.depositOverrideReason else 'Sesi dijalankan tanpa DP.',
                  if (d.depositOverrideBy.isNotEmpty) 'Disetujui ${d.depositOverrideBy}',
                ].join(' · '), style: const TextStyle(fontSize: 12, color: BK.ink2)),
              ]),
            ),
          ],
        ])),

        _sectionLabel('Catatan internal'),
        _notesCard(context, d, disabled),

        // Riwayat pembayaran (attempt yang sudah diverifikasi / ditolak)
        if (d.historyAttempts.isNotEmpty) ...[
          _sectionLabel('Riwayat pembayaran'),
          BKCard(child: Column(children: [
            for (int i = 0; i < d.historyAttempts.length; i++) ...[
              if (i > 0) const Divider(height: 18, color: BK.line),
              _historyRow(context, d.historyAttempts[i]),
            ],
          ])),
        ],

        // Rincian pesanan (F&B + add-on) — item sama digabung jadi satu baris.
        if (d.orders.isNotEmpty || d.options.isNotEmpty) ...[
          _sectionLabel('Rincian pesanan'),
          Builder(builder: (_) {
            final lines = _aggregate([...d.options, ...d.orders]);
            return BKCard(child: Column(children: [
              for (final o in lines)
                Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Row(children: [
                  Expanded(child: Text('${o.name}${o.quantity > 1 ? '  ×${o.quantity}' : ''}', style: const TextStyle(fontSize: 13, color: BK.ink2))),
                  Text('Rp${rupiah(o.subtotal)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink)),
                ])),
            ]));
          }),
        ],

        // Timeline audit — collapsible kalau panjang.
        if (d.events.isNotEmpty) ...[
          _sectionLabel('Timeline'),
          BKCard(child: _Timeline(events: d.events, rowBuilder: _timelineRow)),
        ],

        if (d.canCancel) ...[
          const SizedBox(height: 18),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.critSoft, foregroundColor: BK.crit, padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: disabled ? null : () => _confirmCancel(context),
            child: const Text('Batalkan booking'),
          ),
          const Padding(padding: EdgeInsets.only(top: 4), child: Text('Hanya untuk booking yang belum dimulai.', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: BK.ink3))),
        ],
      ],
    ));
  }

  Future<void> _confirmCancel(BuildContext context) async {
    final c = context.read<BookingDetailController>();
    final reasonCtrl = TextEditingController();
    final yes = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Batalkan booking?'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Booking ${c.detail?.customerName ?? fallback.customer} akan dibatalkan. Hanya berlaku untuk booking yang belum dimulai.', style: const TextStyle(fontSize: 13)),
          const SizedBox(height: 14),
          TextField(controller: reasonCtrl, maxLines: 2, textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: 'Alasan (opsional)', hintText: 'mis. Customer minta reschedule', border: OutlineInputBorder(borderRadius: BorderRadius.circular(11)), isDense: true)),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Kembali')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.crit), onPressed: () => Navigator.pop(context, true), child: const Text('Ya, batalkan')),
        ],
      ),
    );
    if (yes == true && context.mounted) {
      await _run(context, () => c.cancel(reason: reasonCtrl.text.trim()), 'Booking dibatalkan');
    }
    reasonCtrl.dispose();
  }

  Future<void> _confirmNoShow(BuildContext context) async {
    final c = context.read<BookingDetailController>();
    final yes = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Tandai tidak hadir?'),
        content: Text('Booking ${c.detail?.customerName ?? fallback.customer} akan ditandai no-show. Pembayaran yang sudah masuk tidak berubah — pakai ini kalau customer tidak datang tanpa kabar.', style: const TextStyle(fontSize: 13)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Kembali')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.crit), onPressed: () => Navigator.pop(context, true), child: const Text('Ya, tandai')),
        ],
      ),
    );
    if (yes == true && context.mounted) {
      await _run(context, c.markNoShow, 'Booking ditandai tidak hadir');
    }
  }

  /// Pindah jadwal: pilih tanggal → jam mulai baru. Durasi dipertahankan sama
  /// seperti booking asal (geser jam/tanggal, bukan ubah lama sesi).
  Future<void> _rescheduleSheet(BuildContext context, BookingDetail d) async {
    final c = context.read<BookingDetailController>();
    final now = DateTime.now();
    final currentStart = d.startLocal ?? now;
    final duration = (d.endLocal != null && d.startLocal != null)
        ? d.endLocal!.difference(d.startLocal!)
        : const Duration(hours: 1);

    final date = await showDatePicker(
      context: context,
      initialDate: currentStart.isBefore(now) ? now : currentStart,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (date == null || !context.mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(currentStart),
    );
    if (time == null || !context.mounted) return;

    final newStart = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    final newEnd = newStart.add(duration);

    final reason = await _askReason(
      context,
      'Pindah jadwal',
      'Alasan',
      description: 'Jadwal baru: ${_fmtDate(newStart)} · ${_fmtTime(newStart)}–${_fmtTime(newEnd)}.',
      hint: 'mis. Customer minta geser jam',
      confirmLabel: 'Pindahkan jadwal',
    );
    if (reason == null || !context.mounted) return;

    await _run(context, () => c.reschedule(start: newStart, end: newEnd, reason: reason), 'Jadwal dipindah');
  }

  String _fmtDate(DateTime d) => '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  String _fmtTime(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  Widget _notesCard(BuildContext context, BookingDetail d, bool disabled) {
    return BKCard(
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(
          child: Text(
            d.internalNote.isEmpty ? 'Belum ada catatan. Pakai ini untuk komunikasi antar-shift (mis. permintaan khusus customer).' : d.internalNote,
            style: TextStyle(fontSize: 12.5, height: 1.4, color: d.internalNote.isEmpty ? BK.ink3 : BK.ink2, fontStyle: d.internalNote.isEmpty ? FontStyle.italic : FontStyle.normal),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          icon: const Icon(Icons.edit_note_rounded, size: 20, color: BK.ink3),
          onPressed: disabled ? null : () => _editNote(context, d),
        ),
      ]),
    );
  }

  Future<void> _editNote(BuildContext context, BookingDetail d) async {
    final c = context.read<BookingDetailController>();
    final ctrl = TextEditingController(text: d.internalNote);
    final saved = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Catatan internal'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          maxLines: 4,
          minLines: 3,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(hintText: 'mis. Customer bawa anak kecil, titip kursi tambahan', border: OutlineInputBorder(borderRadius: BorderRadius.circular(11)), isDense: true),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.accent), onPressed: () => Navigator.pop(context, true), child: const Text('Simpan')),
        ],
      ),
    );
    if (saved == true && context.mounted) {
      await _run(context, () => c.updateNote(ctrl.text.trim()), 'Catatan disimpan');
    }
    ctrl.dispose();
  }

  Widget _heroPill(IconData icon, String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(20)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 13, color: Colors.white),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
        ]),
      );

  // Tile jadwal di hero (di atas gradient) — Tanggal / Jam.
  Widget _heroTile(IconData icon, String label, String value) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: .15), borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(icon, size: 12, color: Colors.white70),
            const SizedBox(width: 5),
            Text(label.toUpperCase(), style: const TextStyle(color: Colors.white70, fontSize: 9.5, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
          ]),
          const SizedBox(height: 3),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w800)),
        ]),
      );

  Widget _primary(String label, Color color, VoidCallback? onTap, {bool outline = false, String? hint}) {
    final button = SizedBox(
      width: double.infinity,
      child: outline
          ? OutlinedButton(
              style: OutlinedButton.styleFrom(foregroundColor: color, backgroundColor: BK.card, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(vertical: 14)),
              onPressed: onTap, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)))
          : FilledButton(
              style: FilledButton.styleFrom(backgroundColor: color, padding: const EdgeInsets.symmetric(vertical: 14)),
              onPressed: onTap, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700))),
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: hint == null
          ? button
          : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              button,
              Padding(padding: const EdgeInsets.only(top: 3, left: 4), child: Text(hint, style: const TextStyle(fontSize: 11, color: BK.ink3))),
            ]),
    );
  }

  Widget _line(String k, String v, {Color? color}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Text(k, style: const TextStyle(fontSize: 13, color: BK.ink2)),
          const Spacer(),
          Text(v, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color ?? BK.ink)),
        ]),
      );

  // Gabung baris pesanan bernama sama → satu baris (qty & subtotal dijumlah),
  // urutan kemunculan pertama dipertahankan.
  List<OrderLine> _aggregate(List<OrderLine> items) {
    final order = <String>[];
    final qty = <String, int>{};
    final sub = <String, int>{};
    for (final o in items) {
      if (!qty.containsKey(o.name)) order.add(o.name);
      qty[o.name] = (qty[o.name] ?? 0) + o.quantity;
      sub[o.name] = (sub[o.name] ?? 0) + o.subtotal;
    }
    return [for (final n in order) OrderLine(name: n, quantity: qty[n]!, subtotal: sub[n]!)];
  }

  Widget _sectionLabel(String t) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 18, 2, 8),
        child: Row(children: [
          Text(t.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(width: 9),
          const Expanded(child: Divider(color: BK.line)),
        ]),
      );

  // Banner konteks saat booking menunggu DP — biar admin paham statusnya.
  Widget _waitingDpBanner(BookingDetail d) => Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: BK.pendSoft, borderRadius: BorderRadius.circular(BK.radius)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Icon(Icons.hourglass_top_rounded, size: 18, color: BK.pend),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Menunggu ${d.depositTerm} · Rp${rupiah(d.depositAmount)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 2),
            Text('Customer bisa bayar & unggah bukti ${d.depositTerm} sendiri, atau catat pembayaran manual di bawah. Sesi belum bisa dimulai sampai ${d.depositTerm} masuk (atau di-override).',
                style: const TextStyle(fontSize: 12, color: BK.ink2, height: 1.35)),
          ])),
        ]),
      );

  // Label grup aksi (tanpa divider) — memisahkan "Sesi" vs "Pembayaran".
  Widget _groupLabel(String t) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 6, 2, 9),
        child: Text(t.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1, color: BK.ink3)),
      );

  // Tombol F&B / Add-on (reflow: dua → berdampingan, satu → penuh).
  Widget _catalogButtons(BuildContext context, BookingDetail d, bool disabled) {
    OutlinedButton catalogBtn(IconData icon, String label, VoidCallback onTap) => OutlinedButton.icon(
          style: OutlinedButton.styleFrom(foregroundColor: BK.ink, backgroundColor: BK.card, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(vertical: 12)),
          onPressed: disabled ? null : onTap,
          icon: Icon(icon, size: 18),
          label: Text(label),
        );
    // Tombol F&B & Add-on juga ikut mode aplikasi (butuh sesi), bukan hanya
    // flag per-booking enableFnb/enableAddons.
    final auth = context.read<AuthController>();
    final btns = <Widget>[
      if (d.enableFnb && auth.sessionFnbEnabled) catalogBtn(Icons.ramen_dining, 'Tambah F&B', () => _fnbSheet(context, d)),
      if (d.enableAddons && auth.sessionAddonEnabled) catalogBtn(Icons.add_circle_outline, 'Add-on', () => _addonSheet(context, d)),
    ];
    if (btns.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: btns.length == 1
          ? SizedBox(width: double.infinity, child: btns.first)
          : Row(children: [Expanded(child: btns[0]), const SizedBox(width: 9), Expanded(child: btns[1])]),
    );
  }

  // Satu baris riwayat pembayaran (verified/rejected) — bisa buka bukti lagi.
  Widget _historyRow(BuildContext context, PaymentAttempt a) {
    final ok = a.isVerified;
    final color = ok ? BK.live : BK.crit;
    final soft = ok ? BK.liveSoft : BK.critSoft;
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        width: 38, height: 38,
        decoration: BoxDecoration(color: soft, borderRadius: BorderRadius.circular(10)),
        child: Icon(ok ? Icons.check_circle_outline : Icons.cancel_outlined, size: 20, color: color),
      ),
      const SizedBox(width: 11),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('${a.methodLabel}${a.scopeLabel.isNotEmpty ? ' · ${a.scopeLabel}' : ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: BK.ink))),
          Text('Rp${rupiah(a.amount)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: BK.ink)),
        ]),
        const SizedBox(height: 2),
        Text([
          a.statusLabel,
          if (a.stampIso.isNotEmpty) _stamp(a.stampIso),
          if (a.referenceCode.isNotEmpty) 'Ref ${a.referenceCode}',
        ].where((s) => s.isNotEmpty).join(' · '), style: TextStyle(fontSize: 11.5, color: color, fontWeight: FontWeight.w600)),
        if (a.adminNote.isNotEmpty || a.payerNote.isNotEmpty)
          Padding(padding: const EdgeInsets.only(top: 2), child: Text([if (a.payerNote.isNotEmpty) a.payerNote, if (a.adminNote.isNotEmpty) 'Catatan: ${a.adminNote}'].join(' · '), style: const TextStyle(fontSize: 11.5, color: BK.ink3))),
        if (a.proofUrl.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: GestureDetector(
              onTap: () => _showProof(context, a.proofUrl),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                ClipRRect(borderRadius: BorderRadius.circular(7), child: Image.network(a.proofUrl, width: 34, height: 34, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(width: 34, height: 34, color: BK.card2, child: const Icon(Icons.broken_image_outlined, size: 16, color: BK.ink3)))),
                const SizedBox(width: 6),
                const Text('Lihat bukti', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: BK.accent)),
              ]),
            ),
          ),
      ])),
    ]);
  }

  // Override DP: tombol sekunder (outline) — kelihatan jelas tapi tidak
  // sekuat CTA utama, dengan hint konsekuensinya.
  Widget _overrideLink(BuildContext context, bool disabled) {
    onTap() async {
      final c = context.read<BookingDetailController>();
      final reason = await _askReason(
        context,
        'Mulai tanpa DP?',
        'Alasan',
        description: 'Sesi dijalankan tanpa DP. Pelunasan nanti memakai total penuh. Booking ini masih menunggu DP dari customer.',
        hint: 'mis. pelanggan lama, bayar nanti',
        confirmLabel: 'Ya, mulai tanpa DP',
        confirmColor: BK.pend,
      );
      if (reason != null && context.mounted) await _run(context, () => c.overrideDeposit(reason: reason), 'Override DP aktif — sesi bisa dimulai');
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(foregroundColor: BK.ink, backgroundColor: BK.card, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(vertical: 13)),
          onPressed: disabled ? null : onTap,
          icon: const Icon(Icons.lock_open_outlined, size: 17),
          label: const Text('Mulai tanpa DP (override)', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
        const Padding(padding: EdgeInsets.only(top: 3, left: 4), child: Text('Jalankan sesi tanpa DP; pelunasan nanti pakai total penuh.', style: TextStyle(fontSize: 11, color: BK.ink3))),
      ]),
    );
  }

  // Catat DP / pembayaran muka: langsung cash kalau tak ada metode manual,
  // kalau ada → sheet pilih metode (Tunai / transfer / e-wallet).
  void _payDeposit(BuildContext context, BookingDetail d) {
    final c = context.read<BookingDetailController>();
    if (d.manualMethods.isEmpty) {
      _run(context, c.recordDeposit, '${d.depositTerm} dicatat');
    } else {
      _paymentSheet(context, d, 'deposit');
    }
  }

  void _paySettle(BuildContext context, BookingDetail d) {
    final c = context.read<BookingDetailController>();
    if (d.manualMethods.isEmpty) {
      _run(context, c.settle, 'Pembayaran lunas');
    } else {
      _paymentSheet(context, d, 'settlement');
    }
  }

  // ISO → "dd Mmm HH:mm" (dipakai di riwayat pembayaran).
  static String _stamp(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '';
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return '${d.day} ${mon[d.month - 1]} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  Widget _timelineRow(TimelineEvent e, {required bool last}) {
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Column(children: [
          Container(width: 9, height: 9, margin: const EdgeInsets.only(top: 4), decoration: const BoxDecoration(color: BK.accent, shape: BoxShape.circle)),
          if (!last) Expanded(child: Container(width: 2, color: BK.line)),
        ]),
        const SizedBox(width: 11),
        Expanded(child: Padding(
          padding: EdgeInsets.only(bottom: last ? 0 : 14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(e.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: BK.ink)),
            const SizedBox(height: 1),
            Text([
              if (e.actorName.isNotEmpty) e.actorName else e.actorType,
              if (e.description.isNotEmpty) e.description,
              _when(e.createdAt),
            ].where((s) => s.isNotEmpty).join(' · '), style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ]),
        )),
      ]),
    );
  }

  // Jam kalau hari ini, "dd Mmm HH:mm" kalau lain hari — biar event lintas hari tak ambigu.
  static String _when(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '';
    final hm = '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    final now = DateTime.now();
    if (d.year == now.year && d.month == now.month && d.day == now.day) return hm;
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return '${d.day} ${mon[d.month - 1]} $hm';
  }

  /// Sheet perpanjang sesi (mengikuti web): pilih tambahan durasi dengan
  /// preview jam selesai + biaya, opsi yang bentrok jadwal berikutnya dikunci.
  Future<void> _extendSheet(BuildContext context, BookingDetail d) async {
    final c = context.read<BookingDetailController>();
    final catalog = context.read<CatalogRepository>();
    final count = await showModalBottomSheet<int>(
      context: context, backgroundColor: BK.bg, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => ExtendSheet(detail: d, loadBusy: (date) => catalog.availability(d.resourceId, date)),
    );
    if (count != null && count > 0 && context.mounted) {
      await _run(context, () => c.extend(count), 'Sesi diperpanjang $count ${d.unitLabel}');
    }
  }

  Future<void> _fnbSheet(BuildContext context, BookingDetail d) async {
    final c = context.read<BookingDetailController>();
    final repo = context.read<PosRepository>();
    final picked = await showModalBottomSheet<List<({String id, int qty})>>(
      context: context, backgroundColor: BK.bg, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => CartPickerSheet<MenuItem>(
        title: 'Tambah F&B',
        load: repo.listMenu,
        idOf: (m) => m.id, labelOf: (m) => m.name, priceOf: (m) => m.price,
        categoryOf: (m) => m.category,
      ),
    );
    if (picked != null && picked.isNotEmpty && context.mounted) {
      final n = picked.fold(0, (s, e) => s + e.qty);
      await _run(context, () => c.addFnbItems(picked), '$n item F&B ditambahkan');
    }
  }

  Future<void> _addonSheet(BuildContext context, BookingDetail d) async {
    final c = context.read<BookingDetailController>();
    final repo = context.read<CatalogRepository>();
    final picked = await showModalBottomSheet<List<({String id, int qty})>>(
      context: context, backgroundColor: BK.bg, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => CartPickerSheet<Addon>(
        title: 'Tambah add-on',
        load: () async {
          final all = await repo.addonsCatalog();
          final match = all.where((a) => a.resourceId == d.resourceId).toList();
          return match.isEmpty ? all : match;
        },
        idOf: (a) => a.itemId, labelOf: (a) => a.name, priceOf: (a) => a.price,
      ),
    );
    if (picked != null && picked.isNotEmpty && context.mounted) {
      final n = picked.fold(0, (s, e) => s + e.qty);
      await _run(context, () => c.addAddonItems(picked), '$n add-on ditambahkan');
    }
  }

  /// Satu sheet pembayaran: pilih Tunai (langsung) atau metode manual
  /// (transfer/e-wallet + foto bukti + catatan) → attempt awaiting_verification.
  Future<void> _paymentSheet(BuildContext context, BookingDetail d, String scope) async {
    final c = context.read<BookingDetailController>();
    final amount = scope == 'settlement' ? d.balanceDue : d.depositAmount;
    final title = scope == 'settlement' ? 'Lunasi pembayaran' : 'Catat ${d.depositTerm}';
    final result = await showModalBottomSheet<({String method, String proofUrl, String note, bool isCash})>(
      context: context, backgroundColor: BK.card, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetCtx) => _ManualPaySheet(controller: c, title: title, amount: amount, methods: d.manualMethods),
    );
    if (result == null || !context.mounted) return;
    if (result.isCash) {
      await _run(context, scope == 'settlement' ? c.settle : c.recordDeposit,
          scope == 'settlement' ? 'Pembayaran lunas' : '${d.depositTerm} dicatat');
    } else {
      await _run(context, () => c.submitManualPayment(scope: scope, method: result.method, proofUrl: result.proofUrl, note: result.note),
          'Pembayaran dicatat — menunggu verifikasi');
    }
  }
}

/// Sheet catat pembayaran manual: pilih metode + foto bukti opsional (admin).
class _ManualPaySheet extends StatefulWidget {
  final BookingDetailController controller;
  final String title;
  final int amount;
  final List<PaymentMethodOption> methods;
  const _ManualPaySheet({required this.controller, required this.title, required this.amount, required this.methods});
  @override
  State<_ManualPaySheet> createState() => _ManualPaySheetState();
}

class _ManualPaySheetState extends State<_ManualPaySheet> {
  final _picker = ImagePicker();
  final _note = TextEditingController();
  String? _method;
  String? _proofPath; // path lokal foto yang dipilih
  String? _proofUrl; // url setelah terunggah
  bool _uploading = false;
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  // Ikon per kategori metode (bank/e-wallet/QRIS) untuk pindai cepat.
  IconData _methodIcon(PaymentMethodOption m) {
    final c = '${m.category} ${m.code}'.toLowerCase();
    if (c.contains('qris') || c.contains('qr')) return Icons.qr_code_2;
    if (c.contains('wallet') || c.contains('ewallet') || c.contains('gopay') || c.contains('ovo') || c.contains('dana') || c.contains('shopee')) return Icons.account_balance_wallet_outlined;
    if (c.contains('bank') || c.contains('transfer') || c.contains('va')) return Icons.account_balance_outlined;
    return Icons.payments_outlined;
  }

  Future<void> _pick(ImageSource source) async {
    try {
      final x = await _picker.pickImage(source: source, imageQuality: 70, maxWidth: 1600);
      if (x == null) return;
      setState(() {
        _proofPath = x.path;
        _proofUrl = null;
        _uploading = true;
        _error = null;
      });
      final url = await widget.controller.uploadProof(x.path);
      if (!mounted) return;
      setState(() {
        _uploading = false;
        if (url != null) {
          _proofUrl = url;
        } else {
          _proofPath = null;
          _error = 'Gagal mengunggah foto. Coba lagi.';
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _proofPath = null;
        _error = 'Gagal mengambil foto.';
      });
    }
  }

  void _pickSource() {
    showModalBottomSheet<void>(
      context: context, backgroundColor: BK.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: _sourceOption(Icons.photo_camera_outlined, 'Kamera', () { Navigator.pop(ctx); _pick(ImageSource.camera); })),
              const SizedBox(width: 12),
              Expanded(child: _sourceOption(Icons.photo_library_outlined, 'Galeri', () { Navigator.pop(ctx); _pick(ImageSource.gallery); })),
            ]),
          ]),
        ),
      ),
    );
  }

  Widget _sourceOption(IconData icon, String label, VoidCallback onTap) => InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(14), border: Border.all(color: BK.line)),
          child: Column(children: [
            Icon(icon, size: 28, color: BK.accent),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
          ]),
        ),
      );

  static const _cashCode = '__cash__';

  @override
  Widget build(BuildContext context) {
    final isCash = _method == _cashCode;
    final canSubmit = _method != null && !_uploading;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 10),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 10),
            child: Row(children: [
              Text(widget.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
            ]),
          ),
          // Total tagihan
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(14)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Total tagihan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: BK.ink2)),
                const SizedBox(height: 2),
                Text('Rp${rupiah(widget.amount)}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: BK.ink)),
              ]),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('METODE PEMBAYARAN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3, letterSpacing: 0.4)),
              const SizedBox(height: 10),
              // Tunai — langsung tercatat lunas (tanpa verifikasi).
              _methodTile(icon: Icons.payments_rounded, label: 'Tunai (cash)', selected: isCash, onTap: () => setState(() => _method = _cashCode)),
              for (final m in widget.methods)
                _methodTile(
                  icon: _methodIcon(m),
                  label: m.displayName,
                  subtitle: 'Bukti opsional · menunggu verifikasi',
                  selected: _method == m.code,
                  onTap: () => setState(() => _method = m.code),
                ),
              // Foto bukti + catatan hanya relevan untuk pembayaran non-tunai.
              if (_method != null && !isCash) ...[
                const SizedBox(height: 6),
                const Text('FOTO BUKTI (OPSIONAL)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
                const SizedBox(height: 8),
                _proofPreview(),
                if (_error != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(_error!, style: const TextStyle(color: BK.crit, fontSize: 12))),
                const SizedBox(height: 14),
                const Text('CATATAN ADMIN (OPSIONAL)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
                const SizedBox(height: 8),
                TextField(
                  controller: _note,
                  maxLines: 2,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(
                    hintText: 'mis. transfer BCA a.n. Budi, ref 8821',
                    isDense: true,
                    filled: true, fillColor: BK.bg,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
                  ),
                ),
              ],
            ]),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                  onPressed: canSubmit ? () => Navigator.pop(context, (method: isCash ? '' : _method!, proofUrl: _proofUrl ?? '', note: isCash ? '' : _note.text.trim(), isCash: isCash)) : null,
                  child: Text(_uploading ? 'Mengunggah foto…' : 'Catat pembayaran', style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _methodTile({required IconData icon, required String label, String? subtitle, required bool selected, required VoidCallback onTap}) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            decoration: BoxDecoration(
              color: selected ? BK.accentSoft : BK.bg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: selected ? BK.accent : BK.line, width: selected ? 1.4 : 1),
            ),
            child: Row(children: [
              Icon(icon, size: 20, color: selected ? BK.accent : BK.ink2),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: selected ? BK.accent : BK.ink)),
                  if (subtitle != null) Text(subtitle, style: const TextStyle(fontSize: 11, color: BK.ink3)),
                ]),
              ),
              Icon(selected ? Icons.check_circle_rounded : Icons.circle_outlined, size: 20, color: selected ? BK.accent : BK.ink3),
            ]),
          ),
        ),
      );

  Widget _proofPreview() {
    // Sedang unggah — tampilkan preview yang di-overlay spinner.
    if (_uploading && _proofPath != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(children: [
          Image.file(File(_proofPath!), height: 170, width: double.infinity, fit: BoxFit.cover),
          Positioned.fill(
            child: Container(
              color: Colors.black.withValues(alpha: .38),
              child: const Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                  SizedBox(height: 8),
                  Text('Mengunggah…', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                ]),
              ),
            ),
          ),
        ]),
      );
    }
    // Sudah terunggah — preview penuh, ketuk untuk ganti, ada tombol hapus.
    if (_proofUrl != null && _proofPath != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(children: [
          Image.file(File(_proofPath!), height: 170, width: double.infinity, fit: BoxFit.cover),
          Positioned.fill(
            child: Material(
              color: Colors.transparent,
              child: InkWell(onTap: _pickSource),
            ),
          ),
          Positioned(
            left: 8, bottom: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: BK.live, borderRadius: BorderRadius.circular(999)),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.check_circle_rounded, color: Colors.white, size: 13),
                SizedBox(width: 4),
                Text('Bukti terlampir', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
              ]),
            ),
          ),
          Positioned(
            top: 8, right: 8,
            child: GestureDetector(
              onTap: () => setState(() { _proofPath = null; _proofUrl = null; }),
              child: Container(
                padding: const EdgeInsets.all(5),
                decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                child: const Icon(Icons.close_rounded, color: Colors.white, size: 16),
              ),
            ),
          ),
        ]),
      );
    }
    // Kosong — placeholder unggah.
    return GestureDetector(
      onTap: _pickSource,
      child: Container(
        height: 112,
        width: double.infinity,
        decoration: BoxDecoration(color: BK.bg, borderRadius: BorderRadius.circular(12), border: Border.all(color: BK.line)),
        child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.add_a_photo_outlined, color: BK.ink3, size: 26),
          SizedBox(height: 8),
          Text('Unggah foto bukti', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: BK.ink2)),
          SizedBox(height: 2),
          Text('Kamera atau galeri', style: TextStyle(fontSize: 11, color: BK.ink3)),
        ]),
      ),
    );
  }
}

/// Timeline yang bisa di-collapse kalau event-nya banyak.
class _Timeline extends StatefulWidget {
  final List<TimelineEvent> events;
  final Widget Function(TimelineEvent e, {required bool last}) rowBuilder;
  const _Timeline({required this.events, required this.rowBuilder});
  @override
  State<_Timeline> createState() => _TimelineState();
}

class _TimelineState extends State<_Timeline> {
  static const _collapsedCount = 4;
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final all = widget.events;
    final long = all.length > _collapsedCount;
    final visible = (!long || _expanded) ? all.length : _collapsedCount;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      for (int i = 0; i < visible; i++) widget.rowBuilder(all[i], last: i == all.length - 1),
      if (long) ...[
        const Divider(height: 1, color: BK.line),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            style: TextButton.styleFrom(foregroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 6)),
            onPressed: () => setState(() => _expanded = !_expanded),
            icon: Icon(_expanded ? Icons.expand_less : Icons.expand_more, size: 18),
            label: Text(_expanded ? 'Sembunyikan' : 'Lihat ${all.length - _collapsedCount} lainnya', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    ]);
  }
}
