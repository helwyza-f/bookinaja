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
  String query = ''; // cari nama / kode

  List<Booking> get filtered {
    final all = _state.data ?? const [];
    final byFilter = switch (filter) {
      1 => all.where((b) =>
          b.status == BookingStatus.review ||
          b.status == BookingStatus.pending ||
          b.status == BookingStatus.dp),
      2 => all.where((b) => b.status == BookingStatus.live),
      3 => all.where((b) => b.status == BookingStatus.paid),
      _ => all,
    };
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return byFilter.toList();
    return byFilter
        .where((b) => b.customer.toLowerCase().contains(q) || b.code.toLowerCase().contains(q))
        .toList();
  }

  void setFilter(int f) {
    filter = f;
    notifyListeners();
  }

  void setQuery(String q) {
    query = q;
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
