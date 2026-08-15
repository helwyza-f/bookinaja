import '../api/api_client.dart';
import '../models/admin_resource.dart';

/// Kelola resource (unit yang dibooking) sisi tenant. Membuat resource cukup
/// nama; opsi harga & addon ditambah terpisah lewat endpoint items.
class ResourceAdminRepository {
  ResourceAdminRepository(this._api);
  final ApiClient _api;

  /// Daftar ringkas untuk list — termasuk jumlah opsi & addon.
  Future<List<ResourceListItem>> list() async {
    final res = await _api.get('/admin/resources/list');
    final items = (res is Map && res['items'] is List)
        ? res['items'] as List
        : (res is List ? res : const []);
    return items
        .whereType<Map>()
        .map((e) => ResourceListItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Detail + items.
  Future<AdminResource> detail(String id) async {
    final res = await _api.get('/resources-all/$id');
    return AdminResource.fromJson(Map<String, dynamic>.from(res as Map));
  }

  /// Buat resource baru — hanya butuh nama; sisanya opsional.
  Future<AdminResource> create({
    required String name,
    String category = '',
    String description = '',
    String imageUrl = '',
    String operatingMode = '',
  }) async {
    final res = await _api.post('/resources-all', body: {
      'name': name,
      'category': category,
      'description': description,
      'image_url': imageUrl,
      'operating_mode': operatingMode,
    });
    return AdminResource.fromJson(Map<String, dynamic>.from(res as Map));
  }

  /// Update data utama (nama, status, DP, deskripsi, dst.).
  Future<void> update(AdminResource resource) async {
    await _api.put('/resources-all/${resource.id}', body: resource.toUpdateJson());
  }

  Future<void> delete(String id) async {
    await _api.delete('/resources-all/$id');
  }

  /// Ubah status cepat (Aktif/Nonaktif) tanpa mengirim seluruh objek besar —
  /// tetap lewat PUT data utama agar konsisten dengan backend.
  Future<void> setStatus(AdminResource resource, String status) async {
    await update(resource.copyWith(status: status));
  }

  // --- Items (opsi harga & addon) ---

  Future<ResourceItem> addItem(String resourceId, ResourceItem item) async {
    final res = await _api.post('/resources-all/$resourceId/items', body: item.toInput());
    return ResourceItem.fromJson(Map<String, dynamic>.from(res as Map));
  }

  Future<void> updateItem(ResourceItem item) async {
    await _api.put('/resources-all/items/${item.id}', body: item.toInput());
  }

  Future<void> deleteItem(String itemId) async {
    await _api.delete('/resources-all/items/$itemId');
  }

  /// Upload foto cover — kembalikan URL.
  Future<String> uploadCover(String filePath) async {
    final res = await _api.uploadFile('/resources-all/upload-cover', filePath);
    if (res is Map && res['url'] != null) return '${res['url']}';
    throw ApiException(0, 'Upload gagal: URL tidak diterima.');
  }
}
