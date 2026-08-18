import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../models/expense.dart';
import '../repositories/expense_repository.dart';
import '../state/expense_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';

const _monthShort = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];
String _tgl(DateTime? d) => d == null ? '-' : '${d.day} ${_monthShort[d.month]} ${d.year}';
String _rangeLabel(DateTime f, DateTime t) {
  if (f.year == t.year && f.month == t.month) return '${f.day}–${t.day} ${_monthShort[t.month]} ${t.year}';
  if (f.year == t.year) return '${f.day} ${_monthShort[f.month]} – ${t.day} ${_monthShort[t.month]} ${t.year}';
  return '${_tgl(f)} – ${_tgl(t)}';
}

/// Layar admin: Biaya Operasional (pengeluaran). Catat, filter per kategori &
/// rentang tanggal, lengkap dengan foto struk.
class ExpensesScreen extends StatelessWidget {
  const ExpensesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => ExpenseController(ctx.read<ExpenseRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<ExpenseController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Biaya Operasional',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: BK.accent,
        onPressed: () => _openForm(context, c),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Catat', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: Column(children: [
        _Header(c: c),
        Expanded(
          child: c.state.when(
            loading: () => const LoadingList(),
            error: (e) => StateView(
              icon: Icons.wifi_off_rounded,
              color: BK.crit,
              title: 'Gagal memuat pengeluaran',
              hint: '$e',
              action: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: BK.accent),
                onPressed: c.load,
                child: const Text('Coba lagi'),
              ),
            ),
            data: (_) {
              final items = c.filtered;
              if (items.isEmpty) {
                return StateView(
                  icon: Icons.receipt_long_outlined,
                  color: BK.ink3,
                  title: c.isFilterActive ? 'Tidak ada hasil' : 'Belum ada pengeluaran',
                  hint: c.isFilterActive
                      ? 'Coba ubah filter atau kata kunci.'
                      : 'Catat biaya bisnis agar arus pengeluaran rapi.',
                  action: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: BK.accent),
                    onPressed: () => _openForm(context, c),
                    icon: const Icon(Icons.add),
                    label: const Text('Catat pengeluaran'),
                  ),
                );
              }
              return RefreshIndicator(
                color: BK.accent,
                onRefresh: c.load,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _ExpenseCard(
                    expense: items[i],
                    onTap: () => _openForm(context, c, existing: items[i]),
                  ),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }

  Future<void> _openForm(BuildContext context, ExpenseController c, {Expense? existing}) async {
    final result = await showModalBottomSheet<_FormResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ExpenseFormSheet(controller: c, existing: existing),
    );
    if (result == null || !context.mounted) return;
    if (result.deleted) {
      final ok = await c.remove(existing!);
      if (!context.mounted) return;
      ok
          ? BkToast.success(context, 'Pengeluaran dihapus')
          : BkToast.error(context, c.error ?? 'Gagal menghapus');
      return;
    }
    final ok = await c.save(result.expense!);
    if (!context.mounted) return;
    ok
        ? BkToast.success(context, existing == null ? 'Pengeluaran dicatat' : 'Pengeluaran disimpan')
        : BkToast.error(context, c.error ?? 'Gagal menyimpan');
  }
}

class _Header extends StatelessWidget {
  final ExpenseController c;
  const _Header({required this.c});

