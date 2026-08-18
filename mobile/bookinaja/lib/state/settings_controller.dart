import 'package:flutter/foundation.dart';
import '../models/cancellation_policy.dart';
import '../models/payment_gateway.dart';
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

  /// Konfigurasi gateway tenant (BYO). Dimuat bareng daftar metode; menentukan
  /// apakah metode berbasis gateway bisa diaktifkan.
  PaymentGateway gateway = const PaymentGateway();

  List<PaymentMethod> get items => state.data ?? const [];

  /// Payment gateway tenant sudah di-setup (kredensial lengkap) → metode
  /// berbasis gateway boleh diaktifkan.
  bool get gatewayReady => gateway.configured;

  /// Upload gambar (QR QRIS) → URL publik.
  Future<String> uploadImage(String filePath) => _repo.uploadImage(filePath);

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      // Ambil metode & status gateway bersamaan; gateway opsional (jangan
      // gagalkan layar bila endpoint gateway error).
      final methods = await _repo.getPaymentMethods();
      try {
        gateway = await _repo.getPaymentGateway();
      } catch (_) {
        gateway = const PaymentGateway();
      }
      state = AsyncValue.data(methods);
    } catch (e) {
      state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  /// Muat ulang hanya status gateway (mis. setelah kembali dari layar setup).
  Future<void> refreshGateway() async {
    try {
      gateway = await _repo.getPaymentGateway();
      notifyListeners();
    } catch (_) {}
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
