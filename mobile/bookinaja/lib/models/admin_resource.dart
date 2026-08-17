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
    case 'pcs':
      return 'Per pcs';
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

/// Durasi default satu unit (dalam menit) menurut pola jual. Backend membaca
/// `unit_duration` sebagai MENIT (default 60), bukan hitungan unit.
int defaultUnitMinutes(String unit) {
  switch (unit.toLowerCase()) {
    case 'day':
      return 1440;
    case 'week':
      return 10080;
    case 'month':
      return 43200;
    case 'year':
      return 525600;
    default:
      return 60; // hour + session
  }
}

/// Batasi jam paket (metadata.time_lock).
class ItemTimeLock {
  final bool enabled;
  final String from; // "HH:MM"
  final String to; // "HH:MM" (atau "24:00" = tengah malam)
  const ItemTimeLock({this.enabled = false, this.from = '08:00', this.to = '17:00'});

  factory ItemTimeLock.fromJson(Map<String, dynamic> j) => ItemTimeLock(
        enabled: j['enabled'] == true,
        from: '${j['from'] ?? '08:00'}',
        to: '${j['to'] ?? '17:00'}',
      );

  Map<String, dynamic> toJson() =>
      enabled ? {'enabled': true, 'from': from, 'to': to} : {'enabled': false};

  ItemTimeLock copyWith({bool? enabled, String? from, String? to}) =>
      ItemTimeLock(enabled: enabled ?? this.enabled, from: from ?? this.from, to: to ?? this.to);
}

/// Batasi hari paket (metadata.day_lock). Hari ISO: 1=Sen … 7=Min.
class ItemDayLock {
  final bool enabled;
  final List<int> days;
  const ItemDayLock({this.enabled = false, this.days = const []});

  factory ItemDayLock.fromJson(Map<String, dynamic> j) => ItemDayLock(
        enabled: j['enabled'] == true,
        days: (j['days'] is List)
            ? (j['days'] as List).map((e) => _int(e)).where((e) => e >= 1 && e <= 7).toList()
            : const [],
      );

  Map<String, dynamic> toJson() => enabled
      ? {'enabled': true, 'days': ([...days]..sort())}
      : {'enabled': false};

  ItemDayLock copyWith({bool? enabled, List<int>? days}) =>
      ItemDayLock(enabled: enabled ?? this.enabled, days: days ?? this.days);
}

/// Saran addon dari resource lain (untuk fitur "salin addon").
class AddonSuggestion {
  final String name;
  final int price;
  final String priceUnit;
  final String resourceName;
  const AddonSuggestion({
    required this.name,
    required this.price,
    this.priceUnit = 'pcs',
    this.resourceName = '',
  });
}

/// Item harga/addon dalam sebuah resource.
class ResourceItem {
  final String id;
  final String name;
  final int price;
  final String priceUnit;
  final int unitDuration; // MENIT durasi satu unit (main), 0 untuk addon
  final String itemType;
  final bool isDefault;
  final ItemTimeLock timeLock;
  final ItemDayLock dayLock;

  const ResourceItem({
    this.id = '',
    this.name = '',
    this.price = 0,
    this.priceUnit = 'hour',
    this.unitDuration = 60,
    this.itemType = kItemMain,
    this.isDefault = false,
    this.timeLock = const ItemTimeLock(),
    this.dayLock = const ItemDayLock(),
  });

  bool get isMain => itemType.toLowerCase() != kItemAddon;

  factory ResourceItem.fromJson(Map<String, dynamic> j) {
    final meta = j['metadata'];
    final metaMap = meta is Map ? Map<String, dynamic>.from(meta) : const <String, dynamic>{};
    final tl = metaMap['time_lock'];
    final dl = metaMap['day_lock'];
    return ResourceItem(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      price: _money(j['price']),
      priceUnit: '${j['price_unit'] ?? 'hour'}',
      unitDuration: () {
        final d = _int(j['unit_duration']);
        return d <= 0 ? defaultUnitMinutes('${j['price_unit'] ?? 'hour'}') : d;
      }(),
      itemType: '${j['item_type'] ?? kItemMain}',
      isDefault: j['is_default'] == true,
      timeLock: tl is Map ? ItemTimeLock.fromJson(Map<String, dynamic>.from(tl)) : const ItemTimeLock(),
      dayLock: dl is Map ? ItemDayLock.fromJson(Map<String, dynamic>.from(dl)) : const ItemDayLock(),
    );
  }

  Map<String, dynamic> toInput() {
    final map = <String, dynamic>{
      'name': name,
      'price': price,
      'price_unit': priceUnit,
      'unit_duration': isMain ? unitDuration : 0,
      'item_type': itemType,
      'is_default': isMain ? isDefault : false,
    };
    // Penguncian jam/hari hanya untuk paket utama; kirim state eksplisit
    // (enabled:false) agar penonaktifan ikut tersimpan.
    if (isMain) {
      map['metadata'] = {
        'time_lock': timeLock.toJson(),
        'day_lock': dayLock.toJson(),
      };
    }
    return map;
  }

  ResourceItem copyWith({
    String? id,
    String? name,
    int? price,
    String? priceUnit,
    int? unitDuration,
    String? itemType,
    bool? isDefault,
    ItemTimeLock? timeLock,
    ItemDayLock? dayLock,
  }) =>
      ResourceItem(
        id: id ?? this.id,
        name: name ?? this.name,
        price: price ?? this.price,
        priceUnit: priceUnit ?? this.priceUnit,
        unitDuration: unitDuration ?? this.unitDuration,
        timeLock: timeLock ?? this.timeLock,
        dayLock: dayLock ?? this.dayLock,
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
