/// Metode pembayaran yang tersedia untuk sebuah sales order kasir.
class PosPaymentMethod {
  final String code;
  final String label;
  final String category; // cash | qris | bank_transfer | ...
  final String verificationType; // cash | manual | gateway | auto
  final String instructions;

  const PosPaymentMethod({
    required this.code,
    required this.label,
    required this.category,
    required this.verificationType,
    this.instructions = '',
  });

  bool get isCash =>
      category.toLowerCase() == 'cash' ||
      code.toLowerCase() == 'cash' ||
      verificationType.toLowerCase() == 'cash';

  /// Butuh unggah bukti + verifikasi admin (transfer/QRIS statis).
  bool get isManual => !isCash && verificationType.toLowerCase() == 'manual';

  factory PosPaymentMethod.fromJson(Map<String, dynamic> j) {
    return PosPaymentMethod(
      code: '${j['code'] ?? ''}',
      label: '${j['display_name'] ?? j['label'] ?? j['code'] ?? 'Metode'}',
      category: '${j['category'] ?? ''}',
      verificationType: '${j['verification_type'] ?? ''}',
      instructions: '${j['instructions'] ?? ''}',
    );
  }
}

/// Percobaan pembayaran (transfer/QRIS manual) — bisa membawa bukti (proof_url).
class PosPaymentAttempt {
  final String methodLabel;
  final String verificationType;
  final int amount;
  final String status;
  final String referenceCode;
  final String payerNote;
  final String proofUrl;
  final DateTime? createdAt;

  const PosPaymentAttempt({
    required this.methodLabel,
    this.verificationType = '',
    this.amount = 0,
    this.status = '',
    this.referenceCode = '',
    this.payerNote = '',
    this.proofUrl = '',
    this.createdAt,
  });

  bool get hasProof => proofUrl.trim().isNotEmpty;

  factory PosPaymentAttempt.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return PosPaymentAttempt(
      methodLabel: '${j['method_label'] ?? j['method_code'] ?? 'Pembayaran'}',
      verificationType: '${j['verification_type'] ?? ''}',
      amount: money(j['amount']),
      status: '${j['status'] ?? ''}',
      referenceCode: '${j['reference_code'] ?? ''}',
      payerNote: '${j['payer_note'] ?? ''}',
      proofUrl: '${j['proof_url'] ?? ''}',
      createdAt: DateTime.tryParse('${j['created_at'] ?? ''}')?.toLocal(),
    );
  }
}

/// Satu entri timeline riwayat order (dari backend `events`).
class PosOrderEvent {
  final String type; // created | item_added | payment | payment_submitted | payment_rejected | closed | cancelled
  final String description;
  final int amount;
  final String methodCode;
  final DateTime? createdAt;

  const PosOrderEvent({
    required this.type,
    this.description = '',
    this.amount = 0,
    this.methodCode = '',
    this.createdAt,
  });

  factory PosOrderEvent.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return PosOrderEvent(
      type: '${j['event_type'] ?? ''}',
      description: '${j['description'] ?? ''}',
      amount: money(j['amount']),
      methodCode: '${j['method_code'] ?? ''}',
      createdAt: DateTime.tryParse('${j['created_at'] ?? ''}')?.toLocal(),
    );
  }
}

/// Sales order kasir (F&B walk-in).
class PosOrder {
  final String id;
  final String orderNumber;
  final int grandTotal;
  final int paidAmount;
  final int balanceDue;
  final String status;
  final String paymentStatus;
  final String paymentMethod;
  final DateTime? createdAt;
  final DateTime? completedAt;
  final List<PosPaymentMethod> methods;
  final List<PosOrderLine> items;
  final List<PosPaymentAttempt> attempts;
  final List<PosOrderEvent> events;

  const PosOrder({
    required this.id,
    required this.orderNumber,
    required this.grandTotal,
    this.paidAmount = 0,
    this.balanceDue = 0,
    required this.status,
    required this.paymentStatus,
    this.paymentMethod = '',
    this.createdAt,
    this.completedAt,
    this.methods = const [],
    this.items = const [],
    this.attempts = const [],
    this.events = const [],
  });

