import 'dart:async';
import 'package:flutter/material.dart';
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

  void _snack(BuildContext c, String m, Color color) =>
      ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(m), behavior: SnackBarBehavior.floating, backgroundColor: color));

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
    final ok = await action();
    if (!context.mounted) return;
    _snack(context, ok ? okMsg : (c.actionError ?? 'Aksi gagal'), ok ? BK.live : BK.crit);
  }

  Future<String?> _askReason(BuildContext context, String title, String label, {bool required = false}) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: ctrl, maxLines: 2, autofocus: true,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(labelText: label, border: OutlineInputBorder(borderRadius: BorderRadius.circular(11)), isDense: true),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Kembali')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Lanjut')),
        ],
      ),
    );
    final text = ctrl.text.trim();
    ctrl.dispose();
    if (ok != true) return null;
    if (required && text.isEmpty) return null;
    return text;
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
            if (d.isActive && d.endTime.isNotEmpty) ...[
              const SizedBox(height: 12),
              _SessionTimer(endIso: d.endTime),
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
                      final reason = await _askReason(context, 'Tolak bukti?', 'Alasan penolakan');
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
          )
        else ...[
          const Text('AKSI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(height: 9),
          if (d.canConfirm)
            _primary('Konfirmasi booking', BK.accent, disabled ? null : () => _run(context, c.confirm, 'Booking dikonfirmasi')),
          if (d.canRecordDeposit)
            _primary('Catat ${d.depositTerm} (cash)', BK.pend, disabled ? null : () => _run(context, c.recordDeposit, '${d.depositTerm} dicatat')),
          if (d.canStart)
            _primary('▶ Mulai sesi', BK.live, disabled ? null : () => _run(context, c.start, 'Sesi dimulai')),
          if (d.canOverrideDeposit)
            _primary('Mulai tanpa DP (override)', BK.ink, disabled ? null : () async {
              final reason = await _askReason(context, 'Override DP', 'Alasan (opsional)');
              if (reason != null && context.mounted) await _run(context, () => c.overrideDeposit(reason: reason), 'Override DP aktif — sesi bisa dimulai');
            }, outline: true),
          if (d.canComplete)
            _primary('■ Akhiri sesi', BK.accent, disabled ? null : () => _run(context, c.end, 'Sesi diakhiri')),
          if (d.isActive) ...[
            _primary('＋ Perpanjang sesi', BK.accent, disabled ? null : () => _extendDialog(context), outline: true),
            // F&B / Add-on hanya tampil kalau diaktifkan tenant (controller_features),
            // mengikuti web. Reflow: dua → berdampingan, satu → penuh, nol → hilang.
            Builder(builder: (_) {
              OutlinedButton catalogBtn(IconData icon, String label, VoidCallback onTap) => OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(foregroundColor: BK.ink, backgroundColor: BK.card, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(vertical: 12)),
                    onPressed: disabled ? null : onTap,
                    icon: Icon(icon, size: 18),
                    label: Text(label),
                  );
              final btns = <Widget>[
                if (d.enableFnb) catalogBtn(Icons.ramen_dining, 'Tambah F&B', () => _fnbSheet(context, d)),
                if (d.enableAddons) catalogBtn(Icons.add_circle_outline, 'Add-on', () => _addonSheet(context, d)),
              ];
              if (btns.isEmpty) return const SizedBox.shrink();
              if (btns.length == 1) return SizedBox(width: double.infinity, child: btns.first);
              return Row(children: [
                Expanded(child: btns[0]),
                const SizedBox(width: 9),
                Expanded(child: btns[1]),
              ]);
            }),
            if (d.enableFnb || d.enableAddons) const SizedBox(height: 9),
          ],
        ],

        // Pelunasan & nota — di luar gating "isFinal": canSettle justru butuh
        // status completed (sesi selesai tapi masih ada sisa bayar).
        if (d.canSettle)
          Padding(padding: const EdgeInsets.only(top: 4), child: _primary('Lunasi cash · Rp${rupiah(d.balanceDue)}', BK.pend, disabled ? null : () => _run(context, c.settle, 'Pembayaran lunas'))),
        if (d.canSendReceipt)
          Padding(padding: const EdgeInsets.only(top: 8), child: _primary('Kirim nota (WhatsApp)', BK.ink, disabled ? null : () => _run(context, c.sendReceipt, 'Nota dikirim'), outline: true)),

        const SizedBox(height: 8),
        Row(children: const [
          Text('Pembayaran', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
          SizedBox(width: 9),
          Expanded(child: Divider(color: BK.line)),
        ]),
        const SizedBox(height: 4),
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
        ])),

        // Rincian pesanan (F&B + add-on)
        if (d.orders.isNotEmpty || d.options.isNotEmpty) ...[
          _sectionLabel('Rincian pesanan'),
          BKCard(child: Column(children: [
            for (final o in [...d.options, ...d.orders])
              Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Row(children: [
                Expanded(child: Text('${o.name}${o.quantity > 1 ? ' ×${o.quantity}' : ''}', style: const TextStyle(fontSize: 13, color: BK.ink2))),
                Text('Rp${rupiah(o.subtotal)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink)),
              ])),
          ])),
        ],

        // Timeline audit
        if (d.events.isNotEmpty) ...[
          _sectionLabel('Timeline'),
          BKCard(child: Column(children: [
            for (int i = 0; i < d.events.length; i++) _timelineRow(d.events[i], last: i == d.events.length - 1),
          ])),
        ],

        if (d.canCancel) ...[
          const SizedBox(height: 14),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.critSoft, foregroundColor: BK.crit, padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: disabled ? null : () => _confirmCancel(context),
            child: const Text('Batalkan booking'),
          ),
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

  Widget _heroPill(IconData icon, String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(20)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 13, color: Colors.white),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
        ]),
      );

  Widget _primary(String label, Color color, VoidCallback? onTap, {bool outline = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: SizedBox(
        width: double.infinity,
        child: outline
            ? OutlinedButton(
                style: OutlinedButton.styleFrom(foregroundColor: color, backgroundColor: BK.card, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: onTap, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)))
            : FilledButton(
                style: FilledButton.styleFrom(backgroundColor: color, padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: onTap, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700))),
      ),
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

  Widget _sectionLabel(String t) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 18, 2, 8),
        child: Row(children: [
          Text(t.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(width: 9),
          const Expanded(child: Divider(color: BK.line)),
        ]),
      );

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
              _clock(e.createdAt),
            ].where((s) => s.isNotEmpty).join(' · '), style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ]),
        )),
      ]),
    );
  }

  static String _clock(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '';
    final l = d.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _extendDialog(BuildContext context) async {
    final c = context.read<BookingDetailController>();
    int units = 1;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => StatefulBuilder(builder: (ctx, setSt) => AlertDialog(
        title: const Text('Perpanjang sesi'),
        content: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          IconButton(onPressed: () => setSt(() => units = (units - 1).clamp(1, 12)), icon: const Icon(Icons.remove_circle_outline)),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('$units unit', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
          IconButton(onPressed: () => setSt(() => units = (units + 1).clamp(1, 12)), icon: const Icon(Icons.add_circle_outline)),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Perpanjang')),
        ],
      )),
    );
    if (ok == true && context.mounted) await _run(context, () => c.extend(units), 'Sesi diperpanjang $units unit');
  }

  Future<void> _fnbSheet(BuildContext context, BookingDetail d) async {
    final c = context.read<BookingDetailController>();
    final repo = context.read<PosRepository>();
    await showModalBottomSheet<void>(
      context: context, backgroundColor: BK.bg, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetCtx) => _PickerSheet<MenuItem>(
        title: 'Tambah F&B',
        load: repo.listMenu,
        labelOf: (m) => m.name,
        priceOf: (m) => m.price,
        onPick: (m) async {
          Navigator.pop(sheetCtx);
          await _run(context, () => c.addFnb(m.id, 1), '${m.name} ditambahkan');
        },
      ),
    );
  }

  Future<void> _addonSheet(BuildContext context, BookingDetail d) async {
    final c = context.read<BookingDetailController>();
    final repo = context.read<CatalogRepository>();
    await showModalBottomSheet<void>(
      context: context, backgroundColor: BK.bg, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetCtx) => _PickerSheet<Addon>(
        title: 'Tambah add-on',
        load: () async {
          final all = await repo.addonsCatalog();
          final match = all.where((a) => a.resourceId == d.resourceId).toList();
          return match.isEmpty ? all : match;
        },
        labelOf: (a) => a.name,
        priceOf: (a) => a.price,
        onPick: (a) async {
          Navigator.pop(sheetCtx);
          await _run(context, () => c.addAddon(a.itemId), '${a.name} ditambahkan');
        },
      ),
    );
  }
}

