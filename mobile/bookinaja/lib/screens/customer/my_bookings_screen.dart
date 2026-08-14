import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../ui/error_text.dart';
import '../../models/customer_booking.dart';
import '../../state/async_value.dart';
import '../../state/my_bookings_controller.dart';
import 'customer_payment_screen.dart';

/// "Booking Saya" — tab Aktif & Riwayat (read-only, Fase 1).
class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});
  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MyBookingsController>().loadAll();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.watch<MyBookingsController>();
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: BK.bg,
        appBar: AppBar(
          backgroundColor: BK.bg,
          elevation: 0,
          titleSpacing: 16,
          title: const Text('Booking Saya', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: BK.ink)),
          bottom: const TabBar(
            labelColor: BK.accent,
            unselectedLabelColor: BK.ink3,
            indicatorColor: BK.accent,
            labelStyle: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5),
            tabs: [Tab(text: 'Aktif'), Tab(text: 'Riwayat')],
          ),
        ),
        body: TabBarView(
          children: [
            _list(c.active, onRefresh: c.loadActive, emptyHint: 'Belum ada booking aktif. Jelajahi tenant untuk mulai.'),
            _list(c.history, onRefresh: c.loadHistory, emptyHint: 'Belum ada riwayat transaksi.'),
          ],
        ),
      ),
    );
  }

  Widget _list(AsyncValue<List<CustomerBookingItem>> state, {required Future<void> Function() onRefresh, required String emptyHint}) {
    return state.when(
      loading: () => const LoadingList(),
      error: (e) => StateView(
        icon: Icons.wifi_off_rounded,
        color: BK.crit,
        title: 'Gagal memuat',
        hint: friendlyError(e),
        action: FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.accent), onPressed: onRefresh, child: const Text('Coba lagi')),
      ),
      data: (items) {
        if (items.isEmpty) {
          return StateView(icon: Icons.event_available_outlined, color: BK.ink3, title: 'Kosong', hint: emptyHint);
        }
        return RefreshIndicator(
          color: BK.accent,
          onRefresh: onRefresh,
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _BookingCard(items[i]),
          ),
        );
      },
    );
  }
}

class _BookingCard extends StatelessWidget {
  final CustomerBookingItem b;
  const _BookingCard(this.b);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: () => _showDetail(context, b),
      child: BKCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(b.isOrder ? Icons.fastfood_outlined : Icons.event_note_outlined, size: 18, color: BK.ink3),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(b.tenantName.isEmpty ? 'Tenant' : b.tenantName, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: BK.ink)),
                ),
                _statusPill(b.status),
              ],
            ),
            if (b.resource.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(b.resource, style: const TextStyle(fontSize: 13, color: BK.ink2)),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.schedule, size: 14, color: BK.ink3),
                const SizedBox(width: 5),
                Text(_fmtDate(b.date), style: const TextStyle(fontSize: 12, color: BK.ink3)),
                const Spacer(),
                Text('Rp${rupiah(b.grandTotal)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: BK.ink)),
              ],
            ),
            if (b.balanceDue > 0) ...[
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: Text('Sisa Rp${rupiah(b.balanceDue)}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.crit)),
              ),
            ],
            if (b.needsPayment) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: BK.accent,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                  ),
                  onPressed: () => _openPayment(context, b.id),
                  icon: const Icon(Icons.payments_outlined, size: 18),
                  label: const Text('Lanjutkan pembayaran', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

void _openPayment(BuildContext context, String bookingId) {
  Navigator.of(context).push(
    MaterialPageRoute(builder: (_) => CustomerPaymentScreen(bookingId: bookingId)),
  );
}

void _showDetail(BuildContext context, CustomerBookingItem b) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: BK.card,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4)))),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: Text(b.tenantName.isEmpty ? 'Tenant' : b.tenantName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink))),
                _statusPill(b.status),
              ],
            ),
            const SizedBox(height: 12),
            _row('Jenis', b.isOrder ? 'Order F&B / direct sale' : 'Booking'),
            if (b.resource.isNotEmpty) _row('Resource', b.resource),
            _row('Jadwal', _fmtDate(b.date)),
            _row('Total', 'Rp${rupiah(b.grandTotal)}'),
            if (b.balanceDue > 0) _row('Sisa tagihan', 'Rp${rupiah(b.balanceDue)}'),
            _row('Status bayar', b.paymentStatus.isEmpty ? '-' : b.paymentStatus),
            if (b.needsPayment) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: BK.accent,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                  ),
                  onPressed: () {
                    Navigator.of(context).pop();
                    _openPayment(context, b.id);
                  },
                  icon: const Icon(Icons.payments_outlined, size: 18),
                  label: const Text('Lanjutkan pembayaran', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ] else ...[
              const SizedBox(height: 6),
              const Text('Live sesi & detail lengkap menyusul di update berikutnya.',
                  style: TextStyle(fontSize: 11.5, color: BK.ink3, fontStyle: FontStyle.italic)),
            ],
          ],
        ),
      ),
    ),
  );
}

Widget _row(String k, String v) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 110, child: Text(k, style: const TextStyle(fontSize: 12.5, color: BK.ink3))),
          Expanded(child: Text(v, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: BK.ink2))),
        ],
      ),
    );

Widget _statusPill(String status) {
  switch (status) {
    case 'completed':
      return Pill.live('Selesai');
    case 'active':
    case 'ongoing':
      return Pill.live('Berlangsung');
    case 'confirmed':
      return Pill.acc('Siap');
    case 'pending':
      return Pill.pend('Menunggu');
    case 'cancelled':
    case 'canceled':
      return Pill.mut('Batal');
    case 'no_show':
      return Pill.mut('Tidak hadir');
    default:
      return Pill.mut(status.isEmpty ? '-' : status);
  }
}

String _fmtDate(DateTime? d) {
  if (d == null) return '-';
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(d.day)}/${two(d.month)}/${d.year} · ${two(d.hour)}:${two(d.minute)}';
}
