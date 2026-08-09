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

  /// Ringkasan hari ini untuk dashboard (omzet + jumlah booking).
  /// GET /bookings/analytics-summary?days=1
  Future<({int omzet, int bookingsToday})> summaryToday() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return (omzet: 1240000, bookingsToday: 8);
    }
    final res = await _api.get('/bookings/analytics-summary?days=1');
    final m = res is Map ? res : const {};
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return (omzet: money(m['revenue']), bookingsToday: money(m['bookings_count']));
  }

  /// Sesi yang sedang berjalan. GET /bookings/pos/active.
  Future<List<LiveSession>> activeSessions() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 250));
      return sampleLive;
    }
    final res = await _api.get('/bookings/pos/active');
    final list = _extractList(res);
    return list.whereType<Map>().map((a) {
      final end = '${a['end_time'] ?? ''}';
      return LiveSession('${a['resource_name'] ?? '-'}', '${a['customer_name'] ?? ''}', _remaining(end), _hhmm(end));
    }).toList();
  }

  String _remaining(String endIso) {
    final end = DateTime.tryParse(endIso);
    if (end == null) return '';
    final mins = end.difference(DateTime.now()).inMinutes;
    if (mins <= 0) return 'lewat';
    if (mins < 60) return 'sisa ${mins}m';
    return 'sisa ${mins ~/ 60}j ${mins % 60}m';
  }

  String _hhmm(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '';
    final l = d.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
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
      final isReview = b.status == BookingStatus.review;
      final isLive = b.status == BookingStatus.live;
      final now = DateTime.now();
      return BookingDetail(
        id: b.id, resourceId: 'r-demo', statusRaw: statusRaw,
        paymentStatus: isReview ? 'awaiting_verification' : (b.paid >= b.total ? 'paid' : (b.paid > 0 ? 'partial_paid' : 'unpaid')),
        customerName: b.customer, customerPhone: '0812••3344', resourceName: b.resource,
        startTime: isLive ? now.subtract(const Duration(minutes: 90)).toIso8601String() : '',
        endTime: isLive ? now.add(const Duration(minutes: 30)).toIso8601String() : '',
        grandTotal: b.total, paidAmount: b.paid,
        balanceDue: (b.total - b.paid).clamp(0, b.total),
        depositAmount: b.paid > 0 && b.paid < b.total ? b.paid : (b.total * 0.3).round(),
        depositOverrideActive: false,
        attempts: isReview
            ? [PaymentAttempt(id: 'att-demo', methodLabel: 'Transfer BCA', amount: (b.total * 0.3).round(), status: 'awaiting_verification', referenceCode: 'TRX-8842', proofUrl: 'bukti.jpg', payerNote: 'Sudah transfer DP')]
            : const [],
        orders: isLive ? const [OrderLine(name: 'Nasi Goreng Spesial', quantity: 1, subtotal: 18000), OrderLine(name: 'Es Kopi Susu', quantity: 2, subtotal: 24000)] : const [],
        options: const [],
        events: [
          TimelineEvent(title: 'Booking dibuat', description: '', actorType: 'customer', actorName: b.customer, createdAt: now.subtract(const Duration(hours: 3)).toIso8601String()),
          if (b.paid > 0) TimelineEvent(title: 'DP dicatat', description: 'Rp${b.paid}', actorType: 'admin', actorName: 'Dinda', createdAt: now.subtract(const Duration(hours: 2)).toIso8601String()),
          if (isLive) TimelineEvent(title: 'Sesi dimulai', description: '', actorType: 'admin', actorName: 'Dinda', createdAt: now.subtract(const Duration(minutes: 90)).toIso8601String()),
        ],
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

  /// Mulai sesi tanpa DP (override). POST /bookings/:id/override-deposit.
  Future<void> overrideDeposit(String id, {String reason = ''}) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.post('/bookings/$id/override-deposit', body: {'reason': reason});
  }

  /// Verifikasi / tolak bukti transfer. POST /bookings/payment-attempts/:id/{verify|reject}.
  Future<void> verifyAttempt(String attemptId) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.post('/bookings/payment-attempts/$attemptId/verify');
  }

  Future<void> rejectAttempt(String attemptId, {String reason = ''}) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.post('/bookings/payment-attempts/$attemptId/reject', body: {'reason': reason, 'admin_note': reason});
  }

  /// Kirim nota via WhatsApp. POST /bookings/:id/receipt/send.
  Future<void> sendReceipt(String id) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.post('/bookings/$id/receipt/send');
  }

  /// Perpanjang sesi. POST /bookings/:id/extend {additional_duration} (unit).
  Future<void> extendSession(String id, int additionalUnits) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.post('/bookings/$id/extend', body: {'additional_duration': additionalUnits});
  }

  /// Tambah F&B ke sesi. POST /bookings/pos/order/:id {fnb_item_id, quantity}.
  Future<void> addFnb(String id, String fnbItemId, int qty) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.post('/bookings/pos/order/$id', body: {'fnb_item_id': fnbItemId, 'quantity': qty});
  }

  /// Tambah add-on ke booking. POST /bookings/:id/addons {item_id}.
  Future<void> addAddon(String id, String itemId) async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      return;
    }
    await _api.post('/bookings/$id/addons', body: {'item_id': itemId});
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
