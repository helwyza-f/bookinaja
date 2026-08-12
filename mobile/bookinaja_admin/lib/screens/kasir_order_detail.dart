import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/pos_order.dart';
import '../state/pos_controller.dart';
import '../theme.dart';

class KasirOrderDetailScreen extends StatefulWidget {
  final String orderId;
  const KasirOrderDetailScreen({super.key, required this.orderId});

  @override
  State<KasirOrderDetailScreen> createState() => _KasirOrderDetailScreenState();
}

class _KasirOrderDetailScreenState extends State<KasirOrderDetailScreen> {
  late Future<PosOrder> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<PosController>().fetchOrderDetail(widget.orderId);
  }

  String _time(DateTime? d) {
    if (d == null) return '-';
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
  }

  @override
  Widget build(BuildContext context) {
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
      body: FutureBuilder<PosOrder>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const LoadingList(count: 3);
          }
          if (snap.hasError) {
            return StateView(
              icon: Icons.wifi_off_rounded,
              color: BK.crit,
              title: 'Gagal memuat detail',
              hint: '${snap.error}',
            );
          }
          final order = snap.data;
          if (order == null) {
            return const StateView(
              icon: Icons.receipt_long_rounded,
              color: BK.ink3,
              title: 'Data tidak ditemukan',
            );
          }
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
                    _infoRow('Status', order.status),
                    _infoRow('Pembayaran', order.paymentStatus),
                    _infoRow('Metode', order.paymentMethod.isEmpty ? '-' : order.paymentMethod),
                    _infoRow('Total', 'Rp${rupiah(order.grandTotal)}', bold: true),
                  ],
                ),
              ),
              const SizedBox(height: 14),
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
        },
      ),
    );
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
