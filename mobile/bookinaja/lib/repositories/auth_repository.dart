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

/// Konfigurasi "Mode Aplikasi" tenant aktif — menentukan gating booking/kasir.
///
/// - [appMode]: `booking_pos` (booking + kasir) · `booking_only` (booking saja)
///   · `pos_only` (kasir saja, booking hilang dari app).
/// - [posStandalone]: kasir walk-in/customer berdiri sendiri (Kasir A). Hanya
///   berarti saat `booking_pos`; di `pos_only` selalu aktif.
/// - [posOnSession]: F&B nempel ke sesi booking — tombol "Tambah F&B" di detail
///   booking (Kasir B). Hanya berarti saat `booking_pos`.
/// - [posAddonOnSession]: Add-on/layanan resource nempel ke sesi — tombol
///   "Add-on" di detail booking. Hanya berarti saat `booking_pos`.
class AppModeConfig {
  final String appMode;
  final bool posStandalone;
  final bool posOnSession;
  final bool posAddonOnSession;
  const AppModeConfig({
    required this.appMode,
    required this.posStandalone,
    required this.posOnSession,
    required this.posAddonOnSession,
  });

  static const fallback = AppModeConfig(
    appMode: 'booking_pos',
    posStandalone: true,
    posOnSession: true,
    posAddonOnSession: true,
  );

  /// Baca dari blok `features` bootstrap. Mendukung skema baru (`app_mode` +
  /// `pos_standalone`/`pos_on_session`) maupun legacy (`fnb_mode`) agar tenant
  /// lama tetap terbaca tanpa migration.
  factory AppModeConfig.fromFeatures(Map features) {
    final appMode = '${features['app_mode'] ?? ''}';
    if (appMode == 'booking_pos' || appMode == 'booking_only' || appMode == 'pos_only') {
      return AppModeConfig(
        appMode: appMode,
        posStandalone: features['pos_standalone'] != false, // default true
        posOnSession: features['pos_on_session'] != false, // default true
        posAddonOnSession: features['pos_addon_on_session'] != false, // default true
      );
    }
    // Legacy fnb_mode → app_mode. Add-on independen dari fnb → default true.
    switch ('${features['fnb_mode'] ?? ''}') {
      case 'standalone':
        return const AppModeConfig(appMode: 'booking_pos', posStandalone: true, posOnSession: false, posAddonOnSession: true);
      case 'off':
        return const AppModeConfig(appMode: 'booking_only', posStandalone: false, posOnSession: false, posAddonOnSession: true);
      case 'integrated':
      default:
        return AppModeConfig.fallback;
    }
  }
}

/// Status langganan (grace) tenant aktif. [graceActive] = langganan tidak aktif
/// (trial habis / belum bayar) → tenant boleh transaksi tapi TIDAK boleh membuat
/// item baru (unit/resource/promo/item F&B). Selaras dgn middleware backend
/// RequireActiveSubscription (402 subscription_inactive).
class GraceState {
  final bool graceActive;
  final bool canCreate;
  final String status; // trial | active | inactive | expired | ...
  // Eskalasi grace berbasis WAKTU (selaras access.GracePhase backend):
  //   phase: 0 aktif | 1 soft (katalog beku) | 2 friksi (convenience dicabut)
  //          | 3 lock (transaksi baru dikunci)
  //   days: umur grace (hari sejak langganan lewat)
  //   frictionDay/lockDay: ambang hari utk hitung mundur
  //   transactionsAllowed: boleh buat transaksi/booking/order baru
  final int phase;
  final int days;
  final int frictionDay;
  final int lockDay;
  final bool transactionsAllowed;

  /// Akhir masa berlaku langganan/trial (tenant.period_end). Untuk hitung mundur
  /// sisa trial di hero & chip nudge.
  final DateTime? periodEnd;

  const GraceState({
    required this.graceActive,
    required this.canCreate,
    required this.status,
    this.phase = 0,
    this.days = 0,
    this.frictionDay = 8,
    this.lockDay = 15,
    this.transactionsAllowed = true,
    this.periodEnd,
  });

  /// Default aman: bukan grace (jangan halangi tenant saat data tak tersedia).
  static const none = GraceState(graceActive: false, canCreate: true, status: '');

