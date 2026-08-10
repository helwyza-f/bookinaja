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
  String _resQuery = '';
  Timer? _crmDebounce;

  @override
  void initState() {
    super.initState();
    _phone.addListener(_onPhoneChanged);
  }

  void _onPhoneChanged() {
    _crmDebounce?.cancel();
    _crmDebounce = Timer(const Duration(milliseconds: 700), () async {
      if (!mounted) return;
      final name = await context.read<CreateBookingController>().lookupCustomer(_phone.text);
      if (!mounted) return;
      if (name != null && _name.text.trim().isEmpty) {
        _name.text = name; // auto-fill kalau nama masih kosong
      }
    });
  }

  @override
  void dispose() {
    _crmDebounce?.cancel();
    _phone.removeListener(_onPhoneChanged);
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  void _back(CreateBookingController c) {
    if (c.resource != null) {
      c.clearResource();
    } else {
      Navigator.of(context).pop();
    }
  }

  void _snack(String m, Color color) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(m), behavior: SnackBarBehavior.floating, backgroundColor: color));

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
    return PopScope(
      canPop: onResourceStep,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) c.clearResource();
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
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 20),
      children: [
        _label('CUSTOMER'),
        BKCard(child: Column(children: [
          TextField(controller: _phone, keyboardType: TextInputType.phone,
            decoration: const InputDecoration(hintText: 'Nomor WhatsApp', border: InputBorder.none, isDense: true, prefixIcon: Icon(Icons.phone_outlined, size: 20, color: BK.ink3))),
          const Divider(height: 1, color: BK.line),
          TextField(controller: _name, textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(hintText: 'Nama customer', border: InputBorder.none, isDense: true, prefixIcon: Icon(Icons.person_outline, size: 20, color: BK.ink3))),
        ])),
        if (c.foundCustomer != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(color: BK.liveSoft, borderRadius: BorderRadius.circular(10)),
              child: Row(children: [
                const Icon(Icons.verified_user_outlined, size: 16, color: BK.live),
                const SizedBox(width: 8),
                Expanded(child: Text('Pelanggan terdaftar: ${c.foundCustomer!.name}',
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

        _label('PAKET'),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final p in r.packages)
            _choice('${p.name} · Rp${rupiah(p.price)}/${p.unitLabel}', c.pkg?.itemId == p.itemId, () => c.selectPackage(p)),
        ]),

        if (c.pkg != null) ...[
          _label('TANGGAL'),
          _dateStrip(c),

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
            _durationBlock(c),
          ] else ...[
            _label('SLOT MULAI'),
            if (c.busyLoading)
              const Padding(padding: EdgeInsets.all(8), child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))))
            else
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final s in c.slots) _slotChip(s.label, available: s.available, selected: c.slot == s.label, onTap: () => c.selectSlot(s.label)),
              ]),
            _durationBlock(c),
          ],

          if (c.addons.isNotEmpty) ...[
            _label('ADD-ON'),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final a in c.addons)
                _choice('${a.name} · Rp${rupiah(a.price)}', c.selectedAddonIds.contains(a.itemId), () => c.toggleAddon(a.itemId)),
            ]),
          ],

          const SizedBox(height: 18),
          BKCard(child: Column(children: [
            _row('${c.pkg!.name} · ${c.duration} ${c.unitLabel}', 'Rp${rupiah(c.pkg!.price * c.duration)}'),
            for (final a in c.addons.where((a) => c.selectedAddonIds.contains(a.itemId)))
              _row(a.name, 'Rp${rupiah(a.price)}'),
            const Divider(height: 18, color: BK.line),
            Row(children: [
              const Text('Total', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: BK.ink)),
              const Spacer(),
              Text('Rp${rupiah(c.total)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: BK.ink)),
            ]),
          ])),
        ],
      ],
    );
  }

  Widget _dateStrip(CreateBookingController c) => SizedBox(
        height: 64,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: 14,
          separatorBuilder: (_, i) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final d = DateTime.now().add(Duration(days: i));
            final on = c.date.year == d.year && c.date.month == d.month && c.date.day == d.day;
            return GestureDetector(
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
      );

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
                        : 'Buat booking · Rp${rupiah(c.total)}', style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      );

  Widget _label(String t) => Padding(padding: const EdgeInsets.fromLTRB(2, 16, 2, 8), child: Text(t, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)));

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
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _label('DURASI (${c.unitLabel})'),
      Row(children: [
        _stepBtn(Icons.remove, () => c.setDuration(c.duration - 1)),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 18), child: Text('${c.duration} ${c.unitLabel}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink))),
        _stepBtn(Icons.add, () => c.setDuration(c.duration + 1)),
      ]),
      if (showPerUnit)
        Padding(
          padding: const EdgeInsets.only(top: 6, left: 2),
          child: Text('1 ${c.unitLabel} = $perUnit · total $total', style: const TextStyle(fontSize: 12, color: BK.ink3)),
        ),
    ]);
  }

  Widget _choice(String t, bool on, VoidCallback onTap) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
          decoration: BoxDecoration(color: on ? BK.accentSoft : BK.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: on ? BK.accent : BK.line)),
          child: Text(t, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: on ? BK.accent : BK.ink2)),
        ),
      );

  Widget _slotChip(String s, {required bool available, required bool selected, required VoidCallback onTap}) => GestureDetector(
        onTap: available ? onTap : null,
        child: Container(
          width: 68, alignment: Alignment.center, padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(color: selected ? BK.accent : BK.card, borderRadius: BorderRadius.circular(11), border: Border.all(color: selected ? BK.accent : BK.line)),
          child: Text(s, style: TextStyle(
            fontSize: 12.5, fontWeight: FontWeight.w700,
            decoration: available ? null : TextDecoration.lineThrough,
            color: !available ? BK.ink3 : (selected ? Colors.white : BK.ink2),
          )),
        ),
      );

  Widget _stepBtn(IconData i, VoidCallback onTap) => InkWell(
        onTap: onTap, borderRadius: BorderRadius.circular(11),
        child: Container(width: 42, height: 42, decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(11), border: Border.all(color: BK.line)), child: Icon(i, size: 20, color: BK.ink)),
      );

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Expanded(child: Text(k, style: const TextStyle(fontSize: 13, color: BK.ink2))),
          Text(v, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink)),
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
