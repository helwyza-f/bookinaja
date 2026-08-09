import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/booking.dart';
import '../state/bookings_controller.dart';
import 'booking_detail.dart';
import 'create_booking.dart';

class BookingsScreen extends StatelessWidget {
  const BookingsScreen({super.key});
  static const _filters = ['Semua', 'Perlu aksi', 'Aktif', 'Lunas'];

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<BookingsController>();
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(children: [
              const Text('Booking', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
              const Spacer(),
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10)),
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateBookingScreen())),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Baru'),
              ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: BKCard(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(children: const [
                Icon(Icons.search, size: 18, color: BK.ink3),
                SizedBox(width: 10),
                Text('Cari nama / kode…', style: TextStyle(color: BK.ink3, fontSize: 13)),
              ]),
            ),
          ),
          const SizedBox(height: 11),
          SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filters.length,
              separatorBuilder: (_, i) => const SizedBox(width: 7),
              itemBuilder: (_, i) {
                final on = ctrl.filter == i;
                return GestureDetector(
                  onTap: () => ctrl.setFilter(i),
                  child: Container(
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(horizontal: 13),
                    decoration: BoxDecoration(
                      color: on ? BK.ink : BK.card,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: on ? BK.ink : BK.line),
                    ),
                    child: Text(_filters[i], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: on ? Colors.white : BK.ink2)),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ctrl.state.when(
              loading: () => const LoadingList(),
              error: (e) => StateView(
                icon: Icons.wifi_off_rounded,
                color: BK.crit,
                title: 'Gagal memuat booking',
                hint: '$e',
                action: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent),
                  onPressed: () => ctrl.load(),
                  child: const Text('Coba lagi'),
                ),
              ),
              data: (_) {
                final list = ctrl.filtered;
                if (list.isEmpty) {
                  return const StateView(icon: Icons.event_busy, color: BK.ink3, title: 'Tidak ada booking', hint: 'Belum ada booking di filter ini.');
                }
                return RefreshIndicator(
                  onRefresh: ctrl.load,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                    itemCount: list.length,
                    separatorBuilder: (_, i) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _BookingRow(list[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingRow extends StatelessWidget {
  final Booking b;
  const _BookingRow(this.b);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: () async {
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: b)));
        if (context.mounted) context.read<BookingsController>().load();
      },
      child: BKCard(
        child: Row(children: [
          Container(width: 44, height: 44, decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFFC9D6F5), Color(0xFF8AA6E6)]),
            borderRadius: BorderRadius.circular(12),
          )),
          const SizedBox(width: 11),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(b.customer, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
              const SizedBox(height: 2),
              Text('${b.resource} · ${b.time}', style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            statusPill(b.status),
            const SizedBox(height: 4),
            Text('Rp${(b.total / 1000).round()}rb', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: BK.ink2)),
          ]),
        ]),
      ),
    );
  }
}

/// Pill status booking konsisten di seluruh app.
Pill statusPill(BookingStatus s) {
  switch (s) {
    case BookingStatus.live:
      return Pill.live('Live');
    case BookingStatus.review:
      return Pill.crit('Review');
    case BookingStatus.dp:
      return Pill.pend('DP');
    case BookingStatus.paid:
      return Pill.live('Lunas');
    case BookingStatus.cancelled:
      return Pill.mut('Batal');
    case BookingStatus.pending:
      return Pill.acc('Pending');
  }
}
