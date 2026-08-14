import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/account.dart';
import '../models/customer_account.dart';
import '../models/workspace.dart';
import '../repositories/auth_repository.dart';
import '../repositories/customer_auth_repository.dart';
import 'async_value.dart';

/// Peran sesi aktif. Satu app melayani dua dunia: staff tenant & pelanggan.
enum AuthRole { none, tenantStaff, customer }

/// Auth account-first untuk staff (login → pilih workspace → operasional) dan
/// auth pelanggan (OTP WA / email → langsung masuk). Dibedakan lewat [role].
class AuthController extends ChangeNotifier {
  AuthController(this._repo, this._customerRepo);
  final AuthRepository _repo;
  final CustomerAuthRepository _customerRepo;

  AuthRole _role = AuthRole.none;
  Account? _account;
  Workspace? _workspace;
  CustomerAccount? _customer;
  bool _booting = true;
  bool _submitting = false;
  String? _error;
  AsyncValue<List<Workspace>> _workspaces = const AsyncValue.loading();

  // Mode F&B tenant aktif: integrated (nempel booking), standalone (kasir
  // berdiri sendiri), atau off (kasir dimatikan, F&B ditangani app lain).
  String _fnbMode = 'integrated';

  AuthRole get role => _role;
  bool get isStaff => _role == AuthRole.tenantStaff;
  bool get isCustomer => _role == AuthRole.customer;

  Account? get account => _account;
  Workspace? get workspace => _workspace;
  CustomerAccount? get customer => _customer;
  bool get isLoggedIn => _role != AuthRole.none;
  bool get hasWorkspace => _workspace != null;
  bool get booting => _booting;
  bool get submitting => _submitting;
  String? get error => _error;
  AsyncValue<List<Workspace>> get workspaces => _workspaces;

  String get fnbMode => _fnbMode;
  /// Kasir tampil sebagai quick action (dashboard) & tile More hub di semua
  /// mode F&B, kecuali mode "Matikan" — tidak pernah jadi tab bottom nav.
  bool get kasirEnabled => _fnbMode != 'off';

  Future<void> _refreshFnbMode() async {
    _fnbMode = await _repo.fetchFnbMode();
    notifyListeners();
  }

  Future<void> bootstrap() async {
    // Coba restore sesi customer dulu; kalau bukan, baru sesi staff.
    final cust = await _customerRepo.restore();
    if (cust != null) {
      _customer = cust;
      _role = AuthRole.customer;
      _booting = false;
      notifyListeners();
      return;
    }
    final restored = await _repo.restore();
    if (restored != null) {
      _account = restored.account;
      _workspace = restored.workspace;
      _role = AuthRole.tenantStaff;
    }
    _booting = false;
    notifyListeners();
    if (_workspace != null) unawaited(_refreshFnbMode());
  }

  // ---------------- Staff (account-first) ----------------

  /// Langkah 1: login account.
  Future<bool> login({required String email, required String password}) async {
    _submitting = true;
    _error = null;
    notifyListeners();
    try {
      _account = await _repo.login(email: email, password: password);
      _role = AuthRole.tenantStaff;
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

  // ---------------- Customer (pelanggan) ----------------

  /// Kirim OTP login WhatsApp. Lempar exception bila gagal (mis. nomor bisnis).
  Future<void> requestCustomerLoginOtp(String phone) => _customerRepo.requestLoginOtp(phone);

  /// Verifikasi OTP login customer → masuk.
  Future<bool> verifyCustomerOtp({required String phone, required String code}) {
    return _runCustomerAuth(() => _customerRepo.verifyOtp(phone: phone, code: code));
  }

  /// Login customer via email + password.
  Future<bool> loginCustomerEmail({required String email, required String password}) {
    return _runCustomerAuth(() => _customerRepo.loginEmail(email: email, password: password));
  }

  /// Mulai pendaftaran customer (kirim OTP aktivasi). Tidak langsung masuk —
  /// UI lanjut ke layar verifikasi OTP. Lempar exception bila gagal.
  Future<void> startCustomerRegistration({
    required String name,
    required String phone,
    String? email,
    String? password,
  }) {
    return _customerRepo.startRegistration(name: name, phone: phone, email: email, password: password);
  }

  Future<void> resendCustomerRegistrationOtp(String phone) => _customerRepo.resendRegistrationOtp(phone);

  Future<bool> _runCustomerAuth(Future<CustomerAccount> Function() action) async {
    _submitting = true;
    _error = null;
    notifyListeners();
    try {
      _customer = await action();
      _role = AuthRole.customer;
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

  // ---------------- Umum ----------------

  Future<void> logout() async {
    await _repo.logout();
    _account = null;
    _workspace = null;
    _customer = null;
    _role = AuthRole.none;
    _fnbMode = 'integrated';
    notifyListeners();
  }
}
