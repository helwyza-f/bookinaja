import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/customer.dart';
import '../repositories/customers_repository.dart';
import 'customers.dart' show tierPill;

class CustomerDetailScreen extends StatelessWidget {
  final Customer customer;
  const CustomerDetailScreen({super.key, required this.customer});

  void _snack(BuildContext c, String m) =>
      ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(m), behavior: SnackBarBehavior.floating));

  @override
  Widget build(BuildContext context) {
    final c = customer;
    return Scaffold(
      appBar: AppBar(backgroundColor: BK.bg, elevation: 0, title: const Text('Profil', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: BK.ink))),
      backgroundColor: BK.bg,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          BKCard(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 14),
            child: Column(children: [
              Container(
                width: 60, height: 60,
                decoration: BoxDecoration(gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)]), borderRadius: BorderRadius.circular(18)),
                child: Center(child: Text(c.name.isNotEmpty ? c.name[0].toUpperCase() : '?', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 22))),
              ),
              const SizedBox(height: 10),
              Text(c.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BK.ink)),
              const SizedBox(height: 2),
              Text(c.phone, style: const TextStyle(color: BK.ink3, fontSize: 13)),
              const SizedBox(height: 8),
              tierPill(c.tier),
            ]),
          ),
          const SizedBox(height: 11),
          Row(children: [
            Expanded(child: _stat('Sesi', '${c.sessions}')),
            const SizedBox(width: 10),
            Expanded(child: _stat('Total spend', 'Rp${_short(c.spend)}')),
          ]),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(child: FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: BK.live, padding: const EdgeInsets.symmetric(vertical: 13)),
              onPressed: () => _snack(context, 'Buka WhatsApp ${c.name}'),
              icon: const Icon(Icons.chat_bubble_outline, size: 18), label: const Text('WhatsApp'),
            )),
            const SizedBox(width: 9),
            Expanded(child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(foregroundColor: BK.ink, backgroundColor: BK.card2, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(vertical: 13)),
              onPressed: () => _snack(context, 'Telepon ${c.phone}'),
              icon: const Icon(Icons.call_outlined, size: 18), label: const Text('Telepon'),
            )),
          ]),
          const SizedBox(height: 18),
          Row(children: const [
            Text('Booking terakhir', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
            SizedBox(width: 9),
            Expanded(child: Divider(color: BK.line)),
          ]),
          const SizedBox(height: 4),
          FutureBuilder<List<CustomerHistoryItem>>(
            future: context.read<CustomersRepository>().history(c.id),
            builder: (_, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const Padding(padding: EdgeInsets.all(16), child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))));
              }
              final items = snap.data ?? const [];
              if (items.isEmpty) {
                return const BKCard(child: Text('Belum ada transaksi.', style: TextStyle(fontSize: 12.5, color: BK.ink3)));
              }
              return BKCard(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Column(children: [
                  for (int i = 0; i < items.length; i++) ...[
                    _HistoryRow(
                      items[i].resource,
                      [_clock(items[i].date), items[i].status].where((s) => s.isNotEmpty).join(' · '),
                      'Rp${_short(items[i].total)}',
                    ),
                    if (i < items.length - 1) const Divider(height: 1, color: BK.line),
                  ],
                ]),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _stat(String k, String v) => BKCard(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(k, style: const TextStyle(fontSize: 11.5, color: BK.ink3, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(v, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BK.ink)),
        ]),
      );

  static String _clock(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '';
    final l = d.toLocal();
    return '${l.day}/${l.month}';
  }

  static String _short(int v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}jt';
    if (v >= 1000) return '${(v / 1000).round()}rb';
    return '$v';
  }
}

class _HistoryRow extends StatelessWidget {
  final String title, sub, amount;
  const _HistoryRow(this.title, this.sub, this.amount);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(children: [
        Container(width: 40, height: 40, decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(11)), child: const Icon(Icons.sports_esports_outlined, size: 20, color: BK.ink3)),
        const SizedBox(width: 11),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: BK.ink)),
          Text(sub, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
        ])),
        Text(amount, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: BK.ink2)),
      ]),
    );
  }
}
