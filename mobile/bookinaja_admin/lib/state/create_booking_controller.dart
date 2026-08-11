import 'package:flutter/foundation.dart';
import '../models/booking.dart';
import '../models/catalog.dart';
import '../repositories/catalog_repository.dart';
import '../repositories/booking_repository.dart';
import '../repositories/customers_repository.dart';
import 'async_value.dart';

/// Status validasi nomor WA di form booking (mengikuti flow customer web).
enum PhoneStatus { idle, validating, valid, invalid }

/// Flow buat booking: resource → paket → tanggal → slot → durasi → addon → submit.
class CreateBookingController extends ChangeNotifier {
  CreateBookingController(this._catalog, this._bookings, this._customers, {this.initialResourceId = ''});
  final CatalogRepository _catalog;
  final BookingRepository _bookings;
  final CustomersRepository _customers;

  /// Resource yang langsung dipilih (dari Ops "Mulai"). Kosong = pilih manual.
  final String initialResourceId;

  // Jam operasional (menit) — diisi dari profil tenant saat load(). Server tetap validasi.
  int _openMin = 8 * 60;
  int _closeMin = 24 * 60;
  String _tenantId = ''; // untuk preview promo

  /// Pelanggan terdeteksi dari nomor WA (CRM). Null kalau baru.
  ({String name, String tier})? foundCustomer;

  // Status validasi nomor WA + apakah pelanggan lama (mengikuti web).
  PhoneStatus phoneStatus = PhoneStatus.idle;
  bool isReturning = false;

  // Promo (opsional). Di-preview sebelum submit.
  ({bool valid, int discount, int finalAmount, String label, String message})? promo;
  bool checkingPromo = false;
  String promoCodeApplied = ''; // kode (uppercase) yang tervalidasi valid

  AsyncValue<List<ResourceEntry>> resources = const AsyncValue.loading();
  List<Addon> _allAddons = const [];

  ResourceEntry? resource;
  ResourcePackage? pkg;
  DateTime date = DateTime.now();
  List<BusySlot> _busy = const [];
  bool busyLoading = false;
  String? slot; // "HH:mm" (hanya untuk paket berbasis jam/sesi)
  int duration = 1;
  final Set<String> selectedAddonIds = {};

  bool submitting = false;
  String? submitError;

  bool get isInterday => pkg?.isInterday ?? false;
  int get unitMinutes => pkg?.unitDuration ?? 60;
  String get unitLabel => pkg?.unitLabel ?? 'unit';

  List<Addon> get addons =>
      resource == null ? const [] : _allAddons.where((a) => a.resourceId == resource!.resourceId).toList();

  int get total {
    if (pkg == null) return 0;
    final base = pkg!.price * duration;
    final add = addons.where((a) => selectedAddonIds.contains(a.itemId)).fold(0, (s, a) => s + a.price);
    return base + add;
  }

  /// Total setelah promo (kalau ada & valid). Dipakai di ringkasan & submit bar.
  int get grandTotal => (promo?.valid ?? false) ? promo!.finalAmount : total;

  /// Maksimum durasi yang muat dari slot terpilih sampai busy berikutnya / jam
  /// tutup (mengikuti maxAvailableSessions di web). Interday dibatasi 12.
  int get maxDuration {
    if (pkg == null) return 1;
    if (isInterday) return 12;
    if (slot == null) return 30;
    final parts = slot!.split(':');
    final startMin = int.parse(parts[0]) * 60 + int.parse(parts[1]);
    final step = unitMinutes;
    int availableMin = _closeMin - startMin;
    final nextBusy = _busy.where((b) => b.startMin > startMin).fold<int?>(null, (m, b) => m == null || b.startMin < m ? b.startMin : m);
    if (nextBusy != null) availableMin = availableMin < (nextBusy - startMin) ? availableMin : (nextBusy - startMin);
    final max = availableMin ~/ step;
    return max > 0 ? max : 1;
  }

  DateTime _startLocal() {
    if (isInterday) return DateTime(date.year, date.month, date.day, _openMin ~/ 60, _openMin % 60);
    final parts = slot!.split(':');
    return DateTime(date.year, date.month, date.day, int.parse(parts[0]), int.parse(parts[1]));
  }

