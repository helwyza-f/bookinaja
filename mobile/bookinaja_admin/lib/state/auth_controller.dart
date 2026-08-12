import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/account.dart';
import '../models/workspace.dart';
import '../repositories/auth_repository.dart';
import 'async_value.dart';

/// Auth account-first: login → pilih workspace → operasional.
class AuthController extends ChangeNotifier {
  AuthController(this._repo);
  final AuthRepository _repo;

  Account? _account;
  Workspace? _workspace;
  bool _booting = true;
  bool _submitting = false;
  String? _error;
  AsyncValue<List<Workspace>> _workspaces = const AsyncValue.loading();

  // Mode F&B tenant aktif: integrated (nempel booking), standalone (kasir
  // berdiri sendiri), atau off (kasir dimatikan, F&B ditangani app lain).
  String _fnbMode = 'integrated';

  Account? get account => _account;
  Workspace? get workspace => _workspace;
  bool get isLoggedIn => _account != null;
  bool get hasWorkspace => _workspace != null;
  bool get booting => _booting;
  bool get submitting => _submitting;
  String? get error => _error;
  AsyncValue<List<Workspace>> get workspaces => _workspaces;

  String get fnbMode => _fnbMode;
  /// Kasir dipromosikan jadi tab utama bottom nav (mode "POS Menu terpisah").
  bool get showKasirTab => _fnbMode == 'standalone';
  /// Kasir tetap ada sebagai quick action saja (mode "Nyatu dengan booking").
  bool get showKasirQuickAction => _fnbMode == 'integrated';
  /// Kasir dimatikan total (mode "Matikan") — sembunyikan screen & entrypoint.
  bool get kasirEnabled => _fnbMode != 'off';

  Future<void> _refreshFnbMode() async {
    _fnbMode = await _repo.fetchFnbMode();
    notifyListeners();
  }

  Future<void> bootstrap() async {
    final restored = await _repo.restore();
    if (restored != null) {
      _account = restored.account;
      _workspace = restored.workspace;
    }
    _booting = false;
    notifyListeners();
    if (_workspace != null) unawaited(_refreshFnbMode());
  }

  /// Langkah 1: login account.
  Future<bool> login({required String email, required String password}) async {
    _submitting = true;
    _error = null;
    notifyListeners();
    try {
      _account = await _repo.login(email: email, password: password);
      await _autoSelectLastWorkspace(); // langsung masuk kalau last workspace masih valid
      _submitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _submitting = false;
      notifyListeners();
      return false;
    }
  }

  /// Setelah login: kalau ada last workspace & masih ada di daftar, pilih otomatis
  /// (skip layar pemilihan). Kalau tidak, biarkan picker yang tampil.
  Future<void> _autoSelectLastWorkspace() async {
    try {
      final list = await _repo.workspaces();
      _workspaces = AsyncValue.data(list);
      final last = await _repo.lastWorkspaceSlug();
      if (last == null) return;
      final match = list.where((w) => w.slug == last).toList();
      if (match.isNotEmpty) {
        await _repo.selectWorkspace(match.first);
        _workspace = match.first;
        await _refreshFnbMode();
      }
    } catch (_) {
      // Gagal ambil workspace di sini bukan fatal — picker akan coba lagi.
    }
  }

  /// Langkah 2: muat daftar workspace untuk dipilih.
  Future<void> loadWorkspaces() async {
    _workspaces = const AsyncValue.loading();
    notifyListeners();
    try {
      _workspaces = AsyncValue.data(await _repo.workspaces());
    } catch (e) {
      _workspaces = AsyncValue.error(e);
    }
    notifyListeners();
  }

  /// Langkah 3: pilih workspace → masuk operasional.
  Future<void> selectWorkspace(Workspace w) async {
    await _repo.selectWorkspace(w);
    _workspace = w;
    notifyListeners();
    await _refreshFnbMode();
  }

  /// Kembali ke pemilihan workspace (sesi account tetap).
  Future<void> switchWorkspace() async {
    await _repo.leaveWorkspace();
    _workspace = null;
    _fnbMode = 'integrated';
    notifyListeners();
  }

  Future<void> logout() async {
    await _repo.logout();
    _account = null;
    _workspace = null;
    _fnbMode = 'integrated';
    notifyListeners();
  }
}
