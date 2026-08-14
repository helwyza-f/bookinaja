/// Metode pembayaran tenant (dari detail booking customer).
class PayMethod {
  final String code;
  final String displayName;
  final String category;
  final String verificationType; // 'auto' | 'manual'
  final String instructions;
  final Map<String, dynamic> metadata;

  const PayMethod({
    required this.code,
    this.displayName = '',
    this.category = '',
    this.verificationType = 'manual',
    this.instructions = '',
    this.metadata = const {},
  });

  bool get isManual => verificationType != 'auto';
  String get label => displayName.isNotEmpty ? displayName : code;

  // Metadata umum untuk instruksi transfer manual / QRIS.
  String get bankName => '${metadata['bank_name'] ?? ''}';
  String get accountNumber => '${metadata['account_number'] ?? ''}';
  String get accountName => '${metadata['account_name'] ?? ''}';
  String get qrImageUrl => '${metadata['qr_image_url'] ?? ''}';

  factory PayMethod.fromJson(Map<String, dynamic> j) => PayMethod(
        code: '${j['code'] ?? ''}',
        displayName: '${j['display_name'] ?? ''}',
        category: '${j['category'] ?? ''}',
        verificationType: '${j['verification_type'] ?? 'manual'}',
        instructions: '${j['instructions'] ?? ''}',
        metadata: (j['metadata'] is Map) ? Map<String, dynamic>.from(j['metadata'] as Map) : const {},
      );
}

/// Info pembayaran satu booking (subset detail /user/me/bookings/:id).
class BookingPaymentInfo {
  final String id;
  final String tenantId;
  final int grandTotal;
  final int depositAmount;
  final String paymentStatus;
  final String status;
  final List<PayMethod> methods;

  const BookingPaymentInfo({
    required this.id,
    this.tenantId = '',
    this.grandTotal = 0,
    this.depositAmount = 0,
    this.paymentStatus = '',
    this.status = '',
    this.methods = const [],
  });

  /// Metode manual yang aktif (auto/Snap belum didukung di mobile).
  List<PayMethod> get manualMethods => methods.where((m) => m.isManual).toList();

  /// Butuh DP dulu? (deposit > 0 & belum lunas DP).
  bool get needsDeposit => depositAmount > 0 && paymentStatus == 'pending';

  /// Nominal yang harus dibayar sekarang: DP kalau ada, kalau tidak total penuh.
  int get amountDue => depositAmount > 0 ? depositAmount : grandTotal;

  /// scope untuk manual-payment: 'deposit' bila masih tahap DP, else 'settlement'.
  String get scope => needsDeposit ? 'deposit' : 'settlement';

  static int _money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;

  factory BookingPaymentInfo.fromJson(Map<String, dynamic> j) {
    final rawMethods = j['payment_methods'];
    // Hanya metode aktif (is_active != false).
    final activeMethods = (rawMethods is List)
        ? rawMethods
            .whereType<Map>()
            .where((m) => m['is_active'] != false)
            .map((e) => PayMethod.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : <PayMethod>[];
    return BookingPaymentInfo(
      id: '${j['id'] ?? ''}',
      tenantId: '${j['tenant_id'] ?? ''}',
      grandTotal: _money(j['grand_total']),
      depositAmount: _money(j['deposit_amount']),
      paymentStatus: '${j['payment_status'] ?? ''}'.toLowerCase(),
      status: '${j['status'] ?? ''}'.toLowerCase(),
      methods: activeMethods,
    );
  }
}
