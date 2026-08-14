import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../theme.dart';
import '../../ui/error_text.dart';
import '../../models/booking_detail.dart' show PaymentAttempt, PaymentMethodOption;
import '../../models/customer_order_detail.dart';
import '../../realtime/realtime_bus.dart';
import '../../realtime/realtime_channels.dart';
import '../../realtime/realtime_client.dart';
import '../../realtime/realtime_event.dart';
import '../../repositories/customer_booking_repository.dart';

/// Detail order (F&B / direct sale) milik customer — paralel dengan booking
/// detail: rincian item, total, status & riwayat pembayaran, plus ajukan
/// pembayaran manual bila ada sisa tagihan. Realtime via channel order customer.
class CustomerOrderDetailScreen extends StatefulWidget {
  const CustomerOrderDetailScreen({super.key, required this.orderId});
  final String orderId;

  @override
  State<CustomerOrderDetailScreen> createState() => _CustomerOrderDetailScreenState();
}

class _CustomerOrderDetailScreenState extends State<CustomerOrderDetailScreen> {
  late Future<CustomerOrderDetail> _future;
  bool _busy = false;

  static const _rtSource = 'customer-order-detail';
  StreamSubscription<RealtimeEvent>? _rtSub;
  Timer? _rtDebounce;
  bool _rtStarted = false;

  @override
  void initState() {
    super.initState();
    _reload();
    _rtSub = RealtimeBus.instance.events.listen(_onRealtimeEvent);
  }

  @override
  void dispose() {
    _rtSub?.cancel();
    _rtDebounce?.cancel();
    RealtimeClient.instance.clearChannels(source: _rtSource);
    super.dispose();
  }

  void _reload() {
    _future = context.read<CustomerBookingRepository>().orderDetail(widget.orderId);
  }

  Future<void> _refresh() async {
    setState(_reload);
    await _future;
  }

  void _startRealtime(String customerId) {
    if (_rtStarted || customerId.isEmpty) return;
    _rtStarted = true;
    RealtimeClient.instance.setChannels(
      [customerOrderChannel(customerId, widget.orderId)],
      source: _rtSource,
    );
  }

  void _onRealtimeEvent(RealtimeEvent event) {
    final type = event.type.toLowerCase();
    if (!(type.startsWith('order.') || type.startsWith('payment.'))) return;
    final id = '${event.refs['order_id'] ?? event.entityId ?? ''}'.trim();
    if (id != widget.orderId) return;
    _rtDebounce?.cancel();
    _rtDebounce = Timer(const Duration(milliseconds: 350), _bgRefresh);
  }

