import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../models/discovery.dart';
import '../../state/discovery_controller.dart';
import 'tenant_profile_screen.dart';

/// Layar Discover: cari & pilih tenant. Ketuk kartu → profil tenant.
class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});
  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final c = context.read<DiscoveryController>();
      if (c.state.data == null) c.load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.watch<DiscoveryController>();
    return Scaffold(
      backgroundColor: BK.bg,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('Jelajahi', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: BK.ink)),
                        SizedBox(height: 2),
                        Text('Tenant & layanan siap kamu booking', style: TextStyle(fontSize: 13, color: BK.ink3)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
              child: TextField(
                onChanged: c.setQuery,
                decoration: InputDecoration(
                  hintText: 'Cari tenant / kategori…',
                  prefixIcon: const Icon(Icons.search, size: 20, color: BK.ink3),
                  isDense: true,
                  filled: true,
                  fillColor: BK.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: BK.line)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: BK.line)),
                ),
              ),
            ),
            Expanded(
              child: c.state.when(
                loading: () => const LoadingList(),
                error: (e) => StateView(
                  icon: Icons.wifi_off_rounded,
                  color: BK.crit,
                  title: 'Gagal memuat tenant',
                  hint: '$e',
                  action: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: BK.accent),
                    onPressed: c.load,
                    child: const Text('Coba lagi'),
                  ),
                ),
                data: (_) {
                  final list = c.visible;
                  if (list.isEmpty) {
                    return const StateView(icon: Icons.search_off, color: BK.ink3, title: 'Tidak ketemu', hint: 'Coba kata kunci lain.');
                  }
                  return RefreshIndicator(
                    color: BK.accent,
                    onRefresh: c.load,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (_, i) => _TenantCard(list[i]),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TenantCard extends StatelessWidget {
  final TenantDirectoryItem t;
  const _TenantCard(this.t);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => TenantProfileScreen(slug: t.slug, fallbackName: t.name)),
      ),
      child: BKCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(BK.radius)),
              child: AspectRatio(
                aspectRatio: 16 / 8,
                child: t.heroImage.isNotEmpty
                    ? Image.network(
                        t.heroImage,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => _imgFallback(),
                      )
                    : _imgFallback(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(t.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: BK.ink)),
                      ),
                      if (t.promoLabel.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: BK.critSoft, borderRadius: BorderRadius.circular(20)),
                          child: Text(t.promoLabel, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: BK.crit)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    [
                      if (t.businessCategory.isNotEmpty) t.businessCategory,
                      if (t.resourceCount > 0) '${t.resourceCount} resource',
                    ].join(' · '),
                    style: const TextStyle(fontSize: 12, color: BK.ink3),
                  ),
                  if (t.startingPrice > 0) ...[
                    const SizedBox(height: 6),
                    Text('mulai Rp${rupiah(t.startingPrice)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.accent)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _imgFallback() => Container(
        color: BK.card2,
        alignment: Alignment.center,
        child: Text(
          t.name.trim().isNotEmpty ? t.name.trim()[0].toUpperCase() : '?',
          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: BK.ink3),
        ),
      );
}
