import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/catalog.dart';
import '../../models/discovery.dart';
import '../../repositories/discovery_repository.dart';
import '../../theme.dart';
import '../../ui/toast.dart';
import '../../ui/error_text.dart';
import '../../utils/slot_engine.dart';
import 'customer_booking_flow.dart';

class ResourceDetailScreen extends StatefulWidget {
  const ResourceDetailScreen({
    super.key,
    required this.tenant,
    required this.resourceId,
    this.preview,
  });

  final TenantProfile tenant;
  final String resourceId;
  final TenantResource? preview;

  @override
  State<ResourceDetailScreen> createState() => _ResourceDetailScreenState();
}

class _ResourceDetailScreenState extends State<ResourceDetailScreen> {
  late Future<_ResourceDetailData> _future;
  DateTime _peekDate = DateTime.now();
  List<BusySlot> _busySlots = const [];
  bool _peekLoading = false;
  bool _peekLoaded = false;
  String? _lightboxImage;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_ResourceDetailData> _load() async {
    final raw = await context.read<DiscoveryRepository>().resourceDetail(
      widget.resourceId,
    );
    return _ResourceDetailData.fromJson(raw);
  }

  Future<void> _reload() async {
    setState(() {
      _future = _load();
      _peekLoaded = false;
    });
  }

  Future<void> _loadPeek(_ResourceDetailData detail) async {
    if (_peekLoading || detail.bestBookablePackage == null) return;
    _peekLoading = true;
    if (mounted) setState(() {});
    try {
      final slots = await context
          .read<DiscoveryRepository>()
          .resourceAvailability(widget.resourceId, _peekDate);
      _busySlots = slots;
    } catch (_) {
      _busySlots = const [];
    } finally {
      _peekLoading = false;
      _peekLoaded = true;
      if (mounted) setState(() {});
    }
  }

