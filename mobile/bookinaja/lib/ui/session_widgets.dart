import 'dart:async';
import 'package:flutter/material.dart';

import '../theme.dart';
import '../models/booking_detail.dart';
import '../models/catalog.dart';

/// Widget sesi berjalan yang dipakai bersama oleh Booking Detail sisi admin &
/// customer. Sengaja dilepas dari repo/controller manapun — sumber data
/// (slot sibuk) diinjeksi lewat callback agar tiap sisi pakai endpoint sendiri:
/// admin → CatalogRepository, customer → CustomerBookingRepository.

/// Timer sisa waktu sesi (ticking tiap detik). Warna teks putih → dipakai di
/// atas latar berwarna (hero sesi aktif).
class SessionTimer extends StatefulWidget {
  final String endIso;
  final Color color;
  const SessionTimer({super.key, required this.endIso, this.color = Colors.white});
  @override
  State<SessionTimer> createState() => _SessionTimerState();
}

class _SessionTimerState extends State<SessionTimer> {
  Timer? _t;
  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final end = DateTime.tryParse(widget.endIso);
    final diff = end == null ? Duration.zero : end.difference(DateTime.now());
    final over = diff.isNegative;
    final d = diff.abs();
    final label =
        '${d.inHours > 0 ? '${d.inHours}:' : ''}${(d.inMinutes % 60).toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(over ? Icons.warning_amber_rounded : Icons.timer_outlined, size: 16, color: widget.color),
      const SizedBox(width: 7),
      Text(over ? 'Lewat $label' : 'Sisa $label',
          style: TextStyle(
              color: widget.color,
              fontWeight: FontWeight.w800,
              fontSize: 14,
              fontFeatures: const [FontFeature.tabularFigures()])),
    ]);
  }
}

/// Bottom sheet perpanjang sesi, slot-aware: opsi durasi yang bentrok dengan
/// jadwal berikutnya terkunci. [loadBusy] mengambil slot sibuk untuk tanggal
/// sesi. Return via Navigator.pop(int) = jumlah satuan tambahan; null = urung.
class ExtendSheet extends StatefulWidget {
  final BookingDetail detail;
  final Future<List<BusySlot>> Function(DateTime date) loadBusy;
  const ExtendSheet({super.key, required this.detail, required this.loadBusy});
  @override
  State<ExtendSheet> createState() => _ExtendSheetState();
}

class _ExtendSheetState extends State<ExtendSheet> {
  List<BusySlot> _busy = const [];
  bool _loading = true;
  int? _selected;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final date = widget.detail.startLocal ?? DateTime.now();
    try {
      _busy = await widget.loadBusy(date);
    } catch (_) {
      _busy = const [];
    }
    if (mounted) setState(() => _loading = false);
  }

  // Batas menit sebelum bentrok booking berikutnya (atau tengah malam).
  int get _limitMin {
    final endMin = widget.detail.endMinutes ?? 0;
    int limit = 24 * 60;
    for (final b in _busy) {
      if (b.startMin >= endMin && b.startMin < limit) limit = b.startMin;
    }
    return limit;
  }

  String _hm(int min) => '${((min ~/ 60) % 24).toString().padLeft(2, '0')}:${(min % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final d = widget.detail;
    final endMin = d.endMinutes ?? 0;
    final step = d.unitDurationMin;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            const Expanded(child: Text('Perpanjang sesi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink))),
            if (d.endLocal != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(10)),
                child: Text('Selesai kini ${_hm(endMin)}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.accent)),
              ),
          ]),
          const SizedBox(height: 4),
          const Text('Pilih tambahan durasi. Opsi yang bentrok jadwal berikutnya terkunci.', style: TextStyle(fontSize: 12, color: BK.ink3)),
          const SizedBox(height: 14),
          if (_loading)
            const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
          else
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.55,
              children: [for (int i = 1; i <= 4; i++) _optionCard(i, endMin, step)],
            ),
          const SizedBox(height: 14),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14), disabledBackgroundColor: BK.line),
            onPressed: _selected == null ? null : () => Navigator.pop(context, _selected),
            child: Text(_selected == null ? 'Pilih durasi dulu' : 'Perpanjang +$_selected ${d.unitLabel}', style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
        ]),
      ),
    );
  }

  Widget _optionCard(int i, int endMin, int step) {
    final d = widget.detail;
    final newEnd = endMin + step * i;
    final blocked = newEnd > _limitMin;
    final on = _selected == i;
    final cost = d.unitPrice * i;
    return GestureDetector(
      onTap: blocked ? null : () => setState(() => _selected = i),
      child: Opacity(
        opacity: blocked ? 0.45 : 1,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: on ? BK.accentSoft : BK.card,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: on ? BK.accent : BK.line, width: on ? 1.5 : 1),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('+$i', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, height: 1, color: on ? BK.accent : BK.ink)),
              if (blocked)
                const Icon(Icons.lock_outline, size: 16, color: BK.crit)
              else
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  const Text('SELESAI', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: BK.ink3)),
                  Text(_hm(newEnd), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: BK.ink)),
                ]),
            ]),
            Text(blocked ? 'Bentrok jadwal' : (cost > 0 ? '+Rp${rupiah(cost)} · ${d.unitLabel}' : d.unitLabel),
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: blocked ? BK.crit : BK.ink2)),
          ]),
        ),
      ),
    );
  }
}

