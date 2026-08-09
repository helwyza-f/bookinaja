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
}
