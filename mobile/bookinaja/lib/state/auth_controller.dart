import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/account.dart';
import '../models/customer_account.dart';
import '../models/subscription_view.dart';
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

  // Mode Aplikasi tenant aktif — menentukan gating booking & dua jenis kasir.
  // Lihat [AppModeConfig].
  AppModeConfig _appMode = AppModeConfig.fallback;

  // Status langganan (grace) tenant aktif. Menentukan boleh/tidak membuat item
  // baru (selaras middleware backend RequireActiveSubscription).
  GraceState _grace = GraceState.none;

  // Tier langganan & fitur efektif tenant aktif (dari bootstrap), untuk paywall
  // & layar langganan.
  String _plan = '';
  List<String> _planFeatures = const [];

  // Peran + izin efektif user di workspace aktif (dari bootstrap). Sumber
  // kebenaran gating UI sadar-izin (staff vs owner). Owner: role='owner',
  // _permissions kosong tapi can() selalu true (bypass, selaras backend).
  String _bootstrapRole = '';
  Set<String> _permissions = const {};

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

  String get appMode => _appMode.appMode;

  /// Booking aktif — tab Booking, dashboard booking & operations booking tampil.
  /// Mati hanya di mode `pos_only` (kasir saja).
  bool get bookingEnabled => _appMode.appMode != 'pos_only';

  /// Kasir A (walk-in / customer, berdiri sendiri): quick action dashboard &
  /// tile More hub. Selalu aktif di `pos_only`; di `booking_pos` ikut toggle.
  bool get kasirEnabled =>
      _appMode.appMode == 'pos_only' ||
      (_appMode.appMode == 'booking_pos' && _appMode.posStandalone);

  /// F&B nempel ke sesi: tombol "Tambah F&B" di detail booking. Hanya di
  /// `booking_pos` (ikut toggle). `booking_only` = reservasi murni (mati),
  /// `pos_only` = tak ada sesi (mati).
  bool get sessionFnbEnabled =>
      _appMode.appMode == 'booking_pos' && _appMode.posOnSession;

  /// Add-on/layanan resource nempel ke sesi: tombol "Add-on" di detail booking.
  /// Aturan sama seperti [sessionFnbEnabled].
  bool get sessionAddonEnabled =>
      _appMode.appMode == 'booking_pos' && _appMode.posAddonOnSession;

  /// Langganan tenant tidak aktif (trial habis / belum bayar) → mode grace:
  /// boleh transaksi, tak boleh buat item baru. Untuk banner & disable tombol.
  bool get graceActive => _grace.graceActive;

  /// Boleh membuat item baru (unit/resource/promo/item F&B). Kebalikan grace.
  bool get canCreate => _grace.canCreate;

  /// Fase eskalasi grace berbasis waktu: 0 aktif | 1 soft | 2 friksi | 3 lock.
  int get gracePhase => _grace.phase;

  /// Umur grace (hari sejak langganan lewat) & ambang hari lock, utk hitung
  /// mundur di banner/interstitial.
  int get graceDays => _grace.days;
  int get graceLockDay => _grace.lockDay;

  /// Boleh membuat transaksi/booking/order baru. False hanya di fase lock.
  bool get transactionsAllowed => _grace.transactionsAllowed;

  /// Tier langganan tenant (free|trial|starter|pro|scale).
  String get plan => _plan;

  /// Status langganan (trial|active|inactive|expired|...).
  String get subscriptionStatus => _grace.status;

  /// Fitur efektif (grace-aware) yang aktif untuk tenant.
  List<String> get planFeatures => _planFeatures;

  /// Owner workspace aktif — hanya owner yang boleh area owner (billing, profil,
  /// pengaturan, staff, publish). Sumber utama = bootstrap (`user.role`), fallback
  /// ke role workspace dari picker sebelum bootstrap selesai.
  bool get isOwner =>
      _bootstrapRole == 'owner' || (_workspace?.role ?? '').toLowerCase() == 'owner';

  /// Punya izin [key]? Owner selalu true (bypass, selaras middleware backend).
  /// Untuk staff, cek daftar izin efektif (sudah di-expand backend).
  bool can(String key) => isOwner || _permissions.contains(key);

  /// Punya salah satu dari [keys]? Owner selalu true.
  bool canAny(Iterable<String> keys) => isOwner || keys.any(_permissions.contains);

  /// Akhir masa berlaku langganan/trial.
  DateTime? get periodEnd => _grace.periodEnd;

  /// Sisa hari trial (null bila bukan trial atau tanpa tanggal). Dipakai chip
  /// nudge di header dashboard.
  int? get trialDaysLeft {
    if (subscriptionStatus != 'trial' || _grace.periodEnd == null) return null;
    final d = _grace.periodEnd!.difference(DateTime.now()).inDays;
    return d < 0 ? 0 : d;
  }

  /// Deskriptor state langganan — sumber kebenaran untuk hero & kartu status.
  SubView get subView => SubView.of(
        grace: graceActive,
        status: subscriptionStatus,
        plan: _plan,
        trialDaysLeft: trialDaysLeft,
        periodEnd: _grace.periodEnd,
        gracePhase: gracePhase,
        daysToLock: (graceLockDay - graceDays).clamp(0, 9999),
      );

  Future<void> _refreshAppMode() async {
    final res = await _repo.fetchBootstrap();
    _appMode = res.appMode;
    _grace = res.grace;
    _plan = res.plan;
    _planFeatures = res.planFeatures;
    if (res.role.isNotEmpty) _bootstrapRole = res.role;
    _permissions = res.permissionKeys.toSet();
    notifyListeners();
  }

  /// Muat ulang Mode Aplikasi (mis. setelah owner mengubahnya di pengaturan)
  /// agar gating booking/kasir/nav ikut ter-update tanpa login ulang.
  Future<void> refreshAppMode() => _refreshAppMode();

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
    if (_workspace != null) unawaited(_refreshAppMode());
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
        await _refreshAppMode();
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
    await _refreshAppMode();
  }

  /// Buat workspace baru lalu langsung pilih → masuk operasional (dashboard
  /// akan menuntun lengkapi setup lewat gerbang publikasi). Melempar exception
  /// dengan pesan backend bila gagal (mis. slug sudah dipakai) agar UI tampil.
  Future<void> createWorkspace(String name, {String appMode = 'booking_pos'}) async {
    final slug = await _repo.createWorkspace(name, appMode: appMode);
    final list = await _repo.workspaces();
    _workspaces = AsyncValue.data(list);
    final match = list.where((w) => w.slug == slug).toList();
    final chosen = match.isNotEmpty ? match.first : (list.isNotEmpty ? list.last : null);
    if (chosen != null) {
      await selectWorkspace(chosen); // notify + refresh app mode
    } else {
      notifyListeners();
    }
  }

  /// Ganti password akun (owner/staff). Melempar exception dgn pesan backend
  /// bila gagal (mis. password lama salah) agar UI bisa menampilkannya.
  Future<void> changeAccountPassword({required String oldPassword, required String newPassword}) =>
      _repo.changeAccountPassword(oldPassword: oldPassword, newPassword: newPassword);

  /// Kembali ke pemilihan workspace (sesi account tetap).
  Future<void> switchWorkspace() async {
    await _repo.leaveWorkspace();
    _workspace = null;
    _appMode = AppModeConfig.fallback;
    _grace = GraceState.none;
    _bootstrapRole = '';
    _permissions = const {};
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

  /// Terapkan profil customer terbaru ke sesi (setelah edit akun). Repo sudah
  /// menyimpan ke storage; di sini hanya menyegarkan cache + UI.
  void applyCustomer(CustomerAccount updated) {
    _customer = updated;
    notifyListeners();
  }

  /// Edit profil customer (nama/email). Melempar bila gagal (dipakai layar akun).
  Future<void> updateCustomerProfile({String? name, String? email}) async {
    applyCustomer(await _customerRepo.updateProfile(name: name, email: email));
  }

  /// Ganti password customer.
  Future<void> updateCustomerPassword({required String current, required String next}) async {
    applyCustomer(await _customerRepo.updatePassword(current: current, next: next));
  }

  /// Minta OTP ganti nomor WhatsApp.
  Future<void> requestCustomerPhoneChange(String newPhone) =>
      _customerRepo.requestPhoneChange(newPhone);

  /// Verifikasi OTP ganti nomor WhatsApp.
  Future<void> verifyCustomerPhoneChange({required String newPhone, required String code}) async {
    applyCustomer(await _customerRepo.verifyPhoneChange(newPhone: newPhone, code: code));
  }

  /// Hapus akun customer lalu keluar. Backend membebaskan nomor/email sehingga
  /// bisa dipakai mendaftar akun baru. Melempar bila gagal (sesi tetap utuh).
  Future<void> deleteCustomerAccount() async {
    await _customerRepo.deleteAccount();
    await logout();
  }

  // ---------------- Umum ----------------

  Future<void> logout() async {
    await _repo.logout();
    _account = null;
    _workspace = null;
    _customer = null;
    _role = AuthRole.none;
    _appMode = AppModeConfig.fallback;
    _grace = GraceState.none;
    _bootstrapRole = '';
    _permissions = const {};
    notifyListeners();
  }
}
