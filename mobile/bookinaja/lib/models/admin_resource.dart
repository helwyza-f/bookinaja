// Model resource sisi admin (tenant). Endpoints:
//   GET  /admin/resources/list        → daftar ringkas + jumlah opsi/addon
//   GET  /resources-all/:id           → detail + items
//   POST /resources-all               → buat (cukup name)
//   PUT  /resources-all/:id           → update data utama
//   POST /resources-all/:id/items     → tambah opsi harga / addon
//   PUT  /resources-all/items/:id     → edit item
//   DELETE /resources-all/items/:id   → hapus item

int _money(dynamic v) {
  if (v is num) return v.round();
  if (v is String) return double.tryParse(v)?.round() ?? 0;
  return 0;
}

int _int(dynamic v) {
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v) ?? 0;
  return 0;
}

/// Status resource yang relevan untuk toggle Aktif/Nonaktif.
const kStatusActive = 'available';
const kStatusInactive = 'maintenance';

/// Jenis item.
const kItemMain = 'main_option'; // opsi harga utama (bisa dibooking)
const kItemAddon = 'add_on'; // tambahan opsional

/// Satuan harga yang didukung backend.
const kPriceUnits = ['hour', 'session', 'day', 'week', 'month', 'year'];

String priceUnitLabel(String unit) {
  switch (unit.toLowerCase()) {
    case 'hour':
      return 'Per jam';
    case 'session':
      return 'Per sesi';
    case 'day':
      return 'Per hari';
    case 'week':
      return 'Per minggu';
    case 'month':
      return 'Per bulan';
    case 'year':
      return 'Per tahun';
    default:
      return unit.isEmpty ? 'Per unit' : unit;
  }
}

/// Baris daftar resource (ringkas) — dari /admin/resources/list.
class ResourceListItem {
  final String id;
  final String name;
  final String category;
  final String status;
  final String operatingMode;
  final String imageUrl;
  final String description;
  final int mainOptionCount;
  final int addonCount;

  const ResourceListItem({
    required this.id,
    this.name = '',
    this.category = '',
    this.status = kStatusActive,
    this.operatingMode = '',
    this.imageUrl = '',
    this.description = '',
    this.mainOptionCount = 0,
    this.addonCount = 0,
  });

  bool get isActive => status.toLowerCase() == kStatusActive;
  bool get isBookable => mainOptionCount > 0;

  factory ResourceListItem.fromJson(Map<String, dynamic> j) => ResourceListItem(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        category: '${j['category'] ?? ''}',
        status: '${j['status'] ?? kStatusActive}',
        operatingMode: '${j['operating_mode'] ?? ''}',
        imageUrl: '${j['image_url'] ?? ''}',
        description: '${j['description'] ?? ''}',
        mainOptionCount: _int(j['main_option_count']),
        addonCount: _int(j['addon_count']),
      );
}

/// Item harga/addon dalam sebuah resource.
class ResourceItem {
  final String id;
  final String name;
  final int price;
  final String priceUnit;
  final int unitDuration;
  final String itemType;
  final bool isDefault;

  const ResourceItem({
    this.id = '',
    this.name = '',
    this.price = 0,
    this.priceUnit = 'hour',
    this.unitDuration = 1,
    this.itemType = kItemMain,
    this.isDefault = false,
  });

  bool get isMain => itemType.toLowerCase() != kItemAddon;

  factory ResourceItem.fromJson(Map<String, dynamic> j) => ResourceItem(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        price: _money(j['price']),
        priceUnit: '${j['price_unit'] ?? 'hour'}',
        unitDuration: () {
          final d = _int(j['unit_duration']);
          return d <= 0 ? 1 : d;
        }(),
        itemType: '${j['item_type'] ?? kItemMain}',
        isDefault: j['is_default'] == true,
      );

  Map<String, dynamic> toInput() => {
        'name': name,
        'price': price,
        'price_unit': priceUnit,
        'unit_duration': unitDuration,
        'item_type': itemType,
        'is_default': isDefault,
      };