  Future<void> _bgRefresh() async {
    try {
      final o = await context.read<CustomerBookingRepository>().orderDetail(widget.orderId);
      if (mounted) setState(() => _future = Future.value(o));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.card,
        elevation: 0,
        title: const Text('Detail Order', style: TextStyle(fontWeight: FontWeight.w800, color: BK.ink)),
        iconTheme: const IconThemeData(color: BK.ink),
      ),
      body: FutureBuilder<CustomerOrderDetail>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(friendlyError(snap.error), textAlign: TextAlign.center, style: const TextStyle(color: BK.crit)),
                  const SizedBox(height: 12),
                  OutlinedButton(onPressed: _refresh, child: const Text('Coba lagi')),
                ]),
              ),
            );
          }
          final o = snap.data!;
          if (!_rtStarted && o.customerId.isNotEmpty) {
            WidgetsBinding.instance.addPostFrameCallback((_) => _startRealtime(o.customerId));
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                _hero(o),
                const SizedBox(height: 12),
                if (o.items.isNotEmpty) ...[_itemsCard(o), const SizedBox(height: 12)],
                _paymentCard(o),
                if (o.attempts.isNotEmpty) ...[const SizedBox(height: 12), _attemptsCard(o)],
                if (o.notes.isNotEmpty) ...[const SizedBox(height: 12), _notesCard(o)],
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: FutureBuilder<CustomerOrderDetail>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData || !snap.data!.canPay) return const SizedBox.shrink();
          return _payBar(snap.data!);
        },
      ),
    );
  }

  Widget _hero(CustomerOrderDetail o) => BKCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(
                child: Text(o.orderNumber.isEmpty ? o.kindLabel : '#${o.orderNumber}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
              ),
              _statusPill(o),
            ]),
            const SizedBox(height: 4),
            Text([o.kindLabel, if (o.resourceName.isNotEmpty) o.resourceName].join(' · '),
                style: const TextStyle(fontSize: 12.5, color: BK.ink2)),
          ],
        ),
      );

  Widget _statusPill(CustomerOrderDetail o) {
    if (o.isCancelled) return Pill.crit('Dibatalkan');
    if (o.status == 'completed') return Pill.acc('Selesai');
    if (o.isSettled) return Pill.live('Lunas');
    return Pill.pend('Berjalan');
  }

  Widget _itemsCard(CustomerOrderDetail o) => BKCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardTitle(Icons.receipt_long_outlined, 'Rincian'),
            const SizedBox(height: 10),
            for (final it in o.items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(
                    child: Text(it.quantity > 1 ? '${it.name}  ×${it.quantity}' : it.name,
                        style: const TextStyle(fontSize: 13.5, color: BK.ink)),
                  ),
                  const SizedBox(width: 8),
                  Text('Rp${rupiah(it.subtotal)}',
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
                ]),
              ),
          ],
        ),
      );

  Widget _paymentCard(CustomerOrderDetail o) => BKCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              _cardTitle(Icons.payments_outlined, 'Pembayaran'),
              const Spacer(),
              o.isSettled
                  ? Pill.live('Lunas')
                  : o.hasPendingVerification
                      ? Pill.pend('Menunggu verifikasi')
                      : Pill.mut(o.paymentLabel),
            ]),
            const SizedBox(height: 10),
            if (o.discountAmount > 0) _row('Subtotal', 'Rp${rupiah(o.subtotal)}'),
            if (o.discountAmount > 0) _row('Diskon', '- Rp${rupiah(o.discountAmount)}'),
            _row('Total', 'Rp${rupiah(o.grandTotal)}', strong: true),
            if (o.paidAmount > 0) _row('Sudah dibayar', 'Rp${rupiah(o.paidAmount)}'),
            if (o.balanceDue > 0) _row('Sisa tagihan', 'Rp${rupiah(o.balanceDue)}', danger: true),
          ],
        ),
      );

  Widget _attemptsCard(CustomerOrderDetail o) {
    final list = [...o.pendingAttempts, ...o.historyAttempts];
    return BKCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardTitle(Icons.history_outlined, 'Riwayat pembayaran'),
          const SizedBox(height: 6),
          for (final a in list) _attemptRow(a),
        ],
      ),
    );
  }

  Widget _attemptRow(PaymentAttempt a) {
    final pill = a.isVerified
        ? Pill.live(a.statusLabel)
        : a.isRejected
            ? Pill.crit(a.statusLabel)
            : Pill.pend(a.statusLabel);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Rp${rupiah(a.amount)}',
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 2),
            Text(a.methodLabel, style: const TextStyle(fontSize: 12, color: BK.ink2)),
            if (a.isRejected && a.adminNote.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text('Catatan: ${a.adminNote}', style: const TextStyle(fontSize: 11, color: BK.crit)),
              ),
          ]),
        ),
        const SizedBox(width: 8),
        pill,
      ]),
    );
  }

  Widget _notesCard(CustomerOrderDetail o) => BKCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _cardTitle(Icons.sticky_note_2_outlined, 'Catatan'),
          const SizedBox(height: 6),
          Text(o.notes, style: const TextStyle(fontSize: 13, color: BK.ink2)),
        ]),
      );

  Widget _payBar(CustomerOrderDetail o) => SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: FilledButton.icon(
          style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
          onPressed: _busy ? null : () => _payManual(o),
          icon: const Icon(Icons.payments_outlined, size: 18),
          label: Text('Bayar Rp${rupiah(o.balanceDue)}', style: const TextStyle(fontWeight: FontWeight.w800)),
        ),
      );

  Future<void> _payManual(CustomerOrderDetail o) async {
    final methods = o.manualMethods;
    if (methods.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tenant belum mengaktifkan metode transfer/QRIS. Hubungi tenant.')),
      );
      return;
    }
    final repo = context.read<CustomerBookingRepository>();
    final result = await showModalBottomSheet<({String method, String note})>(
      context: context,
      backgroundColor: BK.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _ManualPaySheet(methods: methods, amount: o.balanceDue),
    );
    if (result == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await repo.orderManualPayment(widget.orderId, method: result.method, note: result.note);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pembayaran diajukan — menunggu verifikasi tenant')),
      );
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyError(e)), backgroundColor: BK.crit),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // --- helpers ---
  Widget _cardTitle(IconData icon, String title) => Row(children: [
        Icon(icon, size: 16, color: BK.ink2),
        const SizedBox(width: 6),
        Text(title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: BK.ink2)),
      ]);

  Widget _row(String k, String v, {bool strong = false, bool danger = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Text(k, style: const TextStyle(fontSize: 13, color: BK.ink2))),
          const SizedBox(width: 8),
          Text(v,
              style: TextStyle(
                  fontSize: strong ? 15 : 13.5,
                  fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
                  color: danger ? BK.crit : BK.ink)),
        ]),
      );
}

