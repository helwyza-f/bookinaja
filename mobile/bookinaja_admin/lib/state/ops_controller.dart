import 'package:flutter/foundation.dart';
import '../models/resource_status.dart';
import '../repositories/ops_repository.dart';
import 'async_value.dart';

class OpsController extends ChangeNotifier {
  OpsController(this._repo);
  final OpsRepository _repo;

  AsyncValue<List<ResourceStatus>> _state = const AsyncValue.loading();
  AsyncValue<List<ResourceStatus>> get state => _state;

  int get liveCount => (_state.data ?? const []).where((r) => r.state == ResourceState.live).length;
  int get total => (_state.data ?? const []).length;

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
