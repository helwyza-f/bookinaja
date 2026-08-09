class MenuItem {
  final String id;
  final String name;
  final String category;
  final int price;
  final bool available;

  const MenuItem({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    this.available = true,
  });

  factory MenuItem.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return MenuItem(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? j['title'] ?? '-'}',
      category: '${j['category'] ?? j['category_name'] ?? 'Lainnya'}',
      price: money(j['price'] ?? j['unit_price']),
      available: j['available'] ?? j['is_available'] ?? true,
    );
  }
}

/// Baris keranjang kasir.
class CartLine {
  final MenuItem item;
  int qty;
  CartLine(this.item, [this.qty = 1]);
  int get subtotal => item.price * qty;
}
