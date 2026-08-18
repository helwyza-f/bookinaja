import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/pos_order.dart';
import '../state/pos_controller.dart';
import '../theme.dart';
import 'kasir_order_detail.dart';

class KasirHistoryScreen extends StatefulWidget {
  const KasirHistoryScreen({super.key});

  @override
  State<KasirHistoryScreen> createState() => _KasirHistoryScreenState();
}

class _KasirHistoryScreenState extends State<KasirHistoryScreen> {
  late Future<List<PosOrder>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<PosController>().fetchHistory();
  }

  void _reload() {
    setState(() {
      _future = context.read<PosController>().fetchHistory();
    });
  }

  String _time(DateTime? d) {
    if (d == null) return '-';
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)} ${two(d.hour)}:${two(d.minute)}';
  }

  ({String label, Color color}) _payBadge(PosOrder o) {
    final s = o.paymentStatus.toLowerCase();
    if (s == 'settled' || s == 'paid') return (label: 'Lunas', color: Colors.green);
    if (s.contains('await') || s.contains('verif')) return (label: 'Verifikasi', color: BK.accent);
    if (s == 'rejected') return (label: 'Ditolak', color: BK.crit);
    return (label: o.paymentStatus.isEmpty ? 'Belum bayar' : o.paymentStatus, color: BK.ink3);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text(
          'Riwayat Kasir',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: BK.ink),
        ),
      ),
      body: FutureBuilder<List<PosOrder>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const LoadingList();
          }
          if (snap.hasError) {
            return StateView(
              icon: Icons.wifi_off_rounded,
              color: BK.crit,
              title: 'Gagal memuat riwayat',
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
              icon: Icons.receipt_long_rounded,
              color: BK.ink3,
              title: 'Belum ada transaksi',
              hint: 'Transaksi kasir akan muncul di sini.',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final o = orders[i];
                final badge = _payBadge(o);
                return InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => KasirOrderDetailScreen(orderId: o.id),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: BK.card,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: BK.line),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x0A0D1526),
                          blurRadius: 16,
                          offset: Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: badge.color.withValues(alpha: .12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(
                            Icons.receipt_long_rounded,
                            color: badge.color,
                          ),
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
                                      o.orderNumber,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13.8,
                                        color: BK.ink,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: badge.color.withValues(alpha: .12),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      badge.label,
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w800,
                                        color: badge.color,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _time(o.createdAt),
                                style: const TextStyle(
                                  fontSize: 11.8,
                                  color: BK.ink3,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Rp${rupiah(o.grandTotal)}',
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: BK.ink,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.chevron_right_rounded, color: BK.ink3),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
