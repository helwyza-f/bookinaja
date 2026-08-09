import '../api/api_client.dart';
import '../config.dart';
import '../models/catalog.dart';

/// Katalog resource + ketersediaan slot, untuk flow buat booking.
class CatalogRepository {
  CatalogRepository(this._api);
  final ApiClient _api;

  static int _money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;

  /// GET /admin/resources/pricing-catalog → resource + paket-paketnya.
  Future<List<ResourceEntry>> pricingCatalog() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return _demoResources;
    }
    final res = await _api.get('/admin/resources/pricing-catalog');
    final resources = _asList(res);
    final out = <ResourceEntry>[];
    for (final r in resources.whereType<Map>()) {
      final rid = '${r['resource_id'] ?? ''}';
      final rname = '${r['resource_name'] ?? '-'}';
      final packages = <ResourcePackage>[];
      for (final m in _asList(r['main_items']).whereType<Map>()) {
        packages.add(ResourcePackage(
          resourceId: rid,
          resourceName: rname,
          itemId: '${m['id'] ?? ''}',
          name: '${m['name'] ?? 'Paket'}',
          price: _money(m['price']),
          unitDuration: (m['unit_duration'] is num) ? (m['unit_duration'] as num).toInt() : 60,
          priceUnit: '${m['price_unit'] ?? 'hour'}',
        ));
      }
      if (packages.isEmpty) continue; // resource tanpa paket tak bisa dibooking
      out.add(ResourceEntry(
        resourceId: rid,
        resourceName: rname,
        category: '${r['category'] ?? ''}',
        status: '${r['status'] ?? ''}',
        packages: packages,
      ));
    }
    return out;
  }

  /// GET /admin/resources/addons-catalog → addon per resource.
  Future<List<Addon>> addonsCatalog() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      return _demoAddons;
    }
    final res = await _api.get('/admin/resources/addons-catalog');
    final resources = _asList(res);
    final out = <Addon>[];
    for (final r in resources.whereType<Map>()) {
      final rid = '${r['resource_id'] ?? ''}';
      for (final a in _asList(r['addons']).whereType<Map>()) {
        out.add(Addon(resourceId: rid, itemId: '${a['id'] ?? ''}', name: '${a['name'] ?? 'Add-on'}', price: _money(a['price'])));
      }
    }
    return out;
  }

  /// GET /guest/availability/:id?date=YYYY-MM-DD → busy_slots.
  Future<List<BusySlot>> availability(String resourceId, DateTime date) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 250));
      return const [BusySlot(14 * 60, 16 * 60), BusySlot(19 * 60, 20 * 60)];
    }
    final d = '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    final res = await _api.get('/guest/availability/$resourceId?date=$d');
    final slots = (res is Map) ? _asList(res['busy_slots']) : const [];
    return slots.whereType<Map>().map((e) => BusySlot.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  /// Jam operasional tenant (menit dari 00:00) dari GET /public/profile.
  /// Fallback 08:00–24:00. Menangani tutup tengah malam / lintas hari.
  Future<({int openMin, int closeMin})> operatingHours() async {
    const fallback = (openMin: 8 * 60, closeMin: 24 * 60);
    if (AppConfig.useDemoData) return fallback;
    try {
      final slug = _api.tenantSlug ?? '';
      final res = await _api.get('/public/profile${slug.isEmpty ? '' : '?slug=$slug'}');
      if (res is! Map) return fallback;
      final open = _hhmmToMin('${res['open_time'] ?? ''}');
      var close = _hhmmToMin('${res['close_time'] ?? ''}');
      if (open == null || close == null) return fallback;
      if (close == 0) close = 24 * 60; // "00:00" = tengah malam
      if (close <= open) close = 24 * 60; // lintas hari → batasi ke tengah malam
      return (openMin: open, closeMin: close);
    } catch (_) {
      return fallback;
    }
  }

  int? _hhmmToMin(String s) {
    final parts = s.split(':');
    if (parts.length < 2) return null;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    if (h == null || m == null) return null;
    return h * 60 + m;
  }

  List _asList(dynamic v) {
    if (v is List) return v;
    if (v is Map) {
      for (final k in ['resources', 'items', 'data']) {
        if (v[k] is List) return v[k] as List;
      }
    }
    return const [];
  }

  // --- data demo ---
  static const _demoResources = [
    ResourceEntry(resourceId: 'r1', resourceName: 'Station 03', category: 'PC', status: 'active', packages: [
      ResourcePackage(resourceId: 'r1', resourceName: 'Station 03', itemId: 'p1', name: 'Reguler', price: 15000, unitDuration: 60, priceUnit: 'hour'),
      ResourcePackage(resourceId: 'r1', resourceName: 'Station 03', itemId: 'p1b', name: 'Paket 3 Jam', price: 40000, unitDuration: 180, priceUnit: 'session'),
    ]),
    ResourceEntry(resourceId: 'r3', resourceName: 'PS5 Room B', category: 'PS5', status: 'active', packages: [
      ResourcePackage(resourceId: 'r3', resourceName: 'PS5 Room B', itemId: 'p3', name: 'Private / jam', price: 20000, unitDuration: 60, priceUnit: 'hour'),
    ]),
    ResourceEntry(resourceId: 'r5', resourceName: 'Kamar Kos A1', category: 'Room', status: 'active', packages: [
      ResourcePackage(resourceId: 'r5', resourceName: 'Kamar Kos A1', itemId: 'p5', name: 'Harian', price: 120000, unitDuration: 1440, priceUnit: 'day'),
    ]),
  ];
  static const _demoAddons = [
    Addon(resourceId: 'r1', itemId: 'a1', name: 'Headset', price: 5000),
    Addon(resourceId: 'r3', itemId: 'a2', name: 'Kursi tambahan', price: 8000),
  ];
}
