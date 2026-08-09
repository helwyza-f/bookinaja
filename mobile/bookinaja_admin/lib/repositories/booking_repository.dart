import '../api/api_client.dart';
import '../config.dart';
import '../data/sample_data.dart';
import '../models/booking.dart';
import '../models/booking_detail.dart';

/// Akses data booking. Endpoint admin: GET /bookings (bearer + permission).
class BookingRepository {
  BookingRepository(this._api);
  final ApiClient _api;

  Future<List<Booking>> listAll() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400)); // simulasi latency
      return sampleBookings;
    }

    final res = await _api.get('/bookings');
    final list = _extractList(res);
    return list
        .whereType<Map>()
        .map((e) => Booking.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Detail satu booking. GET /bookings/:id.
  Future<BookingDetail> getDetail(String id) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 350));
      final b = sampleBookings.firstWhere((e) => e.id == id, orElse: () => sampleBookings.first);
      final statusRaw = switch (b.status) {
        BookingStatus.live => 'active',
        BookingStatus.paid => 'completed',
        BookingStatus.cancelled => 'cancelled',
        BookingStatus.dp => 'confirmed',
        BookingStatus.review => 'pending',
        BookingStatus.pending => 'pending',
      };
      return BookingDetail(
        id: b.id, statusRaw: statusRaw,
        paymentStatus: b.paid >= b.total ? 'paid' : (b.paid > 0 ? 'partial_paid' : 'unpaid'),
        customerName: b.customer, customerPhone: '0812••3344', resourceName: b.resource,
        startTime: '', endTime: '', grandTotal: b.total, paidAmount: b.paid,
        balanceDue: (b.total - b.paid).clamp(0, b.total),
        depositAmount: b.paid > 0 && b.paid < b.total ? b.paid : 0, depositOverrideActive: false,
      );
    }
    final res = await _api.get('/bookings/$id');
    return BookingDetail.fromJson(Map<String, dynamic>.from(res as Map));
  }

  /// Ubah status: confirmed | active(mulai) | completed(akhiri) | cancelled.
  /// [reason] dipakai khusus saat cancel (disimpan + masuk timeline audit).
  Future<void> updateStatus(String id, String status, {String reason = ''}) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.put('/bookings/$id/status', body: {'status': status, if (reason.isNotEmpty) 'reason': reason});
  }

  /// Catat DP (cash). POST /bookings/:id/record-deposit.
  Future<void> recordDeposit(String id, {String notes = ''}) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.post('/bookings/$id/record-deposit', body: {'notes': notes});
  }

  /// Lunasi cash penuh. POST /bookings/:id/settle-cash.
  Future<void> settleCash(String id) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.post('/bookings/$id/settle-cash');
  }

  /// Buat booking manual (admin). POST /bookings/manual.
  /// item_ids = [mainPackageId, ...addonIds]. duration = jumlah unit.
  Future<void> create({
    required String resourceId,
    required String customerName,
    required String customerPhone,
    required List<String> itemIds,
    required DateTime startLocal,
    required int durationUnits,
    String bookingMode = 'scheduled',
    String promoCode = '',
  }) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 500));
      return;
    }
    await _api.post('/bookings/manual', body: {
      'resource_id': resourceId,
      'customer_name': customerName.toUpperCase(),
      'customer_phone': customerPhone,
      'item_ids': itemIds,
      'start_time': startLocal.toUtc().toIso8601String(),
      'duration': durationUnits,
      'booking_mode': bookingMode,
      'promo_code': promoCode,
    });
  }

  /// Backend bisa balikin array langsung atau {data:[...]} / {bookings:[...]}.
  List _extractList(dynamic res) {
    if (res is List) return res;
    if (res is Map) {
      for (final key in ['data', 'bookings', 'items', 'results']) {
        if (res[key] is List) return res[key] as List;
      }
    }
    return const [];
  }
}