/// Sheet pilih metode manual + catatan/referensi opsional. Bukti transfer bisa
/// dikirim menyusul lewat verifikasi tenant (upload foto ditunda ke iterasi lain).
class _ManualPaySheet extends StatefulWidget {
  final List<PaymentMethodOption> methods;
  final int amount;
  const _ManualPaySheet({required this.methods, required this.amount});
  @override
  State<_ManualPaySheet> createState() => _ManualPaySheetState();
}

class _ManualPaySheetState extends State<_ManualPaySheet> {
  PaymentMethodOption? _method;
  final _noteCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 18, bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Bayar Rp${rupiah(widget.amount)}',
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
        const SizedBox(height: 4),
        const Text('Pilih metode transfer/QRIS. Pembayaran diverifikasi tenant.',
            style: TextStyle(fontSize: 12.5, color: BK.ink3)),
        const SizedBox(height: 14),
        for (final m in widget.methods) _methodTile(m),
        if (_method != null && _method!.instructions.isNotEmpty) ...[
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(12)),
            child: Text(_method!.instructions, style: const TextStyle(fontSize: 12, height: 1.4, color: BK.accent)),
          ),
        ],
        const SizedBox(height: 12),
        TextField(
          controller: _noteCtrl,
          style: const TextStyle(fontSize: 14, color: BK.ink),
          decoration: InputDecoration(
            labelText: 'Referensi / catatan (opsional)',
            isDense: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton(
          style: FilledButton.styleFrom(
              backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14), disabledBackgroundColor: BK.line),
          onPressed: _method == null ? null : () => Navigator.pop(context, (method: _method!.code, note: _noteCtrl.text.trim())),
          child: Text(_method == null ? 'Pilih metode dulu' : 'Ajukan pembayaran',
              style: const TextStyle(fontWeight: FontWeight.w800)),
        ),
      ]),
    );
  }

  Widget _methodTile(PaymentMethodOption m) {
    final on = _method?.code == m.code;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: () => setState(() => _method = m),
        child: Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: on ? BK.accentSoft : BK.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: on ? BK.accent : BK.line, width: on ? 1.5 : 1),
          ),
          child: Row(children: [
            Icon(on ? Icons.radio_button_checked : Icons.radio_button_off, size: 20, color: on ? BK.accent : BK.ink3),
            const SizedBox(width: 10),
            Expanded(child: Text(m.displayName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: BK.ink))),
          ]),
        ),
      ),
    );
  }
}