  /// Baca dari blok `tenant` bootstrap. Backend lama tanpa field ini → default
  /// aman (canCreate true) agar tak tiba-tiba memblokir.
  factory GraceState.fromTenant(Map tenant) {
    if (!tenant.containsKey('can_create') && !tenant.containsKey('grace_active')) {
      return none;
    }
    final canCreate = tenant['can_create'] != false;
    final graceActive = tenant['grace_active'] == true;
    return GraceState(
      graceActive: graceActive,
      canCreate: canCreate,
      status: '${tenant['status'] ?? ''}',
      phase: tenant['grace_phase'] is int
          ? tenant['grace_phase'] as int
          : (graceActive ? 1 : 0),
      days: tenant['grace_days'] is int ? tenant['grace_days'] as int : 0,
      frictionDay: tenant['grace_friction_day'] is int ? tenant['grace_friction_day'] as int : 8,
      lockDay: tenant['grace_lock_day'] is int ? tenant['grace_lock_day'] as int : 15,
      transactionsAllowed: tenant['transactions_allowed'] != false,
      periodEnd: (tenant['period_end'] is String && (tenant['period_end'] as String).isNotEmpty)
          ? DateTime.tryParse(tenant['period_end'] as String)
          : null,
    );
  }
}

/// Hasil bootstrap admin: Mode Aplikasi + status langganan (grace) + plan &
/// fitur efektif, dimuat sekali dari `/admin/me/bootstrap`.
class BootstrapResult {
  final AppModeConfig appMode;
  final GraceState grace;

  /// Tier langganan tenant (free|trial|starter|pro|scale). Dari `tenant.plan`.
  final String plan;

  /// Daftar fitur EFEKTIF (sudah grace-aware dari backend). Dari
  /// `features.plan_features`.
  final List<String> planFeatures;

  const BootstrapResult({
    required this.appMode,
    required this.grace,
    this.plan = '',
    this.planFeatures = const [],
  });
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

  /// POST /app/workspaces (bearer account token) → buat workspace baru di bawah
  /// account yang login. Backend auto-generate slug dari nama, default kategori,
  /// dan set trial Pro 14 hari. Mengembalikan slug workspace baru agar bisa
  /// di-auto-pilih setelah daftar dimuat ulang.
  /// [appMode] = Mode Aplikasi awal (booking_pos | booking_only | pos_only).
  /// Ditulis ke booking_form_config tenant sejak dibuat, jadi setup & onboarding
  /// langsung menyesuaikan.
  Future<String> createWorkspace(String name, {String appMode = 'booking_pos'}) async {
    final res = await _api.post('/app/workspaces', body: {
      'name': name.trim(),
      'app_mode': appMode,
    });
    final ws = (res is Map && res['workspace'] is Map) ? res['workspace'] as Map : const {};
    return '${ws['slug'] ?? ''}';
  }

  /// Langkah 3 — pilih workspace: set konteks tenant untuk request admin.
  Future<void> selectWorkspace(Workspace w) async {
    _api.setTenant(w.slug); // token account tetap dipakai
    RealtimeClient.instance.updateContext(token: _api.token, tenantSlug: _api.tenantSlug);
    await _store.saveWorkspace(slug: w.slug, name: w.name, role: w.role);
  }

  /// Slug workspace terakhir yang dibuka (buat auto-pilih saat login).
  Future<String?> lastWorkspaceSlug() => _store.lastWorkspaceSlug();

  /// GET /admin/me/bootstrap — ambil fitur tenant aktif untuk menentukan
  /// gating Mode Aplikasi (booking / kasir A / kasir B). Default [AppModeConfig.fallback]
  /// bila gagal (backend lama / offline) agar app tetap penuh, bukan tiba-tiba
  /// kehilangan booking/kasir.
  Future<BootstrapResult> fetchBootstrap() async {
    try {
      final res = await _api.get('/admin/me/bootstrap');
      final features = (res is Map && res['features'] is Map) ? res['features'] as Map : const {};
      final tenant = (res is Map && res['tenant'] is Map) ? res['tenant'] as Map : const {};
      return BootstrapResult(
        appMode: AppModeConfig.fromFeatures(features),
        grace: GraceState.fromTenant(tenant),
        plan: '${tenant['plan'] ?? ''}'.toLowerCase(),
        planFeatures: (features['plan_features'] is List)
            ? (features['plan_features'] as List).map((e) => '$e').toList()
            : const [],
      );
    } catch (_) {
      // Backend lama / offline → jangan menghukum tenant: app penuh & tanpa grace.
      return const BootstrapResult(appMode: AppModeConfig.fallback, grace: GraceState.none);
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
