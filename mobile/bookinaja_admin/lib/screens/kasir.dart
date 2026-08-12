import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../ui/toast.dart';
import '../models/menu_item.dart';
import '../models/pos_order.dart';
import '../state/pos_controller.dart';
import 'kasir_history.dart';

class KasirScreen extends StatefulWidget {
  const KasirScreen({super.key});
  @override
  State<KasirScreen> createState() => _KasirScreenState();
}

class _KasirScreenState extends State<KasirScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final c = context.read<PosController>();
      if (!c.menu.hasData) c.load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<PosController>();
    return Scaffold(
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        leadingWidth: 52,
        titleSpacing: 0,
        title: const Text(
          'Kasir',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: BK.ink),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              onPressed: () => _openHistory(context),
              style: TextButton.styleFrom(
                foregroundColor: BK.ink2,
                backgroundColor: BK.card,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.receipt_long_rounded, size: 18),
              label: const Text(
                'Riwayat',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
      backgroundColor: BK.bg,
      body: ctrl.menu.when(
        loading: () => const LoadingList(),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded,
          color: BK.crit,
          title: 'Gagal memuat menu',
          hint: '$e',
          action: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: ctrl.load,
            child: const Text('Coba lagi'),
          ),
        ),
        data: (_) => Column(children: [
          _SearchBar(value: ctrl.query, onChanged: ctrl.setQuery),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 2),
            child: SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: ctrl.categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final cat = ctrl.categories[i];
                  final on = ctrl.category == cat;
                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => ctrl.setCategory(cat),
                      borderRadius: BorderRadius.circular(999),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        curve: Curves.easeOut,
                        alignment: Alignment.center,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: on ? BK.ink : BK.card,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: on ? BK.ink : BK.line),
                          boxShadow: on
                              ? const [
                                  BoxShadow(
                                    color: Color(0x120D1526),
                                    blurRadius: 10,
                                    offset: Offset(0, 4),
                                  ),
                                ]
                              : const [],
                        ),
                        child: Text(
                          cat,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: on ? Colors.white : BK.ink2,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          Expanded(
            child: ctrl.visibleMenu.isEmpty
                ? StateView(
                    icon: Icons.restaurant_menu_rounded,
                    color: BK.ink3,
                    title: ctrl.query.isEmpty ? 'Menu kosong' : 'Tidak ada hasil',
                    hint: ctrl.query.isEmpty ? 'Tambahkan item F&B lewat pengaturan.' : 'Coba kata kunci lain.',
                  )
                : GridView.count(
                    crossAxisCount: 2,
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.68,
                    children: [for (final m in ctrl.visibleMenu) _MenuCard(m)],
                  ),
          ),
        ]),
      ),
      bottomNavigationBar: ctrl.cartCount == 0
          ? null
          : SafeArea(
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                decoration: const BoxDecoration(color: BK.card, border: Border(top: BorderSide(color: BK.line))),
                child: Row(children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                    Text('${ctrl.cartCount} item', style: const TextStyle(fontSize: 12, color: BK.ink2)),
                    Text('Rp${rupiah(ctrl.cartTotal)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
                  ]),
                  const Spacer(),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14)),
                    onPressed: () => _openCart(context),
                    icon: const Icon(Icons.shopping_cart_rounded, size: 18),
                    label: const Text('Lihat & bayar', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ]),
              ),
            ),
    );
  }

  Future<void> _openCart(BuildContext context) async {
    final ctrl = context.read<PosController>();
    // Cart sheet mengembalikan true bila kasir menekan "Lanjut ke pembayaran".
    final proceed = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: BK.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => ChangeNotifierProvider<PosController>.value(value: ctrl, child: const _CartSheet()),
    );
    // Payment + result dipicu dari context KasirScreen yang stabil (bukan dari
    // context sheet yang sudah ditutup) agar tombol Selesai selalu bisa ditekan.
    if (proceed == true && context.mounted) await _openPayment(context, ctrl);
  }

  Future<void> _openHistory(BuildContext context) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const KasirHistoryScreen(),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  const _SearchBar({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 2),
      child: TextField(
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        style: const TextStyle(fontSize: 14, color: BK.ink),
        decoration: InputDecoration(
          isDense: true,
          hintText: 'Cari menu…',
          hintStyle: const TextStyle(color: BK.ink3, fontSize: 14),
          prefixIcon: const Icon(Icons.search_rounded, color: BK.ink3, size: 20),
          filled: true,
          fillColor: BK.bg,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
        ),
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  final MenuItem m;
  const _MenuCard(this.m);

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<PosController>();
    final qty = ctrl.qtyOf(m.id);
    return BKCard(
      padding: EdgeInsets.zero,
      border: qty > 0 ? BK.accent : BK.line,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(BK.radius)),
                child: AspectRatio(
                  aspectRatio: 16 / 10,
                  child: m.hasImage
                      ? Image.network(
                          m.imageUrl,
                          fit: BoxFit.cover,
                          loadingBuilder: (ctx, child, progress) =>
                              progress == null ? child : const _MenuThumbPlaceholder(loading: true),
                          errorBuilder: (ctx, _, _) => const _MenuThumbPlaceholder(),
                        )
                      : const _MenuThumbPlaceholder(),
                ),
              ),
              Positioned(
                left: 10,
                top: 10,
                child: AnimatedOpacity(
                  opacity: qty > 0 ? 1 : 0,
                  duration: const Duration(milliseconds: 180),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      color: BK.ink,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '$qty item',
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    m.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13.5,
                      height: 1.15,
                      color: BK.ink,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Rp${rupiah(m.price)}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: BK.ink2,
                    ),
                  ),
                  const Spacer(),
                  if (qty == 0)
                    SizedBox(
                      width: double.infinity,
                      height: 38,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: BK.accentSoft,
                          foregroundColor: BK.accent,
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: () => ctrl.add(m),
                        child: const Text(
                          'Tambah',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                        ),
                      ),
                    )
                  else
                    Container(
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        color: BK.accentSoft,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: BK.accent.withValues(alpha: .10)),
                      ),
                      child: Row(
                        children: [
                          _stepBtn(Icons.remove, () => ctrl.remove(m)),
                          Expanded(
                            child: Text(
                              '$qty',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 14,
                                color: BK.ink,
                              ),
                            ),
                          ),
                          _stepBtn(Icons.add, () => ctrl.add(m)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepBtn(IconData i, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(color: BK.accent, borderRadius: BorderRadius.circular(9)),
          child: Icon(i, color: Colors.white, size: 17),
        ),
      );
}

