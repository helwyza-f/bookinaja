import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/promo.dart';
import '../repositories/settings_repository.dart';
import '../theme.dart';
import '../ui/toast.dart';
import 'promo_form_screen.dart';

/// Daftar promo/voucher tenant. Cari, filter status, aktif/nonaktif cepat,
/// ketuk untuk edit, atau buat baru.
class PromoSettingsScreen extends StatefulWidget {
  const PromoSettingsScreen({super.key});

  @override
  State<PromoSettingsScreen> createState() => _PromoSettingsScreenState();
}

class _PromoSettingsScreenState extends State<PromoSettingsScreen> {
  late final SettingsRepository _repo;
  List<Promo> _items = [];
  bool _loading = true;
  String? _error;
  String _status = ''; // '' | 'active' | 'inactive'
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _repo = context.read<SettingsRepository>();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  /// [background] = ganti filter/refresh: jangan tampilkan LoadingList penuh
  /// (bikin blink); pertahankan list lama sampai data baru datang.
  Future<void> _load({bool background = false}) async {
    setState(() {
      if (!background) _loading = true;
      _error = null;
    });
    try {
      final items = await _repo.getPromos(search: _search.text.trim(), status: _status);
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Future<void> _toggle(Promo p) async {
    final next = !p.isActive;
    setState(() {
      _items = [
        for (final x in _items)
          x.id == p.id
              ? Promo.fromJson({...x.toInput(), 'id': x.id, 'is_active': next, 'usage_count': x.usageCount})
              : x
      ];
    });
    try {
      await _repo.setPromoStatus(p.id, next);
    } catch (e) {
      if (!mounted) return;
      BkToast.error(context, 'Gagal ubah status', subtitle: '$e');
      _load();
    }
  }

  Future<void> _openForm([Promo? p]) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => PromoFormScreen(promoId: p?.id)),
    );
    if (changed == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Promo & Voucher',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: BK.accent,
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('Promo baru', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: TextField(
            controller: _search,
            onSubmitted: (_) => _load(),
            textInputAction: TextInputAction.search,
            style: const TextStyle(fontSize: 14, color: BK.ink),
            decoration: InputDecoration(
              hintText: 'Cari kode / nama promo',
              hintStyle: const TextStyle(color: BK.ink3, fontSize: 13.5),
              prefixIcon: const Icon(Icons.search_rounded, color: BK.ink3, size: 20),
              isDense: true,
              filled: true,
              fillColor: BK.card,
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
              focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
          child: _statusFilter(),
        ),
        Expanded(
          child: _loading
              ? const LoadingList()
              : _error != null
                  ? StateView(
                      icon: Icons.wifi_off_rounded,
                      color: BK.crit,
                      title: 'Gagal memuat',
                      hint: _error,
                      action: FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: BK.accent),
                        onPressed: _load,
                        child: const Text('Coba lagi'),
                      ),
                    )
                  : _items.isEmpty
                      ? StateView(
                          icon: Icons.local_offer_outlined,
                          color: BK.ink3,
                          title: _search.text.isNotEmpty || _status.isNotEmpty
                              ? 'Tidak ada hasil'
                              : 'Belum ada promo',
                          hint: 'Buat promo pertama lewat tombol di bawah.',
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                            itemCount: _items.length,
                            itemBuilder: (_, i) => _promoCard(_items[i]),
                          ),
                        ),
        ),
      ]),
    );
  }

  /// Segmented control status dengan indikator yang MENGGESER (bukan crossfade
  /// warna) — mulus saat pindah, dan ganti filter tak memunculkan loading penuh.
  Widget _statusFilter() {
    const options = [('', 'Semua'), ('active', 'Aktif'), ('inactive', 'Nonaktif')];
    final selectedIndex = options.indexWhere((e) => e.$1 == _status);
    const n = 3;
    // Alignment.x untuk n segmen: -1, 0, 1.
    final indicatorX = n == 1 ? 0.0 : -1 + selectedIndex * (2 / (n - 1));
    return Container(
      padding: const EdgeInsets.all(4),
      height: 42,
      decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(12)),
      child: Stack(children: [
        // Pil indikator yang menggeser mengikuti segmen terpilih.
        AnimatedAlign(
          alignment: Alignment(indicatorX, 0),
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          child: FractionallySizedBox(
            widthFactor: 1 / n,
            heightFactor: 1,
            child: Container(
              decoration: BoxDecoration(
                color: BK.card,
                borderRadius: BorderRadius.circular(9),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 5, offset: const Offset(0, 1)),
                ],
              ),
            ),
          ),
        ),
        Row(
          children: options.map((e) {
            final sel = _status == e.$1;
            return Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  if (_status == e.$1) return;
                  setState(() => _status = e.$1);
                  _load(background: true); // pertahankan list, hindari blink
                },
                child: Center(
                  child: AnimatedDefaultTextStyle(
                    duration: const Duration(milliseconds: 200),
                    style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: sel ? BK.ink : BK.ink3),
                    child: Text(e.$2),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ]),
    );
  }

  Widget _promoCard(Promo p) {
    final active = p.isActive;
    final bigValue = p.isPercentage ? '${p.discountValue}' : rupiah(p.discountValue);
    final unit = p.isPercentage ? '%' : 'Rp';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(BK.radius),
        onTap: () => _openForm(p),
        child: BKCard(
          padding: EdgeInsets.zero,
          child: IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              // Blok diskon (kiri) — menonjol, warnanya ikut status.
              Container(
                width: 84,
                decoration: BoxDecoration(
                  color: active ? BK.accentSoft : BK.card2,
                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(BK.radius)),
                ),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(unit,
                      style: TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w700, color: active ? BK.accent : BK.ink3)),
                  Text(bigValue,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: bigValue.length > 5 ? 17 : 24,
                          fontWeight: FontWeight.w900,
                          color: active ? BK.accent : BK.ink3,
                          height: 1)),
                  const SizedBox(height: 2),
                  Text('diskon',
                      style: TextStyle(fontSize: 10, color: active ? BK.accent : BK.ink3)),
                ]),
              ),
              // Info (kanan)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Flexible(
                          child: Text(p.code,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w900, fontSize: 14.5, color: BK.ink, letterSpacing: 0.5)),
                        ),
                        if (!active) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(6)),
                            child: const Text('Nonaktif',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: BK.ink3)),
                          ),
                        ],
                      ]),
                      const SizedBox(height: 2),
                      Text(p.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12.5, color: BK.ink2, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(_ruleSummary(p),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11, color: BK.ink3)),
                    ],
                  ),
                ),
              ),
              // Toggle
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: Center(
                  child: Switch(
                    value: active,
                    activeThumbColor: BK.accent,
                    onChanged: (_) => _toggle(p),
                  ),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  /// Ringkasan aturan dalam satu baris (pengganti deretan chip).
  String _ruleSummary(Promo p) {
    final parts = <String>[];
    if (p.minBookingAmount != null) parts.add('min Rp ${rupiah(p.minBookingAmount!)}');
    if (p.validWeekdays.isNotEmpty) parts.add('${p.validWeekdays.length} hari');
    if (p.usageLimitTotal != null) parts.add('kuota ${p.usageLimitTotal}');
    if (p.usageCount > 0) parts.add('dipakai ${p.usageCount}x');
    return parts.isEmpty ? 'Berlaku untuk semua transaksi' : parts.join(' · ');
  }
}
