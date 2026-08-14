import '../api/api_client.dart';
import '../models/booking_detail.dart';
import '../models/catalog.dart';
import '../models/customer_booking.dart';
import '../models/customer_order_detail.dart';

/// Data booking milik customer login. Endpoint `/user/me/*` — di-resolve dari
/// klaim `customer_id` pada JWT, lintas-tenant (tanpa header tenant).
class CustomerBookingRepository {
  CustomerBookingRepository(this._api);
  final ApiClient _api;

  static List<CustomerBookingItem> _parseList(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => CustomerBookingItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// GET /user/me/active → {active_bookings, active_orders}. Gabungan booking &
  /// order yang masih berjalan/menunggu, diurut terbaru dulu.
  Future<List<CustomerBookingItem>> active() async {
    final res = await _api.get('/user/me/active');
    final map = res is Map ? Map<String, dynamic>.from(res) : const <String, dynamic>{};
    final items = [..._parseList(map['active_bookings']), ..._parseList(map['active_orders'])];
    items.sort((a, b) => (b.date ?? DateTime(0)).compareTo(a.date ?? DateTime(0)));
    return items;
  }

  /// GET /user/me/history → {past_history, past_orders}. Riwayat selesai/batal.
  Future<List<CustomerBookingItem>> history() async {
    final res = await _api.get('/user/me/history');
    final map = res is Map ? Map<String, dynamic>.from(res) : const <String, dynamic>{};
    final items = [..._parseList(map['past_history']), ..._parseList(map['past_orders'])];
    items.sort((a, b) => (b.date ?? DateTime(0)).compareTo(a.date ?? DateTime(0)));
    return items;
  }

  /// GET /user/me/bookings/:id → detail satu booking milik customer. Response
  /// sama bentuknya dgn detail admin, jadi reuse [BookingDetail]. Endpoint juga
  /// mengisi `can_customer_cancel` & `cancel_require_reason` khusus customer.
  Future<BookingDetail> detail(String id) async {
    final res = await _api.get('/user/me/bookings/$id');
    return BookingDetail.fromJson(Map<String, dynamic>.from(res as Map));
  }

  /// POST /user/me/bookings/:id/cancel → batalkan booking. [reason] wajib bila
  /// kebijakan tenant `cancel_require_reason` = true.
  Future<void> cancel(String id, {String reason = ''}) async {
    await _api.post('/user/me/bookings/$id/cancel',
        body: {if (reason.isNotEmpty) 'reason': reason});
  }

  // --- Order (F&B / direct sale) ---

  /// GET /user/me/orders/:id → detail order milik customer.
  Future<CustomerOrderDetail> orderDetail(String id) async {
    final res = await _api.get('/user/me/orders/$id');
    return CustomerOrderDetail.fromJson(Map<String, dynamic>.from(res as Map));
  }

  /// POST /user/me/orders/:id/manual-payment → ajukan pembayaran manual order
  /// (transfer/QRIS). Menghasilkan attempt menunggu verifikasi admin.
  Future<void> orderManualPayment(String id,
      {required String method, String note = '', String proofUrl = ''}) async {
    await _api.post('/user/me/orders/$id/manual-payment', body: {
      'method': method,
      if (note.isNotEmpty) 'note': note,
      if (proofUrl.isNotEmpty) 'proof_url': proofUrl,
    });
  }

  // --- Live session (self-service saat customer datang) ---

  /// POST /user/me/bookings/:id/activate → mulai sesi (check-in mandiri).
  /// Backend meng-gate: hanya confirmed/paid yang boleh. Return booking terbaru.
  Future<BookingDetail> activate(String id) async {
    final res = await _api.post('/user/me/bookings/$id/activate');
    return BookingDetail.fromJson(Map<String, dynamic>.from(res as Map));
  }

  /// POST /user/me/bookings/:id/complete → tutup sesi (memicu pelunasan bila ada
  /// sisa). Return booking terbaru.
  Future<BookingDetail> complete(String id) async {
    final res = await _api.post('/user/me/bookings/$id/complete');
    return BookingDetail.fromJson(Map<String, dynamic>.from(res as Map));
  }

  /// POST /user/me/bookings/:id/extend → perpanjang [units] satuan (jam/sesi).
  Future<void> extend(String id, int units) async {
    await _api.post('/user/me/bookings/$id/extend',
        body: {'additional_duration': units});
  }

  /// GET /user/me/bookings/:id/availability?date=YYYY-MM-DD → slot sibuk resource
  /// pada tanggal itu (untuk perpanjangan sesi yang sadar bentrok jadwal).
  Future<List<BusySlot>> availability(String id, DateTime date) async {
    final d = '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    final res = await _api.get('/user/me/bookings/$id/availability?date=$d');
    final map = res is Map ? Map<String, dynamic>.from(res) : const <String, dynamic>{};
    final raw = map['busy_slots'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => BusySlot.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// GET /customer/fnb?booking_id=:id → menu F&B tenant untuk booking ini.
  /// Return record ringan (id, nama, harga, kategori) — hanya item tersedia.
  Future<List<({String id, String name, int price, String category})>> fnbMenu(String bookingId) async {
    final res = await _api.get('/customer/fnb?booking_id=$bookingId');
    if (res is! List) return const [];
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return res
        .whereType<Map>()
        .where((e) => e['is_available'] != false)
        .map((e) => (
              id: '${e['id'] ?? ''}',
              name: '${e['name'] ?? '-'}',
              price: money(e['price']),
              category: '${e['category'] ?? ''}',
            ))
        .toList();
  }

  /// POST /user/me/bookings/:id/orders → tambah F&B saat sesi berjalan.
  Future<void> addFnb(String id, {required String fnbItemId, int quantity = 1}) async {
    await _api.post('/user/me/bookings/$id/orders',
        body: {'fnb_item_id': fnbItemId, 'quantity': quantity});
  }

  /// POST /user/me/bookings/:id/addons → tambah add-on/layanan resource saat sesi.
  Future<void> addAddon(String id, String itemId) async {
    await _api.post('/user/me/bookings/$id/addons', body: {'item_id': itemId});
  }
}
