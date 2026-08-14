import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/booking.dart';
import '../models/pos_action_item.dart';
import '../state/auth_controller.dart';
import '../state/pos_feed_controller.dart';
import '../theme.dart';
import 'booking_detail.dart';
import 'kasir_order_detail.dart';

/// POS "action desk" — daftar **transaksi** (booking + sales-order) yang perlu
/// ditindak. Beranchor per-transaksi: dua booking berbeda pada resource yang
/// sama muncul sebagai dua kartu terpisah.
class OperationsScreen extends StatefulWidget {
  const OperationsScreen({super.key});
  @override
  State<OperationsScreen> createState() => _OperationsScreenState();
}

class _OperationsScreenState extends State<OperationsScreen>
    with SingleTickerProviderStateMixin {
  String _query = '';
  late final TabController _tabController = TabController(length: 4, vsync: this);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => context.read<PosFeedController>().load(),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<PosFeedController>();
    final tenantSlug = context.watch<AuthController>().workspace?.slug ?? '';
    if (tenantSlug.isNotEmpty) ctrl.bindTenant(tenantSlug);

    final lanes = ctrl.lanes(query: _query);

    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        titleSpacing: 16,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('POS', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BK.ink)),
            SizedBox(height: 2),
            Text('Perlu ditindak sekarang', style: TextStyle(fontSize: 12, color: BK.ink3, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
      body: ctrl.state.when(
        loading: () => const LoadingList(),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded,
          color: BK.crit,
          title: 'Gagal memuat POS',
          hint: '$e',
          action: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: ctrl.load,
            child: const Text('Coba lagi'),
          ),
        ),
        data: (_) => Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          child: Column(
            children: [
              _searchBar(),
              const SizedBox(height: 12),
              Expanded(
                child: _LaneTabs(
                  controller: _tabController,
                  lanes: lanes,
                  onOpen: (it) => _openItem(context, it),
                  refresh: ctrl.load,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _searchBar() {
    return TextField(
      onChanged: (v) => setState(() => _query = v),
      decoration: InputDecoration(
        hintText: 'Cari customer, WA, atau unit...',
        prefixIcon: const Icon(Icons.search, size: 20, color: BK.ink3),
        isDense: true,
        filled: true,
        fillColor: BK.card,
        contentPadding: const EdgeInsets.symmetric(vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: BK.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: BK.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: BK.accent),
        ),
      ),
    );
  }

  void _openItem(BuildContext context, PosActionItem item) {
    if (item.isSalesOrder) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => KasirOrderDetailScreen(orderId: item.id),
        ),
      );
      return;
    }
    final paid = (item.total - item.balanceDue);
    final booking = Booking(
      id: item.id,
      code: item.id.length > 8 ? item.id.substring(0, 8).toUpperCase() : item.id,
      customer: item.customerName.isNotEmpty ? item.customerName : 'Customer',
      resource: item.resourceName,
      time: _windowLabel(item),
      status: bookingStatusFrom(item.status, paymentStatus: item.paymentStatus),
      total: item.total.round(),
      paid: paid > 0 ? paid.round() : 0,
      startAt: item.scheduledAt,
    );
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: booking)),
    );
  }
}

