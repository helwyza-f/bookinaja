import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/catalog.dart';
import '../models/discovery.dart';
import '../repositories/customer_reservation_repository.dart';
import '../utils/slot_engine.dart';

/// Alur booking customer untuk SATU resource: pilih paket → tanggal → slot →
/// durasi → promo → buat booking. Jam operasional dari profil tenant; server
/// tetap memvalidasi ulang. Logika slot/durasi mengikuti sisi admin.
class CustomerBookingController extends ChangeNotifier {
  CustomerBookingController(
    this._repo, {
    required this.tenant,
    required this.resource,
    DateTime? initialDate,
  }) {
    final window = operatingWindow(tenant.openTime, tenant.closeTime);
    _openMin = window.open;
    _closeMin = window.close;
    if (initialDate != null) date = _dateOnly(initialDate);
    if (packages.length == 1) pkg = packages.first;
  }
  final CustomerReservationRepository _repo;
  final TenantProfile tenant;
  final TenantResource resource;

  List<TenantPackage> get packages => resource.bookablePackages;

  int _openMin = 8 * 60;
  int _closeMin = 22 * 60;

  TenantPackage? pkg;
  DateTime date = DateTime.now();
  List<BusySlot> _busy = const [];
  bool busyLoading = false;
  String? slot; // "HH:mm"
  int duration = 1;

  ({bool valid, int discount, int finalAmount, String label, String message})?
  promo;
  bool checkingPromo = false;
  String promoCodeApplied = '';

  bool submitting = false;
  String? submitError;
  Object? submitException;

  // Preview server-authoritative (total + DP). Null sampai slot dipilih.
  BookingPreview? preview;
  bool previewing = false;
  Timer? _previewDebounce;

  /// Total yang ditampilkan: pakai server bila tersedia, else estimasi client.
  int get displayTotal => preview?.grandTotal ?? grandTotal;

  /// Nominal yang dibayar sekarang (DP bila ada, else total). Null sebelum preview.
  int? get amountDueNow => preview?.amountDueNow;

  bool get hasDeposit => preview?.hasDeposit ?? false;

  // Paket customer di sini semuanya berbasis jam/sesi (interday belum didukung
  // di alur mobile — resource interday tetap bisa dibooking lewat web).
  int get unitMinutes {
    final minutes = pkg?.unitDuration ?? 60;
    return minutes > 0 ? minutes : 60;
  }

  String get unitLabel => pkg?.unitLabel ?? 'jam';

  int get total => pkg == null ? 0 : pkg!.price * duration;
  int get grandTotal => (promo?.valid ?? false) ? promo!.finalAmount : total;

  bool get isToday =>
      date.year == DateTime.now().year &&
      date.month == DateTime.now().month &&
      date.day == DateTime.now().day;

  int get maxDuration {
    if (pkg == null || slot == null) return 1;
    return maxUnitsFrom(
      startMin: hmToMin(slot!),
      closeMin: _closeMin,
      stepMin: unitMinutes,
      busy: _busy,
    );
  }

  /// Slot mulai (per 1 unit) + status. Dihitung lewat slot-engine bersama.
  List<DaySlot> get slots {
    if (pkg == null) return const [];
    return buildDaySlots(
      openMin: _openMin,
      closeMin: _closeMin,
      stepMin: unitMinutes,
      date: date,
      busy: _busy,
    );
  }

  DateTime _startLocal() {
    final parts = slot!.split(':');
    return DateTime(
      date.year,
      date.month,
      date.day,
      int.parse(parts[0]),
      int.parse(parts[1]),
    );
  }

  DateTime? get startAt => (pkg == null || slot == null) ? null : _startLocal();
  DateTime? get endAt =>
      startAt?.add(Duration(minutes: unitMinutes * duration));

  bool get canSubmit => pkg != null && slot != null && !submitting;

