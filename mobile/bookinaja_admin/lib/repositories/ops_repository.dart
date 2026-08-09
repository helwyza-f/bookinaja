import '../api/api_client.dart';
import '../config.dart';
import '../data/sample_data.dart';
import '../models/resource_status.dart';

/// Nerve center: gabungan daftar resource + sesi aktif.
/// Live  = resource punya sesi berjalan (dari /bookings/pos/active)
/// Off   = status resource maintenance/inactive
/// Idle  = selebihnya (siap dipakai)
class OpsRepository {
  OpsRepository(this._api);
  final ApiClient _api;

  Future<List<ResourceStatus>> resources() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return sampleResources;
    }

    // Daftar resource WAJIB berhasil.
    final resList = _asList(await _api.get('/resources-all'));

    // Sesi aktif OPSIONAL — kalau gagal (mis. permission), tetap tampilkan resource.
    List activeList = const [];
    try {
      activeList = _asList(await _api.get('/bookings/pos/active'));
    } catch (_) {
      activeList = const [];
    }

    // resource_id → sesi aktif (customer + end_time)
    final activeByResource = <String, Map>{};
    for (final a in activeList.whereType<Map>()) {
      final rid = '${a['resource_id'] ?? ''}';
      if (rid.isNotEmpty) activeByResource[rid] = a;
    }

    final out = <ResourceStatus>[];
    for (final r in resList.whereType<Map>()) {
      final rid = '${r['id'] ?? ''}';
      final name = '${r['name'] ?? '-'}';
      final status = '${r['status'] ?? ''}'.toLowerCase();
      final active = activeByResource[rid];

      if (active != null) {
        out.add(ResourceStatus(
          name: name, resourceId: rid, bookingId: '${active['id'] ?? ''}',
          state: ResourceState.live,
          note: [
            '${active['customer_name'] ?? ''}',
            _remaining('${active['end_time'] ?? ''}'),
          ].where((s) => s.isNotEmpty).join(' · '),
        ));
      } else if (status == 'maintenance' || status == 'inactive' || status == 'archived' || status == 'disabled') {
        out.add(ResourceStatus(name: name, resourceId: rid, state: ResourceState.off, note: status == 'maintenance' ? 'maintenance' : 'nonaktif'));
      } else {
        out.add(ResourceStatus(name: name, resourceId: rid, state: ResourceState.idle, note: 'siap dipakai'));
      }
    }
    return out;
  }

  /// Aktifkan resource (off → active). Fetch full object, ubah status, PUT balik
  /// (UpdateResource overwrite penuh — jaga field lain tetap utuh).
  Future<void> setResourceActive(String resourceId) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    final res = await _api.get('/resources-all/$resourceId');
    final map = (res is Map) ? Map<String, dynamic>.from(res) : <String, dynamic>{};
    map['status'] = 'active';
    await _api.put('/resources-all/$resourceId', body: map);
  }

  String _remaining(String endIso) {
    final end = DateTime.tryParse(endIso);
    if (end == null) return '';
    final mins = end.difference(DateTime.now()).inMinutes;
    if (mins <= 0) return 'lewat';
    if (mins < 60) return 'sisa ${mins}m';
    return 'sisa ${mins ~/ 60}j ${mins % 60}m';
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
}