/// "HH:mm - HH:mm" dari scheduled/end; "Direct sale" untuk sales-order.
String _windowLabel(PosActionItem item) {
  if (item.isSalesOrder) return 'Direct sale';
  final s = item.scheduledAt;
  final e = item.endTime;
  String hhmm(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  if (s == null) return '-';
  return e == null ? hhmm(s) : '${hhmm(s)} - ${hhmm(e)}';
}

class _StatusMeta {
  final String label;
  final Color color;
  const _StatusMeta(this.label, this.color);
}

_StatusMeta _statusMeta(PosActionItem it, DateTime now) {
  if (it.isSalesOrder) {
    if (it.requiresVerification) return const _StatusMeta('Menunggu verifikasi', BK.pend);
    final s = it.status.toLowerCase();
    if (s == 'pending_payment') return const _StatusMeta('Menunggu bayar', BK.pend);
    if (s == 'paid') return const _StatusMeta('Siap ditutup', BK.live);
    return const _StatusMeta('Order langsung', BK.accent);
  }

  if (it.requiresVerification) return const _StatusMeta('Menunggu verifikasi', BK.pend);
  if (it.needsBookingSettlement) return const _StatusMeta('Perlu pelunasan', BK.pend);

  final s = it.status.toLowerCase();
  final p = it.paymentStatus.toLowerCase();
  if (const {'pending', 'confirmed'}.contains(s) &&
      const {'pending', 'partial_paid', 'unpaid', 'failed', 'expired'}.contains(p)) {
    return const _StatusMeta('Menunggu bayar', BK.pend);
  }

  if (it.isActiveBooking) {
    final remaining = it.remainingMinutes(now);
    if (remaining <= 0) return const _StatusMeta('Overtime', BK.crit);
    if (remaining <= 15) return const _StatusMeta('Segera habis', BK.pend);
    return const _StatusMeta('Sedang berjalan', BK.live);
  }

  if (it.isUpcomingBooking(now, PosFeedController.windowMinutes)) {
    return const _StatusMeta('Akan datang', BK.accent);
  }

  return _StatusMeta(it.status.isNotEmpty ? it.status : 'Transaksi', BK.ink3);
}

/// Teks kondisi/urgensi di kartu (countdown relatif).
String _conditionLabel(PosActionItem it, DateTime now) {
  if (it.isSalesOrder) {
    if (it.requiresVerification) return 'Review admin';
    final s = it.status.toLowerCase();
    if (s == 'pending_payment') return 'Tunggu pembayaran';
    if (s == 'paid') return 'Siap ditutup';
    return 'Order langsung';
  }
  if (it.isActiveBooking && it.endTime != null) {
    final r = it.remainingMinutes(now);
    if (r <= 0) return 'Waktu habis';
    if (r < 60) return '$r menit lagi';
    return '${r ~/ 60}j ${r % 60}m lagi';
  }
  if (it.scheduledAt != null) {
    final u = it.minutesUntilStart(now);
    if (u <= 0) return 'Siap ditangani';
    if (u < 60) return '$u menit lagi';
    return '${u ~/ 60}j ${u % 60}m lagi';
  }
  return 'Perlu aksi';
}

/// Aksi ringkas untuk footer kartu — pendek agar tak pernah terpotong.
String _shortAction(PosActionItem it, DateTime now) {
  if (it.requiresVerification) return 'Review bukti';
  if (it.needsBookingSettlement) return 'Pelunasan';
  if (it.isSalesOrder) {
    final s = it.status.toLowerCase();
    if (s == 'paid') return 'Tutup';
    if (s == 'pending_payment') return 'Tuntaskan';
    return 'Lengkapi';
  }
  final s = it.status.toLowerCase();
  final p = it.paymentStatus.toLowerCase();
  if (const {'pending', 'confirmed'}.contains(s) &&
      const {'pending', 'partial_paid', 'unpaid', 'failed', 'expired'}.contains(p)) {
    return 'Tuntaskan';
  }
  if (it.isActiveBooking) return 'Buka sesi';
  if (it.isUpcomingBooking(now, PosFeedController.windowMinutes)) return 'Siapkan';
  return 'Detail';
}

typedef _Lanes = ({
  List<PosActionItem> prioritas,
  List<PosActionItem> live,
  List<PosActionItem> siap,
  List<PosActionItem> lainnya,
});

class _LaneTabs extends StatelessWidget {
  final TabController controller;
  final _Lanes lanes;
  final void Function(PosActionItem) onOpen;
  final Future<void> Function() refresh;

  const _LaneTabs({
    required this.controller,
    required this.lanes,
    required this.onOpen,
    required this.refresh,
  });

  @override
  Widget build(BuildContext context) {
    final tabs = <({String label, List<PosActionItem> items, Color accent, String emptyTitle, String emptyHint})>[
      (
        label: 'Prioritas',
        items: lanes.prioritas,
        accent: BK.pend,
        emptyTitle: 'Tidak ada prioritas',
        emptyHint: 'Tak ada transaksi mendesak.',
      ),
      (
        label: 'Live',
        items: lanes.live,
        accent: BK.live,
        emptyTitle: 'Belum ada sesi aktif',
        emptyHint: 'Sesi berjalan akan muncul di sini.',
      ),
      (
        label: 'Siap',
        items: lanes.siap,
        accent: BK.accent,
        emptyTitle: 'Tidak ada booking dekat',
        emptyHint: 'Booking terjadwal muncul otomatis.',
      ),
      (
        label: 'Lainnya',
        items: lanes.lainnya,
        accent: BK.ink3,
        emptyTitle: 'Kosong',
        emptyHint: 'Tidak ada item tambahan.',
      ),
    ];

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: BK.ink,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFF0A1020)),
            boxShadow: const [
              BoxShadow(color: Color(0x180D1526), blurRadius: 16, offset: Offset(0, 6)),
            ],
          ),
          child: TabBar(
            controller: controller,
            isScrollable: false,
            indicatorSize: TabBarIndicatorSize.tab,
            labelPadding: EdgeInsets.zero,
            padding: EdgeInsets.zero,
            dividerColor: Colors.transparent,
            indicatorColor: Colors.transparent,
            splashFactory: NoSplash.splashFactory,
            overlayColor: const WidgetStatePropertyAll(Colors.transparent),
            indicator: BoxDecoration(
              color: BK.accent,
              borderRadius: BorderRadius.circular(18),
              boxShadow: const [
                BoxShadow(color: Color(0x22000000), blurRadius: 10, offset: Offset(0, 3)),
              ],
            ),
            labelColor: Colors.white,
            unselectedLabelColor: const Color(0xFFB8C2DA),
            labelStyle: const TextStyle(fontSize: 12.8, fontWeight: FontWeight.w800),
            unselectedLabelStyle: const TextStyle(fontSize: 12.8, fontWeight: FontWeight.w800),
            tabs: [
              for (final t in tabs)
                _TabLabel(
                  label: t.label,
                  count: t.items.length,
                  activeColor: t.accent,
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: TabBarView(
            controller: controller,
            children: [
              for (final t in tabs)
                _LanePanel(
                  accent: t.accent,
                  emptyTitle: t.emptyTitle,
                  emptyHint: t.emptyHint,
                  items: t.items,
                  onOpen: onOpen,
                  refresh: refresh,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TabLabel extends StatelessWidget {
  final String label;
  final int count;
  final Color activeColor;
  const _TabLabel({required this.label, required this.count, required this.activeColor});

  @override
  Widget build(BuildContext context) {
    return Tab(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.max,
        children: [
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(letterSpacing: -0.1),
            ),
          ),
          if (count > 0 && label != 'Lainnya') ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: activeColor.withValues(alpha: .18),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '$count',
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: activeColor),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _LanePanel extends StatelessWidget {
  final Color accent;
  final String emptyTitle;
  final String emptyHint;
  final List<PosActionItem> items;
  final void Function(PosActionItem) onOpen;
  final Future<void> Function() refresh;

  const _LanePanel({
    required this.accent,
    required this.emptyTitle,
    required this.emptyHint,
    required this.items,
    required this.onOpen,
    required this.refresh,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: refresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          children: [
            const SizedBox(height: 72),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 86,
                    height: 86,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: .10),
                      borderRadius: BorderRadius.circular(26),
                    ),
                    child: Icon(Icons.inbox_outlined, size: 40, color: accent),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    emptyTitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    emptyHint,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12.5, color: BK.ink3, height: 1.35),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.only(bottom: 18),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _PosActionCard(item: items[i], onTap: () => onOpen(items[i])),
      ),
    );
  }
}

class _PosActionCard extends StatelessWidget {
  final PosActionItem item;
  final VoidCallback onTap;
  const _PosActionCard({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final meta = _statusMeta(item, now);
    final isSales = item.isSalesOrder;
    final showBalance = item.balanceDue > 0;
    final amount = showBalance ? item.balanceDue : item.total;
    final unit = item.resourceName.isNotEmpty
        ? item.resourceName
        : (isSales ? 'Kasir' : 'Unit');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: BK.line),
          boxShadow: const [
            BoxShadow(color: Color(0x0A0D1526), blurRadius: 14, offset: Offset(0, 5)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Baris 1 — identitas + status.
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _avatar(isSales),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.customerName.isNotEmpty
                            ? item.customerName
                            : (isSales ? 'Walk-in' : 'Customer'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: BK.ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          // Badge "Booking" redundan (semua booking) — tag hanya
                          // dipakai untuk membedakan order kasir/direct-sale.
                          if (isSales) ...[
                            _kindTag(),
                            const SizedBox(width: 6),
                          ],
                          Flexible(
                            child: Text(
                              unit,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12, color: BK.ink3, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                _pill(meta),
              ],
            ),
            const SizedBox(height: 12),
            // Baris 2 — jadwal & countdown.
            Row(
              children: [
                _infoPill(Icons.schedule_rounded, _windowLabel(item)),
                const SizedBox(width: 8),
                _infoPill(Icons.timelapse_rounded, _conditionLabel(item, now)),
              ],
            ),
            const SizedBox(height: 12),
            Divider(height: 1, color: BK.line),
            const SizedBox(height: 10),
            // Baris 3 — nominal & aksi.
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      showBalance ? 'Sisa tagihan' : 'Nilai transaksi',
                      style: const TextStyle(
                        fontSize: 10.5, color: BK.ink3, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Rp${rupiah(amount.round())}',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: showBalance ? BK.crit : BK.ink,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Text(
                  _shortAction(item, now),
                  style: const TextStyle(
                    fontSize: 12.5, color: BK.accent, fontWeight: FontWeight.w800),
                ),
                const Icon(Icons.chevron_right_rounded, color: BK.accent, size: 18),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _avatar(bool isSales) {
    return Container(
      width: 44,
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: isSales ? BK.card2 : BK.accentSoft,
        borderRadius: BorderRadius.circular(13),
      ),
      child: isSales
          ? const Icon(Icons.shopping_bag_outlined, size: 21, color: BK.ink2)
          : Text(
              item.customerName.trim().isNotEmpty
                  ? item.customerName.trim()[0].toUpperCase()
                  : '?',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.accent),
            ),
    );
  }

  Widget _kindTag() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: BK.ink.withValues(alpha: .06),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Text(
        'Kasir',
        style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: BK.ink2),
      ),
    );
  }

  Widget _infoPill(IconData icon, String text) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        decoration: BoxDecoration(
          color: BK.card2,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 15, color: BK.ink3),
            const SizedBox(width: 7),
            Flexible(
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w700, color: BK.ink2),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _pill(_StatusMeta m) => Pill(m.label, fg: m.color, bg: _soft(m.color));
}

/// Padankan warna sinyal ke token "soft"-nya untuk latar pill.
Color _soft(Color c) {
  if (c == BK.live) return BK.liveSoft;
  if (c == BK.pend) return BK.pendSoft;
  if (c == BK.crit) return BK.critSoft;
  if (c == BK.accent) return BK.accentSoft;
  return BK.card2;
}
