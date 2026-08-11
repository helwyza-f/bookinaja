import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/catalog.dart';
import '../repositories/catalog_repository.dart';
import '../repositories/booking_repository.dart';
import '../repositories/customers_repository.dart';
import '../state/create_booking_controller.dart';
import '../state/bookings_controller.dart';
import '../ui/toast.dart';

/// Flow buat booking (admin): resource → paket → tanggal → slot → durasi → addon.
class CreateBookingScreen extends StatelessWidget {
  final String initialResourceId;
  const CreateBookingScreen({super.key, this.initialResourceId = ''});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => CreateBookingController(
        ctx.read<CatalogRepository>(),
        ctx.read<BookingRepository>(),
        ctx.read<CustomersRepository>(),
        initialResourceId: initialResourceId,
      )..load(),
      child: const _Flow(),
    );
  }
}

class _Flow extends StatefulWidget {
  const _Flow();
  @override
  State<_Flow> createState() => _FlowState();
}

class _FlowState extends State<_Flow> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _promo = TextEditingController();
  final _scroll = ScrollController();
  String _resQuery = '';
  Timer? _crmDebounce;

  // Auto-scroll ke step yang baru terungkap — hanya reveal pertama (mengikuti
  // web), supaya mengubah pilihan lama tidak menyentak halaman.
  final _scheduleKey = GlobalKey();
  final _durationKey = GlobalKey();
  bool _scrolledSchedule = false;
  bool _scrolledDuration = false;

  @override
  void initState() {
    super.initState();
    _phone.addListener(_onPhoneChanged);
  }

  void _onPhoneChanged() {
    _crmDebounce?.cancel();
    _crmDebounce = Timer(const Duration(milliseconds: 800), () async {
      if (!mounted) return;
      final name = await context.read<CreateBookingController>().validatePhoneNumber(_phone.text);
      if (!mounted) return;
      if (name != null && _name.text.trim().isEmpty) {
        _name.text = name; // auto-fill kalau nama masih kosong
      }
    });
  }

  // Dipanggil tiap build (post-frame): scroll ke section yang baru muncul.
  void _autoScroll(CreateBookingController c) {
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
    Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400), curve: Curves.easeOutCubic, alignment: 0.02);
  }

  @override
  void dispose() {
    _crmDebounce?.cancel();
    _phone.removeListener(_onPhoneChanged);
    _name.dispose();
    _phone.dispose();
    _promo.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _back(CreateBookingController c) {
    if (c.resource != null) {
      _scrolledSchedule = false;
      _scrolledDuration = false;
      c.clearResource();
    } else {
      Navigator.of(context).pop();
    }
  }

  void _snack(String m, Color color) {
    if (color == BK.live) {
      BkToast.success(context, m);
    } else if (color == BK.crit) {
      BkToast.error(context, m);
    } else if (color == BK.pend) {
      BkToast.warning(context, m);
    } else {
      BkToast.info(context, m);
    }
  }

  Future<void> _pickFromList(CreateBookingController c) async {
    FocusManager.instance.primaryFocus?.unfocus();
    final selected = await showModalBottomSheet<({String name, String phone, String tier})>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CustomerPickerSheet(load: c.customerList),
    );
    if (selected == null || !mounted) return;
    _phone.text = selected.phone;
    _name.text = selected.name;
    c.pickCustomer(name: selected.name, phone: selected.phone, tier: selected.tier);
  }

  Future<void> _submit(CreateBookingController c) async {
    if (_name.text.trim().isEmpty) return _snack('Nama customer wajib diisi', BK.crit);
    final booking = await c.submit(name: _name.text, phone: _phone.text);
    if (!mounted) return;
    if (booking != null) {
      context.read<BookingsController>().addLocal(booking);
      Navigator.of(context).pop();
      _snack('Booking ${booking.customer} dibuat', BK.live);
    } else {
      _snack(c.submitError ?? 'Gagal membuat booking', BK.crit);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.watch<CreateBookingController>();
    final onResourceStep = c.resource == null;
    if (!onResourceStep) _autoScroll(c);
    return PopScope(
      canPop: onResourceStep,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _scrolledSchedule = false;
          _scrolledDuration = false;
          c.clearResource();
        }
      },
      child: Scaffold(
        backgroundColor: BK.bg,
        appBar: AppBar(
          backgroundColor: BK.bg, elevation: 0,
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => _back(c)),
          title: Text(onResourceStep ? 'Pilih resource' : (c.resource?.resourceName ?? 'Booking'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
        ),
        body: onResourceStep ? _resourceStep(c) : _builderStep(c),
        bottomNavigationBar: onResourceStep ? null : _submitBar(c),
      ),
    );
  }

  // ---------- STEP 1: RESOURCE ----------
  Widget _resourceStep(CreateBookingController c) {
    return c.resources.when(
      loading: () => const LoadingList(),
      error: (e) => StateView(
        icon: Icons.wifi_off_rounded, color: BK.crit, title: 'Gagal memuat resource', hint: '$e',
        action: FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.accent), onPressed: c.load, child: const Text('Coba lagi')),
      ),
      data: (list) {
        if (list.isEmpty) {
          return const StateView(icon: Icons.inventory_2_outlined, color: BK.ink3, title: 'Belum ada resource', hint: 'Buat resource & paket dulu lewat web.');
        }
        final q = _resQuery.trim().toLowerCase();
        final filtered = q.isEmpty
            ? list
            : list.where((r) => r.resourceName.toLowerCase().contains(q) || r.category.toLowerCase().contains(q)).toList();
        return Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              onChanged: (v) => setState(() => _resQuery = v),
              decoration: InputDecoration(
                hintText: 'Cari resource / kategori…',
                prefixIcon: const Icon(Icons.search, size: 20, color: BK.ink3),
                isDense: true,
                filled: true, fillColor: BK.card,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
              ),
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const StateView(icon: Icons.search_off, color: BK.ink3, title: 'Tidak ketemu', hint: 'Coba kata kunci lain.')
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                    itemCount: filtered.length,
                    separatorBuilder: (_, i) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _resourceCard(filtered[i], () => c.selectResource(filtered[i])),
                  ),
          ),
        ]);
      },
    );
  }

  Widget _resourceCard(ResourceEntry r, VoidCallback onTap) {
    final prices = r.packages.map((p) => p.price).toList()..sort();
    final priceLabel = prices.length == 1 ? 'Rp${rupiah(prices.first)}' : 'mulai Rp${rupiah(prices.first)}';
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: onTap,
      child: BKCard(
        child: Row(children: [
          Container(width: 44, height: 44, decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFC9D6F5), Color(0xFF8AA6E6)]), borderRadius: BorderRadius.circular(12))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(r.resourceName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: BK.ink)),
            const SizedBox(height: 2),
            Text('${r.packages.length} paket · $priceLabel${r.category.isNotEmpty ? ' · ${r.category}' : ''}',
                style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ])),
          const Icon(Icons.arrow_forward_ios, size: 15, color: BK.ink3),
        ]),
      ),
    );
  }

  // ---------- STEP 2: BUILDER ----------
  Widget _builderStep(CreateBookingController c) {
    final r = c.resource!;
    return ListView(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 20),
      children: [
        _stepLabel('01', 'Customer'),
        BKCard(child: Column(children: [
          Row(children: [
            const Icon(Icons.phone_outlined, size: 20, color: BK.ink3),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: _phone, keyboardType: TextInputType.phone,
              decoration: const InputDecoration(hintText: 'Nomor WhatsApp', border: InputBorder.none, isDense: true))),
            _phoneStatusIcon(c.phoneStatus),
          ]),
          const Divider(height: 1, color: BK.line),
          Row(children: [
            const Icon(Icons.person_outline, size: 20, color: BK.ink3),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: _name, textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: 'Nama customer', border: InputBorder.none, isDense: true))),
          ]),
        ])),
        _phoneHint(c),
        if (c.foundCustomer != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(color: BK.liveSoft, borderRadius: BorderRadius.circular(10)),
              child: Row(children: [
                const Icon(Icons.verified_user_outlined, size: 16, color: BK.live),
                const SizedBox(width: 8),
                Expanded(child: Text(c.isReturning ? 'Pelanggan lama: ${c.foundCustomer!.name} — selamat datang kembali' : 'Pelanggan terdaftar: ${c.foundCustomer!.name}',
                    style: const TextStyle(fontSize: 12, color: BK.live, fontWeight: FontWeight.w600))),
                if (c.foundCustomer!.tier.isNotEmpty) Pill.mut(c.foundCustomer!.tier),
              ]),
            ),
          ),

        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(foregroundColor: BK.accent, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
              onPressed: () => _pickFromList(c),
              icon: const Icon(Icons.people_alt_outlined, size: 18),
              label: const Text('Pilih dari daftar pelanggan'),
            ),
          ),
        ),

        _stepLabel('02', 'Paket'),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final p in r.packages)
            _choice('${p.name} · Rp${rupiah(p.price)}/${p.unitLabel}', c.pkg?.itemId == p.itemId, () => c.selectPackage(p)),
        ]),

        if (c.pkg != null) ...[
          Container(key: _scheduleKey),
          _stepLabel('03', 'Jadwal'),
          _dateRow(c),
          Padding(
            padding: const EdgeInsets.only(top: 8, left: 2),
            child: Text(_fullDate(c.date), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: BK.ink2)),
          ),

          // Urutan mengikuti web: pilih SLOT dulu, baru DURASI (paket interday
          // seperti hari/minggu/bulan tidak pakai slot jam).
          if (c.isInterday) ...[
            Padding(
              padding: const EdgeInsets.only(top: 14),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  const Icon(Icons.info_outline, size: 18, color: BK.accent),
                  const SizedBox(width: 9),
                  Expanded(child: Text('Paket ${c.unitLabel} mulai otomatis di jam buka tenant — tanpa pilih slot jam.',
                      style: const TextStyle(fontSize: 12, color: BK.accent, fontWeight: FontWeight.w600))),
                ]),
              ),
            ),
            Container(key: _durationKey),
            _durationBlock(c),
          ] else ...[
            _label('SLOT MULAI'),
            if (c.busyLoading)
              const Padding(padding: EdgeInsets.all(8), child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))))
            else
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final s in c.slots) _slotChip(s.label, available: s.available, selected: c.slot == s.label, onTap: () => c.selectSlot(s.label)),
              ]),
            if (c.slot != null) ...[
              Container(key: _durationKey),
              _durationBlock(c),
            ],
          ],

          if (c.addons.isNotEmpty && (c.isInterday || c.slot != null)) ...[
            _label('ADD-ON'),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final a in c.addons)
                _choice('${a.name} · Rp${rupiah(a.price)}', c.selectedAddonIds.contains(a.itemId), () => c.toggleAddon(a.itemId)),
            ]),
          ],

          if (c.isInterday || c.slot != null) ...[
            _label('PROMO (OPSIONAL)'),
            _promoRow(c),

            const SizedBox(height: 18),
            BKCard(child: Column(children: [
              _row('${c.pkg!.name} · ${c.duration} ${c.unitLabel}', 'Rp${rupiah(c.pkg!.price * c.duration)}'),
              for (final a in c.addons.where((a) => c.selectedAddonIds.contains(a.itemId)))
                _row(a.name, 'Rp${rupiah(a.price)}'),
              if (c.promo?.valid ?? false)
                _row('Promo ${c.promo!.label}', '− Rp${rupiah(c.promo!.discount)}', valueColor: BK.live),
              const Divider(height: 18, color: BK.line),
              Row(children: [
                const Text('Total', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: BK.ink)),
                const Spacer(),
                Text('Rp${rupiah(c.grandTotal)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: BK.ink)),
              ]),
            ])),
          ],
        ],
      ],
    );
  }

  // Ikon status validasi nomor WA (mengikuti web: spinner/valid/invalid).
  Widget _phoneStatusIcon(PhoneStatus s) => switch (s) {
        PhoneStatus.validating => const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: BK.accent)),
        PhoneStatus.valid => const Icon(Icons.verified_outlined, size: 20, color: BK.live),
        PhoneStatus.invalid => const Icon(Icons.error_outline, size: 20, color: BK.crit),
        PhoneStatus.idle => const Icon(Icons.smartphone_outlined, size: 20, color: BK.ink3),
      };

  Widget _phoneHint(CreateBookingController c) {
    final (text, color) = switch (c.phoneStatus) {
      PhoneStatus.validating => ('Mengecek nomor WhatsApp…', BK.accent),
      PhoneStatus.invalid => ('Nomor WhatsApp tidak valid — nota dikirim ke nomor ini.', BK.crit),
      PhoneStatus.valid when c.isReturning => ('Nomor dikenali — pelanggan lama.', BK.live),
      PhoneStatus.valid => ('Nomor valid. Nota & akses booking dikirim ke sini.', BK.live),
      PhoneStatus.idle => ('Nota & akses booking dikirim ke nomor WhatsApp ini.', BK.ink3),
    };
    return Padding(
      padding: const EdgeInsets.only(top: 6, left: 2),
      child: Text(text, style: TextStyle(fontSize: 11.5, color: color, fontWeight: FontWeight.w500)),
    );
  }

  // Strip 14 hari + tombol kalender untuk tanggal jauh.
  Widget _dateRow(CreateBookingController c) => Row(children: [
        Expanded(
          child: SizedBox(
            height: 64,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 14,
              separatorBuilder: (_, i) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final d = DateTime.now().add(Duration(days: i));
                final on = c.date.year == d.year && c.date.month == d.month && c.date.day == d.day;
                return InkWell(
                  borderRadius: BorderRadius.circular(13),
                  onTap: () => c.setDate(d),
                  child: Container(
                    width: 54,
                    decoration: BoxDecoration(color: on ? BK.accent : BK.card, borderRadius: BorderRadius.circular(13), border: Border.all(color: on ? BK.accent : BK.line)),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text(_dow(d.weekday), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: on ? Colors.white70 : BK.ink3)),
                      const SizedBox(height: 2),
                      Text('${d.day}', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: on ? Colors.white : BK.ink)),
                    ]),
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
            width: 48, height: 64,
            decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(13), border: Border.all(color: BK.line)),
            child: const Icon(Icons.calendar_month_outlined, size: 22, color: BK.accent),
          ),
        ),
      ]);

  Future<void> _pickDate(CreateBookingController c) async {
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

  // Baris input promo + tombol Pakai, dengan status hasil.
  Widget _promoRow(CreateBookingController c) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: TextField(
              controller: _promo,
              textCapitalization: TextCapitalization.characters,
              enabled: !(c.promo?.valid ?? false),
              decoration: InputDecoration(
                hintText: 'KODE PROMO',
                isDense: true,
                filled: true, fillColor: BK.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
              ),
            ),
          ),
          const SizedBox(width: 8),
          if (c.promo?.valid ?? false)
            OutlinedButton(
              style: OutlinedButton.styleFrom(foregroundColor: BK.crit, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13)),
              onPressed: () { _promo.clear(); c.applyPromo(''); },
              child: const Text('Hapus'),
            )
          else
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13)),
              onPressed: c.checkingPromo ? null : () => c.applyPromo(_promo.text),
              child: c.checkingPromo
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Pakai', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
        ]),
        if (c.promo != null && !c.promo!.valid && c.promo!.message.isNotEmpty)
          Padding(padding: const EdgeInsets.only(top: 6, left: 2), child: Text(c.promo!.message, style: const TextStyle(fontSize: 12, color: BK.crit))),
        if (c.promo?.valid ?? false)
          Padding(padding: const EdgeInsets.only(top: 6, left: 2), child: Text('Promo ${c.promo!.label} aktif · potongan Rp${rupiah(c.promo!.discount)}', style: const TextStyle(fontSize: 12, color: BK.live, fontWeight: FontWeight.w600))),
      ]);

  Widget _submitBar(CreateBookingController c) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15), disabledBackgroundColor: BK.line),
            onPressed: c.canSubmit ? () => _submit(c) : null,
            child: c.submitting
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(c.pkg == null
                    ? 'Pilih paket dulu'
                    : (!c.isInterday && c.slot == null)
                        ? 'Pilih slot dulu'
                        : 'Buat booking · Rp${rupiah(c.grandTotal)}', style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      );

  Widget _label(String t) => Padding(padding: const EdgeInsets.fromLTRB(2, 16, 2, 8), child: Text(t, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)));

  // Judul step bernomor (mengikuti web: 01 / 02 / 03 …).
  Widget _stepLabel(String num, String title) => Padding(
        padding: const EdgeInsets.fromLTRB(0, 16, 2, 8),
        child: Row(children: [
          Container(
            width: 22, height: 22, alignment: Alignment.center,
            decoration: BoxDecoration(color: BK.accent, borderRadius: BorderRadius.circular(7)),
            child: Text(num, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Colors.white)),
          ),
          const SizedBox(width: 8),
          Text(title.toUpperCase(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: BK.ink)),
        ]),
      );

  String _fullDate(DateTime d) => '${_dow(d.weekday)}, ${d.day} ${_month(d.month)} ${d.year}';
  String _month(int m) => const ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m - 1];

  // Menit → label manusiawi. 90 → "1j 30m", 60 → "1 jam", 45 → "45 menit".
  String _humanMinutes(int m) {
    if (m <= 0) return '';
    if (m < 60) return '$m menit';
    final h = m ~/ 60, rem = m % 60;
    if (rem == 0) return h == 1 ? '1 jam' : '$h jam';
    return '${h}j ${rem}m';
  }

  // Stepper durasi + hint panjang per unit (jam/sesi/hari), mengikuti label
  // resource. Untuk paket berbasis sesi, tampilkan durasi 1 sesi berapa lama.
  Widget _durationBlock(CreateBookingController c) {
    final perUnit = _humanMinutes(c.unitMinutes);
    final showPerUnit = !c.isInterday && perUnit.isNotEmpty;
    final total = _humanMinutes(c.unitMinutes * c.duration);
    final maxDur = c.maxDuration;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        _label('DURASI (${c.unitLabel})'),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
          decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(20)),
          child: Text('maks $maxDur ${c.unitLabel}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.accent)),
        ),
      ]),
      Row(children: [
        _stepBtn(Icons.remove, c.duration > 1 ? () => c.setDuration(c.duration - 1) : null),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 18), child: Text('${c.duration} ${c.unitLabel}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink))),
        _stepBtn(Icons.add, c.duration < maxDur ? () => c.setDuration(c.duration + 1) : null),
      ]),
      if (showPerUnit)
        Padding(
          padding: const EdgeInsets.only(top: 6, left: 2),
          child: Text('1 ${c.unitLabel} = $perUnit · total $total', style: const TextStyle(fontSize: 12, color: BK.ink3)),
        ),
    ]);
  }

  Widget _choice(String t, bool on, VoidCallback onTap) => Material(
        color: on ? BK.accentSoft : BK.card,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: on ? BK.accent : BK.line)),
            child: Text(t, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: on ? BK.accent : BK.ink2)),
          ),
        ),
      );

  Widget _slotChip(String s, {required bool available, required bool selected, required VoidCallback onTap}) => Material(
        color: selected ? BK.accent : BK.card,
        borderRadius: BorderRadius.circular(11),
        child: InkWell(
          onTap: available ? onTap : null,
          borderRadius: BorderRadius.circular(11),
          child: Container(
            width: 68, height: 44, alignment: Alignment.center,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(11), border: Border.all(color: selected ? BK.accent : BK.line)),
            child: Text(s, style: TextStyle(
              fontSize: 12.5, fontWeight: FontWeight.w700,
              decoration: available ? null : TextDecoration.lineThrough,
              color: !available ? BK.ink3 : (selected ? Colors.white : BK.ink2),
            )),
          ),
        ),
      );

  Widget _stepBtn(IconData i, VoidCallback? onTap) => InkWell(
        onTap: onTap, borderRadius: BorderRadius.circular(11),
        child: Container(width: 44, height: 44, decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(11), border: Border.all(color: BK.line)), child: Icon(i, size: 20, color: onTap == null ? BK.ink3 : BK.ink)),
      );

  Widget _row(String k, String v, {Color valueColor = BK.ink}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Expanded(child: Text(k, style: const TextStyle(fontSize: 13, color: BK.ink2))),
          Text(v, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: valueColor)),
        ]),
      );

  String _dow(int weekday) => const ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][weekday - 1];
}

