import 'package:flutter/foundation.dart';
import '../models/resource_status.dart';
import '../repositories/ops_repository.dart';
import 'async_value.dart';

class OpsController extends ChangeNotifier {
  OpsController(this._repo);
  final OpsRepository _repo;

  AsyncValue<List<ResourceStatus>> _state = const AsyncValue.loading();
  AsyncValue<List<ResourceStatus>> get state => _state;

  bool acting = false;
  String? actionError;

  int get liveCount => (_state.data ?? const []).where((r) => r.state == ResourceState.live).length;
  int get total => (_state.data ?? const []).length;

  /// Aktifkan resource off → active, lalu muat ulang.
  Future<bool> setActive(String resourceId) async {
    acting = true;
    actionError = null;
    notifyListeners();
    try {
      await _repo.setResourceActive(resourceId);
      await load();
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

  Future<void> load() async {
    _state = const AsyncValue.loading();
    notifyListeners();
    try {
      _state = AsyncValue.data(await _repo.resources());
    } catch (e) {
      _state = AsyncValue.error(e);
    }
    notifyListeners();
  }
}