class _MenuThumbPlaceholder extends StatelessWidget {
  final bool loading;
  const _MenuThumbPlaceholder({this.loading = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFFFBE2B0), Color(0xFFF0C268)])),
      child: Center(
        child: loading
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white70))
            : const Icon(Icons.restaurant, color: Colors.white70, size: 22),
      ),
    );
  }
}

/// Sheet review keranjang → lanjut ke pembayaran.
class _CartSheet extends StatelessWidget {
  const _CartSheet();

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<PosController>();
    final lines = ctrl.cart;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 10),
        Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 12, 12, 4),
          child: Row(children: [
            const Text('Keranjang', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
            const Spacer(),
            if (lines.isNotEmpty)
              TextButton(onPressed: () => ctrl.clearCart(), child: const Text('Kosongkan', style: TextStyle(color: BK.crit))),
          ]),
        ),
        Flexible(
          child: lines.isEmpty
              ? const Padding(padding: EdgeInsets.all(28), child: Text('Keranjang kosong', style: TextStyle(color: BK.ink3)))
              : ListView.separated(
                  shrinkWrap: true,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: lines.length,
                  separatorBuilder: (_, _) => const Divider(height: 1, color: BK.line),
                  itemBuilder: (_, i) {
                    final l = lines[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(l.item.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
                            const SizedBox(height: 2),
                            Text('Rp${rupiah(l.item.price)} · Rp${rupiah(l.subtotal)}', style: const TextStyle(fontSize: 12, color: BK.ink3)),
                          ]),
                        ),
                        _miniStep(Icons.remove, () => ctrl.remove(l.item)),
                        SizedBox(width: 26, child: Text('${l.qty}', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, color: BK.ink))),
                        _miniStep(Icons.add, () => ctrl.add(l.item)),
                      ]),
                    );
                  },
                ),
        ),
        const Divider(height: 1, color: BK.line),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 6),
          child: Row(children: [
            const Text('Total', style: TextStyle(fontSize: 13, color: BK.ink2)),
            const Spacer(),
            Text('Rp${rupiah(ctrl.cartTotal)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
          ]),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: lines.isEmpty
                    ? null
                    : () => Navigator.of(context).pop(true), // tutup cart sheet & lanjut bayar
                child: const Text('Lanjut ke pembayaran', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _miniStep(IconData i, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(color: BK.bg, borderRadius: BorderRadius.circular(8), border: Border.all(color: BK.line)),
          child: Icon(i, size: 16, color: BK.ink),
        ),
      );
}

