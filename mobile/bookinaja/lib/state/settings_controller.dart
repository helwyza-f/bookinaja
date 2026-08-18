import 'package:flutter/foundation.dart';
import '../models/cancellation_policy.dart';
import '../models/payment_method.dart';
import '../repositories/settings_repository.dart';
import 'async_value.dart';

/// State layar Metode Pembayaran — muat daftar, edit lokal, simpan sekaligus.
class PaymentMethodsController extends ChangeNotifier {
  PaymentMethodsController(this._repo) {
    load();
  }
  final SettingsRepository _repo;

  AsyncValue<List<PaymentMethod>> state = const AsyncValue.loading();
  bool saving = false;
  String? error;

  List<PaymentMethod> get items => state.data ?? const [];

  /// Apakah payment gateway tenant sudah di-setup. Fitur setup gateway
  /// (Midtrans/Xendit) belum tersedia → selalu false untuk sekarang, sehingga
  /// metode berbasis gateway belum bisa diaktifkan. Nanti disambungkan ke
  /// status konfigurasi gateway tenant.
  bool get gatewayReady => false;

  /// Upload gambar (QR QRIS) → URL publik.
  Future<String> uploadImage(String filePath) => _repo.uploadImage(filePath);

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      state = AsyncValue.data(await _repo.getPaymentMethods());
    } catch (e) {
      state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  /// Ganti satu metode di daftar lokal (tanpa simpan).
  void editAt(int index, PaymentMethod method) {
    final list = [...items];
    if (index < 0 || index >= list.length) return;
    list[index] = method;
    state = AsyncValue.data(list);
    notifyListeners();
  }

  Future<bool> save() async {
    if (!state.hasData) return false;
    saving = true;
    error = null;
    notifyListeners();
    try {
      state = AsyncValue.data(await _repo.savePaymentMethods(items));
      saving = false;
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      saving = false;
      notifyListeners();
      return false;
    }
  }
}

class CancellationSettingsController extends ChangeNotifier {
  CancellationSettingsController(this._repo) {
    load();
  }
  final SettingsRepository _repo;

  AsyncValue<CancellationPolicy> state = const AsyncValue.loading();
  bool saving = false;
  String? error;

  CancellationPolicy? get policy => state.data;

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      state = AsyncValue.data(await _repo.getCancellation());
    } catch (e) {
      state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  /// Ubah field lokal tanpa simpan (biar UI responsif).
  void edit(CancellationPolicy p) {
    state = AsyncValue.data(p);
    notifyListeners();
  }

  Future<bool> save() async {
    final p = state.data;
    if (p == null) return false;
    saving = true;
    error = null;
    notifyListeners();
    try {
      state = AsyncValue.data(await _repo.saveCancellation(p));
      saving = false;
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      saving = false;
      notifyListeners();
      return false;
    }
  }
}
