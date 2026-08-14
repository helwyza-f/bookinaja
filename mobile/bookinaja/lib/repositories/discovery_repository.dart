import '../api/api_client.dart';
import '../models/catalog.dart';
import '../models/discovery.dart';

/// Discovery publik (tanpa auth): daftar tenant & profil lengkap untuk sisi
/// pelanggan. Memakai endpoint `/public/*` — tidak butuh konteks tenant aktif.
class DiscoveryRepository {
  DiscoveryRepository(this._api);
  final ApiClient _api;

  /// GET /public/tenants → {items:[...]}. Direktori tenant untuk layar Discover.
  Future<List<TenantDirectoryItem>> listTenants() async {
    final res = await _api.get('/public/tenants');
    final list = (res is Map && res['items'] is List)
        ? res['items'] as List
        : (res is List ? res : const []);
    return list
        .whereType<Map>()
        .map((e) => TenantDirectoryItem.fromJson(Map<String, dynamic>.from(e)))
        .where((t) => t.slug.isNotEmpty)
        .toList();
  }

  /// GET /public/landing?slug=X → {profile, resources}. Profil tenant + katalog
  /// resource/paket untuk layar TenantProfile.
  Future<TenantProfile> tenantProfile(String slug) async {
    final res = await _api.get(
      '/public/landing?slug=${Uri.encodeQueryComponent(slug)}',
    );
    return TenantProfile.fromLanding(Map<String, dynamic>.from(res as Map));
  }

  /// GET /public/resources/:id → detail resource untuk layar detail unit.
  Future<Map<String, dynamic>> resourceDetail(String id) async {
    final res = await _api.get('/public/resources/${Uri.encodeComponent(id)}');
    return Map<String, dynamic>.from(res as Map);
  }

  /// GET /guest/availability/:resource_id?date=YYYY-MM-DD → busy slots.
  Future<List<BusySlot>> resourceAvailability(String id, DateTime date) async {
    final d =
        '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    final res = await _api.get(
      '/guest/availability/${Uri.encodeComponent(id)}?date=$d',
    );
    final slots = (res is Map && res['busy_slots'] is List)
        ? res['busy_slots'] as List
        : const [];
    return slots
        .whereType<Map>()
        .map((e) => BusySlot.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}
