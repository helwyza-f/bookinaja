import 'package:shared_preferences/shared_preferences.dart';

/// Menyimpan token account + workspace terpilih secara lokal.
class TokenStore {
  static const _kToken = 'auth_token';
  static const _kName = 'account_name';
  static const _kEmail = 'account_email';
  static const _kWsSlug = 'ws_slug';
  static const _kWsName = 'ws_name';
  static const _kWsRole = 'ws_role';
  // Preferensi last workspace — sengaja bertahan walau logout, biar login berikutnya cepat.
  static const _kLastWsSlug = 'last_ws_slug';

  Future<void> saveAccount({required String token, required String name, required String email}) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kToken, token);
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

  Future<String?> lastWorkspaceSlug() async {
    final p = await SharedPreferences.getInstance();
    final s = p.getString(_kLastWsSlug);
    return (s == null || s.isEmpty) ? null : s;
  }

  Future<Map<String, String>?> read() async {
    final p = await SharedPreferences.getInstance();
    final token = p.getString(_kToken);
    if (token == null || token.isEmpty) return null;
    return {
      'token': token,
      'name': p.getString(_kName) ?? '',
      'email': p.getString(_kEmail) ?? '',
      'ws_slug': p.getString(_kWsSlug) ?? '',
      'ws_name': p.getString(_kWsName) ?? '',
      'ws_role': p.getString(_kWsRole) ?? '',
    };
  }

  Future<void> clearWorkspace() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_kWsSlug);
    await p.remove(_kWsName);
    await p.remove(_kWsRole);
  }

  /// Logout: hapus sesi tapi PERTAHANKAN last workspace slug.
  Future<void> clear() async {
    final p = await SharedPreferences.getInstance();
    for (final k in [_kToken, _kName, _kEmail, _kWsSlug, _kWsName, _kWsRole]) {
      await p.remove(k);
    }
  }
}