/// Bottom sheet pemilih pelanggan dari daftar CRM (cari nama/nomor).
class _CustomerPickerSheet extends StatefulWidget {
  const _CustomerPickerSheet({required this.load});
  final Future<List<({String id, String name, String phone, String tier})>> Function() load;

  @override
  State<_CustomerPickerSheet> createState() => _CustomerPickerSheetState();
}

class _CustomerPickerSheetState extends State<_CustomerPickerSheet> {
  List<({String id, String name, String phone, String tier})>? _all;
  String? _error;
  String _q = '';

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final list = await widget.load();
      if (mounted) setState(() => _all = list);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = _q.trim().toLowerCase();
    final items = (_all ?? [])
        .where((c) => q.isEmpty || c.name.toLowerCase().contains(q) || c.phone.contains(q))
        .toList();
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scroll) => Container(
        decoration: const BoxDecoration(color: BK.bg, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Column(children: [
          const SizedBox(height: 10),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(3))),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _q = v),
              decoration: InputDecoration(
                hintText: 'Cari nama / nomor',
                isDense: true,
                prefixIcon: const Icon(Icons.search, size: 20),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          Expanded(
            child: _error != null
                ? Center(child: Text('Gagal memuat: $_error', style: const TextStyle(color: BK.crit)))
                : _all == null
                    ? const Center(child: CircularProgressIndicator())
                    : items.isEmpty
                        ? const Center(child: Text('Tidak ada pelanggan', style: TextStyle(color: BK.ink3)))
                        : ListView.separated(
                            controller: scroll,
                            itemCount: items.length,
                            separatorBuilder: (_, _) => const Divider(height: 1, color: BK.line),
                            itemBuilder: (_, i) {
                              final c = items[i];
                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: BK.accentSoft,
                                  child: Text(c.name.isNotEmpty ? c.name[0].toUpperCase() : '?',
                                      style: const TextStyle(color: BK.accent, fontWeight: FontWeight.w700)),
                                ),
                                title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Text(c.phone),
                                trailing: c.tier.isNotEmpty ? Pill.mut(c.tier) : null,
                                onTap: () => Navigator.pop(context, (name: c.name, phone: c.phone, tier: c.tier)),
                              );
                            },
                          ),
          ),
        ]),
      ),
    );
  }
}
