import 'package:flutter/foundation.dart';
import '../models/customer_booking.dart';
import '../repositories/customer_booking_repository.dart';
import 'async_value.dart';

/// State layar "Booking Saya": daftar aktif & riwayat (read-only, Fase 1).
class MyBookingsController extends ChangeNotifier {
  MyBookingsController(this._repo);
  final CustomerBookingRepository _repo;

  AsyncValue<List<CustomerBookingItem>> _active = const AsyncValue.loading();
  AsyncValue<List<CustomerBookingItem>> _history = const AsyncValue.loading();

  AsyncValue<List<CustomerBookingItem>> get active => _active;
  AsyncValue<List<CustomerBookingItem>> get history => _history;

  Future<void> loadActive() async {
    _active = const AsyncValue.loading();
    notifyListeners();
    try {
      _active = AsyncValue.data(await _repo.active());
    } catch (e) {
      _active = AsyncValue.error(e);
    }
    notifyListeners();
  }

  Future<void> loadHistory() async {
    _history = const AsyncValue.loading();
    notifyListeners();
    try {
      _history = AsyncValue.data(await _repo.history());
    } catch (e) {
      _history = AsyncValue.error(e);
    }
    notifyListeners();
  }

  Future<void> loadAll() => Future.wait([loadActive(), loadHistory()]);

  Future<void> refresh() => loadAll();
}
