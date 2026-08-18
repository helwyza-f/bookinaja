import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/pos_order.dart';
import '../state/pos_controller.dart';
import '../theme.dart';
import 'kasir_history.dart';
import 'kasir_order_detail.dart';

/// Daftar pesanan terbuka (bon berjalan) — dine-in / self-order yang belum
/// ditutup. Ketuk untuk membuka detail & aksinya (tambah item, bayar & tutup).
class KasirOpenOrdersScreen extends StatefulWidget {
  const KasirOpenOrdersScreen({super.key});

  @override
  State<KasirOpenOrdersScreen> createState() => _KasirOpenOrdersScreenState();
}

class _KasirOpenOrdersScreenState extends State<KasirOpenOrdersScreen> {
  late Future<List<PosOrder>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<PosController>().fetchOpenOrders();
  }

  void _reload() {
    setState(() => _future = context.read<PosController>().fetchOpenOrders());
  }

  String _time(DateTime? d) {
    if (d == null) return '';
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)} ${two(d.hour)}:${two(d.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Pesanan',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: BK.ink)),
        actions: [
          TextButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const KasirHistoryScreen()),
            ),
            style: TextButton.styleFrom(foregroundColor: BK.accent),
            icon: const Icon(Icons.history_rounded, size: 18),
            label: const Text('Riwayat', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: FutureBuilder<List<PosOrder>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const LoadingList(count: 4);
          }
          if (snap.hasError) {
            return StateView(
              icon: Icons.wifi_off_rounded,
              color: BK.crit,
              title: 'Gagal memuat',
              hint: '${snap.error}',
              action: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: BK.accent),
                onPressed: _reload,
                child: const Text('Coba lagi'),
              ),
            );
          }
          final orders = snap.data ?? const [];
          if (orders.isEmpty) {
            return const StateView(
              icon: Icons.table_restaurant_outlined,
              color: BK.ink3,
              title: 'Tidak ada pesanan terbuka',
              hint: 'Buka pesanan dari keranjang kasir untuk memulai bon berjalan.',
            );
          }
          return RefreshIndicator(
            color: BK.accent,
            onRefresh: () async => _reload(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: orders.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _OpenOrderCard(order: orders[i], time: _time, onChanged: _reload),
            ),
          );
        },
      ),
    );
  }
}

class _OpenOrderCard extends StatelessWidget {
  final PosOrder order;
  final String Function(DateTime?) time;
  final VoidCallback onChanged;
  const _OpenOrderCard({required this.order, required this.time, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final itemCount = order.items.fold<int>(0, (a, l) => a + l.quantity);
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: () async {
        await Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => KasirOrderDetailScreen(orderId: order.id)),
        );
        onChanged(); // segarkan daftar setelah aksi di detail
      },
      child: BKCard(
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: BK.pendSoft, borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.receipt_long_rounded, color: BK.pend, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(order.orderNumber,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: BK.ink)),
              const SizedBox(height: 3),
              Text('${itemCount > 0 ? '$itemCount item · ' : ''}${time(order.createdAt)}',
                  style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('Rp${rupiah(order.grandTotal)}',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: BK.ink)),
            const SizedBox(height: 3),
            order.isPrepaidSettled ? Pill.live('Lunas · terbuka') : Pill.pend('Terbuka'),
          ]),
        ]),
      ),
    );
  }
}
