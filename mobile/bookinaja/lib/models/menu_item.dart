import '../utils/fnb_category.dart';

class MenuItem {
  final String id;
  final String name;
  final String category;
  final int price;
  final bool available;
  final String imageUrl;

  const MenuItem({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    this.available = true,
    this.imageUrl = '',
  });

  bool get hasImage => imageUrl.trim().isNotEmpty;

  /// Kategori ternormalisasi (Bahasa Indonesia, Title Case) untuk tampilan.
  String get categoryLabel => normalizeFnbCategory(category);

  factory MenuItem.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return MenuItem(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? j['title'] ?? '-'}',
      category: '${j['category'] ?? j['category_name'] ?? 'Lainnya'}',
      price: money(j['price'] ?? j['unit_price']),
      available: j['available'] ?? j['is_available'] ?? true,
      imageUrl: '${j['image_url'] ?? j['image'] ?? ''}'.trim() == 'null' ? '' : '${j['image_url'] ?? j['image'] ?? ''}'.trim(),
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
