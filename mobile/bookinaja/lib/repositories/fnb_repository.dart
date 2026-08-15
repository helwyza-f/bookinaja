import '../api/api_client.dart';
import '../models/fnb_item.dart';

/// Kelola menu F&B tenant. Endpoint admin: /fnb (owner/staff dengan
/// permission fnb.*).
class FnbRepository {
  FnbRepository(this._api);
  final ApiClient _api;

  Future<List<FnbItem>> list({String query = ''}) async {
    final q = query.trim().isEmpty ? '' : '?q=${Uri.encodeQueryComponent(query.trim())}';
    final res = await _api.get('/fnb$q');
    final list = res is List ? res : (res is Map && res['items'] is List ? res['items'] as List : const []);
    return list
        .whereType<Map>()
        .map((e) => FnbItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<FnbItem> create(FnbItem item) async {
    final res = await _api.post('/fnb', body: item.toInput());
    return FnbItem.fromJson(Map<String, dynamic>.from(res as Map));
  }

  Future<FnbItem> update(String id, FnbItem item) async {
    final res = await _api.put('/fnb/$id', body: item.toInput());
    return FnbItem.fromJson(Map<String, dynamic>.from(res as Map));
  }

  Future<void> delete(String id) async {
    await _api.delete('/fnb/$id');
  }

  /// Upload foto item — kembalikan URL publik. Reuse endpoint media umum.
  Future<String> uploadImage(String filePath) async {
    final res = await _api.uploadFile('/admin/upload-media', filePath);
    if (res is Map && res['url'] != null) return '${res['url']}';
    if (res is Map && res['data'] is Map && (res['data'] as Map)['url'] != null) {
      return '${(res['data'] as Map)['url']}';
    }
    throw ApiException(0, 'Upload gagal: URL tidak diterima.');
  }
}
