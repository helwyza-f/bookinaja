/// Ragam metode manual — menentukan bentuk form detail.
enum PaymentManualKind { transfer, ewallet, qris }

/// Metode pembayaran tenant (`/admin/payment-methods`). Mencakup tunai,
/// gateway (Midtrans/Xendit), dan manual (transfer bank / e-wallet / QRIS).
/// Metode manual punya detail rekening di [meta].
class PaymentMethod {
  final String id;
  final String code;
  final String displayName;
  final String category;
  final String verificationType; // 'manual' | 'gateway' | 'cash' | ...
  final String provider;
  final String instructions;
  final bool isActive;
  final int sortOrder;
  final PaymentMethodMeta meta;

  const PaymentMethod({
    required this.id,
    required this.code,
    required this.displayName,
    required this.category,
    required this.verificationType,
    required this.provider,
    required this.instructions,
    required this.isActive,
    required this.sortOrder,
    required this.meta,
  });

  /// Metode manual (transfer/e-wallet/QRIS) — butuh detail rekening & bisa
  /// diedit admin. Selain ini (tunai/gateway) hanya di-on/off-kan.
  bool get isManual => verificationType.toLowerCase() == 'manual';

  /// Metode berbasis payment gateway (Midtrans/Xendit) — hanya bisa diaktifkan
  /// bila gateway tenant sudah di-setup.
  bool get isGateway => verificationType.toLowerCase() == 'gateway';

  /// Subtipe metode manual, menentukan form yang tepat.
  PaymentManualKind get manualKind {
    final c = category.toLowerCase();
    final k = '$c ${code.toLowerCase()}';
    if (k.contains('qris')) return PaymentManualKind.qris;
    if (k.contains('ewallet') || k.contains('wallet')) return PaymentManualKind.ewallet;
    return PaymentManualKind.transfer;
  }

  factory PaymentMethod.fromJson(Map<String, dynamic> j) {
    final metaRaw = j['metadata'];
    return PaymentMethod(
      id: '${j['id'] ?? ''}',
      code: '${j['code'] ?? ''}',
      displayName: '${j['display_name'] ?? ''}',
      category: '${j['category'] ?? ''}',
      verificationType: '${j['verification_type'] ?? ''}',
      provider: '${j['provider'] ?? ''}',
      instructions: '${j['instructions'] ?? ''}',
      isActive: j['is_active'] == true,
      sortOrder: j['sort_order'] is num ? (j['sort_order'] as num).toInt() : 0,
      meta: metaRaw is Map
          ? PaymentMethodMeta.fromJson(Map<String, dynamic>.from(metaRaw))
          : const PaymentMethodMeta(),
    );
  }

  /// Bentuk untuk PUT (`TenantPaymentMethodInput`).
  Map<String, dynamic> toInput() => {
        'code': code,
        'display_name': displayName,
        'category': category,
        'verification_type': verificationType,
        'provider': provider,
        'instructions': instructions,
        'is_active': isActive,
        'sort_order': sortOrder,
        'metadata': meta.toJson(),
      };

  PaymentMethod copyWith({
    bool? isActive,
    String? instructions,
    PaymentMethodMeta? meta,
  }) =>
      PaymentMethod(
        id: id,
        code: code,
        displayName: displayName,
        category: category,
        verificationType: verificationType,
        provider: provider,
        instructions: instructions ?? this.instructions,
        isActive: isActive ?? this.isActive,
        sortOrder: sortOrder,
        meta: meta ?? this.meta,
      );
}

class PaymentMethodMeta {
  final String bankName;
  final String accountName;
  final String accountNumber;
  final String qrImageUrl;
  final String footerNote;

  const PaymentMethodMeta({
    this.bankName = '',
    this.accountName = '',
    this.accountNumber = '',
    this.qrImageUrl = '',
    this.footerNote = '',
  });

  factory PaymentMethodMeta.fromJson(Map<String, dynamic> j) => PaymentMethodMeta(
        bankName: '${j['bank_name'] ?? ''}',
        accountName: '${j['account_name'] ?? ''}',
        accountNumber: '${j['account_number'] ?? ''}',
        qrImageUrl: '${j['qr_image_url'] ?? ''}',
        footerNote: '${j['footer_note'] ?? ''}',
      );

  Map<String, dynamic> toJson() => {
        if (bankName.isNotEmpty) 'bank_name': bankName,
        if (accountName.isNotEmpty) 'account_name': accountName,
        if (accountNumber.isNotEmpty) 'account_number': accountNumber,
        if (qrImageUrl.isNotEmpty) 'qr_image_url': qrImageUrl,
        if (footerNote.isNotEmpty) 'footer_note': footerNote,
      };

  PaymentMethodMeta copyWith({
    String? bankName,
    String? accountName,
    String? accountNumber,
    String? qrImageUrl,
    String? footerNote,
  }) =>
      PaymentMethodMeta(
        bankName: bankName ?? this.bankName,
        accountName: accountName ?? this.accountName,
        accountNumber: accountNumber ?? this.accountNumber,
        qrImageUrl: qrImageUrl ?? this.qrImageUrl,
        footerNote: footerNote ?? this.footerNote,
      );
}
