import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Menyimpan sesi lokal untuk dua peran:
/// - staff  → token account + workspace terpilih
/// - customer → token customer + profil customer (JSON)
///
/// Kunci `auth_role` ('staff' | 'customer') menentukan sesi mana yang aktif.
class TokenStore {
  static const _kToken = 'auth_token';
  static const _kRole = 'auth_role'; // 'staff' | 'customer'
  static const _kName = 'account_name';
  static const _kEmail = 'account_email';
  static const _kWsSlug = 'ws_slug';
  static const _kWsName = 'ws_name';
  static const _kWsRole = 'ws_role';
  // Profil customer disimpan utuh sebagai JSON di satu kunci.
  static const _kCustomerJson = 'customer_json';
  // Preferensi last workspace — sengaja bertahan walau logout, biar login berikutnya cepat.
  static const _kLastWsSlug = 'last_ws_slug';

  Future<void> saveAccount({required String token, required String name, required String email}) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kToken, token);
    await p.setString(_kRole, 'staff');
    await p.setString(_kName, name);
    await p.setString(_kEmail, email);
  }

  Future<void> saveWorkspace({required String slug, required String name, required String role}) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kWsSlug, slug);
    await p.setString(_kWsName, name);
    await p.setString(_kWsRole, role);
    await p.setString(_kLastWsSlug, slug); // ingat sebagai last workspace
  }

  /// Simpan sesi customer: token + profil (JSON). Membersihkan jejak workspace
  /// staff agar tidak tercampur bila sebelumnya login staff.
  Future<void> saveCustomer({required String token, required String customerJson}) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kToken, token);
    await p.setString(_kRole, 'customer');
    await p.setString(_kCustomerJson, customerJson);
    for (final k in [_kWsSlug, _kWsName, _kWsRole]) {
      await p.remove(k);
    }
  }

  /// Perbarui hanya profil customer tersimpan (token tetap). Dipakai setelah
  /// customer mengubah data akun (nama/email/nomor) tanpa login ulang.
  Future<void> saveCustomerProfile(String customerJson) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kCustomerJson, customerJson);
  }

  Future<String?> lastWorkspaceSlug() async {
    final p = await SharedPreferences.getInstance();
    final s = p.getString(_kLastWsSlug);
    return (s == null || s.isEmpty) ? null : s;
  }

  /// Peran sesi tersimpan ('staff' | 'customer'), atau null bila belum ada.
  Future<String?> role() async {
    final p = await SharedPreferences.getInstance();
    final token = p.getString(_kToken);
    if (token == null || token.isEmpty) return null;
    final r = p.getString(_kRole);
    return (r == null || r.isEmpty) ? 'staff' : r;
  }

  Future<Map<String, String>?> read() async {
    final p = await SharedPreferences.getInstance();
    final token = p.getString(_kToken);
    if (token == null || token.isEmpty) return null;
    return {
      'token': token,
      'role': p.getString(_kRole) ?? 'staff',
      'name': p.getString(_kName) ?? '',
      'email': p.getString(_kEmail) ?? '',
      'ws_slug': p.getString(_kWsSlug) ?? '',
      'ws_name': p.getString(_kWsName) ?? '',
      'ws_role': p.getString(_kWsRole) ?? '',
    };
  }

  /// Profil customer tersimpan (terurai dari JSON), atau null.
  Future<Map<String, dynamic>?> readCustomer() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_kCustomerJson);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      return decoded is Map ? Map<String, dynamic>.from(decoded) : null;
    } catch (_) {
      return null;
    }
  }

  Future<void> clearWorkspace() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_kWsSlug);
    await p.remove(_kWsName);
    await p.remove(_kWsRole);
  }

  /// Logout: hapus sesi (staff & customer) tapi PERTAHANKAN last workspace slug.
  Future<void> clear() async {
    final p = await SharedPreferences.getInstance();
    for (final k in [_kToken, _kRole, _kName, _kEmail, _kWsSlug, _kWsName, _kWsRole, _kCustomerJson]) {
      await p.remove(k);
    }
  }
}