  bool get isToday => date.year == DateTime.now().year && date.month == DateTime.now().month && date.day == DateTime.now().day;

  /// Slot mulai (HH:mm) + status available — hanya untuk paket non-interday.
  List<({String label, bool available})> get slots {
    if (pkg == null || isInterday) return const [];
    final step = unitMinutes;
    final out = <({String label, bool available})>[];
    final nowMin = DateTime.now().hour * 60 + DateTime.now().minute;
    for (int s = _openMin; s + step <= _closeMin; s += step) {
      final end = s + step * duration;
      final overlaps = _busy.any((b) => s < b.endMin && end > b.startMin);
      final past = isToday && s < nowMin;
      out.add((label: _fmt(s), available: !overlaps && !past && end <= _closeMin));
    }
    return out;
  }

  Future<void> load() async {
    resources = const AsyncValue.loading();
    notifyListeners();
    try {
      final r = await Future.wait([
        _catalog.pricingCatalog(),
        _catalog.addonsCatalog(),
        _catalog.operatingHours(),
      ]);
      _allAddons = r[1] as List<Addon>;
      final hours = r[2] as ({int openMin, int closeMin, String tenantId});
      _openMin = hours.openMin;
      _closeMin = hours.closeMin;
      _tenantId = hours.tenantId;
      final list = r[0] as List<ResourceEntry>;
      resources = AsyncValue.data(list);
      notifyListeners();
      // Pre-select resource kalau datang dari Ops "Mulai".
      if (initialResourceId.isNotEmpty) {
        final match = list.where((e) => e.resourceId == initialResourceId).toList();
        if (match.isNotEmpty) await selectResource(match.first);
      }
    } catch (e) {
      resources = AsyncValue.error(e);
    }
    notifyListeners();
  }

  /// Validasi nomor WA + deteksi pelanggan lama (mengikuti web). Set phoneStatus.
  /// Kembalikan nama untuk auto-fill kalau pelanggan lama & nama masih kosong.
  Future<String?> validatePhoneNumber(String phone) async {
    final trimmed = phone.trim();
    if (trimmed.length < 9) {
      phoneStatus = PhoneStatus.idle;
      isReturning = false;
      if (foundCustomer != null) foundCustomer = null;
      notifyListeners();
      return null;
    }
    phoneStatus = PhoneStatus.validating;
    notifyListeners();
    try {
      final found = await _customers.validate(trimmed);
      if (found != null) {
        foundCustomer = found;
        isReturning = true;
        phoneStatus = PhoneStatus.valid;
        notifyListeners();
        return found.name;
      }
      foundCustomer = null;
      isReturning = false;
      final ok = await _customers.validatePhone(trimmed);
      phoneStatus = ok ? PhoneStatus.valid : PhoneStatus.invalid;
    } catch (_) {
      phoneStatus = PhoneStatus.invalid;
    }
    notifyListeners();
    return null;
  }

  /// Preview kode promo. Butuh paket & slot (untuk non-interday) sudah dipilih.
  Future<void> applyPromo(String code) async {
    final trimmed = code.trim();
    if (trimmed.isEmpty || pkg == null || (!isInterday && slot == null) || resource == null) {
      promo = null;
      notifyListeners();
      return;
    }
    checkingPromo = true;
    notifyListeners();
    try {
      final res = await _bookings.promoPreview(
        code: trimmed.toUpperCase(),
        tenantId: _tenantId,
        resourceId: resource!.resourceId,
        startLocal: _startLocal(),
        subtotal: total,
      );
      promo = res;
      promoCodeApplied = res.valid ? trimmed.toUpperCase() : '';
    } catch (_) {
      promo = (valid: false, discount: 0, finalAmount: total, label: '', message: 'Gagal memvalidasi promo.');
      promoCodeApplied = '';
    }
    checkingPromo = false;
    notifyListeners();
  }

  // Batalkan promo yang sudah diterapkan (dipanggil saat pilihan berubah).
  void _resetPromo() {
    if (promo != null) promo = null;
    promoCodeApplied = '';
  }