  /// Sudah ada pembayaran masuk tapi bon belum tertutup (prabayar bon berjalan):
  /// tagihan saat ini lunas namun status masih terbuka.
  bool get isPrepaidSettled => paidAmount > 0 && balanceDue <= 0;

  factory PosOrder.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    final rawMethods = j['payment_methods'];
    final methods = (rawMethods is List)
        ? rawMethods
            .whereType<Map>()
            .map((e) => PosPaymentMethod.fromJson(Map<String, dynamic>.from(e)))
            .where((m) => m.code.isNotEmpty)
            .toList()
        : <PosPaymentMethod>[];
    final rawItems = j['items'];
    final items = (rawItems is List)
        ? rawItems
            .whereType<Map>()
            .map((e) => PosOrderLine.fromJson(Map<String, dynamic>.from(e)))
            .where((i) => i.name.isNotEmpty)
            .toList()
        : <PosOrderLine>[];
    final rawAttempts = j['payment_attempts'];
    final attempts = (rawAttempts is List)
        ? rawAttempts
            .whereType<Map>()
            .map((e) => PosPaymentAttempt.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : <PosPaymentAttempt>[];
    final rawEvents = j['events'];
    final events = (rawEvents is List)
        ? rawEvents
            .whereType<Map>()
            .map((e) => PosOrderEvent.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : <PosOrderEvent>[];
    final id = '${j['id'] ?? ''}';
    return PosOrder(
      id: id,
      orderNumber: '${j['order_number'] ?? id}',
      grandTotal: money(j['grand_total']),
      paidAmount: money(j['paid_amount']),
      balanceDue: money(j['balance_due']),
      status: '${j['status'] ?? ''}',
      paymentStatus: '${j['payment_status'] ?? ''}',
      paymentMethod: '${j['payment_method'] ?? ''}',
      createdAt: DateTime.tryParse('${j['created_at'] ?? ''}')?.toLocal(),
      completedAt: DateTime.tryParse('${j['completed_at'] ?? ''}')?.toLocal(),
      methods: methods,
      items: items,
      attempts: attempts,
      events: events,
    );
  }

  PosOrder copyWith({
    List<PosPaymentMethod>? methods,
    List<PosOrderLine>? items,
    int? grandTotal,
    String? paymentStatus,
    String? status,
  }) {
    return PosOrder(
      id: id,
      orderNumber: orderNumber,
      grandTotal: grandTotal ?? this.grandTotal,
      paidAmount: paidAmount,
      balanceDue: balanceDue,
      status: status ?? this.status,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      paymentMethod: paymentMethod,
      createdAt: createdAt,
      completedAt: completedAt,
      methods: methods ?? this.methods,
      items: items ?? this.items,
      attempts: attempts,
      events: events,
    );
  }
}

class PosOrderLine {
  final String name;
  final int quantity;
  final int unitPrice;
  final int subtotal;
  final String? category;
  final DateTime? createdAt;

  const PosOrderLine({
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
    this.category,
    this.createdAt,
  });

  /// Kunci identitas item untuk penggabungan (nama + harga satuan).
  String get mergeKey => '${name.toLowerCase()}@$unitPrice';

  factory PosOrderLine.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return PosOrderLine(
      name: '${j['item_name'] ?? j['name'] ?? ''}',
      quantity: money(j['quantity'] ?? 0),
      unitPrice: money(j['price_at_purchase'] ?? j['unit_price'] ?? j['price'] ?? 0),
      subtotal: money(j['subtotal'] ?? money(j['price_at_purchase'] ?? j['unit_price'] ?? j['price'] ?? 0) * money(j['quantity'] ?? 0)),
      category: '${j['category'] ?? ''}'.trim().isEmpty ? null : '${j['category']}',
      createdAt: DateTime.tryParse('${j['created_at'] ?? ''}')?.toLocal(),
    );
  }
}
