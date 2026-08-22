import '../api/api_client.dart';
import '../config.dart';
import '../models/cancellation_policy.dart';
import '../models/payment_gateway.dart';
import '../models/payment_method.dart';
import '../models/promo.dart';
import '../models/receipt_settings.dart';
import '../models/staff.dart';
import '../models/activity.dart';

/// Pengaturan tenant (owner-only). Endpoint: /admin/cancellation-settings,
/// /admin/payment-methods.
class SettingsRepository {
  SettingsRepository(this._api);
  final ApiClient _api;

  // --- Metode pembayaran ---

  Future<List<PaymentMethod>> getPaymentMethods() async {
    final res = await _api.get('/admin/payment-methods');
    return _parseMethods(res);
  }

  Future<List<PaymentMethod>> savePaymentMethods(List<PaymentMethod> items) async {
    final res = await _api.put('/admin/payment-methods', body: {
      'items': items.map((e) => e.toInput()).toList(),
    });
    final parsed = _parseMethods(res);
    return parsed.isNotEmpty ? parsed : items;
  }

  // --- Promo / voucher ---

  Future<List<Promo>> getPromos({String? search, String? status}) async {
    final q = <String>[];
    if (search != null && search.isNotEmpty) q.add('search=${Uri.encodeQueryComponent(search)}');
    if (status != null && status.isNotEmpty) q.add('status=$status');
    final path = '/admin/settings/promos${q.isEmpty ? '' : '?${q.join('&')}'}';
    final res = await _api.get(path);
    final list = (res is Map && res['items'] is List) ? res['items'] as List : const [];
    return list
        .whereType<Map>()
        .map((e) => Promo.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Promo> getPromo(String id) async {
    final res = await _api.get('/admin/settings/promos/$id');
    return Promo.fromJson(res is Map ? Map<String, dynamic>.from(res) : {});
  }

  Future<List<PromoRedemption>> getPromoRedemptions(String id) async {
    final res = await _api.get('/admin/settings/promos/$id/redemptions');
    final list = (res is Map && res['items'] is List) ? res['items'] as List : const [];
    return list
        .whereType<Map>()
        .map((e) => PromoRedemption.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Promo> createPromo(Promo p) async {
    final res = await _api.post('/admin/settings/promos', body: p.toInput());
    return res is Map ? Promo.fromJson(Map<String, dynamic>.from(res)) : p;
  }

  Future<Promo> updatePromo(String id, Promo p) async {
    final res = await _api.put('/admin/settings/promos/$id', body: p.toInput());
    return res is Map ? Promo.fromJson(Map<String, dynamic>.from(res)) : p;
  }

  Future<void> setPromoStatus(String id, bool isActive) =>
      _api.patch('/admin/settings/promos/$id/status', body: {'is_active': isActive});

  /// Ringkasan resource untuk selektor promo (`/admin/resources/summary`).
  Future<List<ResourceOption>> getResourceOptions() async {
    final res = await _api.get('/admin/resources/summary');
    final list = (res is Map && res['items'] is List) ? res['items'] as List : const [];
    return list
        .whereType<Map>()
        .map((e) => ResourceOption.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  // --- Payment gateway (BYO) ---

  /// GET /admin/payment-gateway → {data: AdminView}. Kalau belum di-setup
  /// server tetap balas objek kosong; kembalikan default agar aman.
  Future<PaymentGateway> getPaymentGateway() async {
    final res = await _api.get('/admin/payment-gateway');
    final data = (res is Map && res['data'] is Map)
        ? Map<String, dynamic>.from(res['data'] as Map)
        : (res is Map ? Map<String, dynamic>.from(res) : <String, dynamic>{});
    return PaymentGateway.fromJson(data);
  }

  /// PUT /admin/payment-gateway — simpan kredensial. Kosongkan field rahasia
  /// yang tak diubah (server mempertahankan yang lama).
  Future<PaymentGateway> savePaymentGateway({
    required String provider,
    required String environment,
    required String serverKey,
    required String clientKey,
    required String callbackSecret,
  }) async {
    final res = await _api.put('/admin/payment-gateway', body: {
      'provider': provider,
      'environment': environment,
      'server_key': serverKey,
      'client_key': clientKey,
      'callback_secret': callbackSecret,
    });
    final data = (res is Map && res['data'] is Map)
        ? Map<String, dynamic>.from(res['data'] as Map)
        : <String, dynamic>{};
    return PaymentGateway.fromJson(data);
  }

  /// GET /admin/payment-gateway/all → {items:[AdminView], active_provider}.
  /// Semua provider tersimpan (Midtrans & Xendit berdampingan) + mana yg aktif.
  Future<({List<PaymentGateway> items, String activeProvider})> getPaymentGateways() async {
    final res = await _api.get('/admin/payment-gateway/all');
    final list = (res is Map && res['items'] is List) ? res['items'] as List : const [];
    final items = list
        .whereType<Map>()
        .map((e) => PaymentGateway.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    final active = (res is Map) ? '${res['active_provider'] ?? ''}' : '';
    return (items: items, activeProvider: active);
  }

  /// POST /admin/payment-gateway/activate — pilih provider aktif tanpa isi ulang.
  Future<void> setActivePaymentGateway(String provider) =>
      _api.post('/admin/payment-gateway/activate', body: {'provider': provider});

  /// POST /admin/payment-gateway/test — cek koneksi. [provider] kosong = aktif.
  Future<void> testPaymentGateway({String provider = ''}) => _api.post(
      '/admin/payment-gateway/test${provider.isEmpty ? '' : '?provider=$provider'}');

  /// DELETE /admin/payment-gateway — hapus konfigurasi. [provider] kosong = semua.
  Future<void> deletePaymentGateway({String provider = ''}) => _api.delete(
      '/admin/payment-gateway${provider.isEmpty ? '' : '?provider=$provider'}');

  // --- Pengaturan nota / struk ---

  Future<ReceiptSettings> getReceiptSettings() async {
    final res = await _api.get('/admin/receipt-settings');
    return ReceiptSettings.fromJson(res is Map ? Map<String, dynamic>.from(res) : {});
  }

  Future<ReceiptSettings> saveReceiptSettings(ReceiptSettings s) async {
    final res = await _api.put('/admin/receipt-settings', body: s.toJson());
    final data = (res is Map && res['data'] is Map)
        ? Map<String, dynamic>.from(res['data'] as Map)
        : null;
    return data != null ? ReceiptSettings.fromJson(data) : s;
  }

  /// Upload gambar (mis. QR statis QRIS) → URL publik. Reuse endpoint media.
  Future<String> uploadImage(String filePath) async {
    final res = await _api.uploadFile('/admin/upload-media', filePath);
    if (res is Map && res['url'] != null) return '${res['url']}';
    if (res is Map && res['data'] is Map && (res['data'] as Map)['url'] != null) {
      return '${(res['data'] as Map)['url']}';
    }
    throw ApiException(0, 'Upload gagal: URL tidak diterima.');
  }

  List<PaymentMethod> _parseMethods(dynamic res) {
    final list = (res is Map && res['items'] is List)
        ? res['items'] as List
        : (res is List ? res : const []);
    return list
        .whereType<Map>()
        .map((e) => PaymentMethod.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  // --- Profil tenant (owner) ---

  /// GET /admin/profile → objek Tenant mentah (map). Dipakai untuk setting yang
  /// tersimpan di profil, mis. `booking_form_config.fnb_mode`.
  Future<Map<String, dynamic>> getProfile() async {
    final res = await _api.get('/admin/profile');
    return res is Map ? Map<String, dynamic>.from(res) : <String, dynamic>{};
  }

  /// PUT /admin/profile — endpoint menerima objek Tenant UTUH, jadi kirim balik
  /// map yang sudah dimodifikasi (pola sama seperti web: merge lalu simpan).
  Future<Map<String, dynamic>> saveProfile(Map<String, dynamic> profile) async {
    final res = await _api.put('/admin/profile', body: profile);
    return (res is Map && res['data'] is Map)
        ? Map<String, dynamic>.from(res['data'] as Map)
        : profile;
  }

  // --- Page builder (landing) ---

  /// GET /admin/page-builder → {profile, page{version,sections[]}, theme,
  /// booking_form, preview_url, preview_mobile}. Dikembalikan mentah.
  Future<Map<String, dynamic>> getPageBuilder() async {
    final res = await _api.get('/admin/page-builder');
    return res is Map ? Map<String, dynamic>.from(res) : <String, dynamic>{};
  }

  /// PUT /admin/page-builder — kirim page (section terurut) + theme + booking_form.
  /// Theme & form dipertahankan apa adanya dari state; hanya page yang berubah.
  Future<void> savePageBuilder({
    required Map<String, dynamic> page,
    required dynamic theme,
    required dynamic bookingForm,
  }) async {
    await _api.put('/admin/page-builder', body: {
      'page': page,
      'theme': theme ?? const {},
      'booking_form': bookingForm ?? const {},
    });
  }

  // Simpan sementara untuk mode demo (biar perubahan terlihat dalam sesi).
  static CancellationPolicy _demo = CancellationPolicy.initial;

  Future<CancellationPolicy> getCancellation() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return _demo;
    }
    final res = await _api.get('/admin/cancellation-settings');
    return CancellationPolicy.fromJson(Map<String, dynamic>.from(res as Map));
  }

  Future<CancellationPolicy> saveCancellation(CancellationPolicy p) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      _demo = p;
      return p;
    }
    final res = await _api.put('/admin/cancellation-settings', body: p.toJson());
    final data = (res is Map && res['data'] is Map) ? Map<String, dynamic>.from(res['data'] as Map) : null;
    return data != null ? CancellationPolicy.fromJson(data) : p;
  }

  // --- Kebijakan DP (Down Payment) ---

  static dynamic _demoDpPolicy = {'dp_enabled': false, 'dp_percentage': 0, 'resource_configs': []};

  /// GET /deposit-settings → global DP policy dari backend.
  /// Response: {dp_enabled, dp_percentage, resource_configs[]}
  Future<dynamic> getBookingDpPolicy() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return _demoDpPolicy;
    }
    try {
      final res = await _api.get('/admin/deposit-settings');
      return res is Map ? res : {'dp_enabled': false, 'dp_percentage': 0, 'resource_configs': []};
    } catch (_) {
      return {'dp_enabled': false, 'dp_percentage': 0, 'resource_configs': []};
    }
  }

  /// PUT /deposit-settings → simpan global DP policy.
  /// Body: {dp_enabled, dp_percentage, resource_configs[]}
  Future<void> saveBookingDpPolicy(Map<String, dynamic> policy) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      _demoDpPolicy = policy;
      return;
    }
    await _api.put('/admin/deposit-settings', body: policy);
  }

  // --- Owner Account Settings ---

  /// GET /admin/account → data akun owner (name, email, password status, google link).
  Future<Map<String, dynamic>> getOwnerAccount() async {
    try {
      final res = await _api.get('/admin/account');
      return res is Map ? Map<String, dynamic>.from(res) : {};
    } catch (_) {
      return {};
    }
  }

  /// POST /admin/account/password/change → ubah password (ada password lama)
  /// atau POST /admin/account/password/setup → setup password pertama kali.
  Future<void> updateOwnerPassword({String? oldPassword, required String newPassword}) async {
    if (oldPassword == null || oldPassword.isEmpty) {
      // Setup pertama kali (no old password)
      await _api.post('/admin/account/password/setup', body: {'new_password': newPassword});
    } else {
      // Change (ada old password)
      await _api.post('/admin/account/password/change', body: {
        'old_password': oldPassword,
        'new_password': newPassword,
      });
    }
  }

  /// POST /admin/account/google/link → hubungkan akun Google.
  Future<void> linkOwnerGoogle() async {
    await _api.post('/admin/account/google/link');
  }

  /// DELETE /admin/account → hapus (soft-delete) akun owner & workspace.
  /// Backend wajib: confirm_text = slug workspace; current_password bila owner
  /// punya password. Gagal bila masih ada staff aktif.
  Future<void> deleteOwnerAccount({required String confirmText, String? currentPassword}) async {
    await _api.delete('/admin/account', body: {
      'confirm_text': confirmText,
      if (currentPassword != null && currentPassword.isNotEmpty) 'current_password': currentPassword,
    });
  }

  // --- Onboarding Progress ---

  /// GET /admin/tenant/onboarding-summary → langkah setup + status publikasi.
  /// Response: {steps:[{id,label,description,href,complete,required}],
  ///            is_published, can_publish, progress_percent}
  Future<Map<String, dynamic>> getOnboardingProgress() async {
    try {
      final res = await _api.get('/admin/tenant/onboarding-summary');
      return res is Map ? Map<String, dynamic>.from(res) : {'steps': []};
    } catch (_) {
      return {'steps': []};
    }
  }

  /// POST /admin/tenant/publish → terbitkan bisnis ke customer. Melempar
  /// ApiException (400 code=setup_incomplete + blocking) bila belum siap.
  Future<void> publishTenant() => _api.post('/admin/tenant/publish');

  /// POST /admin/tenant/unpublish → sembunyikan bisnis dari customer.
  Future<void> unpublishTenant() => _api.post('/admin/tenant/unpublish');

  // --- Payment Setup Wizard ---

  // --- Staff & akses (roles + staff) ---
  // Endpoint owner-only & gated fitur (RolePermissions/StaffAccounts): backend
  // membalas 403 pada paket yang tak mendukung — biarkan ApiException naik agar
  // UI bisa tampilkan upsell.

  /// GET /admin/settings/staff → {items:[User]}.
  Future<List<StaffMember>> getStaff() async {
    final res = await _api.get('/admin/settings/staff');
    final list = (res is Map && res['items'] is List) ? res['items'] as List : const [];
    return list
        .whereType<Map>()
        .map((e) => StaffMember.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// GET /admin/settings/roles → {items:[StaffRole]}.
  Future<List<StaffRole>> getRoles() async {
    final res = await _api.get('/admin/settings/roles');
    final list = (res is Map && res['items'] is List) ? res['items'] as List : const [];
    return list
        .whereType<Map>()
        .map((e) => StaffRole.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// POST /admin/settings/staff → buat staff baru (name, email, password, role_id).
  Future<void> createStaff({
    required String name,
    required String email,
    required String password,
    required String roleId,
  }) =>
      _api.post('/admin/settings/staff', body: {
        'name': name,
        'email': email,
        'password': password,
        'role_id': roleId,
      });

  /// PUT /admin/settings/staff/:id → ubah nama/email/peran (password tak diubah di sini).
  Future<void> updateStaff({
    required String id,
    required String name,
    required String email,
    required String roleId,
  }) =>
      _api.put('/admin/settings/staff/$id', body: {
        'name': name,
        'email': email,
        'role_id': roleId,
      });

  /// DELETE /admin/settings/staff/:id.
  Future<void> deleteStaff(String id) => _api.delete('/admin/settings/staff/$id');

  /// POST /admin/settings/roles → buat peran (name, description, permission_keys, is_default).
  Future<StaffRole> createRole(StaffRole r) async {
    final res = await _api.post('/admin/settings/roles', body: {
      'name': r.name,
      'description': r.description,
      'permission_keys': r.permissionKeys,
      'is_default': r.isDefault,
    });
    return res is Map ? StaffRole.fromJson(Map<String, dynamic>.from(res)) : r;
  }

  /// PUT /admin/settings/roles/:id → ubah peran.
  Future<StaffRole> updateRole(StaffRole r) async {
    final res = await _api.put('/admin/settings/roles/${r.id}', body: {
      'name': r.name,
      'description': r.description,
      'permission_keys': r.permissionKeys,
      'is_default': r.isDefault,
    });
    return res is Map ? StaffRole.fromJson(Map<String, dynamic>.from(res)) : r;
  }

  /// DELETE /admin/settings/roles/:id.
  Future<void> deleteRole(String id) => _api.delete('/admin/settings/roles/$id');

  /// GET /admin/settings/activity → {items:[AuditLogEntry]} (owner-only).
  /// Log aktivitas: siapa mengubah apa (staff/role/settings/publish).
  Future<List<ActivityEntry>> getActivity() async {
    final res = await _api.get('/admin/settings/activity');
    final list = (res is Map && res['items'] is List) ? res['items'] as List : const [];
    return list
        .whereType<Map>()
        .map((e) => ActivityEntry.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// GET /admin/payment-setup/status → kesiapan pembayaran. Backend membungkus
  /// di `data`: {gateway_usable, manual_usable, has_online, needs_setup, ...}.
  Future<Map<String, dynamic>> getPaymentSetupStatus() async {
    try {
      final res = await _api.get('/admin/payment-setup/status');
      if (res is Map && res['data'] is Map) return Map<String, dynamic>.from(res['data'] as Map);
      return res is Map ? Map<String, dynamic>.from(res) : {};
    } catch (_) {
      return {};
    }
  }
}