/// Bottom sheet pemilih item generik dengan qty stepper (F&B / add-on) —
/// pilih beberapa item + jumlah, lalu tambah sekaligus. Balik: [(id, qty)].
class CartPickerSheet<T> extends StatefulWidget {
  final String title;
  final Future<List<T>> Function() load;
  final String Function(T) idOf;
  final String Function(T) labelOf;
  final int Function(T) priceOf;
  final String Function(T)? categoryOf; // kalau ada → tampilkan chip kategori
  const CartPickerSheet({super.key, required this.title, required this.load, required this.idOf, required this.labelOf, required this.priceOf, this.categoryOf});
  @override
  State<CartPickerSheet<T>> createState() => CartPickerSheetState<T>();
}

class CartPickerSheetState<T> extends State<CartPickerSheet<T>> {
  List<T>? _items;
  final Map<String, int> _qty = {}; // id → qty
  String _query = '';
  String _cat = 'Semua';

  List<String> get _categories {
    if (widget.categoryOf == null || _items == null) return const [];
    final set = <String>{'Semua'};
    for (final it in _items!) {
      final c = widget.categoryOf!(it).trim();
      if (c.isNotEmpty) set.add(c);
    }
    return set.length > 1 ? set.toList() : const [];
  }

  @override
  void initState() {
    super.initState();
    widget.load().then((v) { if (mounted) setState(() => _items = v); });
  }

  int _total() {
    if (_items == null) return 0;
    var t = 0;
    for (final it in _items!) {
      t += widget.priceOf(it) * (_qty[widget.idOf(it)] ?? 0);
    }
    return t;
  }

  int _count() => _qty.values.fold(0, (s, v) => s + v);

