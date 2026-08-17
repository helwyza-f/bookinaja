import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/menu_item.dart';
import '../models/pos_order.dart';
import '../state/pos_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';
import 'pos_payment_sheet.dart';

class KasirOrderDetailScreen extends StatefulWidget {
  final String orderId;
  const KasirOrderDetailScreen({super.key, required this.orderId});

  @override
  State<KasirOrderDetailScreen> createState() => _KasirOrderDetailScreenState();
}

class _KasirOrderDetailScreenState extends State<KasirOrderDetailScreen> {
  PosOrder? _order;
  Object? _error;
  bool _loading = true;
  bool _acting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final o = await context.read<PosController>().fetchOrderDetail(widget.orderId);
      if (mounted) setState(() { _order = o; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e; _loading = false; });
    }
  }

  /// Order masih terbuka (bon berjalan) → boleh tambah item / bayar-tutup.
  bool get _isOpen {
    final s = _order?.status.toLowerCase() ?? '';
    return s == 'open' || s == 'pending_payment';
  }

  String _time(DateTime? d) {
    if (d == null) return '-';
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text(
          'Detail Transaksi',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: BK.ink),
        ),
      ),
      body: _loading
          ? const LoadingList(count: 3)
          : _error != null
              ? StateView(
                  icon: Icons.wifi_off_rounded,
                  color: BK.crit,
                  title: 'Gagal memuat detail',
                  hint: '$_error',
                  action: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: BK.accent),
                    onPressed: _load,
                    child: const Text('Coba lagi'),
                  ),
                )
              : order == null
                  ? const StateView(
                      icon: Icons.receipt_long_rounded,
                      color: BK.ink3,
                      title: 'Data tidak ditemukan',
                    )
                  : _content(order),
      bottomNavigationBar: (order != null && _isOpen) ? _actionsBar(order) : null,
    );
  }

  Widget _content(PosOrder order) {
    final items = order.items;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: BK.card,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: BK.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.orderNumber,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: BK.ink),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _time(order.createdAt),
                      style: const TextStyle(fontSize: 12, color: BK.ink3),
                    ),
                    const SizedBox(height: 14),
                    _infoRow('Status', _statusLabel(order.status)),
                    _infoRow('Pembayaran', _payLabel(order.paymentStatus)),
                    _infoRow('Metode', _methodLabel(order.paymentMethod)),
                    _infoRow('Total', 'Rp${rupiah(order.grandTotal)}', bold: true),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              if (order.isPrepaidSettled && _isOpen) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: BK.liveSoft,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: BK.live.withValues(alpha: .3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.verified_rounded, color: BK.live, size: 20),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Sudah dibayar — bon masih terbuka. Tambah item lalu Tutup bon di akhir.',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink2),
                      ),
                    ),
                  ]),
                ),
                const SizedBox(height: 14),
              ],
              ..._proofSection(order),
              const Text(
                'Item transaksi',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: BK.ink),
              ),
              const SizedBox(height: 10),
              if (items.isEmpty)
                const StateView(
                  icon: Icons.shopping_bag_outlined,
                  color: BK.ink3,
                  title: 'Item belum tersedia',
                  hint: 'Detail item belum dikirim dari server.',
                )
              else
                ...items.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: BK.card,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: BK.line),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.name,
                                  style: const TextStyle(fontSize: 13.8, fontWeight: FontWeight.w800, color: BK.ink),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${item.quantity} x Rp${rupiah(item.unitPrice)}',
                                  style: const TextStyle(fontSize: 12, color: BK.ink3),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            'Rp${rupiah(item.subtotal)}',
                            style: const TextStyle(fontSize: 13.8, fontWeight: FontWeight.w900, color: BK.ink),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
  }

  // ---------------- Aksi pesanan terbuka ----------------

  Widget _actionsBar(PosOrder order) {
    // Bon prabayar (tagihan sudah lunas tapi masih terbuka): aksi utama adalah
    // menutup bon (/close), bukan membayar lagi — settle manual akan ditolak
    // karena balance sudah 0.
    final prepaid = order.isPrepaidSettled;
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        decoration: const BoxDecoration(
          color: BK.bg,
          border: Border(top: BorderSide(color: BK.line)),
        ),
        child: Row(children: [
          // Sekunder: tambah item (ikon-only agar CTA utama punya ruang lega).
          _SquareAction(
            icon: Icons.add_rounded,
            tooltip: 'Tambah item',
            onTap: _acting ? null : () => _addItems(order),
          ),
          // Sekunder: batalkan — hanya bila belum ada uang masuk.
          if (!prepaid) ...[
            const SizedBox(width: 10),
            _SquareAction(
              icon: Icons.delete_outline_rounded,
              tooltip: 'Batalkan',
              danger: true,
              onTap: _acting ? null : () => _cancelOrder(order),
            ),
          ],
          const SizedBox(width: 12),
          // CTA utama.
          Expanded(
            child: SizedBox(
              height: 52,
              child: prepaid
                  ? FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: BK.live,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      onPressed: _acting ? null : () => _closeBon(order),
                      icon: const Icon(Icons.check_circle_rounded, size: 20),
                      label: const Text('Tutup bon',
                          maxLines: 1, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    )
                  : FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: BK.accent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      onPressed: _acting ? null : () => _payAndClose(order),
                      icon: const Icon(Icons.point_of_sale_rounded, size: 20),
                      label: const Text('Bayar & tutup',
                          maxLines: 1, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    ),
            ),
          ),
        ]),
      ),
    );
  }

  Future<void> _closeBon(PosOrder order) async {
    setState(() => _acting = true);
    try {
      await context.read<PosController>().closeOpenOrder(order.id);
      if (!mounted) return;
      BkToast.success(context, 'Bon ditutup');
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _acting = false);
        BkToast.error(context, 'Gagal menutup bon', subtitle: '$e');
      }
    }
  }

  Future<void> _addItems(PosOrder order) async {
    final lines = await showModalBottomSheet<List<CartLine>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChangeNotifierProvider<PosController>.value(
        value: context.read<PosController>(),
        child: const _AddItemsSheet(),
      ),
    );
    if (lines == null || lines.isEmpty || !mounted) return;
    setState(() => _acting = true);
    try {
      await context.read<PosController>().addItemsToOrder(order.id, lines);
      if (!mounted) return;
      BkToast.success(context, 'Item ditambahkan');
      await _load();
    } catch (e) {
      if (mounted) BkToast.error(context, 'Gagal menambah item', subtitle: '$e');
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _payAndClose(PosOrder order) async {
    final ctrl = context.read<PosController>();
    // Pakai sheet pembayaran yang sama dengan kasir (metode terfilter + uang
    // diterima + unggah bukti). orderId diisi → settle order yang sudah ada.
    final billed = order.balanceDue > 0 ? order.balanceDue : order.grandTotal;
    final outcome = await showModalBottomSheet<PosPaymentOutcome>(
      context: context,
      backgroundColor: BK.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => ChangeNotifierProvider<PosController>.value(
        value: ctrl,
        child: PosPaymentSheet(total: billed, methods: ctrl.paymentMethods, orderId: order.id),
      ),
    );
    if (outcome == null || !mounted) return;
    if (outcome.keptOpen) {
      // Prabayar: bon tetap terbuka → tetap di layar, segarkan status.
      BkToast.success(context, 'Pembayaran tercatat', subtitle: 'Bon tetap terbuka, item bisa ditambah.');
      await _load();
    } else {
      BkToast.success(context, 'Pesanan ditutup', subtitle: 'Pembayaran tercatat.');
      Navigator.of(context).pop();
    }
  }

  Future<void> _cancelOrder(PosOrder order) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Batalkan pesanan?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: const Text('Pesanan terbuka ini akan dibatalkan.', style: TextStyle(fontSize: 13.5, color: BK.ink2)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx, false), child: const Text('Tidak')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.crit),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Batalkan'),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    setState(() => _acting = true);
    try {
      await context.read<PosController>().cancelOrder(order.id);
      if (!mounted) return;
      BkToast.info(context, 'Pesanan dibatalkan');
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _acting = false);
        BkToast.error(context, 'Gagal membatalkan', subtitle: '$e');
      }
    }
  }

  /// Section bukti pembayaran — hanya muncul bila ada attempt yang berbukti.
  List<Widget> _proofSection(PosOrder order) {
    final proofs = order.attempts.where((a) => a.hasProof).toList();
    if (proofs.isEmpty) return const [];
    return [
      const Text('Bukti pembayaran',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: BK.ink)),
      const SizedBox(height: 10),
      for (final a in proofs) Padding(padding: const EdgeInsets.only(bottom: 10), child: _proofCard(a)),
      const SizedBox(height: 4),
    ];
  }

  Widget _proofCard(PosPaymentAttempt a) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: BK.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Text(a.methodLabel,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
            ),
            const SizedBox(width: 8),
            _statusPill(a.status),
          ]),
          if (a.amount > 0) ...[
            const SizedBox(height: 3),
            Text('Rp${rupiah(a.amount)}', style: const TextStyle(fontSize: 12, color: BK.ink3)),
          ],
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => _viewProof(a.proofUrl),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                height: 190,
                width: double.infinity,
                child: Image.network(
                  a.proofUrl,
                  fit: BoxFit.cover,
                  loadingBuilder: (ctx, child, progress) =>
                      progress == null ? child : const BKSkeleton(width: double.infinity, height: 190, radius: 12),
                  errorBuilder: (ctx, _, _) => Container(
                    color: BK.card2,
                    alignment: Alignment.center,
                    child: const Icon(Icons.broken_image_outlined, color: BK.ink3, size: 28),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.zoom_in_rounded, size: 15, color: BK.ink3),
            const SizedBox(width: 5),
            const Text('Ketuk untuk perbesar', style: TextStyle(fontSize: 11.5, color: BK.ink3)),
          ]),
          if (a.payerNote.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('Catatan: ${a.payerNote}', style: const TextStyle(fontSize: 12, color: BK.ink2)),
          ],
        ],
      ),
    );
  }

  Pill _statusPill(String status) {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'approved':
        return Pill.live('Terverifikasi');
      case 'rejected':
        return Pill.crit('Ditolak');
      case 'submitted':
      case 'awaiting_verification':
        return Pill.pend('Menunggu verifikasi');
      default:
        return Pill.mut(status.isEmpty ? '-' : status);
    }
  }

  void _viewProof(String url) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: .9),
      builder: (dctx) => GestureDetector(
        onTap: () => Navigator.of(dctx).pop(),
        child: Stack(
          children: [
            InteractiveViewer(
              minScale: 0.8,
              maxScale: 4,
              child: Center(
                child: Image.network(url, fit: BoxFit.contain,
                    errorBuilder: (ctx, _, _) => const Icon(Icons.broken_image_outlined, color: Colors.white70, size: 40)),
              ),
            ),
            Positioned(
              top: 40, right: 16,
              child: IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                onPressed: () => Navigator.of(dctx).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Label status order dalam Bahasa Indonesia (bukan enum backend).
  String _statusLabel(String s) {
    switch (s.toLowerCase()) {
      case 'open':
        return 'Terbuka';
      case 'pending_payment':
        return 'Menunggu pembayaran';
      case 'paid':
        return 'Lunas';
      case 'completed':
        return 'Selesai';
      case 'cancelled':
        return 'Dibatalkan';
      default:
        return s.isEmpty ? '-' : s;
    }
  }

  /// Label status pembayaran dalam Bahasa Indonesia.
  String _payLabel(String s) {
    switch (s.toLowerCase()) {
      case 'settled':
      case 'paid':
        return 'Lunas';
      case 'unpaid':
      case 'pending':
        return 'Belum dibayar';
      case 'partial_paid':
        return 'Dibayar sebagian';
      case 'awaiting_verification':
      case 'submitted':
        return 'Menunggu verifikasi';
      case 'cancelled':
        return 'Dibatalkan';
      case 'failed':
        return 'Gagal';
      case 'expired':
        return 'Kedaluwarsa';
      default:
        return s.isEmpty ? '-' : s;
    }
  }

  /// Label metode bayar yang ramah dibaca.
  String _methodLabel(String m) {
    final k = m.toLowerCase().trim();
    if (k.isEmpty) return '-';
    if (k == 'cash') return 'Tunai';
    if (k.contains('qris') || k.contains('qr')) return 'QRIS';
    if (k.contains('transfer') || k.contains('bank') || k.contains('va')) return 'Transfer bank';
    return m;
  }

  Widget _infoRow(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(label, style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 12.8,
              fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
              color: BK.ink,
            ),
          ),
        ],
      ),
    );
  }
}

