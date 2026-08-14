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

/// Alur booking customer untuk satu resource: paket → jadwal → slot → durasi →
/// add-on → promo → ringkasan. Struktur & interaksi mengikuti sisi admin
/// (create_booking.dart), kecuali input data customer — customer sudah login,
/// jadi nama/nomor diambil dari akun.
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

  // Auto-scroll ke step yang baru terungkap — hanya reveal pertama (mengikuti
  // admin), supaya mengubah pilihan lama tidak menyentak halaman.
  final _scheduleKey = GlobalKey();
  final _durationKey = GlobalKey();
  bool _scrolledSchedule = false;
  bool _scrolledDuration = false;

  // Dipanggil tiap build (post-frame): scroll ke section yang baru muncul.
  void _autoScroll(CustomerBookingController c) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (c.pkg != null && !_scrolledSchedule) {
        _scrolledSchedule = true;
        _scrollTo(_scheduleKey);
      } else if (c.slot != null && !_scrolledDuration) {
        _scrolledDuration = true;
        _scrollTo(_durationKey);
      }
    });
  }

  void _scrollTo(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx == null) return;
    Scrollable.ensureVisible(
      ctx,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOutCubic,
      alignment: 0.02,
    );
  }

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
        builder: (context, c, _) {
          _autoScroll(c);
          return Scaffold(
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
            padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
            children: [
              _stepLabel('01', 'Paket'),
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
                Container(key: _scheduleKey),
                _stepLabel('02', 'Jadwal'),
                _dateRow(c),
                Padding(
                  padding: const EdgeInsets.only(top: 8, left: 2),
                  child: Text(
                    _fullDate(c.date),
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: BK.ink2,
                    ),
                  ),
                ),
                if (c.busyLoading)
                  const Padding(
                    padding: EdgeInsets.all(18),
                    child: Center(
                      child: SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  )
                else
                  _slotSection(c),
                if (c.slot != null) ...[
                  Container(key: _durationKey),
                  _durationBlock(c),
                  if (c.startAt != null) _scheduleSummary(c),
                  if (c.addons.isNotEmpty) ...[
                    _label('ADD-ON'),
                    _addonsRow(c),
                  ],
                  _label('PROMO (OPSIONAL)'),
                  _promoRow(c),
                  _label('RINGKASAN'),
                  _summary(c),
                ],
              ],
            ],
          ),
          bottomNavigationBar: c.pkg != null && c.slot != null
              ? _submitBar(c)
              : null,
          );
        },
      ),
    );
  }

  // Judul step bernomor (mengikuti admin/web: 01 / 02 …).
  Widget _stepLabel(String num, String title) => Padding(
    padding: const EdgeInsets.fromLTRB(0, 16, 2, 8),
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

  // Sub-label polos untuk seksi di dalam step (SLOT MULAI, DURASI, dst).
  Widget _label(String t) => Padding(
    padding: const EdgeInsets.fromLTRB(2, 16, 2, 8),
    child: Text(
      t,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1,
        color: BK.ink3,
      ),
    ),
  );

  Widget _packages(CustomerBookingController c) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      for (final p in c.packages)
        _choice(
          '${p.name} · Rp${rupiah(p.price)}/${p.unitLabel}',
          c.pkg?.id == p.id,
          () => c.selectPackage(p),
        ),
    ],
  );

  Widget _addonsRow(CustomerBookingController c) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      for (final a in c.addons)
        _choice(
          '${a.name} · Rp${rupiah(a.price)}',
          c.selectedAddonIds.contains(a.id),
          () => c.toggleAddon(a.id),
        ),
    ],
  );

  // Strip 30 hari + tombol kalender untuk tanggal jauh (mengikuti admin).
  Widget _dateRow(CustomerBookingController c) => Row(
    children: [
      Expanded(
        child: SizedBox(
          height: 64,
          child: ListView.separated(
            controller: _dateScroll,
            scrollDirection: Axis.horizontal,
            itemCount: 30,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final now = DateTime.now();
              final d =
                  DateTime(now.year, now.month, now.day).add(Duration(days: i));
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
      ),
      const SizedBox(width: 8),
      InkWell(
        borderRadius: BorderRadius.circular(13),
        onTap: () => _pickDate(c),
        child: Container(
          width: 48,
          height: 64,
          decoration: BoxDecoration(
            color: BK.card,
            borderRadius: BorderRadius.circular(13),
            border: Border.all(color: BK.line),
          ),
          child: const Icon(
            Icons.calendar_month_outlined,
            size: 22,
            color: BK.accent,
          ),
        ),
      ),
    ],
  );

  Future<void> _pickDate(CustomerBookingController c) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: c.date.isBefore(now) ? now : c.date,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 365)),
      helpText: 'Pilih tanggal booking',
    );
    if (picked != null) c.setDate(picked);
  }

  // Grid slot 4 kolom + badge ketersediaan (mengikuti admin).
  Widget _slotSection(CustomerBookingController c) {
    final slots = c.slots;
    if (slots.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _label('SLOT MULAI'),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: BK.card,
              borderRadius: BorderRadius.circular(BK.radius),
              border: Border.all(color: BK.line),
            ),
            child: const Text(
              'Belum ada slot untuk tanggal ini. Coba tanggal lain.',
              style: TextStyle(fontSize: 12.5, color: BK.ink3),
            ),
          ),
        ],
      );
    }
    final avail = slots.where((s) => s.available).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _label('SLOT MULAI'),
            const Spacer(),
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: avail > 0 ? BK.liveSoft : BK.critSoft,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                avail > 0 ? '$avail slot tersedia' : 'penuh',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: avail > 0 ? BK.live : BK.crit,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: slots.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisExtent: 42,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
          ),
          itemBuilder: (_, i) => _slotChip(
            slots[i].label,
            selected: c.slot == slots[i].label,
            available: slots[i].available,
            past: slots[i].past,
            onTap: () => c.selectSlot(slots[i].label),
          ),
        ),
      ],
    );
  }

  // Pilihan durasi sebagai option chips horizontal (mengikuti admin).
  Widget _durationBlock(CustomerBookingController c) {
    final maxDur = c.maxDuration;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _label('DURASI (${c.unitLabel})'),
            const Spacer(),
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
              decoration: BoxDecoration(
                color: BK.accentSoft,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'maks $maxDur ${c.unitLabel}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: BK.accent,
                ),
              ),
            ),
          ],
        ),
        SizedBox(
          height: 56,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: maxDur,
            separatorBuilder: (_, i) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final val = i + 1;
              final on = c.duration == val;
              return GestureDetector(
                onTap: () => c.setDuration(val),
                child: Container(
                  width: 62,
                  decoration: BoxDecoration(
                    color: on ? BK.accent : BK.card,
                    borderRadius: BorderRadius.circular(13),
                    border: Border.all(
                      color: on ? BK.accent : BK.line,
                      width: on ? 1.5 : 1,
                    ),
                    boxShadow: on
                        ? [
                            BoxShadow(
                              color: BK.accent.withValues(alpha: .30),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$val',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          height: 1,
                          color: on ? Colors.white : BK.ink,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        c.unitLabel,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: on ? Colors.white70 : BK.ink3,
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
  }

  // Kartu rangkuman jadwal: waktu mulai → selesai (mengikuti admin).
  Widget _scheduleSummary(CustomerBookingController c) {
    final s = c.startAt!, e = c.endAt!;
    String hm(DateTime t) =>
        '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: BK.accentSoft,
          borderRadius: BorderRadius.circular(BK.radius),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Icon(Icons.schedule, size: 15, color: BK.accent),
                SizedBox(width: 7),
                Text(
                  'RANGKUMAN JADWAL',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: BK.accent,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'MULAI',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                          color: BK.ink3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        hm(s),
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: BK.ink,
                          height: 1,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _fullDate(s),
                        style: const TextStyle(fontSize: 11, color: BK.ink2),
                      ),
                    ],
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.only(top: 16),
                  child: Icon(
                    Icons.arrow_forward_rounded,
                    size: 16,
                    color: BK.ink3,
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'SELESAI',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                          color: BK.ink3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        hm(e),
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: BK.accent,
                          height: 1,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _fullDate(e),
                        style: const TextStyle(fontSize: 11, color: BK.ink2),
                        textAlign: TextAlign.end,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _promoRow(CustomerBookingController c) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          Expanded(
            child: TextField(
              controller: _promo,
              textCapitalization: TextCapitalization.characters,
              enabled: !(c.promo?.valid ?? false),
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
        _sumRow(
          c.pkg!.name,
          'Rp${rupiah(c.pkg!.price * c.duration)}',
          sub: '${c.duration} ${c.unitLabel} × Rp${rupiah(c.pkg!.price)}',
        ),
        for (final a in c.addons.where((a) => c.selectedAddonIds.contains(a.id))) ...[
          const SizedBox(height: 8),
          _sumRow(a.name, 'Rp${rupiah(a.price)}'),
        ],
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

  Widget _choice(String label, bool on, VoidCallback onTap) => Material(
    color: on ? BK.accentSoft : BK.card,
    borderRadius: BorderRadius.circular(12),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: on ? BK.accent : BK.line),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: on ? BK.accent : BK.ink2,
          ),
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
    } else if (past) {
      // Lewat waktu → abu-abu netral (beda dari "penuh").
      bg = BK.card2;
      fg = BK.ink3;
      border = BK.line;
    } else if (!available) {
      bg = BK.critSoft;
      fg = BK.crit;
      border = BK.critSoft;
    } else {
      bg = BK.accentSoft;
      fg = BK.accent;
      border = const Color(0x332F6BFF);
    }
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(11),
      child: InkWell(
        onTap: available ? onTap : null,
        borderRadius: BorderRadius.circular(11),
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: border, width: selected ? 1.5 : 1),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: BK.accent.withValues(alpha: .30),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              decoration: (!available && !past)
                  ? TextDecoration.lineThrough
                  : null,
              color: fg,
            ),
          ),
        ),
      ),
    );
  }

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
  String _fullDate(DateTime d) =>
      '${_dow(d.weekday)}, ${d.day} ${_mon(d.month)} ${d.year}';
}
