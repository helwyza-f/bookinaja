/// Ringkasan tenant untuk daftar Discover (GET /public/tenants → items[]).
class TenantDirectoryItem {
  final String id;
  final String name;
  final String slug;
  final String businessCategory;
  final String tagline;
  final String logoUrl;
  final String bannerUrl;
  final String featuredImageUrl;
  final String openTime;
  final String closeTime;
  final int resourceCount;
  final int startingPrice;
  final String topResourceName;
  final String promoLabel;
  final List<String> tags;

  const TenantDirectoryItem({
    required this.id,
    required this.name,
    required this.slug,
    this.businessCategory = '',
    this.tagline = '',
    this.logoUrl = '',
    this.bannerUrl = '',
    this.featuredImageUrl = '',
    this.openTime = '',
    this.closeTime = '',
    this.resourceCount = 0,
    this.startingPrice = 0,
    this.topResourceName = '',
    this.promoLabel = '',
    this.tags = const [],
  });

  /// Gambar utama untuk kartu: featured → banner → logo.
  String get heroImage => featuredImageUrl.isNotEmpty
      ? featuredImageUrl
      : (bannerUrl.isNotEmpty ? bannerUrl : logoUrl);

  static int _money(dynamic v) =>
      v is num ? v.round() : int.tryParse('$v') ?? 0;
  static List<String> _strList(dynamic v) => v is List
      ? v.map((e) => '$e').where((s) => s.isNotEmpty).toList()
      : const [];

  factory TenantDirectoryItem.fromJson(Map<String, dynamic> j) =>
      TenantDirectoryItem(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        slug: '${j['slug'] ?? ''}',
        businessCategory: '${j['business_category'] ?? ''}',
        tagline: '${j['tagline'] ?? j['slogan'] ?? ''}',
        logoUrl: '${j['logo_url'] ?? ''}',
        bannerUrl: '${j['banner_url'] ?? ''}',
        featuredImageUrl: '${j['featured_image_url'] ?? ''}',
        openTime: '${j['open_time'] ?? ''}',
        closeTime: '${j['close_time'] ?? ''}',
        resourceCount: _money(j['resource_count']),
        startingPrice: _money(j['starting_price']),
        topResourceName: '${j['top_resource_name'] ?? ''}',
        promoLabel: '${j['promo_label'] ?? ''}',
        tags: _strList(j['discovery_tags']),
      );
}

/// Profil tenant lengkap (GET /public/landing?slug=X → {profile, resources}).
class TenantProfile {
  final String id;
  final String name;
  final String slug;
  final String businessCategory;
  final String tagline;
  final String aboutUs;
  final String logoUrl;
  final String bannerUrl;
  final String address;
  final String mapIframeUrl;
  final String whatsappNumber;
  final String openTime;
  final String closeTime;
  final List<String> gallery;
  final List<TenantResource> resources;

  const TenantProfile({
    required this.id,
    required this.name,
    required this.slug,
    this.businessCategory = '',
    this.tagline = '',
    this.aboutUs = '',
    this.logoUrl = '',
    this.bannerUrl = '',
    this.address = '',
    this.mapIframeUrl = '',
    this.whatsappNumber = '',
    this.openTime = '',
    this.closeTime = '',
    this.gallery = const [],
    this.resources = const [],
  });

  factory TenantProfile.fromLanding(Map<String, dynamic> j) {
    final p = (j['profile'] is Map)
        ? Map<String, dynamic>.from(j['profile'] as Map)
        : <String, dynamic>{};
    final rawResources = j['resources'];
    final resources = (rawResources is List)
        ? rawResources
              .whereType<Map>()
              .map((e) => TenantResource.fromJson(Map<String, dynamic>.from(e)))
              .toList()
        : <TenantResource>[];
    return TenantProfile(
      id: '${p['id'] ?? ''}',
      name: '${p['name'] ?? ''}',
      slug: '${p['slug'] ?? ''}',
      businessCategory: '${p['business_category'] ?? ''}',
      tagline: '${p['tagline'] ?? p['slogan'] ?? ''}',
      aboutUs: '${p['about_us'] ?? ''}',
      logoUrl: '${p['logo_url'] ?? ''}',
      bannerUrl: '${p['banner_url'] ?? ''}',
      address: '${p['address'] ?? ''}',
      mapIframeUrl: '${p['map_iframe_url'] ?? ''}',
      whatsappNumber: '${p['whatsapp_number'] ?? ''}',
      openTime: '${p['open_time'] ?? ''}',
      closeTime: '${p['close_time'] ?? ''}',
      gallery: TenantDirectoryItem._strList(p['gallery']),
      resources: resources,
    );
  }
}