/// Tombol aksi sekunder berbentuk kotak (ikon-only) untuk action bar detail.
class _SquareAction extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;
  final bool danger;
  const _SquareAction({required this.icon, required this.tooltip, this.onTap, this.danger = false});

  @override
  Widget build(BuildContext context) {
    final color = danger ? BK.crit : BK.ink;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: BK.card,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: danger ? BK.crit.withValues(alpha: .4) : BK.line),
            ),
            child: Icon(icon, color: onTap == null ? BK.ink3 : color, size: 24),
          ),
        ),
      ),
    );
  }
}

/// Sheet pemilih menu untuk menambah item ke pesanan terbuka. Memakai keranjang
/// lokal sendiri (tidak menyentuh cart kasir utama) lalu mengembalikan pilihan
/// sebagai `List<CartLine>` saat kasir menekan "Tambahkan".
class _AddItemsSheet extends StatefulWidget {
  const _AddItemsSheet();

  @override
  State<_AddItemsSheet> createState() => _AddItemsSheetState();
}

class _AddItemsSheetState extends State<_AddItemsSheet> {
  final Map<String, CartLine> _picked = {};
  String _query = '';

  int get _count => _picked.values.fold(0, (a, l) => a + l.qty);
  int get _total => _picked.values.fold(0, (a, l) => a + l.subtotal);

