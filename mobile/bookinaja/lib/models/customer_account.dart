/// Identitas customer (pelanggan) — berbeda dari [Account] staff tenant.
/// Dibedakan di backend lewat JWT claim `customer_id`.
class CustomerAccount {
  final String id;
  final String name;
  final String phone;
  final String email;
  final String tier; // NEW, REGULAR, GOLD, VIP
  final String avatarUrl;
  final int loyaltyPoints;

  const CustomerAccount({
    required this.id,
    required this.name,
    required this.phone,
    this.email = '',
    this.tier = 'NEW',
    this.avatarUrl = '',
    this.loyaltyPoints = 0,
  });

  factory CustomerAccount.fromJson(Map<String, dynamic> j) => CustomerAccount(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        phone: '${j['phone'] ?? ''}',
        email: '${j['email'] ?? ''}',
        tier: '${j['tier'] ?? 'NEW'}'.isEmpty ? 'NEW' : '${j['tier'] ?? 'NEW'}',
        avatarUrl: '${j['avatar_url'] ?? ''}',
        loyaltyPoints: (j['loyalty_points'] is num) ? (j['loyalty_points'] as num).toInt() : 0,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'phone': phone,
        'email': email,
        'tier': tier,
        'avatar_url': avatarUrl,
        'loyalty_points': loyaltyPoints,
      };
}

/// Hasil auth customer (verify OTP / login email / login Google) →
/// `{token, customer:{...}}`.
class CustomerAuthResult {
  final String token;
  final CustomerAccount customer;
  const CustomerAuthResult({required this.token, required this.customer});

  factory CustomerAuthResult.fromJson(Map<String, dynamic> j) {
    final cust = (j['customer'] is Map) ? Map<String, dynamic>.from(j['customer'] as Map) : <String, dynamic>{};
    return CustomerAuthResult(
      token: '${j['token'] ?? j['access_token'] ?? ''}',
      customer: CustomerAccount.fromJson(cust),
    );
  }
}