  @override
  Widget build(BuildContext context) {
    final total = _total();
    final count = _count();
    final all = _items ?? const [];
    final q = _query.trim().toLowerCase();
    final cats = _categories;
    final filtered = all.where((it) {
      if (q.isNotEmpty && !widget.labelOf(it).toLowerCase().contains(q)) return false;
      if (_cat != 'Semua' && widget.categoryOf != null && widget.categoryOf!(it) != _cat) return false;
      return true;
    }).toList();
    // Layout terpinned (bukan DraggableScrollableSheet) supaya CTA tetap di atas
    // keyboard saat mengetik pencarian.
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        top: false,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.82),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const SizedBox(height: 10),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(3))),
            Padding(padding: const EdgeInsets.fromLTRB(20, 12, 12, 6), child: Row(children: [
              Text(widget.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
              const Spacer(),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, color: BK.ink3)),
            ])),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                onChanged: (v) => setState(() => _query = v),
                textInputAction: TextInputAction.search,
                style: const TextStyle(fontSize: 14, color: BK.ink),
                decoration: InputDecoration(
                  hintText: 'Cari item…',
                  prefixIcon: const Icon(Icons.search, size: 19, color: BK.ink3),
                  isDense: true,
                  filled: true, fillColor: BK.card,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
                ),
              ),
            ),
            if (cats.isNotEmpty)
              SizedBox(
                height: 34,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  itemCount: cats.length,
                  separatorBuilder: (_, i) => const SizedBox(width: 7),
                  itemBuilder: (_, i) {
                    final on = _cat == cats[i];
                    return GestureDetector(
                      onTap: () => setState(() => _cat = cats[i]),
                      child: Container(
                        alignment: Alignment.center,
                        padding: const EdgeInsets.symmetric(horizontal: 13),
                        decoration: BoxDecoration(
                          color: on ? BK.ink : BK.card,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: on ? BK.ink : BK.line),
                        ),
                        child: Text(cats[i], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: on ? Colors.white : BK.ink2)),
                      ),
                    );
                  },
                ),
              ),
            Flexible(child: _items == null
                ? const Center(child: Padding(padding: EdgeInsets.all(28), child: CircularProgressIndicator()))
                : filtered.isEmpty
                    ? StateView(icon: q.isEmpty ? Icons.inbox : Icons.search_off, color: BK.ink3, title: q.isEmpty ? 'Kosong' : 'Tidak ketemu', hint: q.isEmpty ? 'Belum ada item.' : 'Coba kata kunci lain.')
                    : ListView.separated(
                        shrinkWrap: true,
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                        itemCount: filtered.length,
                        separatorBuilder: (_, i) => const Divider(height: 1, color: BK.line),
                        itemBuilder: (_, i) {
                          final it = filtered[i];
                          final id = widget.idOf(it);
                          final qn = _qty[id] ?? 0;
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(children: [
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(widget.labelOf(it), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
                                const SizedBox(height: 1),
                                Text('Rp${rupiah(widget.priceOf(it))}', style: const TextStyle(fontSize: 12, color: BK.ink3)),
                              ])),
                              _qtyStepper(qn,
                                  onMinus: qn > 0 ? () => setState(() { if (qn - 1 <= 0) { _qty.remove(id); } else { _qty[id] = qn - 1; } }) : null,
                                  onPlus: () => setState(() => _qty[id] = qn + 1)),
                            ]),
                          );
                        },
                      ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15), disabledBackgroundColor: BK.line, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  onPressed: count == 0 ? null : () => Navigator.pop(context, [
                    for (final e in _qty.entries) (id: e.key, qty: e.value),
                  ]),
                  child: Text(count == 0 ? 'Pilih item dulu' : 'Tambah $count item · Rp${rupiah(total)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _qtyStepper(int q, {VoidCallback? onMinus, required VoidCallback onPlus}) {
    if (q == 0) {
      return OutlinedButton(
        style: OutlinedButton.styleFrom(foregroundColor: BK.accent, backgroundColor: BK.accentSoft, side: BorderSide.none, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), minimumSize: const Size(0, 0)),
        onPressed: onPlus,
        child: const Text('Tambah', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
      );
    }
    Widget btn(IconData ic, VoidCallback? on) => InkWell(
          onTap: on, borderRadius: BorderRadius.circular(9),
          child: Container(width: 30, height: 30, alignment: Alignment.center, child: Icon(ic, size: 18, color: on == null ? BK.ink3 : BK.accent)),
        );
    return Container(
      decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(10)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        btn(Icons.remove, onMinus),
        SizedBox(width: 22, child: Text('$q', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: BK.ink))),
        btn(Icons.add, onPlus),
      ]),
    );
  }
}
