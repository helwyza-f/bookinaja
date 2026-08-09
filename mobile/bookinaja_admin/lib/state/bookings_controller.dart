import 'package:flutter/foundation.dart';
import '../models/booking.dart';
import '../repositories/booking_repository.dart';
import 'async_value.dart';

/// Memuat & menyaring daftar booking.
class BookingsController extends ChangeNotifier {
  BookingsController(this._repo);
  final BookingRepository _repo;

  AsyncValue<List<Booking>> _state = const AsyncValue.loading();
  AsyncValue<List<Booking>> get state => _state;

  int filter = 0; // 0 semua, 1 perlu aksi, 2 aktif, 3 lunas

  List<Booking> get filtered {
    final all = _state.data ?? const [];
    switch (filter) {
      case 1:
        return all.where((b) =>
            b.status == BookingStatus.review ||
            b.status == BookingStatus.pending ||
            b.status == BookingStatus.dp).toList();
      case 2:
        return all.where((b) => b.status == BookingStatus.live).toList();
      case 3:
        return all.where((b) => b.status == BookingStatus.paid).toList();
      default:
        return all;
    }
  }

  void setFilter(int f) {
    filter = f;
    notifyListeners();
  }

  /// Sisipkan booking baru di atas daftar (dipakai flow buat booking / demo).
  void addLocal(Booking b) {
    final current = List<Booking>.from(_state.data ?? const []);
    current.insert(0, b);
    _state = AsyncValue.data(current);
    notifyListeners();
  }

  Future<void> load() async {
    _state = const AsyncValue.loading();
    notifyListeners();
    try {
      _state = AsyncValue.data(await _repo.listAll());
    } catch (e) {
      _state = AsyncValue.error(e);
    }
    notifyListeners();
  }
}