/// Resource tenant beserta paket harga (dari data landing).
class TenantResource {
  final String id;
  final String name;
  final String category;
  final String description;
  final String imageUrl;
  final List<String> gallery;
  final List<TenantPackage> packages;

  /// Add-on/F&B (itemType add_on) milik resource — bisa dipilih bersama paket
  /// utama. Dipisah dari [packages] karena bukan paket bookable mandiri.
  final List<TenantPackage> addons;

  const TenantResource({
    required this.id,
    required this.name,
    this.category = '',
    this.description = '',
    this.imageUrl = '',
    this.gallery = const [],
    this.packages = const [],
    this.addons = const [],
  });

  int? get startingPrice {
    final prices = packages.map((p) => p.price).where((p) => p > 0).toList()
      ..sort();
    return prices.isEmpty ? null : prices.first;
  }

  factory TenantResource.fromJson(Map<String, dynamic> j) {
    final rawItems = j['items'];
    // Parse sekali, lalu pisahkan: paket bookable vs add-on. Backend
    // mengirim keduanya dalam list `items` yang sama.
    final parsed = (rawItems is List)
        ? rawItems
              .whereType<Map>()
              .map((e) => TenantPackage.fromJson(Map<String, dynamic>.from(e)))
              .toList()
        : <TenantPackage>[];
    // Paket resource dari backend bisa datang sebagai:
    // main_option / main / console_option / package / service.
    final packages = parsed.where(_isBookingPackageType).toList();
    // Add-on/F&B sengaja dipisah dari daftar paket utama.
    final addons = parsed.where(_isAddonType).toList();
    return TenantResource(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      category: '${j['category'] ?? ''}',
      description: '${j['description'] ?? ''}',
      imageUrl: '${j['image_url'] ?? ''}',
      gallery: TenantDirectoryItem._strList(j['gallery']),
      packages: packages,
      addons: addons,
    );
  }

  /// Paket yang memang bisa dipakai di mobile booking flow saat ini.
  /// Mobile hanya mendukung paket berbasis jam/sesi; paket antar-hari
  /// sengaja disembunyikan agar tidak masuk ke alur yang belum didukung.
  List<TenantPackage> get bookablePackages => packages
      .where(_isBookingPackageType)
      .where((p) {
        final unit = p.priceUnit.trim().toLowerCase();
        return unit.isEmpty ||
            unit == 'hour' ||
            unit == 'session' ||
            unit == 'sesi';
      })
      .toList(growable: false);

  static bool _isBookingPackageType(TenantPackage p) {
    final type = p.itemType.trim().toLowerCase();
    if (type.isEmpty) return true;
    return type == 'main_option' ||
        type == 'main' ||
        type == 'console_option' ||
        type == 'package' ||
        type == 'service';
  }

  static bool _isAddonType(TenantPackage p) {
    final type = p.itemType.trim().toLowerCase();
    return type == 'add_on' || type == 'addon';
  }
}

/// Paket/harga bookable pada sebuah resource.
class TenantPackage {
  final String id;
  final String name;
  final String itemType;
  final int price;
  final String priceUnit;
  final int unitDuration;

  const TenantPackage({
    required this.id,
    required this.name,
    this.itemType = '',
    this.price = 0,
    this.priceUnit = '',
    this.unitDuration = 60,
  });

  factory TenantPackage.fromJson(Map<String, dynamic> j) => TenantPackage(
    id: '${j['id'] ?? ''}',
    name: '${j['name'] ?? ''}',
    itemType: '${j['item_type'] ?? ''}',
    price: TenantDirectoryItem._money(j['price']),
    priceUnit: '${j['price_unit'] ?? ''}',
    unitDuration: j['unit_duration'] is num
        ? (j['unit_duration'] as num).toInt()
        : 60,
  );

  String get unitLabel {
    switch (priceUnit.trim().toLowerCase()) {
      case 'hour':
        return 'jam';
      case 'session':
      case 'sesi':
        return 'sesi';
      case 'day':
        return 'hari';
      case 'week':
        return 'minggu';
      case 'month':
        return 'bulan';
      case 'year':
        return 'tahun';
      default:
        return priceUnit.trim().isEmpty ? 'unit' : priceUnit.trim();
    }
  }
}
