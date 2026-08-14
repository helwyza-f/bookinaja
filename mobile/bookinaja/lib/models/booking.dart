/// Status booking dinormalisasi untuk UI.
enum BookingStatus { pending, dp, live, review, paid, cancelled, noShow }

BookingStatus bookingStatusFrom(String raw, {String? paymentStatus}) {
  final s = raw.toLowerCase();
  final p = (paymentStatus ?? '').toLowerCase();
  if (s == 'cancelled' || s == 'canceled') return BookingStatus.cancelled;
  if (s == 'no_show') return BookingStatus.noShow;
  if (s == 'ongoing' || s == 'active' || s == 'live') return BookingStatus.live;
  if (p == 'review' || p == 'pending_verification') return BookingStatus.review;
  if (p == 'partial' || p == 'dp' || p == 'deposit') return BookingStatus.dp;
  if (p == 'paid' || s == 'completed') return BookingStatus.paid;
  return BookingStatus.pending;
}

class Booking {
  final String id; // uuid asli (untuk GET /bookings/:id & aksi)
  final String code;
  final String customer;
  final String resource;
  final String time;
  final BookingStatus status;
  final int total;
  final int paid;
  final DateTime? startAt; // waktu mulai (untuk urutan "akan datang")

  const Booking({
    required this.id,
    required this.code,
    required this.customer,
    required this.resource,
    required this.time,
    required this.status,
    required this.total,
    required this.paid,
    this.startAt,
  });

  int get remaining => (total - paid).clamp(0, total);

  Booking copyWith({
    String? id,
    String? code,
    String? customer,
    String? resource,
    String? time,
    BookingStatus? status,
    int? total,
    int? paid,
    DateTime? startAt,
  }) {
    return Booking(
      id: id ?? this.id,
      code: code ?? this.code,
      customer: customer ?? this.customer,
      resource: resource ?? this.resource,
      time: time ?? this.time,
      status: status ?? this.status,
      total: total ?? this.total,
      paid: paid ?? this.paid,
      startAt: startAt ?? this.startAt,
    );
  }

  /// Map dari BookingDetail backend (GET /bookings).
  factory Booking.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    final total = money(j['grand_total'] ?? j['total'] ?? j['total_price']);
    final paid = money(j['paid_amount'] ?? j['paid'] ?? j['deposit_amount']);
    // id HARUS UUID asli (dipakai GET /bookings/:id & aksi) — jangan fallback ke
    // kode BKN, itu bikin 404. code hanya untuk tampilan.
    final id = '${j['id'] ?? ''}';
    final rawCode = '${j['booking_code'] ?? j['code'] ?? ''}';
    final code = rawCode.isNotEmpty ? rawCode : (id.length > 8 ? id.substring(0, 8).toUpperCase() : id);
    return Booking(
      id: id,
      code: code,
      customer: '${j['customer_name'] ?? j['customer'] ?? j['name'] ?? 'Tanpa nama'}',
      resource: '${j['resource_name'] ?? j['resource'] ?? '-'}',
      time: _timeLabel('${j['start_time'] ?? ''}', '${j['end_time'] ?? ''}',
          fallback: '${j['time_label'] ?? j['schedule'] ?? '-'}'),
      status: bookingStatusFrom('${j['status'] ?? ''}', paymentStatus: '${j['payment_status'] ?? ''}'),
      total: total,
      paid: paid,
      startAt: DateTime.tryParse('${j['start_time'] ?? ''}')?.toLocal(),
    );
  }
}

/// Bentuk "16:00 · 2 jam" dari start/end ISO. Ambil jam:menit dari string
/// (menjaga zona waktu tenant), durasi dari selisih.
String _timeLabel(String startIso, String endIso, {String fallback = '-'}) {
  if (startIso.isEmpty || startIso.length < 16) return fallback;
  final hhmm = startIso.substring(11, 16);
  final start = DateTime.tryParse(startIso);
  final end = DateTime.tryParse(endIso);
  if (start == null || end == null) return hhmm;
  final mins = end.difference(start).inMinutes;
  if (mins <= 0) return hhmm;
  final h = mins ~/ 60;
  final m = mins % 60;
  final dur = m == 0 ? '$h jam' : (h == 0 ? '$m mnt' : '${h}j ${m}m');
  return '$hhmm · $dur';
}
