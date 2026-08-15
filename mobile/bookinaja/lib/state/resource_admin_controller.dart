import 'package:flutter/foundation.dart';
import '../models/admin_resource.dart';
import '../repositories/resource_admin_repository.dart';
import 'async_value.dart';

/// State daftar resource — muat, toggle aktif/nonaktif, hapus.
class ResourcesController extends ChangeNotifier {
  ResourcesController(this._repo) {
    load();
  }
  final ResourceAdminRepository _repo;

  AsyncValue<List<ResourceListItem>> state = const AsyncValue.loading();
  String? error;
  final Set<String> _busy = {}; // id yang sedang diproses (toggle)

  List<ResourceListItem> get items => state.data ?? const [];
  bool isBusy(String id) => _busy.contains(id);

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      state = AsyncValue.data(await _repo.list());
    } catch (e) {
      state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  /// Toggle Aktif/Nonaktif. Fetch detail dulu agar PUT tak menghapus field lain
  /// (backend Update menimpa kolom yang dikirim).
  Future<bool> toggleStatus(ResourceListItem item) async {
    if (_busy.contains(item.id)) return false;
    _busy.add(item.id);
    error = null;
    notifyListeners();
    try {
      final detail = await _repo.detail(item.id);
      final next = detail.isActive ? kStatusInactive : kStatusActive;
      await _repo.setStatus(detail, next);
      _replaceLocal(ResourceListItem(
        id: item.id,
        name: item.name,
        category: item.category,
        status: next,
        operatingMode: item.operatingMode,
        imageUrl: item.imageUrl,
        description: item.description,
        mainOptionCount: item.mainOptionCount,
        addonCount: item.addonCount,
      ));
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      _busy.remove(item.id);
      notifyListeners();
    }
  }

  Future<bool> remove(String id) async {
    error = null;
    try {
      await _repo.delete(id);
      state = AsyncValue.data(items.where((e) => e.id != id).toList());
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  void _replaceLocal(ResourceListItem item) {
    if (!state.hasData) return;
    state = AsyncValue.data([
      for (final e in items) if (e.id == item.id) item else e,
    ]);
  }
}

/// State layar detail/edit satu resource — data utama + items (opsi & addon).
class ResourceDetailController extends ChangeNotifier {
  ResourceDetailController(this._repo, this._id) {
    load();
  }
  final ResourceAdminRepository _repo;
  final String _id;

  AsyncValue<AdminResource> state = const AsyncValue.loading();
  bool saving = false;
  String? error;

  AdminResource? get resource => state.data;

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      state = AsyncValue.data(await _repo.detail(_id));
    } catch (e) {
      state = AsyncValue.error(e);
    }
    notifyListeners();
  }

  /// Simpan perubahan data utama (nama, kategori, deskripsi, status, dsb.).
  Future<bool> saveBasics(AdminResource next) async {
    saving = true;
    error = null;
    notifyListeners();
    try {
      await _repo.update(next);
      state = AsyncValue.data(next);
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<bool> toggleActive() async {
    final r = resource;
    if (r == null) return false;
    return saveBasics(r.copyWith(status: r.isActive ? kStatusInactive : kStatusActive));
  }

  /// Tambah atau update item (opsi harga / addon).
  Future<bool> saveItem(ResourceItem item) async {
    final r = resource;
    if (r == null) return false;
    error = null;
    try {
      ResourceItem saved;
      if (item.id.isEmpty) {
        saved = await _repo.addItem(r.id, item);
      } else {
        await _repo.updateItem(item);
        saved = item;
      }
      // Bila item ini di-set default, item lain di tipe yang sama tidak lagi default.
      final list = <ResourceItem>[];
      var replaced = false;
      for (final e in r.items) {
        if (e.id == saved.id) {
          list.add(saved);
          replaced = true;
        } else if (saved.isDefault && e.isMain == saved.isMain) {
          list.add(e.copyWith(isDefault: false));
        } else {
          list.add(e);
        }
      }
      if (!replaced) list.add(saved);
      state = AsyncValue.data(r.copyWith(items: list));
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteItem(String itemId) async {
    final r = resource;
    if (r == null) return false;
    error = null;
    try {
      await _repo.deleteItem(itemId);
      state = AsyncValue.data(r.copyWith(items: r.items.where((e) => e.id != itemId).toList()));
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<String> uploadCover(String filePath) => _repo.uploadCover(filePath);
}