  void _inc(MenuItem m) => setState(() {
        _picked.update(m.id, (l) { l.qty++; return l; }, ifAbsent: () => CartLine(m));
      });

  void _dec(MenuItem m) => setState(() {
        final l = _picked[m.id];
        if (l == null) return;
        if (l.qty <= 1) {
          _picked.remove(m.id);
        } else {
          l.qty--;
        }
      });

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<PosController>();
    final q = _query.trim().toLowerCase();
    final menu = (ctrl.menu.data ?? const <MenuItem>[])
        .where((m) => q.isEmpty || m.name.toLowerCase().contains(q) || m.category.toLowerCase().contains(q))
        .toList();
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: BK.card,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40, height: 4,
              decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(2)),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Tambah item', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: BK.ink)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
              child: TextField(
                onChanged: (v) => setState(() => _query = v),
                decoration: InputDecoration(
                  hintText: 'Cari menu…',
                  prefixIcon: const Icon(Icons.search_rounded, color: BK.ink3, size: 20),
                  filled: true,
                  fillColor: BK.card2,
                  contentPadding: const EdgeInsets.symmetric(vertical: 4),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                ),
              ),
            ),
            Expanded(
              child: menu.isEmpty
                  ? const StateView(
                      icon: Icons.restaurant_menu_rounded,
                      color: BK.ink3,
                      title: 'Tidak ada menu',
                      hint: 'Coba kata kunci lain.',
                    )
                  : ListView.separated(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                      itemCount: menu.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _row(menu[i]),
                    ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 6, 16, 12 + viewInsets),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                    onPressed: _count == 0 ? null : () => Navigator.of(context).pop(_picked.values.toList()),
                    child: Text(
                      _count == 0 ? 'Pilih item' : 'Tambahkan $_count item · Rp${rupiah(_total)}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(MenuItem m) {
    final qty = _picked[m.id]?.qty ?? 0;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: BK.card2,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: BK.line),
      ),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(m.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 3),
            Text('Rp${rupiah(m.price)}', style: const TextStyle(fontSize: 12, color: BK.ink3)),
          ]),
        ),
        const SizedBox(width: 8),
        if (qty == 0)
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: BK.accentSoft,
              foregroundColor: BK.accent,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            ),
            onPressed: () => _inc(m),
            child: const Text('Tambah', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5)),
          )
        else
          Row(children: [
            _qtyBtn(Icons.remove, () => _dec(m)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Text('$qty', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: BK.ink)),
            ),
            _qtyBtn(Icons.add, () => _inc(m)),
          ]),
      ]),
    );
  }

  Widget _qtyBtn(IconData i, VoidCallback onTap) => Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(9),
          child: Container(
            width: 30, height: 30,
            decoration: BoxDecoration(color: BK.accent, borderRadius: BorderRadius.circular(9)),
            child: Icon(i, color: Colors.white, size: 16),
          ),
        ),
      );
}
