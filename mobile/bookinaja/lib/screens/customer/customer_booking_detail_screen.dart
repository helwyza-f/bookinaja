import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../theme.dart';
import '../../ui/error_text.dart';
import '../../models/booking_detail.dart';
import '../../realtime/realtime_bus.dart';
import '../../realtime/realtime_channels.dart';
import '../../realtime/realtime_client.dart';
import '../../realtime/realtime_event.dart';
import '../../repositories/customer_booking_repository.dart';
import '../../ui/session_widgets.dart';
import 'customer_payment_screen.dart';

/// Detail satu booking milik customer: jadwal, rincian pesanan, status & riwayat
/// pembayaran, lalu aksi customer (lanjut bayar / batalkan). Read-only untuk data;
/// live-session (mulai/selesai/perpanjang) menyusul di milestone berikutnya.
class CustomerBookingDetailScreen extends StatefulWidget {
  const CustomerBookingDetailScreen({super.key, required this.bookingId});
  final String bookingId;

  @override
  State<CustomerBookingDetailScreen> createState() => _CustomerBookingDetailScreenState();
}

class _CustomerBookingDetailScreenState extends State<CustomerBookingDetailScreen> {
  late Future<BookingDetail> _future;
  bool _busy = false;

  // Realtime: dengarkan bus global, filter event booking ini, lalu refresh
  // senyap (tanpa spinner). Channel WS didaftarkan setelah customer_id diketahui.
  static const _rtSource = 'customer-booking-detail';
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
    _future = context.read<CustomerBookingRepository>().detail(widget.bookingId);
  }

  Future<void> _refresh() async {
    setState(_reload);
    await _future;
  }

  /// Daftarkan channel WS milik customer untuk booking ini (sekali, setelah
  /// customer_id diketahui dari detail pertama).
  void _startRealtime(String customerId) {
    if (_rtStarted || customerId.isEmpty) return;
    _rtStarted = true;
    RealtimeClient.instance.setChannels(
      [customerBookingChannel(customerId, widget.bookingId)],
      source: _rtSource,
    );
  }

  void _onRealtimeEvent(RealtimeEvent event) {
    final type = event.type.toLowerCase();
    if (!(type.startsWith('booking.') ||
        type.startsWith('payment.') ||
        type.startsWith('session.') ||
        type.startsWith('order.'))) {
      return;
    }
    final id = '${event.refs['booking_id'] ?? event.entityId ?? ''}'.trim();
    if (id != widget.bookingId) return;
    // Debounce: satu aksi backend bisa memicu beberapa event beruntun.
    _rtDebounce?.cancel();
    _rtDebounce = Timer(const Duration(milliseconds: 350), _bgRefresh);
  }

  /// Ambil ulang detail lalu ganti future dengan hasil yang sudah komplet,
  /// sehingga tak memunculkan spinner (beda dari [_refresh]).
  Future<void> _bgRefresh() async {
    try {
      final d = await context.read<CustomerBookingRepository>().detail(widget.bookingId);
      if (mounted) setState(() => _future = Future.value(d));
    } catch (_) {
      // Abaikan; layar tetap menampilkan data terakhir yang valid.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.card,
        elevation: 0,
        title: const Text('Detail Booking', style: TextStyle(fontWeight: FontWeight.w800, color: BK.ink)),
        iconTheme: const IconThemeData(color: BK.ink),
      ),
      body: FutureBuilder<BookingDetail>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(friendlyError(snap.error),
                        textAlign: TextAlign.center, style: const TextStyle(color: BK.crit)),
                    const SizedBox(height: 12),
                    OutlinedButton(onPressed: _refresh, child: const Text('Coba lagi')),
                  ],
                ),
              ),
            );
          }
          final d = snap.data!;
          // Daftarkan channel realtime setelah customer_id diketahui (sekali).
          if (!_rtStarted && d.customerId.isNotEmpty) {
            WidgetsBinding.instance.addPostFrameCallback((_) => _startRealtime(d.customerId));
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                _hero(d),
                if (d.isActive) ...[
                  const SizedBox(height: 12),
                  _liveBanner(d),
                  if (d.enableFnb || (d.enableAddons && d.resourceAddons.isNotEmpty)) ...[
                    const SizedBox(height: 10),
                    _sessionExtras(d),
                  ],
                ],
                const SizedBox(height: 12),
                _scheduleCard(d),
                if (d.statusRaw != 'cancelled') ...[
                  const SizedBox(height: 12),
                  _stepsCard(d),
                ],
                const SizedBox(height: 12),
                if (d.options.isNotEmpty || d.orders.isNotEmpty) ...[
                  _itemsCard(d),
                  const SizedBox(height: 12),
                ],
                _paymentCard(d),
                if (d.attempts.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _attemptsCard(d),
                ],
                if (d.cancellationReason.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _cancelReasonCard(d),
                ],
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: FutureBuilder<BookingDetail>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData) return const SizedBox.shrink();
          return _actionBar(snap.data!) ?? const SizedBox.shrink();
        },
      ),
    );
  }

  // --- Hero: tenant + resource + status ---
  Widget _hero(BookingDetail d) => BKCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(d.resourceName,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
                ),
                _statusPill(d),
              ],
            ),
            const SizedBox(height: 4),
            Text(d.sessionLabel, style: const TextStyle(fontSize: 12.5, color: BK.ink2)),
          ],
        ),
      );

  Widget _statusPill(BookingDetail d) {
    switch (d.statusRaw) {
      case 'active':
      case 'ongoing':
        return Pill.live('Berjalan');
      case 'completed':
        return Pill.acc('Selesai');
      case 'cancelled':
        return Pill.crit('Dibatalkan');
      case 'no_show':
        return Pill.crit('Tidak hadir');
      case 'confirmed':
        return Pill.acc('Terkonfirmasi');
      default:
        return Pill.pend('Menunggu');
    }
  }

  // --- Banner sesi berjalan (countdown ticking dari end_time) ---
  Widget _liveBanner(BookingDetail d) {
    final rem = d.remainingMinutes;
    final warn = rem != null && rem <= 15;
    return BKCard(
      color: warn ? BK.critSoft : BK.liveSoft,
      border: warn ? BK.crit : BK.live,
      child: Row(
        children: [
          Icon(Icons.play_circle_fill, size: 20, color: warn ? BK.crit : BK.live),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Sesi sedang berjalan',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: BK.ink)),
                Text('Berakhir ${d.timeRangeLabel.split('– ').last}',
                    style: const TextStyle(fontSize: 12, color: BK.ink2)),
              ],
            ),
          ),
          SessionTimer(endIso: d.endTime, color: warn ? BK.crit : BK.live),
        ],
      ),
    );
  }

  // --- Tambah pesanan saat sesi berjalan (F&B / add-on) ---
  Widget _sessionExtras(BookingDetail d) => Row(
        children: [
          if (d.enableFnb)
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: BK.ink,
                  side: const BorderSide(color: BK.line),
                  backgroundColor: BK.card,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: _busy ? null : () => _addFnb(),
                icon: const Icon(Icons.ramen_dining, size: 18, color: BK.accent),
                label: const Text('Tambah F&B', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ),
          if (d.enableFnb && d.enableAddons && d.resourceAddons.isNotEmpty) const SizedBox(width: 10),
          if (d.enableAddons && d.resourceAddons.isNotEmpty)
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: BK.ink,
                  side: const BorderSide(color: BK.line),
                  backgroundColor: BK.card,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: _busy ? null : () => _addAddon(d),
                icon: const Icon(Icons.add_circle_outline, size: 18, color: BK.accent),
                label: const Text('Add-on', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ),
        ],
      );

  Future<void> _addFnb() async {
    final repo = context.read<CustomerBookingRepository>();
    final picked = await showModalBottomSheet<List<({String id, int qty})>>(
      context: context,
      backgroundColor: BK.bg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => CartPickerSheet<({String id, String name, int price, String category})>(
        title: 'Tambah F&B',
        load: () => repo.fnbMenu(widget.bookingId),
        idOf: (m) => m.id,
        labelOf: (m) => m.name,
        priceOf: (m) => m.price,
        categoryOf: (m) => m.category,
      ),
    );
    if (picked == null || picked.isEmpty || !mounted) return;
    final n = picked.fold(0, (s, e) => s + e.qty);
    await _runAction(() async {
      for (final e in picked) {
        await repo.addFnb(widget.bookingId, fnbItemId: e.id, quantity: e.qty);
      }
    }, success: '$n item F&B ditambahkan');
  }

  Future<void> _addAddon(BookingDetail d) async {
    final repo = context.read<CustomerBookingRepository>();
    final picked = await showModalBottomSheet<List<({String id, int qty})>>(
      context: context,
      backgroundColor: BK.bg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => CartPickerSheet<ResourceAddonSimple>(
        title: 'Tambah add-on',
        load: () async => d.resourceAddons,
        idOf: (a) => a.id,
        labelOf: (a) => a.name,
        priceOf: (a) => a.price,
      ),
    );
    if (picked == null || picked.isEmpty || !mounted) return;
    final n = picked.fold(0, (s, e) => s + e.qty);
    await _runAction(() async {
      for (final e in picked) {
        // Backend add-on menerima satu item_id per panggilan; ulang sejumlah qty.
        for (var k = 0; k < e.qty; k++) {
          await repo.addAddon(widget.bookingId, e.id);
        }
      }
    }, success: '$n add-on ditambahkan');
  }

  // --- Jadwal ---
  Widget _scheduleCard(BookingDetail d) => BKCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardTitle(Icons.event_outlined, 'Jadwal'),
            const SizedBox(height: 10),
            _row('Tanggal', d.dateLabel),
            _row('Waktu', d.timeRangeLabel),
          ],
        ),
      );

  // --- Langkah / progress (hand-holding customer, port dari web) ---
  Widget _stepsCard(BookingDetail d) {
    final step = _bookingStep(d);
    return BKCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardTitle(Icons.flag_outlined, 'Langkah'),
          const SizedBox(height: 8),
          Text(_nextStep(d), style: const TextStyle(fontSize: 13.5, height: 1.5, color: BK.ink)),
          const SizedBox(height: 14),
          _stepRow(1, step, 'Booking dibuat', 'Jadwal & resource tercatat.'),
          _stepRow(2, step, 'Pembayaran',
              step > 2 ? 'Pembayaran awal sudah tercatat.' : 'Selesaikan pembayaran sesuai tahap.'),
          _stepRow(3, step, 'Sesi',
              d.statusRaw == 'completed' ? 'Booking selesai.' : d.isActive ? 'Sesi sedang berjalan.' : 'Mulai sesi saat waktunya tiba.'),
        ],
      ),
    );
  }

  Widget _stepRow(int index, int current, String title, String desc) {
    final isDone = current > index;
    final active = current == index;
    final color = isDone ? BK.live : active ? BK.accent : BK.ink3;
    final bg = isDone ? BK.liveSoft : active ? BK.accentSoft : BK.card2;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
            child: Icon(isDone ? Icons.check_rounded : Icons.circle_outlined, size: 16, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: active || isDone ? BK.ink : BK.ink2)),
                Text(desc, style: const TextStyle(fontSize: 12, color: BK.ink3)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Tahap booking 1..3 — mirror resolveBookingStep di web.
  int _bookingStep(BookingDetail d) {
    if (d.statusRaw == 'active' || d.statusRaw == 'ongoing' || d.statusRaw == 'completed') return 3;
    final p = d.paymentStatus;
    if (p == 'awaiting_verification' ||
        p == 'partial_paid' ||
        p == 'settled' ||
        p == 'paid' ||
        (d.depositAmount > 0 && p != 'pending') ||
        d.balanceDue <= 0) {
      return 2;
    }
    return 1;
  }

  // Kalimat langkah berikutnya — mirror resolveNextStep, disesuaikan mobile
  // (aksi inline di layar ini, bukan halaman live terpisah).
  String _nextStep(BookingDetail d) {
    final p = d.paymentStatus;
    final s = d.statusRaw;
    if (p == 'awaiting_verification') {
      return 'Tunggu admin tenant menyelesaikan verifikasi pembayaranmu.';
    }
    if (d.depositAmount > 0 && p == 'pending') {
      return d.isFullMode
          ? 'Selesaikan pembayaran penuh dulu agar sesi bisa diaktifkan tepat waktu.'
          : 'Selesaikan DP dulu agar sesi bisa diaktifkan tepat waktu.';
    }
    if (s == 'pending' || s == 'confirmed') {
      return 'Saat sudah tiba di jadwal, tekan "Mulai sesi" untuk mengaktifkan.';
    }
    if (s == 'active' || s == 'ongoing') {
      return 'Pakai tombol di bawah untuk perpanjang durasi atau mengakhiri sesi.';
    }
    if (s == 'completed' && d.balanceDue > 0) {
      return 'Sesi selesai. Lanjutkan pelunasan lewat tombol pembayaran.';
    }
    if (s == 'completed') {
      return 'Booking selesai dan tidak ada langkah yang tertinggal.';
    }
    return 'Pantau status terbaru booking di halaman ini.';
  }

  // --- Rincian pesanan ---
  Widget _itemsCard(BookingDetail d) => BKCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardTitle(Icons.receipt_long_outlined, 'Rincian'),
            const SizedBox(height: 10),
            for (final o in d.options) _lineRow(o.name, o.quantity, o.subtotal),
            for (final o in d.orders) _lineRow(o.name, o.quantity, o.subtotal),
          ],
        ),
      );

  Widget _lineRow(String name, int qty, int subtotal) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(qty > 1 ? '$name  ×$qty' : name,
                  style: const TextStyle(fontSize: 13.5, color: BK.ink)),
            ),
            const SizedBox(width: 8),
            Text('Rp${rupiah(subtotal)}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
          ],
        ),
      );

  // --- Pembayaran ---
  Widget _paymentCard(BookingDetail d) => BKCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _cardTitle(Icons.payments_outlined, 'Pembayaran'),
                const Spacer(),
                _paymentPill(d),
              ],
            ),
            const SizedBox(height: 10),
            _row('Total', 'Rp${rupiah(d.grandTotal)}', strong: true),
            if (d.depositAmount > 0 && !d.isFullMode) _row(d.depositTerm, 'Rp${rupiah(d.depositAmount)}'),
            if (d.paidAmount > 0) _row('Sudah dibayar', 'Rp${rupiah(d.paidAmount)}'),
            if (d.balanceDue > 0) _row('Sisa tagihan', 'Rp${rupiah(d.balanceDue)}', danger: true),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(11),
              decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(12)),
              child: Text(_paymentHint(d),
                  style: const TextStyle(fontSize: 12, height: 1.45, color: BK.accent)),
            ),
          ],
        ),
      );

  // Kalimat penjelas status bayar — port paymentStatusMeta.hint di web.
  String _paymentHint(BookingDetail d) {
    if (d.isPaymentSettled) return 'Pembayaran booking sudah masuk di sistem.';
    switch (d.paymentStatus) {
      case 'awaiting_verification':
        return 'Pembayaran manualmu sudah dikirim dan sedang direview admin tenant.';
      case 'partial_paid':
        return 'DP sudah tercatat. Sisa tagihan bisa dilunasi setelah sesi selesai.';
      case 'expired':
        return 'Pembayaran sebelumnya lewat batas waktu. Mulai lagi dari halaman pembayaran.';
      case 'failed':
      case 'denied':
        return 'Pembayaran belum berhasil. Coba ulangi dengan metode yang sama atau pilih metode lain.';
      case 'pending':
        return 'Selesaikan pembayaran sesuai metode yang dipilih agar booking bisa diproses.';
      default:
        return 'Status pembayaran berubah otomatis setelah kamu bayar atau admin memverifikasi.';
    }
  }

  Widget _paymentPill(BookingDetail d) {
    if (d.isPaymentSettled) return Pill.live('Lunas');
    if (d.hasPendingVerification || d.paymentStatus == 'awaiting_verification') {
      return Pill.pend('Menunggu verifikasi');
    }
    if (d.balanceDue > 0 && d.paidAmount > 0) return Pill.acc(d.paymentLabel);
    return Pill.mut(d.paymentLabel);
  }

  // --- Riwayat bukti/percobaan pembayaran ---
  Widget _attemptsCard(BookingDetail d) {
    final list = [...d.pendingAttempts, ...d.historyAttempts];
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
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Text('Rp${rupiah(a.amount)}',
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
                  if (a.scopeLabel.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Text('· ${a.scopeLabel}', style: const TextStyle(fontSize: 12, color: BK.ink3)),
                  ],
                ]),
                const SizedBox(height: 2),
                Text(a.methodLabel, style: const TextStyle(fontSize: 12, color: BK.ink2)),
                if (a.proofUrl.isNotEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Text('Bukti terlampir', style: TextStyle(fontSize: 11, color: BK.ink3)),
                  ),
                if (a.isRejected && a.adminNote.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text('Catatan: ${a.adminNote}', style: const TextStyle(fontSize: 11, color: BK.crit)),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          pill,
        ],
      ),
    );
  }

  Widget _cancelReasonCard(BookingDetail d) => BKCard(
        border: BK.critSoft,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardTitle(Icons.cancel_outlined, 'Alasan pembatalan', color: BK.crit),
            const SizedBox(height: 6),
            Text(d.cancellationReason, style: const TextStyle(fontSize: 13, color: BK.ink2)),
          ],
        ),
      );

  // --- Aksi bawah ---
  // Prioritas konteks: sesi aktif (perpanjang/selesai) > siap mulai (activate) >
  // pra-sesi (bayar/batal). Semua aksi juga di-gate ulang oleh backend.
  Widget? _actionBar(BookingDetail d) {
    if (d.isActive) return _sessionBar(d);
    if (d.canStart) {
      return _bar([
        Expanded(
          child: _primaryBtn(
            icon: Icons.play_arrow_rounded,
            label: 'Mulai sesi',
            onPressed: () => _runAction(() => context.read<CustomerBookingRepository>().activate(widget.bookingId),
                success: 'Sesi dimulai'),
          ),
        ),
      ]);
    }

    final canPay = !d.isPaymentSettled &&
        d.statusRaw != 'cancelled' &&
        d.balanceDue > 0 &&
        !d.hasPendingVerification &&
        d.paymentStatus != 'awaiting_verification';
    final canCancel = d.canCustomerCancel;
    if (!canPay && !canCancel) return null;

    return _bar([
      if (canCancel)
        Expanded(
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: BK.crit,
              side: const BorderSide(color: BK.crit),
              padding: const EdgeInsets.symmetric(vertical: 13),
            ),
            onPressed: _busy ? null : () => _confirmCancel(d),
            child: const Text('Batalkan', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
      if (canCancel && canPay) const SizedBox(width: 10),
      if (canPay)
        Expanded(
          flex: 2,
          child: _primaryBtn(
            icon: Icons.payments_outlined,
            label: 'Lanjutkan pembayaran',
            onPressed: _openPayment,
          ),
        ),
    ]);
  }

  Widget _sessionBar(BookingDetail d) => _bar([
        Expanded(
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: BK.accent,
              side: const BorderSide(color: BK.accent),
              padding: const EdgeInsets.symmetric(vertical: 13),
            ),
            onPressed: _busy ? null : () => _confirmExtend(d),
            icon: const Icon(Icons.more_time, size: 18),
            label: const Text('Perpanjang', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          flex: 2,
          child: _primaryBtn(
            icon: Icons.stop_circle_outlined,
            label: 'Selesai sesi',
            onPressed: () => _confirmComplete(d),
          ),
        ),
      ]);

  Widget _bar(List<Widget> children) => SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Row(children: children),
      );

  Widget _primaryBtn({required IconData icon, required String label, required VoidCallback onPressed}) =>
      FilledButton.icon(
        style: FilledButton.styleFrom(
          backgroundColor: BK.accent,
          padding: const EdgeInsets.symmetric(vertical: 13),
        ),
        onPressed: _busy ? null : onPressed,
        icon: Icon(icon, size: 18),
        label: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      );

  Future<void> _openPayment() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => CustomerPaymentScreen(bookingId: widget.bookingId)),
    );
    if (mounted) await _refresh();
  }

  /// Jalankan satu aksi mutasi: set busy, tampilkan snackbar sukses/gagal, lalu
  /// refresh detail. Dipakai activate/complete/extend/cancel agar seragam.
  Future<void> _runAction(Future<void> Function() op, {required String success}) async {
    setState(() => _busy = true);
    try {
      await op();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(success)));
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

  Future<void> _confirmCancel(BookingDetail d) async {
    final reason = await _askCancel(d.cancelRequireReason);
    if (reason == null || !mounted) return; // urung
    final repo = context.read<CustomerBookingRepository>();
    await _runAction(() => repo.cancel(widget.bookingId, reason: reason), success: 'Booking dibatalkan');
  }

  Future<void> _confirmComplete(BookingDetail d) async {
    final ok = await _confirmDialog(
      title: 'Selesaikan sesi?',
      body: d.balanceDue > 0
          ? 'Sisa tagihan Rp${rupiah(d.balanceDue)} akan ditagihkan untuk pelunasan.'
          : 'Sesi akan ditutup.',
      confirmLabel: 'Selesai',
    );
    if (ok != true || !mounted) return;
    final repo = context.read<CustomerBookingRepository>();
    await _runAction(() => repo.complete(widget.bookingId), success: 'Sesi selesai');
  }

  Future<void> _confirmExtend(BookingDetail d) async {
    final repo = context.read<CustomerBookingRepository>();
    final units = await showModalBottomSheet<int>(
      context: context,
      backgroundColor: BK.bg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => ExtendSheet(detail: d, loadBusy: (date) => repo.availability(widget.bookingId, date)),
    );
    if (units == null || units <= 0 || !mounted) return;
    await _runAction(() => repo.extend(widget.bookingId, units), success: 'Durasi diperpanjang');
  }

  Future<bool?> _confirmDialog({
    required String title,
    required String body,
    required String confirmLabel,
  }) =>
      showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: BK.card,
          title: Text(title),
          content: Text(body, style: const TextStyle(fontSize: 13, color: BK.ink2)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Urung')),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: BK.accent),
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(confirmLabel),
            ),
          ],
        ),
      );

  /// Dialog konfirmasi batal. Return null = urung; string (bisa kosong bila tak
  /// wajib) = lanjut batalkan. Kalau [requireReason], teks wajib diisi.
  Future<String?> _askCancel(bool requireReason) {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) {
        String? err;
        return StatefulBuilder(
          builder: (ctx, setLocal) => AlertDialog(
            backgroundColor: BK.card,
            title: const Text('Batalkan booking?'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Tindakan ini tidak bisa dibatalkan.', style: TextStyle(fontSize: 13, color: BK.ink2)),
                const SizedBox(height: 12),
                TextField(
                  controller: ctrl,
                  maxLines: 3,
                  minLines: 1,
                  decoration: InputDecoration(
                    hintText: requireReason ? 'Alasan pembatalan (wajib)' : 'Alasan (opsional)',
                    errorText: err,
                    border: const OutlineInputBorder(),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Urung')),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: BK.crit),
                onPressed: () {
                  final text = ctrl.text.trim();
                  if (requireReason && text.isEmpty) {
                    setLocal(() => err = 'Alasan wajib diisi');
                    return;
                  }
                  Navigator.pop(ctx, text);
                },
                child: const Text('Batalkan booking'),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- helpers ---
  Widget _cardTitle(IconData icon, String title, {Color color = BK.ink2}) => Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(title, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: color)),
        ],
      );

  Widget _row(String k, String v, {bool strong = false, bool danger = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Text(k, style: const TextStyle(fontSize: 13, color: BK.ink2))),
            const SizedBox(width: 8),
            Text(
              v,
              style: TextStyle(
                fontSize: strong ? 15 : 13.5,
                fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
                color: danger ? BK.crit : BK.ink,
              ),
            ),
          ],
        ),
      );
}