  void _openBooking(_ResourceDetailData detail) {
    final bookable = detail.bestBookablePackage;
    if (detail.isDirectSale || bookable == null) {
      _showUnsupportedBookingInfo(detail);
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CustomerBookingFlow(
          tenant: widget.tenant,
          resource: detail.toTenantResource(),
          initialDate: _peekDate,
        ),
      ),
    );
  }

  void _showUnsupportedBookingInfo(_ResourceDetailData detail) {
    final message = detail.mainItems.isEmpty
        ? 'Resource ini belum punya paket booking.'
        : 'Paketnya ada, tapi belum ada yang bisa dibooking lewat mobile. Coba web.';
    BkToast.info(context, message);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_ResourceDetailData>(
      future: _future,
      builder: (context, snap) {
        final preview = widget.preview;

        if (snap.connectionState == ConnectionState.waiting &&
            preview == null) {
          return const Scaffold(
            backgroundColor: BK.bg,
            body: Center(child: CircularProgressIndicator(color: BK.accent)),
          );
        }

        if (snap.hasError && preview == null) {
          return Scaffold(
            backgroundColor: BK.bg,
            body: SafeArea(
              child: StateView(
                icon: Icons.wifi_off_rounded,
                color: BK.crit,
                title: 'Gagal memuat detail resource',
                hint: friendlyError(snap.error),
                action: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent),
                  onPressed: _reload,
                  child: const Text('Coba lagi'),
                ),
              ),
            ),
          );
        }

        final detail = snap.data ?? _ResourceDetailData.fromPreview(preview!);
        if (!_peekLoaded) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) unawaited(_loadPeek(detail));
          });
        }

        return Scaffold(
          backgroundColor: BK.bg,
          body: Stack(
            children: [
              CustomScrollView(
                slivers: [
              SliverAppBar(
                expandedHeight: 320,
                pinned: true,
                backgroundColor: BK.ink,
                foregroundColor: Colors.white,
                leading: Container(
                  margin: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.28),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (detail.imageUrl.isNotEmpty)
                        Image.network(
                          detail.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Container(color: BK.ink),
                        )
                      else
                        Container(color: BK.ink),
                      Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Color(0xAA000000),
                              Color(0xDD000000),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 20,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (detail.category.isNotEmpty)
                              Pill.acc(detail.category),
                            const SizedBox(height: 10),
                            Text(
                              detail.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                height: 1.0,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              detail.heroSummary,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 13.5,
                                height: 1.45,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                  child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (detail.aboutBody.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        _sectionTitle('Tentang'),
                        const SizedBox(height: 10),
                        BKCard(
                          child: Text(
                            detail.aboutBody,
                            maxLines: 4,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13.5,
                              height: 1.55,
                              color: BK.ink2,
                            ),
                          ),
                        ),
                      ],
                      if (detail.galleryImages.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        _sectionTitle('Galeri'),
                        const SizedBox(height: 10),
                        SizedBox(
                          height: 122,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: detail.galleryImages.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(width: 10),
                            itemBuilder: (_, i) =>
                                _galleryTile(detail.galleryImages[i]),
                          ),
                        ),
                      ],
                      if (detail.features.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        _sectionTitle('Fasilitas utama'),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ...detail.features
                                .take(6)
                                .map(
                                  (f) => Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 9,
                                    ),
                                    decoration: BoxDecoration(
                                      color: BK.card,
                                      borderRadius: BorderRadius.circular(999),
                                      border: Border.all(color: BK.line),
                                    ),
                                    child: Text(
                                      f,
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                        color: BK.ink2,
                                      ),
                                    ),
                                  ),
                                ),
                            if (detail.features.length > 6)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 9,
                                ),
                                decoration: BoxDecoration(
                                  color: BK.card2,
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(color: BK.line),
                                ),
                                child: Text(
                                  '+${detail.features.length - 6}',
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: BK.ink3,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                      if (detail.mainItems.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        _sectionTitle(
                          detail.isDirectSale
                              ? 'Produk'
                              : 'Paket',
                        ),
                        const SizedBox(height: 10),
                        ...detail.mainItems.map(_priceCard),
                      ],
                      if (detail.addonItems.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        _sectionTitle('Tambahan'),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: detail.addonItems
                              .map(
                                (item) => Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 9,
                                  ),
                                  decoration: BoxDecoration(
                                    color: BK.card,
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(color: BK.line),
                                  ),
                                  child: Text(
                                    '${item.name} · Rp${rupiah(item.price)}',
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: BK.ink2,
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ],
                      if (!detail.isDirectSale) ...[
                        const SizedBox(height: 6),
                        _sectionTitle(
                          detail.bestBookablePackage == null
                              ? 'Cek slot'
                              : 'Cek slot & booking',
                        ),
                        const SizedBox(height: 10),
                        detail.bestBookablePackage == null
                            ? _unsupportedBookingCard(detail)
                            : _availabilityPanel(detail),
                      ],
                      const SizedBox(height: 20),
                      _locationCard(),
                      const SizedBox(height: 120),
                    ],
                  ),
                ),
              ),
                ],
              ),
              if (_lightboxImage != null)
                Positioned.fill(
                  child: GestureDetector(
                    onTap: () => setState(() => _lightboxImage = null),
                    child: Container(
                      color: Colors.black.withValues(alpha: 0.92),
                      alignment: Alignment.center,
                      child: SafeArea(
                        child: Stack(
                          children: [
                            Center(
                              child: InteractiveViewer(
                                minScale: 1,
                                maxScale: 4,
                                child: Image.network(
                                  _lightboxImage!,
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, _, _) => const Icon(
                                    Icons.broken_image_outlined,
                                    size: 48,
                                    color: Colors.white70,
                                  ),
                                ),
                              ),
                            ),
                            Positioned(
                              right: 16,
                              top: 10,
                              child: Material(
                                color: Colors.transparent,
                                child: IconButton(
                                  onPressed: () =>
                                      setState(() => _lightboxImage = null),
                                  icon: const Icon(
                                    Icons.close_rounded,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          bottomNavigationBar: _bottomBar(detail),
        );
      },
    );
  }

  Widget _galleryTile(String url) => ClipRRect(
    borderRadius: BorderRadius.circular(14),
    child: AspectRatio(
      aspectRatio: 4 / 3,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: url.isEmpty ? null : () => setState(() => _lightboxImage = url),
          child: Stack(
            fit: StackFit.expand,
            children: [
              url.isNotEmpty
                  ? Image.network(
                      url,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Container(color: BK.card2),
                    )
                  : Container(color: BK.card2),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x00000000), Color(0x33000000)],
                  ),
                ),
              ),
              const Positioned(
                right: 8,
                bottom: 8,
                child: Icon(
                  Icons.zoom_in_rounded,
                  size: 18,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );

  Widget _priceCard(_ResourceItemData item) {
    final unitLabel = item.priceUnitLabel;
    final durationLabel = item.unitDuration > 0
        ? humanizeDuration(item.unitDuration)
        : '';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: BKCard(
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.name,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                      color: BK.ink,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    durationLabel.isNotEmpty ? durationLabel : unitLabel,
                    style: const TextStyle(fontSize: 12, color: BK.ink3),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'Rp${rupiah(item.price)}',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: BK.accent,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              '/$unitLabel',
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: BK.ink3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _unsupportedBookingCard(_ResourceDetailData detail) {
    final msg = detail.mainItems.isEmpty
        ? 'Belum ada paket booking yang diunggah untuk resource ini.'
        : 'Paket ada, tapi belum ada yang cocok untuk booking mobile.';
    return BKCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: BK.card2,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.info_outline_rounded,
              size: 18,
              color: BK.ink3,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Booking belum tersedia',
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: BK.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  msg,
                  style: const TextStyle(
                    fontSize: 12.5,
                    height: 1.5,
                    color: BK.ink3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _availabilityPanel(_ResourceDetailData detail) {
    final best = detail.bestBookablePackage!;
    // Slot-engine bersama dengan booking flow — satu sumber kebenaran.
    final window = operatingWindow(widget.tenant.openTime, widget.tenant.closeTime);
    final slots = buildDaySlots(
      openMin: window.open,
      closeMin: window.close,
      stepMin: best.unitDuration,
      date: _peekDate,
      busy: _busySlots,
    );
    final availableCount = slots.where((s) => s.available).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 58,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: 7,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final day = DateTime.now().add(Duration(days: i));
              final selected =
                  _peekDate.year == day.year &&
                  _peekDate.month == day.month &&
                  _peekDate.day == day.day;
              return InkWell(
                onTap: () {
                  setState(() {
                    _peekDate = day;
                    _peekLoaded = false;
                  });
                  unawaited(_loadPeek(detail));
                },
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: 62,
                  decoration: BoxDecoration(
                    color: selected ? BK.accent : BK.card,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: selected ? BK.accent : BK.line),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        i == 0
                            ? 'Hari ini'
                            : i == 1
                            ? 'Besok'
                            : _shortDow(day.weekday),
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: selected ? Colors.white70 : BK.ink3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${day.day}',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: selected ? Colors.white : BK.ink,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        if (_peekLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: BK.accent,
              ),
            ),
          )
        else
          BKCard(
      child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  availableCount > 0
                      ? '$availableCount slot tersedia'
                      : 'Belum ada slot kosong',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: availableCount > 0 ? BK.live : BK.pend,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: slots
                      .map(
                        (slot) => Container(
                          width: 70,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: slot.available ? BK.accentSoft : BK.card2,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: slot.available ? BK.accentSoft : BK.line,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            slot.label,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w800,
                              color: slot.available ? BK.accent : BK.ink3,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 10),
                Text(
                  'Slot ini indikatif. Final booking dihitung di langkah berikutnya.',
                  style: const TextStyle(
                    fontSize: 11.5,
                    height: 1.4,
                    color: BK.ink3,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _locationCard() {
    return BKCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.place_outlined, size: 18, color: BK.ink3),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              widget.tenant.address.isNotEmpty
                  ? widget.tenant.address
                  : 'Alamat tenant belum diisi.',
              style: const TextStyle(
                fontSize: 13.5,
                height: 1.5,
                color: BK.ink2,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _bottomBar(_ResourceDetailData detail) {
    final bookable = !detail.isDirectSale && detail.bestBookablePackage != null;
    final best = detail.bestPriceLabel;
    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: BK.bg.withValues(alpha: 0.96),
          border: const Border(top: BorderSide(color: BK.line)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    bookable ? 'Mulai dari' : 'Belum bisa booking',
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: BK.ink3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    bookable ? best : 'Cek detail paket dulu',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: bookable ? BK.accent : BK.ink,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: bookable ? BK.accent : BK.card2,
                foregroundColor: bookable ? Colors.white : BK.ink3,
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 14,
                ),
              ),
              onPressed: () => _openBooking(detail),
              child: Text(bookable ? 'Lanjut booking' : 'Belum didukung'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String text) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 8),
    child: Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 10.5,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.8,
        color: BK.ink3,
      ),
    ),
  );

}

class _ResourceDetailData {
  final String id;
  final String name;
  final String category;
  final String description;
  final String about;
  final String imageUrl;
  final List<String> gallery;
  final String operatingMode;
  final List<_ResourceItemData> items;

  const _ResourceDetailData({
    required this.id,
    required this.name,
    this.category = '',
    this.description = '',
    this.about = '',
    this.imageUrl = '',
    this.gallery = const [],
    this.operatingMode = '',
    this.items = const [],
  });

  factory _ResourceDetailData.fromJson(Map<String, dynamic> j) {
    final rawItems = j['items'];
    final items = (rawItems is List)
        ? rawItems
              .whereType<Map>()
              .map(
                (e) => _ResourceItemData.fromJson(Map<String, dynamic>.from(e)),
              )
              .toList()
        : <_ResourceItemData>[];

    final gallery = _stringList(j['gallery']);
    return _ResourceDetailData(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      category: '${j['category'] ?? ''}',
      description: '${j['description'] ?? ''}',
      about: '${j['about'] ?? ''}',
      imageUrl: '${j['image_url'] ?? ''}',
      gallery: gallery,
      operatingMode: '${j['operating_mode'] ?? ''}',
      items: items,
    );
  }

  factory _ResourceDetailData.fromPreview(TenantResource preview) =>
      _ResourceDetailData(
        id: preview.id,
        name: preview.name,
        category: preview.category,
        description: preview.description,
        imageUrl: preview.imageUrl,
        items: [...preview.packages, ...preview.addons]
            .map(
              (pkg) => _ResourceItemData(
                id: pkg.id,
                name: pkg.name,
                itemType: pkg.itemType,
                price: pkg.price,
                priceUnit: pkg.priceUnit,
                unitDuration: pkg.unitDuration,
              ),
            )
            .toList(growable: false),
      );

  bool get isDirectSale => operatingMode.trim().toLowerCase() == 'direct_sale';

  List<String> get features => _parseFeatureList(description);

  /// Tagline hero = daftar fasilitas dijoin ("A · B · C") — sesuai maksud form
  /// admin (fasilitas tampil sebagai tagline singkat + chip). Fallback ke narasi
  /// "Tentang" bila fasilitas kosong.
  String get heroSummary {
    if (features.isNotEmpty) return features.join(' · ');
    final a = about.trim();
    if (a.isNotEmpty) return a;
    return 'Detail resource, paket, dan ketersediaan booking.';
  }

  /// Narasi untuk kartu "Tentang" — field terpisah dari fasilitas, jadi tak
  /// pernah dobel dengan hero/chip.
  String get aboutBody => about.trim();

  List<String> get galleryImages {
    final images = <String>[
      imageUrl,
      ...gallery,
      ...items.map((item) => item.imageUrl),
    ].map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    return images.toSet().toList();
  }

  List<_ResourceItemData> get mainItems =>
      items.where(_isMainItem).toList(growable: false);

  List<_ResourceItemData> get addonItems =>
      items.where(_isAddonItem).toList(growable: false);

  /// Sumber kebenaran bookability = [TenantResource.bookablePackages] (dipakai
  /// juga oleh CustomerBookingFlow). Diambil lewat konversi id agar PDP & flow
  /// TIDAK PERNAH berbeda soal apa yang bisa dibooking (mencegah dead-end saat
  /// "Lanjut booking" mendarat di daftar paket kosong).
  List<_ResourceItemData> get bookablePackages {
    final bookableIds =
        toTenantResource().bookablePackages.map((p) => p.id).toSet();
    return items
        .where((it) => bookableIds.contains(it.id))
        .toList(growable: false);
  }

  _ResourceItemData? get bestBookablePackage {
    if (bookablePackages.isEmpty) return null;
    final sorted = [...bookablePackages]
      ..sort((a, b) => a.price.compareTo(b.price));
    return sorted.first;
  }

  String get bestPriceLabel {
    final best = bestBookablePackage;
    if (best != null) {
      return 'Rp${rupiah(best.price)}';
    }
    final allMain = [...mainItems]..sort((a, b) => a.price.compareTo(b.price));
    if (allMain.isNotEmpty && allMain.first.price > 0) {
      return 'Rp${rupiah(allMain.first.price)}';
    }
    return '';
  }

  TenantResource toTenantResource() {
    TenantPackage toPkg(_ResourceItemData item) => TenantPackage(
      id: item.id,
      name: item.name,
      itemType: item.itemType,
      price: item.price,
      priceUnit: item.priceUnit,
      unitDuration: item.unitDuration,
    );
    // Pisahkan add-on dari paket agar CustomerBookingController.addons terisi.
    // packages tetap berisi item non-add-on (bookablePackages menyaring lagi).
    return TenantResource(
      id: id,
      name: name,
      category: category,
      description: description,
      imageUrl: imageUrl,
      packages: items
          .where((it) => !_isAddonItem(it))
          .map(toPkg)
          .toList(growable: false),
      addons: addonItems.map(toPkg).toList(growable: false),
    );
  }
}

class _ResourceItemData {
  final String id;
  final String name;
  final String itemType;
  final int price;
  final String priceUnit;
  final int unitDuration;
  final String imageUrl;

  const _ResourceItemData({
    required this.id,
    required this.name,
    this.itemType = '',
    this.price = 0,
    this.priceUnit = '',
    this.unitDuration = 60,
    this.imageUrl = '',
  });

  factory _ResourceItemData.fromJson(Map<String, dynamic> j) =>
      _ResourceItemData(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        itemType: '${j['item_type'] ?? ''}',
        price: _money(j['price']),
        priceUnit: '${j['price_unit'] ?? ''}',
        unitDuration: j['unit_duration'] is num
            ? (j['unit_duration'] as num).toInt()
            : 60,
        imageUrl: '${j['image_url'] ?? ''}',
      );

  String get priceUnitLabel {
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

bool _isMainItem(_ResourceItemData item) {
  return [
    'main_option',
    'main',
    'console_option',
    'package',
    'pricing',
    'service',
  ].contains(item.itemType.trim().toLowerCase());
}

bool _isAddonItem(_ResourceItemData item) {
  return ['add_on', 'addon'].contains(item.itemType.trim().toLowerCase());
}

List<String> _stringList(dynamic value) {
  if (value is List) {
    return value
        .map((e) => '$e')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
  }
  return const [];
}

int _money(dynamic value) {
  if (value is num) return value.round();
  return int.tryParse('$value') ?? 0;
}

String _shortDow(int weekday) {
  switch (weekday) {
    case DateTime.monday:
      return 'Sen';
    case DateTime.tuesday:
      return 'Sel';
    case DateTime.wednesday:
      return 'Rab';
    case DateTime.thursday:
      return 'Kam';
    case DateTime.friday:
      return 'Jum';
    case DateTime.saturday:
      return 'Sab';
    default:
      return 'Min';
  }
}

String humanizeDuration(int minutesValue) {
  final total = minutesValue;
  if (total <= 0) return '';
  final hours = total ~/ 60;
  final minutes = total % 60;
  if (hours == 0) return '$minutes menit';
  if (minutes == 0) return '$hours jam';
  return '$hours jam $minutes menit';
}

List<String> _parseFeatureList(String? description) {
  final raw = '$description'.trim();
  if (raw.isEmpty || raw.contains('.')) return const [];
  final parts = raw
      .split(',')
      .map((part) => part.trim())
      .where((part) => part.isNotEmpty)
      .toList();
  return parts.length >= 2 ? parts : const [];
}
