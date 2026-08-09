import 'package:flutter/foundation.dart';
import '../models/customer.dart';
import '../repositories/customers_repository.dart';
import 'async_value.dart';

class CustomersController extends ChangeNotifier {
  CustomersController(this._repo);
  final CustomersRepository _repo;

  AsyncValue<List<Customer>> _state = const AsyncValue.loading();
  AsyncValue<List<Customer>> get state => _state;

  String query = '';

  List<Customer> get filtered {
    final all = _state.data ?? const [];
    if (query.trim().isEmpty) return all;
    final q = query.toLowerCase();
    return all.where((c) => c.name.toLowerCase().contains(q) || c.phone.contains(q)).toList();
  }

  int get total => (_state.data ?? const []).length;

  void search(String q) {
    query = q;
    notifyListeners();
  }

  Future<void> load() async {
    _state = const AsyncValue.loading();
    notifyListeners();
    try {
      _state = AsyncValue.data(await _repo.list());
    } catch (e) {
      _state = AsyncValue.error(e);
    }
    notifyListeners();
  }
}
