import 'package:flutter/foundation.dart';
import '../models/cancellation_policy.dart';
import '../repositories/settings_repository.dart';
import 'async_value.dart';

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
