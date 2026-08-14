import '../api/api_client.dart';
import '../models/catalog.dart';

/// Hasil pembuatan booking oleh customer.
class CreatedBooking {
  final String id;
  final String code;
  final String accessToken;
  const CreatedBooking({required this.id, this.code = '', this.accessToken = ''});
}

/// Hitungan server-authoritative untuk sebuah pilihan (sebelum booking dibuat):
/// total, diskon, DP, dan "bayar sekarang". Menggantikan estimasi client.
class BookingPreview {
  final int grandTotal;
  final int originalGrandTotal;
  final int discountAmount;
  final int depositAmount;
  final int balanceDue;
  final int amountDueNow;
  final String paymentMode; // none | partial | full
  final String timezone;

  const BookingPreview({
    this.grandTotal = 0,
    this.originalGrandTotal = 0,
    this.discountAmount = 0,
    this.depositAmount = 0,
    this.balanceDue = 0,
    this.amountDueNow = 0,
    this.paymentMode = '',
    this.timezone = '',
  });

  /// Perlu bayar DP di muka (bukan lunas & bukan bayar-di-tempat)?
  bool get hasDeposit => depositAmount > 0 && depositAmount < grandTotal;

  static int _money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;

  factory BookingPreview.fromJson(Map<String, dynamic> j) => BookingPreview(
        grandTotal: _money(j['grand_total']),
        originalGrandTotal: _money(j['original_grand_total']),
        discountAmount: _money(j['discount_amount']),
        depositAmount: _money(j['deposit_amount']),
        balanceDue: _money(j['balance_due']),
        amountDueNow: _money(j['amount_due_now']),
        paymentMode: '${j['payment_mode'] ?? ''}',
        timezone: '${j['timezone'] ?? ''}',
      );
}

/// Format waktu sebagai wall-clock lokal tanpa suffix zona ("YYYY-MM-DDTHH:mm:ss").
/// Backend menafsirkannya di timezone tenant (ParseInLocation), jadi jam yang
/// dipilih customer = jam tenant — tanpa perlu database tz di sisi mobile.
String _isoWallClock(DateTime d) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${d.year.toString().padLeft(4, '0')}-${two(d.month)}-${two(d.day)}'
      'T${two(d.hour)}:${two(d.minute)}:${two(d.second)}';
}

/// Reservasi sisi customer lewat endpoint publik. Customer app selalu dalam
/// keadaan login saat booking, jadi tak perlu alur guest→exchange — booking
/// dibuat langsung atas nama/nomor customer & auto-terhubung ke akunnya.
class CustomerReservationRepository {
  CustomerReservationRepository(this._api);
  final ApiClient _api;

  static List _asList(dynamic v) => v is List ? v : const [];

  /// GET /guest/availability/:resource_id?date=YYYY-MM-DD → busy slots.
  Future<List<BusySlot>> availability(String resourceId, DateTime date) async {
    final d = '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    final res = await _api.get('/guest/availability/$resourceId?date=$d');
    final slots = (res is Map) ? _asList(res['busy_slots']) : const [];
    return slots.whereType<Map>().map((e) => BusySlot.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  /// POST /public/promos/preview — validasi kode promo untuk booking.
  Future<({bool valid, int discount, int finalAmount, String label, String message})> promoPreview({
    required String code,
    required String tenantId,
    required String resourceId,
    required DateTime startLocal,
    required int subtotal,
  }) async {
    final iso = startLocal.toUtc().toIso8601String();
    final res = await _api.post('/public/promos/preview', body: {
      'code': code,
      if (tenantId.isNotEmpty) 'tenant_id': tenantId,
      'resource_id': resourceId,
      'start_time': iso,
      'end_time': iso,
      'subtotal': subtotal,
    });
    final m = res is Map ? res : const {};
    final valid = m['valid'] == true;
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return (
      valid: valid,
      discount: money(m['discount_amount']),
      finalAmount: valid ? money(m['final_amount']) : subtotal,
      label: '${m['label'] ?? m['code'] ?? code}',
      message: '${m['message'] ?? ''}',
    );
  }

  /// POST /public/bookings/preview — total + DP server-authoritative untuk
  /// pilihan saat ini (tanpa membuat booking).
  Future<BookingPreview> preview({
    required String resourceId,
    required List<String> itemIds,
    required DateTime startLocal,
    required int durationUnits,
    String promoCode = '',
  }) async {
    final res = await _api.post('/public/bookings/preview', body: {
      'resource_id': resourceId,
      'item_ids': itemIds,
      'start_time': _isoWallClock(startLocal),
      'duration': durationUnits,
      'promo_code': promoCode,
    });
    return BookingPreview.fromJson(Map<String, dynamic>.from(res as Map));
  }

  /// POST `/public/bookings?slug=<tenantSlug>` — buat booking. Tenant di-resolve
  /// dari query slug (TenantIdentifier). Status default backend: pending.
  Future<CreatedBooking> createBooking({
    required String tenantSlug,
    required String resourceId,
    required String customerName,
    required String customerPhone,
    required List<String> itemIds,
    required DateTime startLocal,
    required int durationUnits,
    String promoCode = '',
  }) async {
    final res = await _api.post('/public/bookings?slug=${Uri.encodeQueryComponent(tenantSlug)}', body: {
      'resource_id': resourceId,
      'customer_name': customerName.trim(),
      'customer_phone': customerPhone.trim(),
      'item_ids': itemIds,
      'start_time': _isoWallClock(startLocal),
      'duration': durationUnits,
      'booking_mode': 'scheduled',
      'promo_code': promoCode,
    });
    final map = res is Map ? res : const {};
    final booking = map['booking'] is Map ? map['booking'] as Map : const {};
    final id = '${map['booking_id'] ?? booking['id'] ?? ''}';
    final code = '${booking['booking_code'] ?? booking['code'] ?? ''}';
    final token = '${booking['access_token'] ?? map['access_token'] ?? ''}';
    return CreatedBooking(id: id, code: code, accessToken: token);
  }
}
