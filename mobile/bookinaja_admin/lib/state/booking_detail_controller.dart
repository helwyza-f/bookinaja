import 'package:flutter/foundation.dart';
import '../models/booking_detail.dart';
import '../repositories/booking_repository.dart';
import 'async_value.dart';

/// Detail satu booking + aksi operasional (start/end/confirm/cancel/DP/lunas).
class BookingDetailController extends ChangeNotifier {
  BookingDetailController(this._repo, this.bookingId) {
    load();
  }
  final BookingRepository _repo;
  final String bookingId;

  AsyncValue<BookingDetail> state = const AsyncValue.loading();
  bool acting = false;
  String? actionError;
  bool changed = false; // true kalau ada aksi sukses → daftar perlu refresh

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
  Future<bool> addFnb(String fnbItemId, int qty) => _act(() => _repo.addFnb(bookingId, fnbItemId, qty));
  Future<bool> addAddon(String itemId) => _act(() => _repo.addAddon(bookingId, itemId));
}
