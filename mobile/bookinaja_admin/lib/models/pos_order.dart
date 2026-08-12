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

/// Sales order kasir (F&B walk-in).
class PosOrder {
  final String id;
  final String orderNumber;
  final int grandTotal;
  final String status;
  final String paymentStatus;
  final List<PosPaymentMethod> methods;

  const PosOrder({
    required this.id,
    required this.orderNumber,
    required this.grandTotal,
    required this.status,
    required this.paymentStatus,
    this.methods = const [],
  });

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
    final id = '${j['id'] ?? ''}';
    return PosOrder(
      id: id,
      orderNumber: '${j['order_number'] ?? id}',
      grandTotal: money(j['grand_total']),
      status: '${j['status'] ?? ''}',
      paymentStatus: '${j['payment_status'] ?? ''}',
      methods: methods,
    );
  }

  PosOrder copyWith({List<PosPaymentMethod>? methods, int? grandTotal, String? paymentStatus, String? status}) {
    return PosOrder(
      id: id,
      orderNumber: orderNumber,
      grandTotal: grandTotal ?? this.grandTotal,
      status: status ?? this.status,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      methods: methods ?? this.methods,
    );
  }
}
