import '../api/api_client.dart';
import '../config.dart';
import '../data/sample_data.dart';
import '../models/customer.dart';

/// Akses data customer (CRM ringan). Endpoint admin: GET /customers.
class CustomersRepository {
  CustomersRepository(this._api);
  final ApiClient _api;

  Future<List<Customer>> list() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 350));
      return sampleCustomers;
    }
    final res = await _api.get('/customers');
    final list = (res is List) ? res : (res is Map && res['data'] is List ? res['data'] as List : const []);
    return list.whereType<Map>().map((e) => Customer.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  /// Cek pelanggan by nomor (CRM). GET /public/validate-customer?phone=
  /// Balik {name, tier} kalau terdaftar, null kalau baru.
  Future<({String name, String tier})?> validate(String phone) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      // Contoh: nomor diawali 0812 dianggap pelanggan lama.
      if (phone.startsWith('0812')) return (name: 'Sarah Wijaya', tier: 'vip');
      return null;
    }
    final res = await _api.get('/public/validate-customer?phone=${Uri.encodeComponent(phone)}');
    if (res is! Map || res['name'] == null) return null;
    return (name: '${res['name']}', tier: '${res['tier'] ?? 'reguler'}');
  }
}
