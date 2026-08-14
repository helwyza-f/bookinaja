/// Satu item pada POS action-feed (`GET /pos/action-feed`).
///
/// Beranchor **per transaksi** (booking atau sales-order): bila satu resource
/// punya 2 booking yang sama-sama perlu ditindak, keduanya muncul sebagai dua
/// item terpisah — sesuai perilaku POS web.
enum PosActionLane { prioritas, live, siap, lainnya }

class PosActionItem {
  final String kind; // 'booking' | 'sales_order'
  final String id; // uuid transaksi (booking id / sales order id)
  final String resourceId;
  final String resourceName;
  final String customerName;
  final String customerPhone;
  final String status;
  final String paymentStatus;
  final String actionLabel; // sudah dilokalkan backend
  final int priority; // makin kecil makin mendesak (5,10,15,20,25,30,35)
  final DateTime? scheduledAt; // lokal
  final DateTime? endTime; // lokal
  final double total;
  final double balanceDue;
  final String operatingMode;

  const PosActionItem({
    required this.kind,
    required this.id,
    required this.resourceId,
    required this.resourceName,
    required this.customerName,
    required this.customerPhone,
    required this.status,
    required this.paymentStatus,
    required this.actionLabel,
    required this.priority,
    required this.scheduledAt,
    required this.endTime,
    required this.total,
    required this.balanceDue,
    required this.operatingMode,
  });

  bool get isBooking => kind == 'booking';
  bool get isSalesOrder => kind == 'sales_order';

  String get _status => status.toLowerCase();
  String get _payment => paymentStatus.toLowerCase();

  bool get requiresVerification => _payment == 'awaiting_verification';

  bool get isOpenSalesOrder =>
      isSalesOrder &&
      !const {'completed', 'closed', 'cancelled'}.contains(_status);

  /// Draft order kosong: sales-order `open` tanpa item & tanpa pembayaran —
  /// biasanya dibuat lalu ditinggal (draft POS web / flow non-tunai terputus).
  /// Bukan pekerjaan nyata, jadi disembunyikan dari feed.
  bool get isEmptyDraft =>
      isSalesOrder && _status == 'open' && total <= 0 && balanceDue <= 0;

  bool get needsBookingSettlement {
    if (!isBooking) return false;
    if (_status != 'completed') return false;
    return balanceDue > 0 ||
        const {
          'pending',
          'partial_paid',
          'unpaid',
          'failed',
          'expired',
          'awaiting_verification',
        }.contains(_payment);
  }

  bool get isActiveBooking =>
      isBooking && const {'active', 'ongoing'}.contains(_status);

  bool isUpcomingBooking(DateTime now, int windowMinutes) {
    if (!isBooking || scheduledAt == null) return false;
    if (!const {'pending', 'confirmed'}.contains(_status)) return false;
    final diff = scheduledAt!.difference(now).inMinutes;
    return diff >= 0 && diff <= windowMinutes;
  }

  /// Klasifikasi lane, meniru logika POS web (urutan penting).
  PosActionLane lane(DateTime now, int windowMinutes) {
    if (isOpenSalesOrder || requiresVerification || needsBookingSettlement) {
      return PosActionLane.prioritas;
    }
    if (isActiveBooking) return PosActionLane.live;
    if (isUpcomingBooking(now, windowMinutes)) return PosActionLane.siap;
    return PosActionLane.lainnya;
  }

  /// Sisa menit sesi (dari end_time). ≤0 berarti overtime/lewat.
  int remainingMinutes(DateTime now) {
    if (endTime == null) return 0;
    return endTime!.difference(now).inMinutes;
  }

  /// Menit sampai mulai (dari scheduled_at).
  int minutesUntilStart(DateTime now) {
    if (scheduledAt == null) return 0;
    return scheduledAt!.difference(now).inMinutes;
  }

  factory PosActionItem.fromJson(Map<String, dynamic> j) {
    double money(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
    DateTime? ts(dynamic v) {
      final s = '${v ?? ''}';
      if (s.isEmpty) return null;
      return DateTime.tryParse(s)?.toLocal();
    }

    return PosActionItem(
      kind: '${j['kind'] ?? 'booking'}',
      id: '${j['id'] ?? ''}',
      resourceId: '${j['resource_id'] ?? ''}',
      resourceName: '${j['resource_name'] ?? ''}',
      customerName: '${j['customer_name'] ?? ''}',
      customerPhone: '${j['customer_phone'] ?? ''}',
      status: '${j['status'] ?? ''}',
      paymentStatus: '${j['payment_status'] ?? ''}',
      actionLabel: '${j['action_label'] ?? ''}',
      priority: j['priority'] is num
          ? (j['priority'] as num).round()
          : int.tryParse('${j['priority'] ?? ''}') ?? 999,
      scheduledAt: ts(j['scheduled_at']),
      endTime: ts(j['end_time']),
      total: money(j['total']),
      balanceDue: money(j['balance_due']),
      operatingMode: '${j['operating_mode'] ?? ''}',
    );
  }
}