Future<void> _openPayment(BuildContext context, PosController ctrl) async {
  if (ctrl.cartCount == 0) return;
  // Order belum dibuat di titik ini — dibuat saat konfirmasi bayar, jadi
  // menutup sheet tanpa bayar tidak meninggalkan order menggantung.
  await showModalBottomSheet<void>(
    context: context,
    backgroundColor: BK.card,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => ChangeNotifierProvider<PosController>.value(
      value: ctrl,
      child: _PaymentSheet(total: ctrl.cartTotal, methods: ctrl.paymentMethods),
    ),
  );
  // Struk ditampilkan dari context KasirScreen yang stabil, setelah payment
  // sheet benar-benar tertutup — berlaku untuk tunai maupun manual (transfer/QRIS).
  final result = ctrl.lastResult;
  if (result != null && context.mounted) _showResult(context, ctrl, result);
}

class _PaymentSheet extends StatefulWidget {
  final int total;
  final List<PosPaymentMethod> methods;
  const _PaymentSheet({required this.total, required this.methods});

  @override
  State<_PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends State<_PaymentSheet> {
  PosPaymentMethod? _method;
  final _cashCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  String? _proofPath;

  late final List<PosPaymentMethod> _methods = _buildMethods(widget.methods);

  @override
  void initState() {
    super.initState();
    _method = _methods.isNotEmpty ? _methods.first : null;
  }

  @override
  void dispose() {
    _cashCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  // Kasir hanya menerima tunai + metode manual (butuh bukti). Pastikan tunai selalu ada.
  List<PosPaymentMethod> _buildMethods(List<PosPaymentMethod> source) {
    final list = source.where((m) => m.isCash || m.isManual).toList();
    if (!list.any((m) => m.isCash)) {
      list.insert(0, const PosPaymentMethod(code: 'cash', label: 'Tunai', category: 'cash', verificationType: 'cash'));
    }
    list.sort((a, b) => (a.isCash ? 0 : 1).compareTo(b.isCash ? 0 : 1));
    return list;
  }

  int get _cashReceived => int.tryParse(_cashCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
  int get _change => (_cashReceived - widget.total);

  bool get _canConfirm => _method != null;

  Widget _methodTile(PosPaymentMethod method, bool on) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: () => setState(() => _method = method),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          decoration: BoxDecoration(
            color: on ? BK.accentSoft : BK.bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: on ? BK.accent : BK.line, width: on ? 1.4 : 1),
          ),
          child: Row(children: [
            Icon(_iconFor(method), size: 20, color: on ? BK.accent : BK.ink2),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(method.label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: on ? BK.accent : BK.ink)),
                if (!method.isCash)
                  const Text('Bukti opsional · langsung lunas', style: TextStyle(fontSize: 11, color: BK.ink3)),
              ]),
            ),
            Icon(on ? Icons.check_circle_rounded : Icons.circle_outlined, size: 20, color: on ? BK.accent : BK.ink3),
          ]),
        ),
      ),
    );
  }

  IconData _iconFor(PosPaymentMethod m) {
    if (m.isCash) return Icons.payments_rounded;
    final key = '${m.category}${m.code}'.toLowerCase();
    if (key.contains('qris') || key.contains('qr')) return Icons.qr_code_rounded;
    if (key.contains('transfer') || key.contains('bank') || key.contains('va')) return Icons.account_balance_rounded;
    return Icons.receipt_long_rounded;
  }

  Future<void> _pickProof() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: BK.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetCtx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 12),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.photo_camera_rounded, color: BK.accent),
            title: const Text('Ambil foto', style: TextStyle(fontWeight: FontWeight.w700, color: BK.ink)),
            onTap: () => Navigator.pop(sheetCtx, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_rounded, color: BK.accent),
            title: const Text('Pilih dari galeri', style: TextStyle(fontWeight: FontWeight.w700, color: BK.ink)),
            onTap: () => Navigator.pop(sheetCtx, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
    if (source == null) return;
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 70, maxWidth: 1600);
    if (file == null) return;
    setState(() => _proofPath = file.path);
  }

  Future<void> _confirm() async {
    final ctrl = context.read<PosController>();
    final m = _method!;
    final ok = m.isCash
        ? await ctrl.payCash(method: m.code, cashReceived: _cashReceived > 0 ? _cashReceived : null)
        : await ctrl.payManual(method: m.code, proofPath: _proofPath, note: _noteCtrl.text);
    if (!mounted) return;
    if (ok) {
      // Cukup tutup payment sheet; struk ditampilkan oleh _openPayment dari
      // context yang stabil setelah sheet ini tertutup.
      Navigator.of(context).pop();
    } else {
      BkToast.error(context, ctrl.checkoutError ?? 'Pembayaran gagal');
    }
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<PosController>();
    final m = _method;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 10),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(4))),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 10),
            child: Row(children: const [
              Text('Pembayaran', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(14)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Total tagihan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: BK.ink2)),
                const SizedBox(height: 2),
                Text('Rp${rupiah(widget.total)}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: BK.ink)),
              ]),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('METODE PEMBAYARAN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3, letterSpacing: 0.4)),
              const SizedBox(height: 10),
              for (final method in _methods) _methodTile(method, method.code == m?.code),
              if (m != null && m.isCash) ...[const SizedBox(height: 16), ..._cashFields()],
              if (m != null && m.isManual) ...[const SizedBox(height: 16), ..._manualFields()],
            ]),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                  onPressed: (!_canConfirm || ctrl.submitting) ? null : _confirm,
                  child: ctrl.submitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(
                          m != null && m.isManual ? 'Kirim bukti & selesai' : 'Terima pembayaran',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  List<Widget> _cashFields() {
    final change = _change;
    return [
      TextField(
        controller: _cashCtrl,
        keyboardType: TextInputType.number,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        onChanged: (_) => setState(() {}),
        style: const TextStyle(fontSize: 15, color: BK.ink, fontWeight: FontWeight.w700),
        decoration: InputDecoration(
          isDense: true,
          labelText: 'Uang diterima (opsional)',
          prefixText: 'Rp ',
          filled: true,
          fillColor: BK.bg,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
        ),
      ),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [
        for (final v in _quickCash())
          ActionChip(
            label: Text('Rp${rupiah(v)}', style: const TextStyle(fontSize: 12)),
            backgroundColor: BK.bg,
            side: const BorderSide(color: BK.line),
            onPressed: () => setState(() => _cashCtrl.text = '$v'),
          ),
      ]),
      if (_cashReceived > 0) ...[
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: change >= 0 ? BK.bg : const Color(0x14D14D4D),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: change >= 0 ? BK.line : BK.crit),
          ),
          child: Row(children: [
            Text(change >= 0 ? 'Kembalian' : 'Uang kurang', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: BK.ink2)),
            const Spacer(),
            Text('Rp${rupiah(change.abs())}',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: change >= 0 ? BK.ink : BK.crit)),
          ]),
        ),
      ],
      const SizedBox(height: 6),
    ];
  }

  List<int> _quickCash() {
    final t = widget.total;
    final out = <int>{t};
    for (final step in [5000, 10000, 20000, 50000, 100000]) {
      final rounded = ((t / step).ceil()) * step;
      if (rounded > t) out.add(rounded);
    }
    final list = out.toList()..sort();
    return list.take(4).toList();
  }

  List<Widget> _manualFields() {
    return [
      GestureDetector(
        onTap: _pickProof,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: BK.bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _proofPath == null ? BK.line : BK.accent),
          ),
          child: _proofPath == null
              ? const Row(children: [
                  Icon(Icons.add_a_photo_rounded, size: 20, color: BK.ink3),
                  SizedBox(width: 10),
                  Text('Ambil foto bukti (opsional)', style: TextStyle(fontSize: 13.5, color: BK.ink2, fontWeight: FontWeight.w600)),
                ])
              : Row(children: [
                  ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.file(File(_proofPath!), width: 46, height: 46, fit: BoxFit.cover)),
                  const SizedBox(width: 10),
                  const Expanded(child: Text('Bukti terpilih. Ketuk untuk ganti.', style: TextStyle(fontSize: 13, color: BK.ink2))),
                  const Icon(Icons.check_circle_rounded, color: BK.accent, size: 20),
                ]),
        ),
      ),
      const SizedBox(height: 10),
      TextField(
        controller: _noteCtrl,
        style: const TextStyle(fontSize: 14, color: BK.ink),
        decoration: InputDecoration(
          isDense: true,
          hintText: 'Catatan (opsional)',
          filled: true,
          fillColor: BK.bg,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.line)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: BK.accent)),
        ),
      ),
      const SizedBox(height: 6),
    ];
  }
}