  ResourceItem copyWith({
    String? id,
    String? name,
    int? price,
    String? priceUnit,
    int? unitDuration,
    String? itemType,
    bool? isDefault,
  }) =>
      ResourceItem(
        id: id ?? this.id,
        name: name ?? this.name,
        price: price ?? this.price,
        priceUnit: priceUnit ?? this.priceUnit,
        unitDuration: unitDuration ?? this.unitDuration,
        itemType: itemType ?? this.itemType,
        isDefault: isDefault ?? this.isDefault,
      );
}

/// Detail lengkap resource + items.
class AdminResource {
  final String id;
  final String name;
  final String category;
  final String operatingMode;
  final String description;
  final String about;
  final String imageUrl;
  final List<String> gallery;
  final String status;
  final String paymentMode;
  final bool dpEnabled;
  final double dpPercentage;
  final List<ResourceItem> items;

  const AdminResource({
    required this.id,
    this.name = '',
    this.category = '',
    this.operatingMode = '',
    this.description = '',
    this.about = '',
    this.imageUrl = '',
    this.gallery = const [],
    this.status = kStatusActive,
    this.paymentMode = '',
    this.dpEnabled = false,
    this.dpPercentage = 0,
    this.items = const [],
  });

  bool get isActive => status.toLowerCase() == kStatusActive;
  List<ResourceItem> get mainOptions => items.where((e) => e.isMain).toList();
  List<ResourceItem> get addons => items.where((e) => !e.isMain).toList();

  factory AdminResource.fromJson(Map<String, dynamic> j) {
    final rawItems = j['items'];
    final items = rawItems is List
        ? rawItems.whereType<Map>().map((e) => ResourceItem.fromJson(Map<String, dynamic>.from(e))).toList()
        : <ResourceItem>[];
    final rawGallery = j['gallery'];
    final gallery = rawGallery is List ? rawGallery.map((e) => '$e').toList() : <String>[];
    double pct(dynamic v) {
      if (v is num) return v.toDouble();
      if (v is String) return double.tryParse(v) ?? 0;
      return 0;
    }

    return AdminResource(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      category: '${j['category'] ?? ''}',
      operatingMode: '${j['operating_mode'] ?? ''}',
      description: '${j['description'] ?? ''}',
      about: '${j['about'] ?? ''}',
      imageUrl: '${j['image_url'] ?? ''}',
      gallery: gallery,
      status: '${j['status'] ?? kStatusActive}',
      paymentMode: '${j['payment_mode'] ?? ''}',
      dpEnabled: j['dp_enabled'] == true,
      dpPercentage: pct(j['dp_percentage']),
      items: items,
    );
  }

  /// Payload untuk PUT /resources-all/:id (data utama). Items dikelola terpisah.
  Map<String, dynamic> toUpdateJson() => {
        'name': name,
        'category': category,
        'operating_mode': operatingMode,
        'description': description,
        'about': about,
        'image_url': imageUrl,
        'gallery': gallery,
        'status': status,
        'payment_mode': paymentMode,
        'dp_enabled': dpEnabled,
        'dp_percentage': dpPercentage,
      };

  AdminResource copyWith({
    String? name,
    String? category,
    String? operatingMode,
    String? description,
    String? about,
    String? imageUrl,
    List<String>? gallery,
    String? status,
    String? paymentMode,
    bool? dpEnabled,
    double? dpPercentage,
    List<ResourceItem>? items,
  }) =>
      AdminResource(
        id: id,
        name: name ?? this.name,
        category: category ?? this.category,
        operatingMode: operatingMode ?? this.operatingMode,
        description: description ?? this.description,
        about: about ?? this.about,
        imageUrl: imageUrl ?? this.imageUrl,
        gallery: gallery ?? this.gallery,
        status: status ?? this.status,
        paymentMode: paymentMode ?? this.paymentMode,
        dpEnabled: dpEnabled ?? this.dpEnabled,
        dpPercentage: dpPercentage ?? this.dpPercentage,
        items: items ?? this.items,
      );
}
