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
      tier: normalizeTier('${j['tier'] ?? ''}'),
      sessions: num0(j['total_visits'] ?? j['sessions'] ?? j['visit_count']),
      spend: num0(j['total_spent'] ?? j['spend'] ?? j['total_spend']),
    );
  }
}

/// Satu baris riwayat transaksi customer (GET /customers/:id/history).
class CustomerHistoryItem {
  final String kind; // booking | order
  final String resource;
  final String date; // iso
  final int total;
  final String status;

  const CustomerHistoryItem({required this.kind, required this.resource, required this.date, required this.total, required this.status});

  factory CustomerHistoryItem.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return CustomerHistoryItem(
      kind: '${j['kind'] ?? 'booking'}',
      resource: '${j['resource'] ?? '-'}',
      date: '${j['date'] ?? ''}',
      total: money(j['grand_total'] ?? j['total_spent'] ?? j['paid_amount']),
      status: '${j['payment_status'] ?? j['status'] ?? ''}'.toLowerCase(),
    );
  }
}

/// Normalisasi tier backend (NEW/REGULAR/GOLD/VIP) ke label internal.
String normalizeTier(String raw) {
  final t = raw.toLowerCase();
  if (t == 'vip' || t == 'gold') return 'vip';
  if (t == 'new') return 'baru';
  if (t == 'regular' || t == 'reguler') return 'reguler';
  return t.isEmpty ? 'reguler' : t;
}
