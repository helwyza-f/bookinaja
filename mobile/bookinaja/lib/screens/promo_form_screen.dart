import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../models/promo.dart';
import '../repositories/settings_repository.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Form buat / edit promo — versi mobile. Alih-alih form desktop dua kolom,
/// pakai preview voucher hidup di atas, kartu diskon besar, lalu baris
/// pengaturan yang membuka bottom-sheet fokus untuk aturan lanjutan.
class PromoFormScreen extends StatefulWidget {
  final String? promoId;
  const PromoFormScreen({super.key, this.promoId});

  bool get isEdit => promoId != null;

  @override
  State<PromoFormScreen> createState() => _PromoFormScreenState();
}

const _dayOptions = [
  (1, 'Sen'), (2, 'Sel'), (3, 'Rab'), (4, 'Kam'), (5, 'Jum'), (6, 'Sab'), (7, 'Min'),
];

class _PromoFormScreenState extends State<PromoFormScreen> {
  late final SettingsRepository _repo;
  bool _loading = true;
  bool _saving = false;

  // Field inti
  final _code = TextEditingController();
  final _name = TextEditingController();
  final _desc = TextEditingController();
  final _value = TextEditingController();

  String _behavior = 'locked';
  String _type = 'percentage';
  bool _isActive = true;

  // Aturan lanjutan (disimpan sebagai state, diedit via bottom-sheet)
  int? _maxDiscount;
  int? _minBooking;
  int? _limitTotal;
  int? _limitPerCust;
  DateTime? _startsAt;
  DateTime? _endsAt;
  final Set<int> _weekdays = {};
  TimeOfDay? _timeStart;
  TimeOfDay? _timeEnd;
  final Set<String> _resourceIds = {};

  List<ResourceOption> _resources = [];
  List<PromoRedemption> _redemptions = [];

