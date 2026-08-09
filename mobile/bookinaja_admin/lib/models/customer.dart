class Customer {
  final String id;
  final String name;
  final String phone;
  final String tier; // vip | reguler | baru
  final int sessions;
  final int spend;

  const Customer({
    required this.id,
    required this.name,
    required this.phone,
    required this.tier,
    required this.sessions,
    required this.spend,
  });

  factory Customer.fromJson(Map<String, dynamic> j) {
    int num0(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return Customer(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? j['full_name'] ?? 'Tanpa nama'}',
      phone: '${j['phone'] ?? j['whatsapp'] ?? j['phone_number'] ?? '-'}',
      tier: '${j['tier'] ?? 'reguler'}'.toLowerCase(),
      sessions: num0(j['sessions'] ?? j['visit_count'] ?? j['total_sessions']),
      spend: num0(j['spend'] ?? j['total_spend'] ?? j['lifetime_value']),
    );
  }
}
