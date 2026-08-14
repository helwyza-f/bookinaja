import 'dart:convert';
import '../api/api_client.dart';
import '../data/token_store.dart';
import '../models/customer_account.dart';
import '../realtime/realtime_client.dart';

/// Autentikasi pelanggan (customer) lewat endpoint `/public/customer/*`.
/// Token yang diterbitkan membawa claim `customer_id` — backend memisahkan
/// customer dari staff berdasarkan claim ini. Tidak perlu memilih tenant:
/// tenant di-resolve dari klaim/aksi berikutnya.
class CustomerAuthRepository {
  CustomerAuthRepository(this._api, this._store);
  final ApiClient _api;
  final TokenStore _store;

  /// Kirim OTP login ke WhatsApp. POST /public/customer/login {phone}.
  Future<void> requestLoginOtp(String phone) async {
    await _api.post('/public/customer/login', body: {'phone': phone.trim()});
  }

  /// Verifikasi OTP login → token + profil customer. Menyimpan sesi.
  /// POST /public/customer/verify {phone, code}.
  Future<CustomerAccount> verifyOtp({required String phone, required String code}) async {
    final res = await _api.post('/public/customer/verify', body: {'phone': phone.trim(), 'code': code.trim()});
    return _persist(CustomerAuthResult.fromJson(Map<String, dynamic>.from(res as Map)));
  }

  /// Login email + password → token + profil customer. Menyimpan sesi.
  /// POST /public/customer/login-email {email, password}.
  Future<CustomerAccount> loginEmail({required String email, required String password}) async {
    final res = await _api.post('/public/customer/login-email', body: {'email': email.trim(), 'password': password});
    return _persist(CustomerAuthResult.fromJson(Map<String, dynamic>.from(res as Map)));
  }

  /// Mulai pendaftaran → kirim OTP aktivasi. Belum menerbitkan token; customer
  /// harus verifikasi via [verifyOtp]. POST /public/customer/register.
  Future<void> startRegistration({
    required String name,
    required String phone,
    String? email,
    String? password,
  }) async {
    await _api.post('/public/customer/register', body: {
      'name': name.trim(),
      'phone': phone.trim(),
      if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
      if (password != null && password.isNotEmpty) 'password': password,
    });
  }

  /// Kirim ulang OTP aktivasi pendaftaran. POST /public/customer/register/resend.
  Future<void> resendRegistrationOtp(String phone) async {
    await _api.post('/public/customer/register/resend', body: {'phone': phone.trim()});
  }

  /// Restore sesi customer tersimpan. Mengembalikan null bila peran tersimpan
  /// bukan customer (biarkan jalur staff yang menangani).
  Future<CustomerAccount?> restore() async {
    if (await _store.role() != 'customer') return null;
    final saved = await _store.read();
    if (saved == null) return null;
    final profile = await _store.readCustomer();
    if (profile == null) return null;
    _api.setToken(saved['token']);
    _api.setTenant(null);
    RealtimeClient.instance.updateContext(token: _api.token, tenantSlug: _api.tenantSlug);
    return CustomerAccount.fromJson(profile);
  }

  Future<CustomerAccount> _persist(CustomerAuthResult result) async {
    _api.setToken(result.token);
    _api.setTenant(null); // customer tidak terikat satu tenant
    RealtimeClient.instance.updateContext(token: _api.token, tenantSlug: _api.tenantSlug);
    await _store.saveCustomer(token: result.token, customerJson: jsonEncode(result.customer.toJson()));
    return result.customer;
  }
}