/// Timer sisa waktu sesi (ticking tiap detik).
class _SessionTimer extends StatefulWidget {
  final String endIso;
  const _SessionTimer({required this.endIso});
  @override
  State<_SessionTimer> createState() => _SessionTimerState();
}

class _SessionTimerState extends State<_SessionTimer> {
  Timer? _t;
  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final end = DateTime.tryParse(widget.endIso);
    final diff = end == null ? Duration.zero : end.difference(DateTime.now());
    final over = diff.isNegative;
    final d = diff.abs();
    final label = '${d.inHours > 0 ? '${d.inHours}:' : ''}${(d.inMinutes % 60).toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: .15), borderRadius: BorderRadius.circular(12)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(over ? Icons.warning_amber_rounded : Icons.timer_outlined, size: 16, color: Colors.white),
        const SizedBox(width: 7),
        Text(over ? 'Lewat $label' : 'Sisa $label', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14, fontFeatures: [FontFeature.tabularFigures()])),
      ]),
    );
  }
}

/// Bottom sheet pemilih item generik (F&B / add-on).
class _PickerSheet<T> extends StatelessWidget {
  final String title;
  final Future<List<T>> Function() load;
  final String Function(T) labelOf;
  final int Function(T) priceOf;
  final Future<void> Function(T) onPick;
  const _PickerSheet({required this.title, required this.load, required this.labelOf, required this.priceOf, required this.onPick});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6, minChildSize: 0.4, maxChildSize: 0.9, expand: false,
      builder: (_, scroll) => Column(children: [
        Padding(padding: const EdgeInsets.fromLTRB(20, 16, 20, 8), child: Row(children: [
          Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
          const Spacer(),
          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, color: BK.ink3)),
        ])),
        Expanded(child: FutureBuilder<List<T>>(
          future: load(),
          builder: (_, snap) {
            if (!snap.hasData) return const Center(child: CircularProgressIndicator());
            final items = snap.data!;
            if (items.isEmpty) return const StateView(icon: Icons.inbox, color: BK.ink3, title: 'Kosong', hint: 'Belum ada item.');
            return ListView.separated(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              itemCount: items.length,
              separatorBuilder: (_, i) => const Divider(height: 1, color: BK.line),
              itemBuilder: (_, i) {
                final it = items[i];
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                  title: Text(labelOf(it), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: BK.ink)),
                  trailing: Text('Rp${rupiah(priceOf(it))}', style: const TextStyle(fontWeight: FontWeight.w700, color: BK.ink2)),
                  onTap: () => onPick(it),
                );
              },
            );
          },
        )),
      ]),
    );
  }
}
