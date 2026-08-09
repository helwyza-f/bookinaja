import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/booking.dart';
import '../models/booking_detail.dart';
import '../repositories/booking_repository.dart';
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

  Future<void> _run(BuildContext context, Future<bool> Function() action, String okMsg) async {
    final c = context.read<BookingDetailController>();
    final ok = await action();
    if (!context.mounted) return;
    _snack(context, ok ? okMsg : (c.actionError ?? 'Aksi gagal'), ok ? BK.live : BK.crit);
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
          TextField(
            controller: reasonCtrl,
            maxLines: 2,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: 'Alasan (opsional)',
              hintText: 'mis. Customer minta reschedule',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(11)),
              isDense: true,
            ),
          ),
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
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        // hero
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [BK.accent, Color(0xFF1C47C9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(BK.radius),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              _statusChip(d.statusRaw),
              const Spacer(),
              if (d.hasBalance) Text('Sisa Rp${rupiah(d.balanceDue)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12.5)),
            ]),
            const SizedBox(height: 10),
            Text(d.customerName, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text('${d.resourceName}${d.customerPhone.isNotEmpty ? ' · ${d.customerPhone}' : ''}', style: const TextStyle(color: Colors.white, fontSize: 12.5)),
          ]),
        ),
        const SizedBox(height: 16),

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
            ]),
          )
        else ...[
          const Text('AKSI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
          const SizedBox(height: 9),
          // Aksi utama sesuai status
          if (d.canConfirm)
            _primary('Konfirmasi booking', BK.accent, disabled ? null : () => _run(context, c.confirm, 'Booking dikonfirmasi')),
          if (d.needsDeposit)
            _primary('Catat DP (cash)', BK.pend, disabled ? null : () => _run(context, c.recordDeposit, 'DP dicatat')),
          if (d.canStart && !d.needsDeposit)
            _primary('▶ Mulai sesi', BK.live, disabled ? null : () => _run(context, c.start, 'Sesi dimulai')),
          if (d.canEnd)
            _primary('■ Akhiri sesi', BK.accent, disabled ? null : () => _run(context, c.end, 'Sesi diakhiri')),
          if (d.hasBalance && !d.needsDeposit)
            _primary('Lunasi cash · Rp${rupiah(d.balanceDue)}', BK.ink, disabled ? null : () => _run(context, c.settle, 'Pembayaran lunas'), outline: true),
        ],

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
          const Divider(height: 18, color: BK.line),
          Row(children: [
            const Text('Sisa', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: BK.ink)),
            const Spacer(),
            Text('Rp${rupiah(d.balanceDue)}', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: d.hasBalance ? BK.pend : BK.live)),
          ]),
        ])),

        if (d.canCancel) ...[
          const SizedBox(height: 14),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.critSoft, foregroundColor: BK.crit, padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: disabled ? null : () => _confirmCancel(context),
            child: const Text('Batalkan booking'),
          ),
        ],
      ],
    );
  }

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

  Widget _statusChip(String s) {
    final (label, bg, fg) = switch (s) {
      'active' || 'ongoing' => ('Sesi berjalan', Colors.white24, Colors.white),
      'completed' => ('Selesai', Colors.white24, Colors.white),
      'cancelled' => ('Dibatalkan', Colors.white24, Colors.white),
      'confirmed' => ('Terkonfirmasi', Colors.white24, Colors.white),
      _ => ('Pending', Colors.white24, Colors.white),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w700)),
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
}
