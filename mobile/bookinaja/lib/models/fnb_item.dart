import '../utils/fnb_category.dart';

/// Item menu F&B milik tenant. Cermin tabel `fnb_items` di backend.
/// Endpoint: /admin/fnb (GET/POST/PUT/DELETE).
class FnbItem {
  final String id;
  final String name;
  final String description;
  final int price; // rupiah bulat
  final String category;
  final String? imageUrl;
  final bool isAvailable; // Ready / Habis

  const FnbItem({
    required this.id,
    this.name = '',
    this.description = '',
    this.price = 0,
    this.category = '',
    this.imageUrl,
    this.isAvailable = true,
  });

  /// Kategori tampilan ternormalisasi (Bahasa Indonesia, Title Case).
  String get categoryLabel => normalizeFnbCategory(category);

  factory FnbItem.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    final img = j['image_url'];
    final imgStr = img == null ? null : '$img';
    return FnbItem(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      description: '${j['description'] ?? ''}',
      price: money(j['price']),
      category: '${j['category'] ?? ''}',
      imageUrl: (imgStr == null || imgStr.isEmpty) ? null : imgStr,
      isAvailable: j['is_available'] == null ? true : j['is_available'] == true,
    );
  }

  /// Payload untuk Create/Update (UpsertItemReq di backend).
  Map<String, dynamic> toInput() => {
        'name': name,
        'description': description,
        'price': price,
        'category': category,
        'image_url': imageUrl,
        'is_available': isAvailable,
      };

  FnbItem copyWith({
    String? id,
    String? name,
    String? description,
    int? price,
    String? category,
    String? imageUrl,
    bool? isAvailable,
  }) {
    return FnbItem(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      category: category ?? this.category,
      imageUrl: imageUrl ?? this.imageUrl,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }
}
