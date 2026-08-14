import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../models/discovery.dart';
import '../../repositories/discovery_repository.dart';
import '../../theme.dart';
import '../../ui/toast.dart';
import 'resource_detail_screen.dart';

/// Tenant detail sebagai landing mini: orientasi, trust, lalu pilih resource.
class TenantProfileScreen extends StatefulWidget {
  final String slug;
  final String fallbackName;

  const TenantProfileScreen({
    super.key,
    required this.slug,
    this.fallbackName = '',
  });

  @override
  State<TenantProfileScreen> createState() => _TenantProfileScreenState();
}

class _TenantProfileScreenState extends State<TenantProfileScreen> {
  late Future<TenantProfile> _future;
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _aboutKey = GlobalKey();
  final GlobalKey _galleryKey = GlobalKey();
  final GlobalKey _catalogKey = GlobalKey();
  final GlobalKey _locationKey = GlobalKey();
  String? _lightboxImage;

  @override
  void initState() {
    super.initState();
    _future = context.read<DiscoveryRepository>().tenantProfile(widget.slug);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _reload() => setState(() {
    _future = context.read<DiscoveryRepository>().tenantProfile(widget.slug);
  });

  Future<void> _jumpTo(GlobalKey key) async {
    final ctx = key.currentContext;
    if (ctx == null) return;
    await Scrollable.ensureVisible(
      ctx,
      alignment: 0.05,
      duration: const Duration(milliseconds: 420),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      body: FutureBuilder<TenantProfile>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: BK.accent),
            );
          }

