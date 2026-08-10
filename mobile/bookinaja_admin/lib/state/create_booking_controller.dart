import 'package:flutter/foundation.dart';
import '../models/booking.dart';
import '../models/catalog.dart';
import '../repositories/catalog_repository.dart';
import '../repositories/booking_repository.dart';
import '../repositories/customers_repository.dart';
import 'async_value.dart';

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

  /// Pelanggan terdeteksi dari nomor WA (CRM). Null kalau baru.
  ({String name, String tier})? foundCustomer;

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
      final hours = r[2] as ({int openMin, int closeMin});
      _openMin = hours.openMin;
      _closeMin = hours.closeMin;
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

  /// Cek CRM by nomor WA. Kembalikan nama kalau terdaftar (buat auto-fill).
  Future<String?> lookupCustomer(String phone) async {
    final trimmed = phone.trim();
    if (trimmed.length < 9) {
      if (foundCustomer != null) {
        foundCustomer = null;
        notifyListeners();
      }
      return null;
    }
    try {
      foundCustomer = await _customers.validate(trimmed);
    } catch (_) {
      foundCustomer = null;
    }
    notifyListeners();
    return foundCustomer?.name;
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
    notifyListeners();
  }

  Future<void> selectPackage(ResourcePackage p) async {
    pkg = p;
    slot = null;
    duration = 1;
    notifyListeners();
    if (!p.isInterday) await _loadAvailability();
  }

  Future<void> setDate(DateTime d) async {
    date = d;
    slot = null;
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
    notifyListeners();
  }

  void setDuration(int n) {
    duration = n.clamp(1, 30);
    // Slot dipilih lebih dulu (seperti web); durasi baru bisa membuat slot
    // tak muat lagi — batalkan pilihan slot yang jadi tidak tersedia.
    if (slot != null && !slots.any((s) => s.label == slot && s.available)) {
      slot = null;
    }
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
    notifyListeners();
  }

  bool get canSubmit => pkg != null && (isInterday || slot != null) && !submitting;

  /// Submit → kembalikan Booking untuk daftar (null kalau gagal).
  Future<Booking?> submit({required String name, required String phone}) async {
    if (pkg == null || !canSubmit) return null;
    submitting = true;
    submitError = null;
    notifyListeners();

    final DateTime startLocal;
    if (isInterday) {
      startLocal = DateTime(date.year, date.month, date.day, _openMin ~/ 60, _openMin % 60);
    } else {
      final parts = slot!.split(':');
      startLocal = DateTime(date.year, date.month, date.day, int.parse(parts[0]), int.parse(parts[1]));
    }

    try {
      final created = await _bookings.create(
        resourceId: resource!.resourceId,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        itemIds: [pkg!.itemId, ...selectedAddonIds],
        startLocal: startLocal,
        durationUnits: duration,
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
        total: total,
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
