import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/booking_detail.dart';
import '../realtime/realtime_bus.dart';
import '../realtime/realtime_event.dart';
import '../repositories/booking_repository.dart';
import 'async_value.dart';

/// Detail satu booking + aksi operasional (start/end/confirm/cancel/DP/lunas).
class BookingDetailController extends ChangeNotifier {
  BookingDetailController(this._repo, this.bookingId) {
    _realtimeSub = RealtimeBus.instance.events.listen(_onRealtimeEvent);
    load();
  }
  final BookingRepository _repo;
  final String bookingId;

  AsyncValue<BookingDetail> state = const AsyncValue.loading();
  bool acting = false;
  String? actionError;
  bool changed = false; // true kalau ada aksi sukses → daftar perlu refresh
  StreamSubscription<RealtimeEvent>? _realtimeSub;
  Timer? _refreshDebounce;

  BookingDetail? get detail => state.data;

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      state = AsyncValue.data(await _repo.getDetail(bookingId));
    } catch (e) {
      state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  void _onRealtimeEvent(RealtimeEvent event) {
    final type = event.type.toLowerCase();
    if (type.isEmpty) return;
    if (!(type.startsWith('booking.') || type.startsWith('payment.') || type.startsWith('session.') || type.startsWith('order.'))) return;
    final id = '${event.refs['booking_id'] ?? event.entityId ?? ''}'.trim();
    if (id.isEmpty || id != bookingId) return;
    // Patch skalar (status/pembayaran/total) untuk update instan bila memungkinkan.
    if (_patchLocal(event)) {
      notifyListeners();
    }
    // Selalu reload penuh (silent) untuk merekonsiliasi koleksi bersarang:
    // rincian order, attempt bukti bayar, dan timeline tidak terbawa di summary
    // event sehingga hanya bisa didapat dari server.
    _scheduleReload();
  }

  bool _patchLocal(RealtimeEvent event) {
    final current = state.data;
    if (current == null) return false;
    final summary = event.summary;
    final status = '${summary['status'] ?? ''}'.trim().toLowerCase();
    final payment = '${summary['payment_status'] ?? ''}'.trim().toLowerCase();
    if (status.isEmpty && payment.isEmpty) return false;

    state = AsyncValue.data(
      BookingDetail(
        id: current.id,
        resourceId: current.resourceId,
        statusRaw: status.isNotEmpty ? status : current.statusRaw,
        paymentStatus: payment.isNotEmpty ? payment : current.paymentStatus,
        customerName: '${summary['customer_name'] ?? summary['customer'] ?? current.customerName}',
        customerPhone: '${summary['customer_phone'] ?? current.customerPhone}',
        resourceName: '${summary['resource_name'] ?? summary['resource'] ?? current.resourceName}',
        startTime: '${summary['start_time'] ?? current.startTime}',
        endTime: '${summary['end_time'] ?? current.endTime}',
        grandTotal: _intOf(summary['grand_total'] ?? summary['total'], current.grandTotal),
        paidAmount: _intOf(summary['paid_amount'] ?? summary['paid'], current.paidAmount),
        balanceDue: _intOf(summary['balance_due'], current.balanceDue),
        depositAmount: _intOf(summary['deposit_amount'], current.depositAmount),
        unitPrice: current.unitPrice,
        unitDurationMin: current.unitDurationMin,
        depositOverrideActive: summary['deposit_override_active'] == true ? true : current.depositOverrideActive,
        depositOverrideReason: '${summary['deposit_override_reason'] ?? current.depositOverrideReason}',
        depositOverrideBy: '${summary['deposit_override_by'] ?? current.depositOverrideBy}',
        cancellationReason: '${summary['cancellation_reason'] ?? current.cancellationReason}',
        paymentMode: '${summary['payment_mode'] ?? current.paymentMode}'.toLowerCase(),
        enableFnb: current.enableFnb,
        enableAddons: current.enableAddons,
        attempts: current.attempts,
        orders: current.orders,
        options: current.options,
        events: current.events,
        paymentMethods: current.paymentMethods,
      ),
    );
    return true;
  }

  void _scheduleReload() {
    _refreshDebounce?.cancel();
    _refreshDebounce = Timer(const Duration(milliseconds: 350), _silentReload);
  }

  /// Reload detail dari server tanpa mengubah state ke loading, agar tidak
  /// memunculkan spinner saat rekonsiliasi realtime. Data lama dipertahankan
  /// bila reload gagal.
  Future<void> _silentReload() async {
    try {
      state = AsyncValue.data(await _repo.getDetail(bookingId));
      notifyListeners();
    } catch (_) {
      // pertahankan data saat ini bila reload gagal
    }
  }

  int _intOf(dynamic v, int fallback) {
    if (v is num) return v.round();
    return int.tryParse('$v') ?? fallback;
  }

  Future<bool> _act(Future<void> Function() op) async {
    acting = true;
    actionError = null;
    notifyListeners();
    try {
      await op();
      changed = true;
      await load(); // ambil status terbaru
      acting = false;
      notifyListeners();
      return true;
    } catch (e) {
      actionError = e.toString();
      acting = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> confirm() => _act(() => _repo.updateStatus(bookingId, 'confirmed'));
  Future<bool> start() => _act(() => _repo.updateStatus(bookingId, 'active'));
  Future<bool> end() => _act(() => _repo.updateStatus(bookingId, 'completed'));
  Future<bool> cancel({String reason = ''}) => _act(() => _repo.updateStatus(bookingId, 'cancelled', reason: reason));
  Future<bool> recordDeposit() => _act(() => _repo.recordDeposit(bookingId));
  Future<bool> settle() => _act(() => _repo.settleCash(bookingId));
  Future<bool> overrideDeposit({String reason = ''}) => _act(() => _repo.overrideDeposit(bookingId, reason: reason));
  Future<bool> verifyAttempt(String attemptId) => _act(() => _repo.verifyAttempt(attemptId));
  Future<bool> rejectAttempt(String attemptId, {String reason = ''}) => _act(() => _repo.rejectAttempt(attemptId, reason: reason));
  Future<bool> sendReceipt() => _act(() => _repo.sendReceipt(bookingId));
  Future<bool> submitManualPayment({required String scope, required String method, String proofUrl = '', String note = ''}) =>
      _act(() => _repo.submitManualPayment(bookingId, scope: scope, method: method, proofUrl: proofUrl, note: note));

  /// Upload bukti (tidak mengubah state booking) → kembalikan URL, atau null jika gagal.
  Future<String?> uploadProof(String filePath) async {
    try {
      return await _repo.uploadPaymentProof(bookingId, filePath);
    } catch (e) {
      actionError = e.toString();
      notifyListeners();
      return null;
    }
  }
  Future<bool> extend(int units) => _act(() => _repo.extendSession(bookingId, units));

  /// Tambah beberapa F&B sekaligus (satu reload). items: (id, qty>0).
  Future<bool> addFnbItems(List<({String id, int qty})> items) => _act(() async {
        for (final it in items) {
          if (it.qty > 0) await _repo.addFnb(bookingId, it.id, it.qty);
        }
      });

  /// Tambah beberapa add-on sekaligus. Endpoint hanya terima 1/item → loop qty.
  Future<bool> addAddonItems(List<({String id, int qty})> items) => _act(() async {
        for (final it in items) {
          for (int i = 0; i < it.qty; i++) {
            await _repo.addAddon(bookingId, it.id);
          }
        }
      });

  @override
  void dispose() {
    _refreshDebounce?.cancel();
    _realtimeSub?.cancel();
    super.dispose();
  }
}
