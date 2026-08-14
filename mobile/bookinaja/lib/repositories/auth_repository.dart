import '../api/api_client.dart';
import '../data/token_store.dart';
import '../models/account.dart';
import '../models/workspace.dart';
import '../realtime/realtime_client.dart';

/// Hasil restore sesi tersimpan.
class RestoredSession {
  final Account account;
  final Workspace? workspace;
  const RestoredSession(this.account, this.workspace);
}

/// Autentikasi account-first: login → daftar workspace → pilih workspace.
class AuthRepository {
  AuthRepository(this._api, this._store);
  final ApiClient _api;
  final TokenStore _store;

  /// Langkah 1 — POST /auth/login {email,password} → token account.
  Future<Account> login({required String email, required String password}) async {
    final res = await _api.post('/auth/login', body: {'email': email, 'password': password});
    final result = AuthResult.fromJson(Map<String, dynamic>.from(res as Map));
    _api.setToken(result.token);
    RealtimeClient.instance.updateContext(token: _api.token, tenantSlug: _api.tenantSlug);
    await _store.saveAccount(token: result.token, name: result.account.name, email: result.account.email);
    return result.account;
  }

  /// Langkah 2 — GET /app/workspaces (bearer account token) → {items:[...]}.
  Future<List<Workspace>> workspaces() async {
    final res = await _api.get('/app/workspaces');
    final list = (res is Map && res['items'] is List)
        ? res['items'] as List
        : (res is List ? res : const []);
    return list.whereType<Map>().map((e) => Workspace.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  /// Langkah 3 — pilih workspace: set konteks tenant untuk request admin.
  Future<void> selectWorkspace(Workspace w) async {
    _api.setTenant(w.slug); // token account tetap dipakai
    RealtimeClient.instance.updateContext(token: _api.token, tenantSlug: _api.tenantSlug);
    await _store.saveWorkspace(slug: w.slug, name: w.name, role: w.role);
  }

  /// Slug workspace terakhir yang dibuka (buat auto-pilih saat login).
  Future<String?> lastWorkspaceSlug() => _store.lastWorkspaceSlug();

  /// GET /admin/me/bootstrap — ambil fitur tenant aktif (mis. mode F&B:
  /// integrated/standalone/off) untuk menentukan gating nav Kasir.
  /// Default 'integrated' bila gagal (backend lama / offline) agar Kasir
  /// tetap terlihat sebagai quick action, bukan tiba-tiba hilang.
  Future<String> fetchFnbMode() async {
    try {
      final res = await _api.get('/admin/me/bootstrap');
      final features = (res is Map && res['features'] is Map) ? res['features'] as Map : const {};
      final mode = '${features['fnb_mode'] ?? ''}';
      if (mode == 'standalone' || mode == 'off' || mode == 'integrated') return mode;
      return 'integrated';
    } catch (_) {
      return 'integrated';
    }
  }

  Future<RestoredSession?> restore() async {
    final saved = await _store.read();
    if (saved == null) return null;
    _api.setToken(saved['token']);
    _api.setTenant((saved['ws_slug'] ?? '').isEmpty ? null : saved['ws_slug']);
    RealtimeClient.instance.updateContext(token: _api.token, tenantSlug: _api.tenantSlug);
    final account = Account(id: '', name: saved['name'] ?? 'Admin', email: saved['email'] ?? '');
    final slug = saved['ws_slug'] ?? '';
    final workspace = slug.isEmpty
        ? null
        : Workspace(id: '', slug: slug, name: saved['ws_name'] ?? slug, role: saved['ws_role'] ?? 'staff', plan: '', status: '');
    return RestoredSession(account, workspace);
  }

  /// Keluar dari workspace (kembali ke pemilihan), sesi account tetap.
  Future<void> leaveWorkspace() async {
    _api.setTenant(null);
    RealtimeClient.instance.updateContext(token: _api.token, tenantSlug: _api.tenantSlug);
    await _store.clearWorkspace();
  }

  Future<void> logout() async {
    await _store.clear();
    _api.clearAuth();
    RealtimeClient.instance.updateContext(token: _api.token, tenantSlug: _api.tenantSlug);
  }
}
