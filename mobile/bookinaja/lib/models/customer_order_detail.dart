import 'booking_detail.dart' show OrderLine, PaymentAttempt, PaymentMethodOption;

/// Detail satu order (F&B / direct sale) milik customer, dari
/// GET /user/me/orders/:id. Bentuk `payment_methods`/`payment_attempts`/`items`
/// sama dengan booking, jadi model sub-nya di-reuse dari [booking_detail.dart].
class CustomerOrderDetail {
  final String id;
  final String customerId;
  final String orderNumber;
  final String orderKind; // menu | direct_sale | booking | public
  final String resourceName;
  final String status;
  final String paymentStatus;
  final int subtotal;
  final int discountAmount;
  final int grandTotal;
  final int paidAmount;
  final int balanceDue;
  final String notes;
  final String createdAt;
  final List<OrderLine> items;
  final List<PaymentAttempt> attempts;
  final List<PaymentMethodOption> methods;

  const CustomerOrderDetail({
    required this.id,
    this.customerId = '',
    this.orderNumber = '',
    this.orderKind = '',
    this.resourceName = '',
    this.status = '',
    this.paymentStatus = '',
    this.subtotal = 0,
    this.discountAmount = 0,
    this.grandTotal = 0,
    this.paidAmount = 0,
    this.balanceDue = 0,
    this.notes = '',
    this.createdAt = '',
    this.items = const [],
    this.attempts = const [],
    this.methods = const [],
  });

  bool get isSettled => paymentStatus == 'settled' || paymentStatus == 'paid' || (balanceDue <= 0 && paidAmount > 0);
  bool get hasBalance => balanceDue > 0;
  bool get hasPendingVerification => attempts.any((a) => a.isPending);
  bool get isCancelled => status == 'cancelled' || status == 'canceled' || status == 'void';

  // Metode manual (transfer/e-wallet verifikasi manual) — tanpa tunai.
  List<PaymentMethodOption> get manualMethods =>
      methods.where((m) => m.isActive && m.isManual && !m.isCash).toList();

  bool get canPay =>
      !isSettled && !isCancelled && balanceDue > 0 && !hasPendingVerification && paymentStatus != 'awaiting_verification';

  List<PaymentAttempt> get pendingAttempts => attempts.where((a) => a.isPending).toList();
  List<PaymentAttempt> get historyAttempts {
    final list = attempts.where((a) => !a.isPending).toList();
    list.sort((a, b) => b.stampIso.compareTo(a.stampIso));
    return list;
  }

  String get kindLabel => switch (orderKind) {
        'menu' => 'Order F&B',
        'direct_sale' => 'Penjualan langsung',
        'booking' => 'Booking',
        'public' => 'Order',
        _ => 'Order',
      };

  String get paymentLabel {
    if (isSettled) return 'Lunas';
    if (hasPendingVerification || paymentStatus == 'awaiting_verification') return 'Menunggu verifikasi';
    if (paidAmount > 0 && balanceDue > 0) return 'Bayar sebagian';
    if (paymentStatus == 'expired') return 'Kadaluarsa';
    if (paymentStatus == 'failed' || paymentStatus == 'denied') return 'Gagal';
    return 'Menunggu pembayaran';
  }

  factory CustomerOrderDetail.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    List asList(dynamic v) => v is List ? v : const [];
    final total = money(j['grand_total']);
    final paid = money(j['paid_amount']);
    return CustomerOrderDetail(
      id: '${j['id'] ?? ''}',
      customerId: '${j['customer_id'] ?? ''}',
      orderNumber: '${j['order_number'] ?? ''}',
      orderKind: '${j['order_kind'] ?? ''}'.toLowerCase(),
      resourceName: '${j['resource_name'] ?? ''}',
      status: '${j['status'] ?? ''}'.toLowerCase(),
      paymentStatus: '${j['payment_status'] ?? ''}'.toLowerCase(),
      subtotal: money(j['subtotal']),
      discountAmount: money(j['discount_amount']),
      grandTotal: total,
      paidAmount: paid,
      balanceDue: j['balance_due'] != null ? money(j['balance_due']) : (total - paid).clamp(0, total),
      notes: '${j['notes'] ?? ''}',
      createdAt: '${j['created_at'] ?? ''}',
      items: asList(j['items']).whereType<Map>().map((e) => OrderLine.fnb(Map<String, dynamic>.from(e))).toList(),
      attempts: asList(j['payment_attempts'])
          .whereType<Map>()
          .map((e) => PaymentAttempt.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      methods: asList(j['payment_methods'])
          .whereType<Map>()
          .map((e) => PaymentMethodOption.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }
}