  Future<void> _pickRange(BuildContext context) async {
    final now = DateTime.now();
    final res = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 3),
      lastDate: DateTime(now.year + 1),
      initialDateRange: DateTimeRange(start: c.from, end: c.to),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(colorScheme: ColorScheme.light(primary: BK.accent, onPrimary: Colors.white)),
        child: child!,
      ),
    );
    if (res != null) c.setRange(res.start, res.end);
  }

  @override
  Widget build(BuildContext context) {
    final cats = ['all', ...kExpenseCategories];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Ringkasan
        Row(children: [
          Expanded(
            child: _SummaryTile(
              label: 'Total pengeluaran',
              value: 'Rp ${rupiah(c.summary.total)}',
              icon: Icons.payments_rounded,
              tone: BK.crit,
            ),
          ),
          const SizedBox(width: 10),
          _SummaryTile(
            label: 'Catatan',
            value: '${c.summary.entries}',
            icon: Icons.receipt_long_rounded,
            tone: BK.accent,
            compact: true,
          ),
        ]),
        const SizedBox(height: 12),
        // Rentang tanggal
        InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _pickRange(context),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            decoration: BoxDecoration(
              color: BK.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: BK.line),
            ),
            child: Row(children: [
              const Icon(Icons.calendar_today_rounded, size: 16, color: BK.accent),
              const SizedBox(width: 10),
              Expanded(
                child: Text(_rangeLabel(c.from, c.to),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: BK.ink)),
              ),
              if (c.isFilterActive)
                GestureDetector(
                  onTap: c.resetFilters,
                  child: const Text('Reset', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: BK.crit)),
                )
              else
                const Icon(Icons.expand_more_rounded, size: 18, color: BK.ink3),
            ]),
          ),
        ),
        const SizedBox(height: 10),
        // Pencarian
        TextField(
          onChanged: c.search,
          style: const TextStyle(fontSize: 14, color: BK.ink),
          decoration: InputDecoration(
            hintText: 'Cari judul, vendor, catatan…',
            hintStyle: const TextStyle(color: BK.ink3, fontSize: 14),
            prefixIcon: const Icon(Icons.search, color: BK.ink3, size: 20),
            isDense: true,
            filled: true,
            fillColor: BK.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
          ),
        ),
        const SizedBox(height: 10),
        // Kategori chips
        SizedBox(
          height: 34,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: cats.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final cat = cats[i];
              final on = c.category == cat;
              return GestureDetector(
                onTap: () => c.setCategory(cat),
                child: Container(
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: on ? BK.ink : BK.card,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: on ? BK.ink : BK.line),
                  ),
                  child: Text(cat == 'all' ? 'Semua' : cat,
                      style: TextStyle(
                          fontSize: 12.5, fontWeight: FontWeight.w800, color: on ? Colors.white : BK.ink2)),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color tone;
  final bool compact;
  const _SummaryTile({required this.label, required this.value, required this.icon, required this.tone, this.compact = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: compact ? 92 : null,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(14), border: Border.all(color: BK.line)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 15, color: tone),
          const SizedBox(width: 6),
          Expanded(
            child: Text(label,
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: BK.ink3)),
          ),
        ]),
        const SizedBox(height: 5),
        Text(value,
            maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: BK.ink)),
      ]),
    );
  }
}

class _ExpenseCard extends StatelessWidget {
  final Expense expense;
  final VoidCallback onTap;
  const _ExpenseCard({required this.expense, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: onTap,
      child: BKCard(
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: BK.critSoft, borderRadius: BorderRadius.circular(12)),
            child: Icon(expense.hasReceipt ? Icons.receipt_long_rounded : Icons.payments_rounded, color: BK.crit, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(expense.title.isEmpty ? '(Tanpa judul)' : expense.title,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5, color: BK.ink)),
              const SizedBox(height: 4),
              Row(children: [
                Pill.acc(expense.category),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(_tgl(expense.expenseDate),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                ),
              ]),
            ]),
          ),
          const SizedBox(width: 8),
          Text('Rp ${rupiah(expense.amount)}',
              style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w900, color: BK.crit)),
        ]),
      ),
    );
  }
}

class _FormResult {
  final Expense? expense;
  final bool deleted;
  const _FormResult({this.expense, this.deleted = false});
}

class _ExpenseFormSheet extends StatefulWidget {
  final ExpenseController controller;
  final Expense? existing;
  const _ExpenseFormSheet({required this.controller, this.existing});

  @override
  State<_ExpenseFormSheet> createState() => _ExpenseFormSheetState();
}