void _showResult(BuildContext context, PosController ctrl, PosResult r) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: BK.card,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetCtx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(r.awaitingVerification ? Icons.hourglass_top_rounded : Icons.check_circle_rounded,
              color: r.awaitingVerification ? BK.accent : Colors.green, size: 48),
          const SizedBox(height: 10),
          Text(r.awaitingVerification ? 'Menunggu verifikasi' : 'Pembayaran diterima',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: BK.ink)),
          const SizedBox(height: 4),
          Text('Order ${r.orderNumber}', style: const TextStyle(fontSize: 13, color: BK.ink3)),
          const SizedBox(height: 14),
          _resultRow('Total', 'Rp${rupiah(r.total)}'),
          if (!r.awaitingVerification && r.cashReceived != null) ...[
            _resultRow('Tunai diterima', 'Rp${rupiah(r.cashReceived!)}'),
            _resultRow('Kembalian', 'Rp${rupiah(r.change)}', strong: true),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
              onPressed: () {
                ctrl.clearResult();
                Navigator.of(sheetCtx).pop();
              },
              child: const Text('Selesai', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ]),
      ),
    ),
  );
}

Widget _resultRow(String k, String v, {bool strong = false}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        Text(k, style: const TextStyle(fontSize: 13, color: BK.ink2)),
        const Spacer(),
        Text(v, style: TextStyle(fontSize: strong ? 16 : 14, fontWeight: strong ? FontWeight.w800 : FontWeight.w700, color: BK.ink)),
      ]),
    );
