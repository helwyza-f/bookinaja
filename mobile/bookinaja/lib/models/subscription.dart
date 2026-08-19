/// Model langganan & katalog paket untuk paywall / layar langganan mobile.
/// Harga & paket yang bisa dibeli MENCERMINKAN backend (billing.priceFor):
/// hanya Starter & Pro yang dijual; Scale = konsultasi.
library;

/// Interval penagihan.
enum BillingInterval { monthly, annual }

extension BillingIntervalX on BillingInterval {
  /// Nilai yang dikirim ke backend (POST /billing/checkout).
  String get wire => this == BillingInterval.annual ? 'annual' : 'monthly';
  bool get isAnnual => this == BillingInterval.annual;
}

/// Ringkasan langganan tenant (GET /billing/subscription).
class SubscriptionInfo {
  final String plan; // free | trial | starter | pro | scale
  final String status; // trial | active | inactive | expired | ...
  final DateTime? currentPeriodEnd;
  final List<String> planFeatures;

  const SubscriptionInfo({
    required this.plan,
    required this.status,
    this.currentPeriodEnd,
    this.planFeatures = const [],
  });

  factory SubscriptionInfo.fromJson(Map json) {
    DateTime? parseDate(dynamic v) {
      if (v is String && v.isNotEmpty) return DateTime.tryParse(v);
      return null;
    }

    return SubscriptionInfo(
      plan: '${json['plan'] ?? ''}'.toLowerCase(),
      status: '${json['status'] ?? ''}'.toLowerCase(),
      currentPeriodEnd: parseDate(json['current_period_end']),
      planFeatures: (json['plan_features'] is List)
          ? (json['plan_features'] as List).map((e) => '$e').toList()
          : const [],
    );
  }
}

/// Hasil checkout (POST /billing/checkout). [redirectUrl] adalah halaman
/// pembayaran hosted (Midtrans Snap / invoice Xendit) yang dibuka di WebView.
class CheckoutResult {
  final String orderId;
  final String redirectUrl;
  final String snapToken;
  final int amount;

  const CheckoutResult({
    required this.orderId,
    required this.redirectUrl,
    required this.snapToken,
    required this.amount,
  });

  factory CheckoutResult.fromJson(Map json) => CheckoutResult(
        orderId: '${json['order_id'] ?? ''}',
        redirectUrl: '${json['redirect_url'] ?? ''}',
        snapToken: '${json['snap_token'] ?? ''}',
        amount: json['amount'] is int ? json['amount'] as int : 0,
      );

  bool get hasPaymentPage => redirectUrl.isNotEmpty;
}

/// Definisi paket untuk ditampilkan di kartu paywall.
class PlanDef {
  final String key; // starter | pro
  final String name;
  final int monthly;
  final int annual;
  final List<String> highlights;
  final bool recommended;

  const PlanDef({
    required this.key,
    required this.name,
    required this.monthly,
    required this.annual,
    required this.highlights,
    this.recommended = false,
  });

  /// Setara harga per bulan bila ambil paket tahunan.
  int get annualMonthlyEquivalent => (annual / 12).round();

  int priceFor(BillingInterval interval) =>
      interval.isAnnual ? annual : monthly;

  /// Harga /bulan yang ditampilkan besar (tahunan pakai setara bulanan).
  int monthlyDisplay(BillingInterval interval) =>
      interval.isAnnual ? annualMonthlyEquivalent : monthly;
}

/// Katalog paket yang bisa dibeli — cermin backend billing.priceFor.
const kSellablePlans = <PlanDef>[
  PlanDef(
    key: 'starter',
    name: 'Starter',
    monthly: 149000,
    annual: 1490000,
    highlights: [
      'Booking & kasir',
      'Laporan pendapatan',
      'Sampai 10 unit',
    ],
  ),
  PlanDef(
    key: 'pro',
    name: 'Pro',
    monthly: 349000,
    annual: 3490000,
    recommended: true,
    highlights: [
      'Semua fitur Starter',
      'Akun & role staff',
      'Analitik lengkap',
      'Broadcast WhatsApp',
    ],
  ),
];

/// Persen hemat paket tahunan dibanding 12× bulanan (untuk badge toggle).
int annualSavingsPercent() {
  const p = kSellablePlans;
  if (p.isEmpty) return 0;
  final regular = p.first.monthly * 12;
  if (regular == 0) return 0;
  return (((regular - p.first.annual) / regular) * 100).round();
}
