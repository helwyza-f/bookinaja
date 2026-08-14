import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../ui/toast.dart';
import '../../ui/error_text.dart';
import '../../models/discovery.dart';
import '../../state/auth_controller.dart';
import '../../state/my_bookings_controller.dart';
import '../../state/customer_booking_controller.dart';
import '../../repositories/customer_reservation_repository.dart';
import 'customer_payment_screen.dart';

/// Alur booking customer untuk satu resource: paket → tanggal → slot → durasi →
/// promo → buat booking. Customer sudah login, jadi nama/nomor diambil dari akun.
class CustomerBookingFlow extends StatefulWidget {
  final TenantProfile tenant;
  final TenantResource resource;
  final DateTime? initialDate;
  const CustomerBookingFlow({
    super.key,
    required this.tenant,
    required this.resource,
    this.initialDate,
  });

  @override
  State<CustomerBookingFlow> createState() => _CustomerBookingFlowState();
}

class _CustomerBookingFlowState extends State<CustomerBookingFlow> {
  late final CustomerBookingController _c;
  final _promo = TextEditingController();
  final _dateScroll = ScrollController();

  static const double _dateItemExtent = 54 + 8; // lebar chip + separator

  @override
  void initState() {
    super.initState();
    _c = CustomerBookingController(
      context.read<CustomerReservationRepository>(),
      tenant: widget.tenant,
      resource: widget.resource,
      initialDate: widget.initialDate,
    );
    // Kalau paket cuma satu, controller sudah pre-select → muat slot untuk
    // tanggal awal (dari peek PDP bila ada, else hari ini).
    if (_c.pkg != null) _c.setDate(_c.date);
    // Geser strip tanggal ke tanggal terpilih (mis. dari peek PDP) agar terlihat.
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToSelectedDate());
  }

  void _scrollToSelectedDate() {
    if (!_dateScroll.hasClients) return;
    final today = DateTime.now();
    final index = _c.date
        .difference(DateTime(today.year, today.month, today.day))
        .inDays;
    if (index <= 0) return;
    final target = (index * _dateItemExtent)
        .clamp(0.0, _dateScroll.position.maxScrollExtent);
    _dateScroll.animateTo(
      target,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  @override
  void dispose() {
    _promo.dispose();
    _dateScroll.dispose();
    _c.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final cust = context.read<AuthController>().customer;
    if (cust == null) {
      BkToast.error(context, 'Sesi tidak valid, masuk ulang');
      return;
    }
    final created = await _c.submit(
      customerName: cust.name,
      customerPhone: cust.phone,
    );
    if (!mounted) return;
    if (created == null || created.id.isEmpty) {
      final err = _c.submitException;
      if (isSlotConflict(err)) {
        // Slot keburu diambil orang lain — segarkan ketersediaan (setDate juga
        // mereset pilihan slot) lalu minta customer pilih ulang.
        await _c.setDate(_c.date);
        if (!mounted) return;
        BkToast.warning(
          context,
          'Jam ini barusan terisi',
          subtitle: 'Ketersediaan diperbarui. Pilih jam lain, ya.',
        );
        return;
      }
      BkToast.error(
        context,
        'Gagal membuat booking',
        subtitle: friendlyError(err),
      );
      return;
    }
    unawaited(context.read<MyBookingsController>().loadAll());
    // Booking dibuat → lanjut ke pembayaran (ganti layar agar back tidak balik ke form).
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => CustomerPaymentScreen(bookingId: created.id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _c,
      child: Consumer<CustomerBookingController>(
        builder: (context, c, _) => Scaffold(
          backgroundColor: BK.bg,
          appBar: AppBar(
            backgroundColor: BK.bg,
            elevation: 0,
            foregroundColor: BK.ink,
            title: Text(
              c.resource.name,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              _label('01', 'Paket'),
              if (c.packages.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 4),
                  child: Text(
                    'Resource ini belum punya paket yang didukung booking mobile. Coba resource lain atau gunakan web.',
                    style: TextStyle(fontSize: 13, color: BK.ink3),
                  ),
                )
              else
                _packages(c),
              if (c.pkg != null) ...[
                _label('02', 'Tanggal'),
                _dateRow(c),
                _label('03', 'Jam mulai'),
                _slots(c),
                if (c.slot != null) ...[
                  _label('04', 'Durasi'),
                  _duration(c),
                  _label('05', 'Promo (opsional)'),
                  _promoRow(c),
                  const SizedBox(height: 18),
                  _summary(c),
                ],
              ],
            ],
          ),
          bottomNavigationBar: c.pkg != null && c.slot != null
              ? _submitBar(c)
              : null,
        ),
      ),
    );
  }

  Widget _label(String num, String title) => Padding(
    padding: const EdgeInsets.fromLTRB(0, 18, 2, 8),
    child: Row(
      children: [
        Container(
          width: 22,
          height: 22,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: BK.accent,
            borderRadius: BorderRadius.circular(7),
          ),
          child: Text(
            num,
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
            color: BK.ink,
          ),
        ),
      ],
    ),
  );

  Widget _packages(CustomerBookingController c) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      for (final p in c.packages)
        _choice(
          '${p.name} · Rp${rupiah(p.price)}${p.priceUnit.isNotEmpty ? '/${p.priceUnit}' : ''}',
          c.pkg?.id == p.id,
          () => c.selectPackage(p),
        ),
    ],
  );

  Widget _dateRow(CustomerBookingController c) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.only(bottom: 8, left: 2),
        child: Text(
          _monthYear(c.date),
          style: const TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: BK.ink2,
          ),
        ),
      ),
      SizedBox(
        height: 64,
        child: ListView.separated(
          controller: _dateScroll,
          scrollDirection: Axis.horizontal,
          itemCount: 30,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final now = DateTime.now();
            final d = DateTime(now.year, now.month, now.day).add(Duration(days: i));
            final on =
                c.date.year == d.year &&
                c.date.month == d.month &&
                c.date.day == d.day;
            // Tandai awal bulan baru agar batas bulan jelas saat scroll.
            final newMonth = i > 0 && d.day == 1;
            return InkWell(
              borderRadius: BorderRadius.circular(13),
              onTap: () => c.setDate(d),
              child: Container(
                width: 54,
                decoration: BoxDecoration(
                  color: on ? BK.accent : BK.card,
                  borderRadius: BorderRadius.circular(13),
                  border: Border.all(color: on ? BK.accent : BK.line),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      newMonth ? _mon(d.month) : _dow(d.weekday),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: on
                            ? Colors.white70
                            : (newMonth ? BK.accent : BK.ink3),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${d.day}',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: on ? Colors.white : BK.ink,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    ],
  );

  Widget _slots(CustomerBookingController c) {
    if (c.busyLoading) {
      return const Padding(
        padding: EdgeInsets.all(18),
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }
    final slots = c.slots;
    if (slots.isEmpty) {
      return const Text(
        'Tidak ada slot untuk tanggal ini.',
        style: TextStyle(fontSize: 13, color: BK.ink3),
      );
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final s in slots)
          _slotChip(
            s.label,
            selected: c.slot == s.label,
            available: s.available,
            past: s.past,
            onTap: s.available ? () => c.selectSlot(s.label) : null,
          ),
      ],
    );
  }

  Widget _duration(CustomerBookingController c) => Row(
    children: [
      _stepBtn(
        Icons.remove,
        c.duration > 1 ? () => c.setDuration(c.duration - 1) : null,
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18),
        child: Text(
          '${c.duration} ${c.unitLabel}',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: BK.ink,
          ),
        ),
      ),
      _stepBtn(
        Icons.add,
        c.duration < c.maxDuration ? () => c.setDuration(c.duration + 1) : null,
      ),
      const Spacer(),
      Text(
        'maks ${c.maxDuration}',
        style: const TextStyle(fontSize: 11.5, color: BK.ink3),
      ),
    ],
  );

  Widget _promoRow(CustomerBookingController c) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          Expanded(
            child: TextField(
              controller: _promo,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'KODE PROMO',
                isDense: true,
                filled: true,
                fillColor: BK.card,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: BK.line),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: BK.line),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          if (c.promo?.valid ?? false)
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: BK.crit,
                side: const BorderSide(color: BK.line),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 13,
                ),
              ),
              onPressed: () {
                _promo.clear();
                c.applyPromo('');
              },
              child: const Text('Hapus'),
            )
          else
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: BK.accent,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 13,
                ),
              ),
              onPressed: c.checkingPromo
                  ? null
                  : () => c.applyPromo(_promo.text),
              child: c.checkingPromo
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Pakai',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
            ),
        ],
      ),
      if (c.promo != null && !c.promo!.valid && c.promo!.message.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 6, left: 2),
          child: Text(
            c.promo!.message,
            style: const TextStyle(fontSize: 12, color: BK.crit),
          ),
        ),
      if (c.promo?.valid ?? false)
        Padding(
          padding: const EdgeInsets.only(top: 6, left: 2),
          child: Text(
            'Promo ${c.promo!.label} aktif · potongan Rp${rupiah(c.promo!.discount)}',
            style: const TextStyle(
              fontSize: 12,
              color: BK.live,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
    ],
  );

  Widget _summary(CustomerBookingController c) => BKCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (c.startAt != null) ...[
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: BK.accentSoft,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: const Icon(Icons.event_rounded, size: 20, color: BK.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _dowFull(c.date),
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: BK.ink,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      '${c.slot} – ${_fmtEnd(c)} · ${c.duration} ${c.unitLabel}',
                      style: const TextStyle(fontSize: 12.5, color: BK.ink3),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 22, color: BK.line),
        ],
        _sumRow(
          c.pkg!.name,
          'Rp${rupiah(c.pkg!.price * c.duration)}',
          sub: '${c.duration} ${c.unitLabel} × Rp${rupiah(c.pkg!.price)}',
        ),
        if (c.promo?.valid ?? false) ...[
          const SizedBox(height: 8),
          _sumRow(
            'Promo ${c.promo!.label}',
            '− Rp${rupiah(c.promo!.discount)}',
            valueColor: BK.live,
          ),
        ],
        const Divider(height: 22, color: BK.line),
        Row(
          children: [
            const Text(
              'Total',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 15,
                color: BK.ink,
              ),
            ),
            const Spacer(),
            Text(
              'Rp${rupiah(c.displayTotal)}',
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 18,
                color: BK.accent,
              ),
            ),
          ],
        ),
        if (c.hasDeposit) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: BK.accentSoft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    const Text(
                      'Bayar sekarang (DP)',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: BK.ink),
                    ),
                    const Spacer(),
                    Text(
                      'Rp${rupiah(c.amountDueNow ?? 0)}',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: BK.accent),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Text('Sisa dibayar di lokasi', style: TextStyle(fontSize: 11.5, color: BK.ink3)),
                    const Spacer(),
                    Text('Rp${rupiah(c.preview!.balanceDue)}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ],
    ),
  );

  Widget _submitBar(CustomerBookingController c) => SafeArea(
    child: Container(
      decoration: const BoxDecoration(
        color: BK.bg,
        border: Border(top: BorderSide(color: BK.line)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                c.hasDeposit ? 'Bayar sekarang (DP)' : 'Total booking',
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: BK.ink3,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Rp${rupiah(c.hasDeposit ? (c.amountDueNow ?? 0) : c.displayTotal)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: BK.accent,
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: BK.accent,
                padding: const EdgeInsets.symmetric(vertical: 15),
                disabledBackgroundColor: BK.line,
              ),
              onPressed: c.canSubmit ? _submit : null,
              child: c.submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Lanjut ke pembayaran',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
            ),
          ),
        ],
      ),
    ),
  );

  // ---------- widget kecil ----------

  Widget _choice(String label, bool on, VoidCallback onTap) => InkWell(
    borderRadius: BorderRadius.circular(11),
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: on ? BK.accent : BK.card,
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: on ? BK.accent : BK.line),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
          color: on ? Colors.white : BK.ink2,
        ),
      ),
    ),
  );

  Widget _slotChip(
    String label, {
    required bool selected,
    required bool available,
    required bool past,
    VoidCallback? onTap,
  }) {
    final Color bg, fg, border;
    if (selected) {
      bg = BK.accent;
      fg = Colors.white;
      border = BK.accent;
    } else if (!available) {
      bg = BK.card2;
      fg = BK.ink3;
      border = BK.line;
    } else {
      bg = BK.card;
      fg = BK.ink;
      border = BK.line;
    }
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: fg,
            decoration: !available && !selected
                ? TextDecoration.lineThrough
                : null,
          ),
        ),
      ),
    );
  }

  Widget _stepBtn(IconData i, VoidCallback? onTap) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(10),
    child: Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: onTap == null ? BK.card2 : BK.accentSoft,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(i, size: 18, color: onTap == null ? BK.ink3 : BK.accent),
    ),
  );

  Widget _sumRow(
    String title,
    String value, {
    String? sub,
    Color? valueColor,
  }) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: BK.ink,
              ),
            ),
            if (sub != null) ...[
              const SizedBox(height: 2),
              Text(sub, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ],
          ],
        ),
      ),
      const SizedBox(width: 10),
      Text(
        value,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w700,
          color: valueColor ?? BK.ink,
        ),
      ),
    ],
  );

  String _dow(int weekday) =>
      const ['', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][weekday];
  String _mon(int month) => const [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ][month];
  String _monthYear(DateTime d) => '${const [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ][d.month]} ${d.year}';
  String _dowFull(DateTime d) {
    const days = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    return '${days[d.weekday]}, ${d.day} ${_mon(d.month)} ${d.year}';
  }
  String _fmtEnd(CustomerBookingController c) {
    final e = c.endAt;
    if (e == null) return '';
    return '${e.hour.toString().padLeft(2, '0')}:${e.minute.toString().padLeft(2, '0')}';
  }
}