  Future<void> selectPackage(TenantPackage p) async {
    pkg = p;
    slot = null;
    duration = 1;
    _resetPromo();
    preview = null;
    _previewDebounce?.cancel();
    notifyListeners();
    await _loadAvailability();
  }

  Future<void> setDate(DateTime d) async {
    date = d;
    slot = null;
    _resetPromo();
    preview = null;
    _previewDebounce?.cancel();
    notifyListeners();
    if (pkg != null) await _loadAvailability();
  }

  @override
  void dispose() {
    _previewDebounce?.cancel();
    super.dispose();
  }

  void selectSlot(String s) {
    slot = s;
    if (duration > maxDuration) duration = 1;
    _resetPromo();
    notifyListeners();
    _schedulePreview();
  }

  void setDuration(int n) {
    duration = n.clamp(1, maxDuration);
    _resetPromo();
    notifyListeners();
    _schedulePreview();
  }

  /// Jadwalkan refresh preview (debounce) setelah pilihan berubah.
  void _schedulePreview() {
    _previewDebounce?.cancel();
    if (pkg == null || slot == null) {
      preview = null;
      return;
    }
    _previewDebounce = Timer(const Duration(milliseconds: 300), _refreshPreview);
  }

  Future<void> _refreshPreview() async {
    if (pkg == null || slot == null) return;
    previewing = true;
    notifyListeners();
    try {
      final res = await _repo.preview(
        resourceId: resource.id,
        itemIds: [pkg!.id],
        startLocal: _startLocal(),
        durationUnits: duration,
        promoCode: (promo?.valid ?? false) ? promoCodeApplied : '',
      );
      preview = res;
    } catch (_) {
      // Preview gagal → tetap pakai estimasi client, jangan blokir alur.
      preview = null;
    }
    previewing = false;
    notifyListeners();
  }

  Future<void> _loadAvailability() async {
    busyLoading = true;
    notifyListeners();
    try {
      _busy = await _repo.availability(resource.id, date);
    } catch (_) {
      _busy = const [];
    }
    busyLoading = false;
    notifyListeners();
  }

  Future<void> applyPromo(String code) async {
    final trimmed = code.trim();
    if (trimmed.isEmpty || pkg == null || slot == null) {
      promo = null;
      notifyListeners();
      return;
    }
    checkingPromo = true;
    notifyListeners();
    try {
      final res = await _repo.promoPreview(
        code: trimmed.toUpperCase(),
        tenantId: tenant.id,
        resourceId: resource.id,
        startLocal: _startLocal(),
        subtotal: total,
      );
      promo = res;
      promoCodeApplied = res.valid ? trimmed.toUpperCase() : '';
    } catch (_) {
      promo = (
        valid: false,
        discount: 0,
        finalAmount: total,
        label: '',
        message: 'Gagal memvalidasi promo.',
      );
      promoCodeApplied = '';
    }
    checkingPromo = false;
    notifyListeners();
    _schedulePreview();
  }

  void _resetPromo() {
    promo = null;
    promoCodeApplied = '';
  }

  /// Buat booking. Kembalikan hasil (id) atau null bila gagal.
  Future<CreatedBooking?> submit({
    required String customerName,
    required String customerPhone,
  }) async {
    if (!canSubmit || pkg == null) return null;
    submitting = true;
    submitError = null;
    submitException = null;
    notifyListeners();
    try {
      final created = await _repo.createBooking(
        tenantSlug: tenant.slug,
        resourceId: resource.id,
        customerName: customerName,
        customerPhone: customerPhone,
        itemIds: [pkg!.id],
        startLocal: _startLocal(),
        durationUnits: duration,
        promoCode: (promo?.valid ?? false) ? promoCodeApplied : '',
      );
      submitting = false;
      notifyListeners();
      return created;
    } catch (e) {
      submitError = e.toString();
      submitException = e;
      submitting = false;
      notifyListeners();
      return null;
    }
  }

  DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);
}