  @override
  void initState() {
    super.initState();
    _repo = context.read<SettingsRepository>();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_code, _name, _desc, _value]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      _resources = await _repo.getResourceOptions();
      if (widget.isEdit) {
        final p = await _repo.getPromo(widget.promoId!);
        _redemptions =
            await _repo.getPromoRedemptions(widget.promoId!).catchError((_) => <PromoRedemption>[]);
        _hydrate(p);
      }
    } catch (e) {
      if (mounted) BkToast.error(context, 'Gagal memuat form', subtitle: '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _hydrate(Promo p) {
    _code.text = p.code;
    _name.text = p.name;
    _desc.text = p.description;
    _value.text = p.discountValue == 0 ? '' : '${p.discountValue}';
    _behavior = p.discountBehavior;
    _type = p.discountType;
    _isActive = p.isActive;
    _maxDiscount = p.maxDiscountAmount;
    _minBooking = p.minBookingAmount;
    _limitTotal = p.usageLimitTotal;
    _limitPerCust = p.usageLimitPerCustomer;
    _startsAt = p.startsAt != null ? DateTime.tryParse(p.startsAt!) : null;
    _endsAt = p.endsAt != null ? DateTime.tryParse(p.endsAt!) : null;
    _weekdays..clear()..addAll(p.validWeekdays);
    _timeStart = _parseTime(p.timeStart);
    _timeEnd = _parseTime(p.timeEnd);
    _resourceIds..clear()..addAll(p.resourceIds);
  }

  TimeOfDay? _parseTime(String? s) {
    if (s == null || s.isEmpty) return null;
    final parts = s.split(':');
    if (parts.length < 2) return null;
    return TimeOfDay(hour: int.tryParse(parts[0]) ?? 0, minute: int.tryParse(parts[1]) ?? 0);
  }

  String _fmtTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}:00';

  int get _valueInt => int.tryParse(_value.text.trim()) ?? 0;
  bool get _ready => _code.text.trim().isNotEmpty && _name.text.trim().isNotEmpty && _valueInt > 0;

  String get _discountLabel =>
      _type == 'percentage' ? '$_valueInt%' : 'Rp ${rupiah(_valueInt)}';

  Future<void> _submit() async {
    if (!_ready) {
      BkToast.error(context, 'Lengkapi dulu', subtitle: 'Kode, nama, dan nilai diskon wajib diisi.');
      return;
    }
    setState(() => _saving = true);
    final promo = Promo(
      code: _code.text.trim().toUpperCase(),
      name: _name.text.trim(),
      description: _desc.text.trim(),
      discountBehavior: _behavior,
      discountType: _type,
      discountValue: _valueInt,
      maxDiscountAmount: _maxDiscount,
      minBookingAmount: _minBooking,
      usageLimitTotal: _limitTotal,
      usageLimitPerCustomer: _limitPerCust,
      validWeekdays: _weekdays.toList()..sort(),
      timeStart: _timeStart != null ? _fmtTime(_timeStart!) : null,
      timeEnd: _timeEnd != null ? _fmtTime(_timeEnd!) : null,
      startsAt: _startsAt?.toUtc().toIso8601String(),
      endsAt: _endsAt?.toUtc().toIso8601String(),
      resourceIds: _resourceIds.toList(),
      isActive: _isActive,
    );
    try {
      if (widget.isEdit) {
        await _repo.updatePromo(widget.promoId!, promo);
      } else {
        await _repo.createPromo(promo);
      }
      if (!mounted) return;
      BkToast.success(context, widget.isEdit ? 'Promo diperbarui' : 'Promo dibuat');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal menyimpan', subtitle: '$e');
    }
  }

  void _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final r = Random();
    _code.text = List.generate(6, (_) => chars[r.nextInt(chars.length)]).join();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: Text(widget.isEdit ? 'Edit Promo' : 'Promo Baru',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: _loading
          ? const LoadingList()
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                _voucherPreview(),
                const SizedBox(height: 18),
                _discountCard(),
                const SizedBox(height: 14),
                _identityCard(),
                const SizedBox(height: 14),
                _activeCard(),
                const SizedBox(height: 14),
                _sectionTitle('Aturan', 'Semua opsional — ketuk untuk atur'),
                _rulesCard(),
                if (widget.isEdit) ...[
                  const SizedBox(height: 14),
                  _usageCard(),
                ],
              ],
            ),
      bottomNavigationBar: _loading
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: _ready ? BK.accent : BK.ink3,
                      padding: const EdgeInsets.symmetric(vertical: 15)),
                  onPressed: _saving ? null : _submit,
                  child: _saving
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(widget.isEdit ? 'Simpan perubahan' : 'Buat promo',
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ),
    );
  }

  // ---------- Preview voucher (tiket) ----------

  Widget _voucherPreview() {
    final code = _code.text.trim().isEmpty ? 'KODEKAMU' : _code.text.trim().toUpperCase();
    final name = _name.text.trim().isEmpty ? 'Nama promo' : _name.text.trim();
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(BK.radius),
        gradient: const LinearGradient(
            colors: [BK.accent, Color(0xFF5B8BFF)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight),
        boxShadow: [
          BoxShadow(color: BK.accent.withValues(alpha: 0.25), blurRadius: 18, offset: const Offset(0, 8)),
        ],
      ),
      child: Row(children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 12, 18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.local_offer_rounded, color: Colors.white70, size: 15),
                const SizedBox(width: 6),
                Text(name.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
              ]),
              const SizedBox(height: 10),
              Text('Diskon ${_valueInt > 0 ? _discountLabel : '—'}',
                  style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(_validitySummary(),
                  style: const TextStyle(color: Colors.white70, fontSize: 11.5)),
            ]),
          ),
        ),
        // Sobekan tiket + kode vertikal
        Container(
          width: 1,
          height: 92,
          margin: const EdgeInsets.symmetric(vertical: 8),
          decoration: const BoxDecoration(
            border: Border(right: BorderSide(color: Colors.white38, width: 1, style: BorderStyle.solid)),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: RotatedBox(
            quarterTurns: 3,
            child: Text(code,
                style: const TextStyle(
                    color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900, letterSpacing: 3)),
          ),
        ),
      ]),
    );
  }

  String _validitySummary() {
    if (_startsAt == null && _endsAt == null) return 'Berlaku tanpa batas waktu';
    final s = _startsAt != null ? _fmtDate(_startsAt!) : '…';
    final e = _endsAt != null ? _fmtDate(_endsAt!) : '…';
    return 'Berlaku $s – $e';
  }

  // ---------- Kartu diskon ----------

  Widget _discountCard() {
    return BKCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _segmented(_type, const {'percentage': 'Persen (%)', 'fixed': 'Nominal (Rp)'}, (v) {
          setState(() {
            _type = v;
            if (v == 'fixed') _maxDiscount = null; // maks diskon hanya relevan utk persen
          });
        }),
        const SizedBox(height: 14),
        Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
          Text(_type == 'percentage' ? '%' : 'Rp',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink3)),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: _value,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (_) => setState(() {}),
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: BK.ink),
              decoration: const InputDecoration(
                border: InputBorder.none,
                isDense: true,
                hintText: '0',
                hintStyle: TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: BK.line),
              ),
            ),
          ),
        ]),
        if (_type == 'percentage') ...[
          const Divider(height: 22, color: BK.line),
          _inlineRow(
            icon: Icons.trending_down_rounded,
            label: 'Maksimal potongan',
            value: _maxDiscount != null ? 'Rp ${rupiah(_maxDiscount!)}' : 'Tanpa batas',
            onTap: () => _editRupiah('Maksimal potongan', _maxDiscount, (v) => setState(() => _maxDiscount = v),
                hint: 'Batasi nominal diskon persen. Kosongkan bila tanpa batas.'),
          ),
        ],
        const Divider(height: 22, color: BK.line),
        _behaviorRow(),
      ]),
    );
  }

  Widget _behaviorRow() {
    final floating = _behavior == 'floating';
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => setState(() => _behavior = floating ? 'locked' : 'floating'),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          const Icon(Icons.tune_rounded, size: 18, color: BK.ink3),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Perilaku diskon',
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
              Text(floating ? 'Floating — ikut naik bila total bertambah' : 'Locked — dihitung di booking awal',
                  style: const TextStyle(fontSize: 11, color: BK.ink3)),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(8)),
            child: Text(floating ? 'Floating' : 'Locked',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
          ),
        ]),
      ),
    );
  }

  // ---------- Kartu identitas ----------

  Widget _identityCard() {
    return BKCard(
      child: Column(children: [
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(
            child: _plainField('Kode promo', _code,
                hint: 'WEEKDAY10', caps: true, onChanged: () => setState(() {})),
          ),
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: IconButton(
              onPressed: _generateCode,
              tooltip: 'Buat kode acak',
              style: IconButton.styleFrom(backgroundColor: BK.accentSoft),
              icon: const Icon(Icons.casino_rounded, color: BK.accent, size: 20),
            ),
          ),
        ]),
        const Divider(height: 22, color: BK.line),
        _plainField('Nama promo', _name, hint: 'Promo weekday siang', onChanged: () => setState(() {})),
        const Divider(height: 22, color: BK.line),
        _plainField('Deskripsi (opsional)', _desc, hint: 'Catatan singkat untuk tim', maxLines: 2),
      ]),
    );
  }

  // ---------- Kartu aktif ----------

  Widget _activeCard() {
    return BKCard(
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
              color: _isActive ? BK.liveSoft : BK.card2, borderRadius: BorderRadius.circular(11)),
          child: Icon(_isActive ? Icons.check_circle_rounded : Icons.pause_circle_outline_rounded,
              color: _isActive ? BK.live : BK.ink3, size: 21),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_isActive ? 'Promo aktif' : 'Nonaktif',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: BK.ink)),
            Text(_isActive ? 'Bisa langsung dipakai customer' : 'Disimpan tapi belum bisa dipakai',
                style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ]),
        ),
        Switch(value: _isActive, activeThumbColor: BK.accent, onChanged: (v) => setState(() => _isActive = v)),
      ]),
    );
  }

  // ---------- Kartu aturan (baris → bottom sheet) ----------

  Widget _rulesCard() {
    return BKCard(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      child: Column(children: [
        _settingRow(
          icon: Icons.date_range_rounded,
          label: 'Periode berlaku',
          value: (_startsAt == null && _endsAt == null)
              ? 'Tanpa batas'
              : '${_startsAt != null ? _fmtDate(_startsAt!) : '…'} – ${_endsAt != null ? _fmtDate(_endsAt!) : '…'}',
          onTap: _editPeriod,
        ),
        _divider(),
        _settingRow(
          icon: Icons.event_available_rounded,
          label: 'Hari & jam',
          value: _dayTimeSummary(),
          onTap: _editDayTime,
        ),
        _divider(),
        _settingRow(
          icon: Icons.grid_view_rounded,
          label: 'Resource berlaku',
          value: _resourceIds.isEmpty ? 'Semua resource' : '${_resourceIds.length} resource dipilih',
          onTap: _resources.isEmpty ? null : _editResources,
          disabled: _resources.isEmpty,
        ),
        _divider(),
        _settingRow(
          icon: Icons.confirmation_number_outlined,
          label: 'Batas & kuota',
          value: _quotaSummary(),
          onTap: _editQuota,
        ),
      ]),
    );
  }

  String _dayTimeSummary() {
    final parts = <String>[];
    parts.add(_weekdays.isEmpty
        ? 'Setiap hari'
        : (_weekdays.toList()..sort()).map((d) => _dayOptions[d - 1].$2).join(', '));
    if (_timeStart != null && _timeEnd != null) {
      parts.add('${_timeStart!.format(context)}–${_timeEnd!.format(context)}');
    }
    return parts.join(' · ');
  }

  String _quotaSummary() {
    final parts = <String>[];
    if (_minBooking != null) parts.add('Min Rp ${rupiah(_minBooking!)}');
    if (_limitTotal != null) parts.add('Kuota ${_limitTotal!}');
    if (_limitPerCust != null) parts.add('${_limitPerCust!}/customer');
    return parts.isEmpty ? 'Tanpa batas' : parts.join(' · ');
  }

  // ---------- Kartu pemakaian (edit) ----------

  Widget _usageCard() {
    return BKCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Pemakaian promo',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: BK.ink)),
        const SizedBox(height: 10),
        if (_redemptions.isEmpty)
          const Text('Belum ada booking yang memakai promo ini.',
              style: TextStyle(fontSize: 12.5, color: BK.ink3))
        else
          ..._redemptions.map((r) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(r.customerName,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: BK.ink)),
                      Text('${r.resourceName} · ${r.bookingStatus}',
                          style: const TextStyle(fontSize: 11, color: BK.ink3)),
                    ]),
                  ),
                  Text('-Rp ${rupiah(r.discountAmount)}',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: BK.live)),
                ]),
              )),
      ]),
    );
  }

  // ================= Bottom sheets =================

  Future<void> _editPeriod() async {
    var start = _startsAt;
    var end = _endsAt;
    await _sheet(
      title: 'Periode berlaku',
      builder: (ctx, setSheet) => Column(mainAxisSize: MainAxisSize.min, children: [
        _sheetDateRow('Mulai', start, (d) => setSheet(() => start = d)),
        const SizedBox(height: 10),
        _sheetDateRow('Berakhir', end, (d) => setSheet(() => end = d)),
        const SizedBox(height: 8),
        const Align(
          alignment: Alignment.centerLeft,
          child: Text('Kosongkan salah satu untuk tanpa batas di sisi itu.',
              style: TextStyle(fontSize: 11.5, color: BK.ink3)),
        ),
      ]),
      onSave: () => setState(() {
        _startsAt = start;
        _endsAt = end;
      }),
    );
  }

  Widget _sheetDateRow(String label, DateTime? value, ValueChanged<DateTime?> onPick) {
    return Row(children: [
      SizedBox(width: 72, child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink2))),
      Expanded(
        child: GestureDetector(
          onTap: () async {
            final now = DateTime.now();
            final d = await showDatePicker(
              context: context,
              initialDate: value ?? now,
              firstDate: DateTime(now.year - 1),
              lastDate: DateTime(now.year + 3),
            );
            if (d != null) onPick(d);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
                color: BK.card2, borderRadius: BorderRadius.circular(11), border: Border.all(color: BK.line)),
            child: Row(children: [
              const Icon(Icons.calendar_today_outlined, size: 15, color: BK.ink3),
              const SizedBox(width: 8),
              Expanded(
                child: Text(value == null ? 'Pilih tanggal' : _fmtDate(value),
                    style: TextStyle(fontSize: 13, color: value == null ? BK.ink3 : BK.ink)),
              ),
              if (value != null)
                GestureDetector(
                    onTap: () => onPick(null),
                    child: const Icon(Icons.close_rounded, size: 16, color: BK.ink3)),
            ]),
          ),
        ),
      ),
    ]);
  }

  Future<void> _editDayTime() async {
    final days = {..._weekdays};
    var start = _timeStart;
    var end = _timeEnd;
    await _sheet(
      title: 'Hari & jam berlaku',
      builder: (ctx, setSheet) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Hari', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final d in _dayOptions)
            _chip(d.$2, days.contains(d.$1), () => setSheet(() => days.contains(d.$1) ? days.remove(d.$1) : days.add(d.$1))),
        ]),
        const SizedBox(height: 6),
        Text(days.isEmpty ? 'Kosong = berlaku setiap hari.' : '${days.length} hari dipilih',
            style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
        const SizedBox(height: 16),
        const Text('Jam', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: _sheetTimeBtn('Mulai', start, (t) => setSheet(() => start = t))),
          const SizedBox(width: 10),
          Expanded(child: _sheetTimeBtn('Selesai', end, (t) => setSheet(() => end = t))),
        ]),
        const SizedBox(height: 6),
        const Text('Isi dua-duanya bila promo hanya di jam tertentu.',
            style: TextStyle(fontSize: 11.5, color: BK.ink3)),
      ]),
      onSave: () => setState(() {
        _weekdays..clear()..addAll(days);
        _timeStart = start;
        _timeEnd = end;
      }),
    );
  }

  Widget _sheetTimeBtn(String label, TimeOfDay? value, ValueChanged<TimeOfDay?> onPick) {
    return GestureDetector(
      onTap: () async {
        final t = await showTimePicker(context: context, initialTime: value ?? const TimeOfDay(hour: 9, minute: 0));
        if (t != null) onPick(t);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
            color: BK.card2, borderRadius: BorderRadius.circular(11), border: Border.all(color: BK.line)),
        child: Row(children: [
          const Icon(Icons.schedule_rounded, size: 15, color: BK.ink3),
          const SizedBox(width: 8),
          Expanded(
            child: Text(value == null ? label : value.format(context),
                style: TextStyle(fontSize: 13, color: value == null ? BK.ink3 : BK.ink)),
          ),
          if (value != null)
            GestureDetector(onTap: () => onPick(null), child: const Icon(Icons.close_rounded, size: 15, color: BK.ink3)),
        ]),
      ),
    );
  }

  Future<void> _editResources() async {
    final sel = {..._resourceIds};
    await _sheet(
      title: 'Resource berlaku',
      builder: (ctx, setSheet) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(sel.isEmpty ? 'Kosong = berlaku di semua resource.' : '${sel.length} dipilih',
            style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final r in _resources)
            _chip(r.name, sel.contains(r.id), () => setSheet(() => sel.contains(r.id) ? sel.remove(r.id) : sel.add(r.id))),
        ]),
      ]),
      onSave: () => setState(() => _resourceIds..clear()..addAll(sel)),
    );
  }

  Future<void> _editQuota() async {
    final minC = TextEditingController(text: _minBooking?.toString() ?? '');
    final totC = TextEditingController(text: _limitTotal?.toString() ?? '');
    final perC = TextEditingController(text: _limitPerCust?.toString() ?? '');
    await _sheet(
      title: 'Batas & kuota',
      builder: (ctx, setSheet) => Column(mainAxisSize: MainAxisSize.min, children: [
        _sheetNumField('Minimum booking (Rp)', minC, hint: 'mis. 100000'),
        const SizedBox(height: 12),
        _sheetNumField('Kuota total pemakaian', totC, hint: 'mis. 100'),
        const SizedBox(height: 12),
        _sheetNumField('Batas per customer', perC, hint: 'mis. 1'),
      ]),
      onSave: () => setState(() {
        _minBooking = int.tryParse(minC.text.trim());
        _limitTotal = int.tryParse(totC.text.trim());
        _limitPerCust = int.tryParse(perC.text.trim());
      }),
    );
  }

  Future<void> _editRupiah(String title, int? current, ValueChanged<int?> onSave, {String? hint}) async {
    final c = TextEditingController(text: current?.toString() ?? '');
    await _sheet(
      title: title,
      builder: (ctx, setSheet) => _sheetNumField(title, c, hint: hint),
      onSave: () => onSave(int.tryParse(c.text.trim())),
    );
  }

  // ================= Komponen dasar =================

  Widget _sheetNumField(String label, TextEditingController c, {String? hint}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: BK.ink2)),
      const SizedBox(height: 6),
      TextField(
        controller: c,
        keyboardType: TextInputType.number,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: const TextStyle(fontSize: 14, color: BK.ink),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: BK.ink3, fontSize: 13),
          isDense: true,
          filled: true,
          fillColor: BK.card2,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
        ),
      ),
    ]);
  }

  Widget _chip(String label, bool sel, VoidCallback onTap) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: sel ? BK.accent : BK.card2,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: sel ? BK.accent : BK.line),
          ),
          child: Text(label,
              style: TextStyle(
                  fontSize: 12.5, fontWeight: FontWeight.w700, color: sel ? Colors.white : BK.ink2)),
        ),
      );

  /// Bottom sheet fokus dengan tombol Simpan. [builder] menerima setstate lokal.
  Future<void> _sheet({
    required String title,
    required Widget Function(BuildContext, StateSetter) builder,
    required VoidCallback onSave,
  }) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: BK.card,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: StatefulBuilder(
          builder: (ctx, setSheet) => SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Center(
                  child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 14),
                Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
                const SizedBox(height: 16),
                builder(ctx, setSheet),
                const SizedBox(height: 20),
                FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: BK.accent,
                      minimumSize: const Size.fromHeight(48)),
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('Simpan', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
    if (saved == true) onSave();
  }

  Widget _settingRow({
    required IconData icon,
    required String label,
    required String value,
    VoidCallback? onTap,
    bool disabled = false,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        child: Row(children: [
          Icon(icon, size: 20, color: disabled ? BK.line : BK.ink3),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label,
                  style: TextStyle(
                      fontSize: 13.5, fontWeight: FontWeight.w700, color: disabled ? BK.ink3 : BK.ink)),
              const SizedBox(height: 1),
              Text(disabled ? 'Belum ada resource' : value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          if (!disabled) const Icon(Icons.chevron_right_rounded, color: BK.ink3),
        ]),
      ),
    );
  }

  Widget _inlineRow({required IconData icon, required String label, required String value, VoidCallback? onTap}) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Icon(icon, size: 18, color: BK.ink3),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
          ),
          Text(value, style: const TextStyle(fontSize: 12.5, color: BK.ink2, fontWeight: FontWeight.w600)),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right_rounded, size: 18, color: BK.ink3),
        ]),
      ),
    );
  }

  Widget _sectionTitle(String title, String sub) => Padding(
        padding: const EdgeInsets.only(bottom: 10, left: 4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
          Text(sub, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
        ]),
      );

  Widget _divider() => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 12),
        child: Divider(height: 1, color: BK.line),
      );

  Widget _segmented(String value, Map<String, String> options, ValueChanged<String> onChanged) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: options.entries.map((e) {
          final sel = e.key == value;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(e.key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: BoxDecoration(
                  color: sel ? BK.card : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: sel
                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 1))]
                      : null,
                ),
                child: Text(e.value,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700, color: sel ? BK.ink : BK.ink3)),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _plainField(String label, TextEditingController controller,
      {String? hint, int maxLines = 1, bool caps = false, VoidCallback? onChanged}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
      const SizedBox(height: 4),
      TextField(
        controller: controller,
        maxLines: maxLines,
        inputFormatters: caps
            ? [TextInputFormatter.withFunction((o, n) => n.copyWith(text: n.text.toUpperCase()))]
            : null,
        onChanged: onChanged == null ? null : (_) => onChanged(),
        style: const TextStyle(fontSize: 14.5, color: BK.ink, fontWeight: FontWeight.w600),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: BK.ink3, fontSize: 14, fontWeight: FontWeight.w400),
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 4),
          border: InputBorder.none,
        ),
      ),
    ]);
  }

  String _fmtDate(DateTime d) {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return '${d.day} ${m[d.month - 1]} ${d.year}';
  }
}