class _ExpenseFormSheetState extends State<_ExpenseFormSheet> {
  final _picker = ImagePicker();
  late final TextEditingController _title;
  late final TextEditingController _amount;
  late final TextEditingController _notes;
  late String _category;
  late DateTime _date;
  String? _receiptUrl;
  String? _localPreview;
  bool _uploading = false;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _title = TextEditingController(text: e?.title ?? '');
    _amount = TextEditingController(text: e != null && e.amount > 0 ? rupiah(e.amount) : '');
    _notes = TextEditingController(text: e?.notes ?? '');
    _category = e?.category ?? 'Operasional';
    if (!kExpenseCategories.contains(_category)) _category = 'Lainnya';
    _date = e?.expenseDate ?? DateTime.now();
    _receiptUrl = e?.receiptUrl;
  }

  @override
  void dispose() {
    _title.dispose();
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final res = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(now.year - 3),
      lastDate: DateTime(now.year + 1),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(colorScheme: ColorScheme.light(primary: BK.accent, onPrimary: Colors.white)),
        child: child!,
      ),
    );
    if (res != null) setState(() => _date = res);
  }

  Future<void> _pickReceipt() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: BK.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: _sourceOption(Icons.photo_camera_outlined, 'Kamera', () => Navigator.pop(sheetCtx, ImageSource.camera))),
              const SizedBox(width: 12),
              Expanded(child: _sourceOption(Icons.photo_library_outlined, 'Galeri', () => Navigator.pop(sheetCtx, ImageSource.gallery))),
            ]),
          ]),
        ),
      ),
    );
    if (source == null) return;
    try {
      final x = await _picker.pickImage(source: source, imageQuality: 70, maxWidth: 1600);
      if (x == null) return;
      setState(() {
        _uploading = true;
        _localPreview = x.path;
      });
      final url = await widget.controller.uploadReceipt(x.path);
      if (!mounted) return;
      setState(() {
        _receiptUrl = url;
        _uploading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _uploading = false);
      BkToast.error(context, 'Gagal upload struk', subtitle: '$e');
    }
  }

  Widget _sourceOption(IconData icon, String label, VoidCallback onTap) => InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(14), border: Border.all(color: BK.line)),
          child: Column(children: [
            Icon(icon, size: 28, color: BK.accent),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
          ]),
        ),
      );

  void _submit() {
    final title = _title.text.trim();
    if (title.isEmpty) {
      BkToast.warning(context, 'Keterangan wajib diisi');
      return;
    }
    final amount = int.tryParse(_amount.text.trim().replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
    if (amount <= 0) {
      BkToast.warning(context, 'Nominal harus lebih dari 0');
      return;
    }
    setState(() => _saving = true);
    final base = widget.existing ?? const Expense();
    final expense = base.copyWith(
      title: title,
      amount: amount,
      category: _category,
      expenseDate: _date,
      notes: _notes.text.trim(),
      receiptUrl: _receiptUrl ?? '',
    );
    Navigator.of(context).pop(_FormResult(expense: expense));
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Hapus pengeluaran?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: Text('“${widget.existing!.title}” akan dihapus permanen.',
            style: const TextStyle(fontSize: 13.5, color: BK.ink2)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx, false), child: const Text('Batal')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.crit),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (ok == true && mounted) Navigator.of(context).pop(const _FormResult(deleted: true));
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final maxHeight = MediaQuery.of(context).size.height * 0.92;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: Container(
          decoration: const BoxDecoration(color: BK.bg, borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
          child: SafeArea(
            top: false,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              // ── Header tetap ──
              const SizedBox(height: 10),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(2))),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 12, 8, 8),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(_isEdit ? 'Ubah pengeluaran' : 'Catat pengeluaran',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
                      const SizedBox(height: 1),
                      const Text('Biaya operasional', style: TextStyle(fontSize: 11.5, color: BK.ink3)),
                    ]),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, color: BK.ink3),
                  ),
                ]),
              ),
              const Divider(height: 1, color: BK.line),
              // ── Konten scroll ──
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _amountHero(),
                    const SizedBox(height: 18),
                    _field('Keterangan', _title, hint: 'mis. Bayar listrik bulan ini'),
                    const SizedBox(height: 14),
                    _dateRow(),
                    const SizedBox(height: 14),
                    _categoryRow(),
                    const SizedBox(height: 14),
                    _field('Catatan (opsional)', _notes, hint: 'Vendor, no. nota, dll.', maxLines: 2),
                    const SizedBox(height: 14),
                    _receiptPicker(),
                  ]),
                ),
              ),
              // ── Footer aksi sticky ──
              Container(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 12),
                decoration: const BoxDecoration(color: BK.bg, border: Border(top: BorderSide(color: BK.line))),
                child: Row(children: [
                  if (_isEdit) ...[
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: BK.crit,
                        side: const BorderSide(color: BK.critSoft),
                        padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 16),
                      ),
                      onPressed: _saving ? null : _confirmDelete,
                      child: const Icon(Icons.delete_outline, size: 20),
                    ),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                      onPressed: (_saving || _uploading) ? null : _submit,
                      child: _saving
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(_isEdit ? 'Simpan perubahan' : 'Simpan pengeluaran',
                              style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ]),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  /// Input nominal sebagai fokus utama form (hero), dengan format ribuan hidup.
  Widget _amountHero() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      decoration: BoxDecoration(color: BK.critSoft, borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('NOMINAL PENGELUARAN',
            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: BK.crit)),
        const SizedBox(height: 6),
        Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
          const Text('Rp', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BK.crit)),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _amount,
              keyboardType: TextInputType.number,
              onChanged: _onAmountChanged,
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: BK.ink, height: 1.1),
              decoration: const InputDecoration(
                isCollapsed: true,
                border: InputBorder.none,
                hintText: '0',
                hintStyle: TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: BK.ink3),
              ),
            ),
          ),
        ]),
      ]),
    );
  }

  void _onAmountChanged(String v) {
    final digits = v.replaceAll(RegExp(r'[^0-9]'), '');
    final formatted = digits.isEmpty ? '' : rupiah(int.parse(digits));
    if (formatted == _amount.text) return;
    _amount.value = TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  Widget _label(String t) =>
      Text(t, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2));

  Widget _categoryRow() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _label('Kategori'),
      const SizedBox(height: 6),
      InkWell(
        borderRadius: BorderRadius.circular(11),
        onTap: _pickCategory,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(11), border: Border.all(color: BK.line)),
          child: Row(children: [
            const Icon(Icons.sell_outlined, size: 16, color: BK.accent),
            const SizedBox(width: 10),
            Expanded(
              child: Text(_category,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
            ),
            const Icon(Icons.expand_more_rounded, size: 18, color: BK.ink3),
          ]),
        ),
      ),
    ]);
  }

  Future<void> _pickCategory() async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: BK.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 10),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 14, 20, 6),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Kategori', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink)),
            ),
          ),
          for (final cat in kExpenseCategories)
            ListTile(
              title: Text(cat,
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: _category == cat ? BK.accent : BK.ink)),
              trailing: _category == cat ? const Icon(Icons.check_rounded, color: BK.accent, size: 20) : null,
              onTap: () => Navigator.pop(ctx, cat),
            ),
          const SizedBox(height: 8),
        ]),
      ),
    );
    if (picked != null) setState(() => _category = picked);
  }

  Widget _dateRow() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _label('Tanggal'),
      const SizedBox(height: 6),
      InkWell(
        borderRadius: BorderRadius.circular(11),
        onTap: _pickDate,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(11), border: Border.all(color: BK.line)),
          child: Row(children: [
            const Icon(Icons.calendar_today_rounded, size: 16, color: BK.accent),
            const SizedBox(width: 10),
            Expanded(
              child: Text(_tgl(_date),
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
            ),
            const Icon(Icons.expand_more_rounded, size: 18, color: BK.ink3),
          ]),
        ),
      ),
    ]);
  }

  Widget _receiptPicker() {
    final hasImage = _localPreview != null || (_receiptUrl != null && _receiptUrl!.isNotEmpty);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _label('Foto struk (opsional)'),
      const SizedBox(height: 6),
      if (_uploading)
        _receiptImage(overlayLoading: true)
      else if (hasImage)
        _receiptImage()
      else
        GestureDetector(
          onTap: _pickReceipt,
          child: Container(
            height: 112,
            width: double.infinity,
            decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: BK.line)),
            child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.add_a_photo_outlined, color: BK.ink3, size: 26),
              SizedBox(height: 8),
              Text('Unggah foto struk', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: BK.ink2)),
              SizedBox(height: 2),
              Text('Kamera atau galeri', style: TextStyle(fontSize: 11, color: BK.ink3)),
            ]),
          ),
        ),
    ]);
  }

  Widget _receiptImage({bool overlayLoading = false}) {
    final img = _localPreview != null
        ? Image.file(File(_localPreview!), height: 170, width: double.infinity, fit: BoxFit.cover)
        : Image.network(_receiptUrl!, height: 170, width: double.infinity, fit: BoxFit.cover,
            errorBuilder: (_, _, _) => Container(height: 170, color: BK.card2, alignment: Alignment.center,
                child: const Icon(Icons.broken_image_outlined, color: BK.ink3, size: 28)));
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Stack(children: [
        img,
        if (overlayLoading)
          Positioned.fill(
            child: Container(
              color: Colors.black.withValues(alpha: .38),
              child: const Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                  SizedBox(height: 8),
                  Text('Mengunggah…', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                ]),
              ),
            ),
          )
        else ...[
          Positioned.fill(child: Material(color: Colors.transparent, child: InkWell(onTap: _pickReceipt))),
          Positioned(
            top: 8, right: 8,
            child: GestureDetector(
              onTap: () => setState(() { _receiptUrl = null; _localPreview = null; }),
              child: Container(
                padding: const EdgeInsets.all(5),
                decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                child: const Icon(Icons.close_rounded, color: Colors.white, size: 16),
              ),
            ),
          ),
        ],
      ]),
    );
  }

  Widget _field(String label, TextEditingController controller, {String? hint, int maxLines = 1, TextInputType? keyboard}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
      const SizedBox(height: 5),
      TextField(
        controller: controller,
        maxLines: maxLines,
        keyboardType: keyboard,
        style: const TextStyle(fontSize: 13.5, color: BK.ink),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: BK.ink3, fontSize: 13),
          isDense: true,
          filled: true,
          fillColor: BK.card,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
        ),
      ),
    ]);
  }
}
