import 'package:flutter/foundation.dart';
import '../models/discovery.dart';
import '../repositories/discovery_repository.dart';
import 'async_value.dart';

/// State layar Discover: daftar tenant + pencarian sederhana (nama/kategori/tag).
class DiscoveryController extends ChangeNotifier {
  DiscoveryController(this._repo);
  final DiscoveryRepository _repo;

  AsyncValue<List<TenantDirectoryItem>> _state = const AsyncValue.loading();
  String _query = '';

  AsyncValue<List<TenantDirectoryItem>> get state => _state;
  String get query => _query;

  List<TenantDirectoryItem> get visible {
    final all = _state.data ?? const [];
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return all;
    return all.where((t) {
      if (t.name.toLowerCase().contains(q)) return true;
      if (t.businessCategory.toLowerCase().contains(q)) return true;
      return t.tags.any((tag) => tag.toLowerCase().contains(q));
    }).toList();
  }

  void setQuery(String v) {
    _query = v;
    notifyListeners();
  }

  Future<void> load() async {
    _state = const AsyncValue.loading();
    notifyListeners();
    try {
      _state = AsyncValue.data(await _repo.listTenants());
    } catch (e) {
      _state = AsyncValue.error(e);
    }
    notifyListeners();
  }
}
