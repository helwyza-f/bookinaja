/// Promo / voucher tenant (`/admin/settings/promos`). Diskon persen atau
/// nominal, dengan aturan opsional (min transaksi, kuota, hari/jam, resource).
class Promo {
  final String id;
  final String code;
  final String name;
  final String description;
  final String discountBehavior; // 'locked' | 'floating'
  final String discountType; // 'percentage' | 'fixed'
  final int discountValue;
  final int? maxDiscountAmount;
  final int? minBookingAmount;
  final int? usageLimitTotal;
  final int? usageLimitPerCustomer;
  final List<int> validWeekdays; // 1=Sen .. 7=Min
  final String? timeStart; // 'HH:mm[:ss]'
  final String? timeEnd;
  final String? startsAt; // ISO
  final String? endsAt;
  final List<String> resourceIds;
  final bool isActive;
  final int usageCount;

  const Promo({
    this.id = '',
    this.code = '',
    this.name = '',
    this.description = '',
    this.discountBehavior = 'locked',
    this.discountType = 'percentage',
    this.discountValue = 0,
    this.maxDiscountAmount,
    this.minBookingAmount,
    this.usageLimitTotal,
    this.usageLimitPerCustomer,
    this.validWeekdays = const [],
    this.timeStart,
    this.timeEnd,
    this.startsAt,
    this.endsAt,
    this.resourceIds = const [],
    this.isActive = true,
    this.usageCount = 0,
  });

  bool get isPercentage => discountType == 'percentage';

  factory Promo.fromJson(Map<String, dynamic> j) {
    int? asIntN(dynamic v) => v == null ? null : (v is num ? v.toInt() : int.tryParse('$v'));
    int asInt(dynamic v) => v is num ? v.toInt() : (int.tryParse('$v') ?? 0);
    String? asStrN(dynamic v) => (v == null || '$v'.isEmpty) ? null : '$v';
    return Promo(
      id: '${j['id'] ?? ''}',
      code: '${j['code'] ?? ''}',
      name: '${j['name'] ?? ''}',
      description: '${j['description'] ?? ''}',
      discountBehavior: '${j['discount_behavior'] ?? 'locked'}',
      discountType: '${j['discount_type'] ?? 'percentage'}',
      discountValue: asInt(j['discount_value']),
      maxDiscountAmount: asIntN(j['max_discount_amount']),
      minBookingAmount: asIntN(j['min_booking_amount']),
      usageLimitTotal: asIntN(j['usage_limit_total']),
      usageLimitPerCustomer: asIntN(j['usage_limit_per_customer']),
      validWeekdays: (j['valid_weekdays'] is List)
          ? (j['valid_weekdays'] as List).map((e) => asInt(e)).toList()
          : const [],
      timeStart: asStrN(j['time_start']),
      timeEnd: asStrN(j['time_end']),
      startsAt: asStrN(j['starts_at']),
      endsAt: asStrN(j['ends_at']),
      resourceIds: (j['resource_ids'] is List)
          ? (j['resource_ids'] as List).map((e) => '$e').toList()
          : const [],
      isActive: j['is_active'] == true,
      usageCount: asInt(j['usage_count']),
    );
  }

  Map<String, dynamic> toInput() => {
        'code': code,
        'name': name,
        'description': description,
        'discount_behavior': discountBehavior,
        'discount_type': discountType,
        'discount_value': discountValue,
        'max_discount_amount': maxDiscountAmount,
        'min_booking_amount': minBookingAmount,
        'usage_limit_total': usageLimitTotal,
        'usage_limit_per_customer': usageLimitPerCustomer,
        'valid_weekdays': validWeekdays,
        'time_start': timeStart,
        'time_end': timeEnd,
        'starts_at': startsAt,
        'ends_at': endsAt,
        'resource_ids': resourceIds,
        'is_active': isActive,
      };
}

/// Satu baris histori pemakaian promo.
class PromoRedemption {
  final String id;
  final String customerName;
  final String resourceName;
  final int discountAmount;
  final int finalAmount;
  final String bookingStatus;
  final String redeemedAt;

  const PromoRedemption({
    required this.id,
    required this.customerName,
    required this.resourceName,
    required this.discountAmount,
    required this.finalAmount,
    required this.bookingStatus,
    required this.redeemedAt,
  });

  factory PromoRedemption.fromJson(Map<String, dynamic> j) {
    int asInt(dynamic v) => v is num ? v.toInt() : (int.tryParse('$v') ?? 0);
    return PromoRedemption(
      id: '${j['id'] ?? ''}',
      customerName: '${j['customer_name'] ?? '-'}',
      resourceName: '${j['resource_name'] ?? '-'}',
      discountAmount: asInt(j['discount_amount']),
      finalAmount: asInt(j['final_amount']),
      bookingStatus: '${j['booking_status'] ?? ''}',
      redeemedAt: '${j['redeemed_at'] ?? ''}',
    );
  }
}

/// Ringkasan resource untuk selektor promo.
class ResourceOption {
  final String id;
  final String name;
  const ResourceOption(this.id, this.name);
  factory ResourceOption.fromJson(Map<String, dynamic> j) =>
      ResourceOption('${j['id'] ?? ''}', '${j['name'] ?? ''}');
}