          if (snap.hasError) {
            return SafeArea(
              child: StateView(
                icon: Icons.wifi_off_rounded,
                color: BK.crit,
                title: 'Gagal memuat profil',
                hint: '${snap.error}',
                action: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent),
                  onPressed: _reload,
                  child: const Text('Coba lagi'),
                ),
              ),
            );
          }

          final p = snap.data!;
          final metrics = _tenantMetrics(p);
          final featured = _featuredResources(p);
          final remaining = _remainingResources(p, featured);
          final galleryImages = _galleryImages(p);

          return Scaffold(
            backgroundColor: BK.bg,
            body: Stack(
              children: [
                CustomScrollView(
                  controller: _scrollController,
                  slivers: [
                    SliverAppBar(
                      expandedHeight: 360,
                      pinned: true,
                      backgroundColor: BK.ink,
                      foregroundColor: Colors.white,
                      leading: Container(
                        margin: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.30),
                          shape: BoxShape.circle,
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.arrow_back_rounded),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ),
                      flexibleSpace: FlexibleSpaceBar(
                        title: const SizedBox.shrink(),
                        background: Stack(
                          fit: StackFit.expand,
                          children: [
                            _heroBackground(p),
                            const DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Color(0x12000000),
                                    Color(0x22000000),
                                    Color(0xCC000000),
                                  ],
                                ),
                              ),
                            ),
                            Positioned(
                              left: 16,
                              right: 16,
                              bottom: 18,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      if (p.businessCategory.isNotEmpty)
                                        Pill.acc(p.businessCategory),
                                      if (p.businessCategory.isNotEmpty)
                                        const SizedBox(width: 8),
                                      if (_openStatus(p) != null)
                                        Pill.live(_openStatus(p)!),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    p.name.isEmpty
                                        ? widget.fallbackName
                                        : p.name,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 32,
                                      height: 0.98,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -0.6,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    p.tagline.isNotEmpty
                                        ? p.tagline
                                        : 'Pilih resource yang pas.',
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 13.5,
                                      height: 1.45,
                                    ),
                                  ),
                                  const SizedBox(height: 14),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      if (metrics.openText.isNotEmpty)
                                        _heroChip(metrics.openText),
                                      if (metrics.addressShort.isNotEmpty)
                                        _heroChip(metrics.addressShort),
                                      _heroChip(
                                        '${metrics.resourceCount} unit',
                                      ),
                                    ],
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
                            if (p.aboutUs.isNotEmpty) ...[
                              const SizedBox(height: 16),
                              _section(
                                key: _aboutKey,
                                title: 'Tentang',
                                child: BKCard(
                                  child: Text(
                                    p.aboutUs,
                                    maxLines: 4,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 13.5,
                                      height: 1.7,
                                      color: BK.ink2,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                            if (galleryImages.isNotEmpty) ...[
                              const SizedBox(height: 16),
                              _section(
                                key: _galleryKey,
                                title: 'Galeri',
                                child: SizedBox(
                                  height: 124,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: galleryImages.length.clamp(0, 6),
                                    separatorBuilder: (_, _) =>
                                        const SizedBox(width: 10),
                                    itemBuilder: (_, i) =>
                                        _galleryTile(galleryImages[i]),
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),
                            _section(
                              key: _catalogKey,
                              title: 'Resource',
                              child: featured.isEmpty
                                  ? const BKCard(
                                      child: Text(
                                        'Belum ada resource.',
                                        style: TextStyle(
                                          fontSize: 13.5,
                                          color: BK.ink3,
                                        ),
                                      ),
                                    )
                                  : Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        SizedBox(
                                          height: 250,
                                          child: ListView.separated(
                                            scrollDirection: Axis.horizontal,
                                            itemCount: featured.length,
                                            separatorBuilder: (_, _) =>
                                                const SizedBox(width: 12),
                                            itemBuilder: (_, i) =>
                                                _featuredResourceCard(
                                                  p,
                                                  featured[i],
                                                ),
                                          ),
                                        ),
                                        if (remaining.isNotEmpty) ...[
                                          const SizedBox(height: 14),
                                          ...remaining.map(
                                            (r) => Padding(
                                              padding: const EdgeInsets.only(
                                                bottom: 12,
                                              ),
                                              child: _resourceListCard(p, r),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                            ),
                            const SizedBox(height: 16),
                            _section(
                              key: _locationKey,
                              title: 'Lokasi',
                              child: _locationSection(p),
                            ),
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
            bottomNavigationBar: SafeArea(
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
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: BK.ink,
                          side: const BorderSide(color: BK.line),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () => _jumpTo(_catalogKey),
                        child: const Text(
                          'Resource',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: BK.accent,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () => _jumpTo(_locationKey),
                        child: const Text(
                          'Lokasi',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _heroBackground(TenantProfile p) {
    final image = p.bannerUrl.isNotEmpty ? p.bannerUrl : p.logoUrl;
    if (image.isEmpty) {
      return Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF10192F), Color(0xFF1C2450), Color(0xFF0D1526)],
          ),
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        Image.network(
          image,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF10192F),
                  Color(0xFF1C2450),
                  Color(0xFF0D1526),
                ],
              ),
            ),
          ),
        ),
        Positioned(
          right: -40,
          top: 36,
          child: _glowBlob(color: BK.accent.withValues(alpha: 0.18), size: 160),
        ),
        Positioned(
          left: -20,
          bottom: 88,
          child: _glowBlob(
            color: Colors.white.withValues(alpha: 0.08),
            size: 120,
          ),
        ),
      ],
    );
  }

  Widget _glowBlob({required Color color, required double size}) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: color,
      boxShadow: [BoxShadow(color: color, blurRadius: 60, spreadRadius: 20)],
    ),
  );

  Widget _section({
    required GlobalKey key,
    required String title,
    required Widget child,
  }) {
    return SizedBox(
      key: key,
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: BK.ink3,
            ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }

  Widget _heroChip(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.10),
      borderRadius: BorderRadius.circular(999),
      border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
    ),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
    ),
  );

  Widget _galleryTile(String url) => ClipRRect(
    borderRadius: BorderRadius.circular(16),
    child: Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => setState(() => _lightboxImage = url),
        child: SizedBox(
          width: 160,
          child: AspectRatio(
            aspectRatio: 4 / 3,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  url,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(color: BK.card2),
                ),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0x00000000), Color(0x55000000)],
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
    ),
  );

  List<String> _galleryImages(TenantProfile p) {
    final images = <String>[
      ...p.gallery,
      ...p.resources.expand(
        (r) => [if (r.imageUrl.trim().isNotEmpty) r.imageUrl, ...r.gallery],
      ),
    ].map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    return images.toSet().toList();
  }

  Widget _locationSection(TenantProfile p) {
    final mapSrc = _resolveMapEmbedSrc(p.mapIframeUrl);
    final mapsUri = _mapsExternalUri(p);
    final whatsappUri = _whatsappUri(
      p,
      message:
          'Halo, saya ingin tanya jadwal dan booking di ${p.name.isNotEmpty ? p.name : widget.fallbackName}.',
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BKCard(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: BK.accentSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.place_outlined,
                  color: BK.accent,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.address.isNotEmpty
                          ? p.address
                          : 'Alamat tenant belum diisi.',
                      style: const TextStyle(
                        fontSize: 13.5,
                        height: 1.5,
                        color: BK.ink2,
                      ),
                    ),
                    if (p.whatsappNumber.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        'Admin siap bantu cek slot dan detail booking.',
                        style: const TextStyle(
                          fontSize: 11.5,
                          height: 1.35,
                          color: BK.ink3,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (mapSrc.isNotEmpty)
          _MapPreviewCard(
            mapUrl: mapSrc,
            onOpenMaps: mapsUri == null
                ? null
                : () => _launchExternalUrl(mapsUri),
          )
        else
          _MapFallbackCard(
            address: p.address,
            onOpenMaps: mapsUri == null ? null : () => _launchExternalUrl(mapsUri),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: BK.ink,
                  side: const BorderSide(color: BK.line),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                ),
                onPressed: mapsUri == null ? null : () => _launchExternalUrl(mapsUri),
                icon: const Icon(Icons.map_outlined, size: 18),
                label: const Text(
                  'Buka Maps',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF1DBF73),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                ),
                onPressed: whatsappUri == null
                    ? null
                    : () => _launchExternalUrl(whatsappUri),
                icon: const Icon(Icons.chat_rounded, size: 18),
                label: const Text(
                  'WhatsApp Admin',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _featuredResourceCard(TenantProfile tenant, TenantResource r) {
    final start = r.startingPrice;
    final bookableCount = r.bookablePackages.length;
    final statusText = _resourceStatusText(r);
    final statusColor = bookableCount > 0
        ? BK.live
        : (r.packages.isNotEmpty ? BK.pend : BK.ink3);

    return SizedBox(
      width: 238,
      child: InkWell(
        borderRadius: BorderRadius.circular(BK.radius),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ResourceDetailScreen(
              tenant: tenant,
              resourceId: r.id,
              preview: r,
            ),
          ),
        ),
        child: BKCard(
          padding: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(BK.radius),
                ),
                child: AspectRatio(
                  aspectRatio: 16 / 10,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (r.imageUrl.isNotEmpty)
                        Image.network(
                          r.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => _resourceFallback(r),
                        )
                      else
                        _resourceFallback(r),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Color(0x00000000), Color(0xAA000000)],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 10,
                        top: 10,
                        child: Pill(
                          statusText,
                          fg: statusColor,
                          bg: statusColor == BK.live
                              ? BK.liveSoft
                              : statusColor == BK.pend
                              ? BK.pendSoft
                              : BK.card2,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w900,
                        color: BK.ink,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      r.category.isNotEmpty
                          ? r.category
                          : (r.description.isNotEmpty
                                ? r.description
                                : 'Lihat detail'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11.5,
                        height: 1.2,
                        color: BK.ink3,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            start != null
                                ? 'Rp${rupiah(start)}'
                                : 'Lihat detail',
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: BK.accent,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(
                          Icons.arrow_forward_rounded,
                          size: 18,
                          color: BK.ink3,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resourceListCard(TenantProfile tenant, TenantResource r) {
    final start = r.startingPrice;
    final bookableCount = r.bookablePackages.length;
    final statusText = _resourceStatusText(r);
    final statusColor = bookableCount > 0
        ? BK.live
        : (r.packages.isNotEmpty ? BK.pend : BK.ink3);

    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ResourceDetailScreen(
            tenant: tenant,
            resourceId: r.id,
            preview: r,
          ),
        ),
      ),
      child: BKCard(
        child: Row(
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: BK.accentSoft,
                borderRadius: BorderRadius.circular(18),
              ),
              clipBehavior: Clip.antiAlias,
              child: r.imageUrl.isNotEmpty
                  ? Image.network(
                      r.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => _resourceFallback(r),
                    )
                  : _resourceFallback(r),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          r.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: BK.ink,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor == BK.live
                              ? BK.liveSoft
                              : statusColor == BK.pend
                              ? BK.pendSoft
                              : BK.card2,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          statusText,
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    r.category.isNotEmpty
                        ? r.category
                        : (r.description.isNotEmpty
                              ? r.description
                              : 'Lihat detail'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      height: 1.2,
                      color: BK.ink3,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          start != null ? 'Rp${rupiah(start)}' : 'Lihat detail',
                          style: const TextStyle(
                            fontSize: 13.2,
                            fontWeight: FontWeight.w800,
                            color: BK.accent,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(
                        Icons.chevron_right_rounded,
                        size: 20,
                        color: BK.ink3,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _resourceFallback(TenantResource r) => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFE7EFFF), Color(0xFFF3F5F9)],
      ),
    ),
    alignment: Alignment.center,
    child: Text(
      r.name.trim().isNotEmpty ? r.name.trim()[0].toUpperCase() : '?',
      style: const TextStyle(
        fontSize: 26,
        fontWeight: FontWeight.w900,
        color: BK.accent,
      ),
    ),
  );

  List<TenantResource> _featuredResources(TenantProfile p) {
    final resources = [...p.resources];
    resources.sort((a, b) {
      final aBookable = a.bookablePackages.length;
      final bBookable = b.bookablePackages.length;
      if (aBookable != bBookable) return bBookable.compareTo(aBookable);
      final aPrice = a.startingPrice ?? 1 << 30;
      final bPrice = b.startingPrice ?? 1 << 30;
      return aPrice.compareTo(bPrice);
    });
    return resources
        .take(math.min(3, resources.length))
        .toList(growable: false);
  }

  List<TenantResource> _remainingResources(
    TenantProfile p,
    List<TenantResource> featured,
  ) {
    final featuredIds = featured.map((e) => e.id).toSet();
    return p.resources
        .where((r) => !featuredIds.contains(r.id))
        .toList(growable: false);
  }

  String _resourceStatusText(TenantResource r) {
    if (r.packages.isEmpty) return 'Belum ada paket';
    if (r.bookablePackages.isNotEmpty) return 'Siap booking';
    return 'Lihat detail';
  }

  _TenantMetrics _tenantMetrics(TenantProfile p) {
    final resourceCount = p.resources.length;
    final bookableCount = p.resources
        .where((r) => r.bookablePackages.isNotEmpty)
        .length;
    final prices =
        p.resources
            .map((r) => r.startingPrice)
            .whereType<int>()
            .where((v) => v > 0)
            .toList()
          ..sort();

    return _TenantMetrics(
      resourceCount: resourceCount,
      bookableCount: bookableCount,
      startingPriceLabel: prices.isEmpty
          ? 'Harga di detail'
          : 'Rp${rupiah(prices.first)}',
      openText: p.openTime.isNotEmpty && p.closeTime.isNotEmpty
          ? '${p.openTime}–${p.closeTime}'
          : '',
      addressShort: _shortAddress(p.address),
    );
  }

  String _shortAddress(String value) {
    final clean = value.trim();
    if (clean.isEmpty) return '';
    final parts = clean.split(',');
    return parts.first.trim();
  }

  String? _openStatus(TenantProfile p) {
    if (p.openTime.isEmpty || p.closeTime.isEmpty) return null;
    final open = _clockToMinutes(p.openTime, 8 * 60);
    final close = _clockToMinutes(p.closeTime, 22 * 60);
    final now = DateTime.now();
    final nowMin = now.hour * 60 + now.minute;
    final isOpen = close <= open
        ? nowMin >= open || nowMin < close
        : nowMin >= open && nowMin < close;
    return isOpen ? 'Buka sekarang' : 'Tutup sekarang';
  }

  int _clockToMinutes(String value, int fallback) {
    final parts = value.split(':');
    if (parts.length < 2) return fallback;
    final hour = int.tryParse(parts[0]) ?? 0;
    final minute = int.tryParse(parts[1]) ?? 0;
    return hour * 60 + minute;
  }

  String _resolveMapEmbedSrc(String? value) {
    final raw = (value ?? '').trim();
    if (raw.isEmpty) return '';
    if (raw.toLowerCase().contains('<iframe')) {
      final lower = raw.toLowerCase();
      final srcIndex = lower.indexOf('src=');
      if (srcIndex < 0) return '';
      final after = raw.substring(srcIndex + 4).trimLeft();
      if (after.isEmpty) return '';
      final quote = after[0];
      if (quote != '\'' && quote != '"') return '';
      final end = after.indexOf(quote, 1);
      if (end <= 1) return '';
      return after.substring(1, end).trim();
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return '';
  }

  Uri? _mapsExternalUri(TenantProfile p) {
    final raw = _resolveMapEmbedSrc(p.mapIframeUrl);
    if (raw.isNotEmpty) {
      final uri = Uri.tryParse(raw);
      if (uri != null) return uri;
    }
    final query = p.address.trim();
    if (query.isEmpty) return null;
    return Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}',
    );
  }

  Uri? _whatsappUri(TenantProfile p, {String? message}) {
    final digits = p.whatsappNumber.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return null;
    final text = Uri.encodeComponent(
      message ??
          'Halo, saya ingin tanya jadwal dan booking di ${p.name.isNotEmpty ? p.name : widget.fallbackName}.',
    );
    return Uri.parse('https://wa.me/$digits?text=$text');
  }

  Future<void> _launchExternalUrl(Uri uri) async {
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      BkToast.error(context, 'Gagal membuka tautan');
    }
  }
}

class _TenantMetrics {
  final int resourceCount;
  final int bookableCount;
  final String startingPriceLabel;
  final String openText;
  final String addressShort;

  const _TenantMetrics({
    required this.resourceCount,
    required this.bookableCount,
    required this.startingPriceLabel,
    required this.openText,
    required this.addressShort,
  });
}

class _MapPreviewCard extends StatefulWidget {
  final String mapUrl;
  final VoidCallback? onOpenMaps;

  const _MapPreviewCard({
    required this.mapUrl,
    this.onOpenMaps,
  });

  @override
  State<_MapPreviewCard> createState() => _MapPreviewCardState();
}

class _MapPreviewCardState extends State<_MapPreviewCard> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(BK.card)
      ..loadRequest(Uri.parse(widget.mapUrl));
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(BK.radius),
      child: Stack(
        children: [
          SizedBox(
            height: 180,
            width: double.infinity,
            child: IgnorePointer(
              child: WebViewWidget(controller: _controller),
            ),
          ),
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x00000000), Color(0x22000000)],
                ),
              ),
            ),
          ),
          Positioned(
            left: 12,
            top: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.88),
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text(
                'Peta',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: BK.ink,
                ),
              ),
            ),
          ),
          Positioned(
            right: 12,
            bottom: 12,
            child: FilledButton.tonalIcon(
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white.withValues(alpha: 0.95),
                foregroundColor: BK.ink,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              onPressed: widget.onOpenMaps,
              icon: const Icon(Icons.open_in_new_rounded, size: 18),
              label: const Text(
                'Buka',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapFallbackCard extends StatelessWidget {
  final String address;
  final VoidCallback? onOpenMaps;

  const _MapFallbackCard({
    required this.address,
    this.onOpenMaps,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(BK.radius),
        border: Border.all(color: BK.line),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: BK.accentSoft,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.map_outlined,
              color: BK.accent,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Peta belum tersedia',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: BK.ink,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  address.isNotEmpty
                      ? address
                      : 'Alamat belum diisi.',
                  style: const TextStyle(
                    fontSize: 12.5,
                    height: 1.45,
                    color: BK.ink2,
                  ),
                ),
                const SizedBox(height: 10),
                TextButton.icon(
                  onPressed: onOpenMaps,
                  icon: const Icon(Icons.open_in_new_rounded, size: 16),
                  label: const Text('Buka Maps'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
