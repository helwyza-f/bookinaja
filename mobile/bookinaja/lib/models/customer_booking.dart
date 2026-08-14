/// Satu baris booking/order milik customer (dari RecentHistoryDTO backend),
/// dipakai di layar "Booking Saya" (aktif & riwayat).
class CustomerBookingItem {
  final String id;
  final String kind; // 'booking' | 'order'
  final String tenantName;
  final String tenantSlug;
  final String resource;
  final DateTime? date;
  final DateTime? endDate;
  final int grandTotal;
  final int balanceDue;
  final String status;
  final String paymentStatus;
  final String paymentMethod;

  const CustomerBookingItem({
    required this.id,
    this.kind = 'booking',
    this.tenantName = '',
    this.tenantSlug = '',
    this.resource = '',
    this.date,
    this.endDate,
    this.grandTotal = 0,
    this.balanceDue = 0,
    this.status = '',
    this.paymentStatus = '',
    this.paymentMethod = '',
  });

  bool get isOrder => kind == 'order';
  bool get isFullyPaid => balanceDue <= 0;

  bool get isTerminal =>
      status == 'cancelled' ||
      status == 'canceled' ||
      status == 'completed' ||
      status == 'no_show';

  /// Booking (bukan order) yang masih perlu dibayar & belum batal/selesai —
  /// bisa dilanjutkan pembayarannya dari "Booking Saya".
  bool get needsPayment => !isOrder && !isTerminal && balanceDue > 0;

  static int _money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
  static DateTime? _date(dynamic v) {
    final s = '${v ?? ''}';
    if (s.isEmpty) return null;
    return DateTime.tryParse(s)?.toLocal();
  }

  factory CustomerBookingItem.fromJson(Map<String, dynamic> j) => CustomerBookingItem(
        id: '${j['id'] ?? ''}',
        kind: '${j['kind'] ?? 'booking'}',
        tenantName: '${j['tenant_name'] ?? ''}',
        tenantSlug: '${j['tenant_slug'] ?? ''}',
        resource: '${j['resource'] ?? ''}',
        date: _date(j['date']),
        endDate: _date(j['end_date']),
        grandTotal: _money(j['grand_total']),
        balanceDue: _money(j['balance_due']),
        status: '${j['status'] ?? ''}'.toLowerCase(),
        paymentStatus: '${j['payment_status'] ?? ''}'.toLowerCase(),
        paymentMethod: '${j['payment_method'] ?? ''}',
      );
}