  /// Langkah 1: pilih resource → masuk builder.
  Future<void> selectResource(ResourceEntry r) async {
    resource = r;
    pkg = null;
    slot = null;
    duration = 1;
    selectedAddonIds.clear();
    date = DateTime.now();
    // Auto-pilih kalau paketnya cuma satu.
    if (r.packages.length == 1) {
      await selectPackage(r.packages.first);
    } else {
      notifyListeners();
    }
  }

  /// Kembali ke daftar resource.
  void clearResource() {
    resource = null;
    pkg = null;
    slot = null;
    submitError = null;
    _resetPromo();
    notifyListeners();
  }

  Future<void> selectPackage(ResourcePackage p) async {
    pkg = p;
    slot = null;
    duration = 1;
    _resetPromo();
    notifyListeners();
    if (!p.isInterday) await _loadAvailability();
  }

  Future<void> setDate(DateTime d) async {
    date = d;
    slot = null;
    _resetPromo();
    notifyListeners();
    if (pkg != null && !isInterday) await _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    if (resource == null) return;
    busyLoading = true;
    notifyListeners();
    try {
      _busy = await _catalog.availability(resource!.resourceId, date);
    } catch (_) {
      _busy = const [];
    }
    busyLoading = false;
    notifyListeners();
  }

  void selectSlot(String s) {
    slot = s;
    // Slot baru bisa mengubah durasi maksimum — kembalikan ke 1 kalau tak muat.
    if (duration > maxDuration) duration = 1;
    _resetPromo();
    notifyListeners();
  }

  void setDuration(int n) {
    duration = n.clamp(1, maxDuration);
    _resetPromo();
    notifyListeners();
  }

  /// Isi customer langsung dari daftar (picker) — nomor + nama sekaligus.
  void pickCustomer({required String name, required String phone, String tier = ''}) {
    foundCustomer = name.isNotEmpty ? (name: name, tier: tier) : null;
    notifyListeners();
  }

  /// Muat daftar pelanggan (untuk picker "pilih dari daftar").
  Future<List<({String id, String name, String phone, String tier})>> customerList() async {
    final list = await _customers.list();
    return list
        .map((c) => (id: c.id, name: c.name, phone: c.phone, tier: c.tier))
        .toList();
  }

  void toggleAddon(String id) {
    if (!selectedAddonIds.add(id)) selectedAddonIds.remove(id);
    _resetPromo();
    notifyListeners();
  }

  bool get canSubmit => pkg != null && (isInterday || slot != null) && !submitting;

  /// Submit → kembalikan Booking untuk daftar (null kalau gagal).
  Future<Booking?> submit({required String name, required String phone}) async {
    if (pkg == null || !canSubmit) return null;
    submitting = true;
    submitError = null;
    notifyListeners();

    final startLocal = _startLocal();
    final promoApplied = (promo?.valid ?? false) ? promoCodeApplied : '';

    try {
      final created = await _bookings.create(
        resourceId: resource!.resourceId,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        itemIds: [pkg!.itemId, ...selectedAddonIds],
        startLocal: startLocal,
        durationUnits: duration,
        promoCode: promoApplied,
      );
      submitting = false;
      notifyListeners();
      final timeLabel = isInterday
          ? '${_dmy(date)} · $duration ${pkg!.unitLabel}'
          : '$slot · $duration ${pkg!.unitLabel}';
      // Pakai UUID asli dari server agar detail langsung bisa dibuka.
      final id = created.id.isNotEmpty ? created.id : 'BKN-${DateTime.now().millisecondsSinceEpoch % 10000}';
      final code = created.code.isNotEmpty
          ? created.code
          : (id.length > 8 ? id.substring(0, 8).toUpperCase() : id);
      return Booking(
        id: id,
        code: code,
        customer: name.trim(),
        resource: resource!.resourceName,
        time: timeLabel,
        status: BookingStatus.pending,
        total: grandTotal,
        paid: 0,
      );
    } catch (e) {
      submitError = e.toString();
      submitting = false;
      notifyListeners();
      return null;
    }
  }

  String _fmt(int min) => '${(min ~/ 60).toString().padLeft(2, '0')}:${(min % 60).toString().padLeft(2, '0')}';
  String _dmy(DateTime d) => '${d.day}/${d.month}';
}
