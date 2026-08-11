import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../ui/toast.dart';
import '../models/menu_item.dart';
import '../state/pos_controller.dart';

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

  Future<void> _checkout() async {
    final c = context.read<PosController>();
    final ok = await c.checkout();
    if (!mounted) return;
    if (ok) {
      BkToast.success(context, 'Order ${c.lastOrderNumber ?? ''} dibayar', subtitle: 'Pembayaran tunai tercatat.');
    } else {
      BkToast.error(context, c.checkoutError ?? 'Gagal membuat order');
    }
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<PosController>();
    return Scaffold(
      appBar: AppBar(
        backgroundColor: BK.bg, elevation: 0,
        title: const Text('Kasir', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
        actions: [Padding(padding: const EdgeInsets.only(right: 14), child: Center(child: Pill.acc('Walk-in')))],
      ),
      backgroundColor: BK.bg,
      body: ctrl.menu.when(
        loading: () => const LoadingList(),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded, color: BK.crit, title: 'Gagal memuat menu', hint: '$e',
          action: FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.accent), onPressed: ctrl.load, child: const Text('Coba lagi')),
        ),
        data: (_) => Column(children: [
          SizedBox(
            height: 46,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: ctrl.categories.length,
              separatorBuilder: (_, i) => const SizedBox(width: 7),
              itemBuilder: (_, i) {
                final cat = ctrl.categories[i];
                final on = ctrl.category == cat;
                return GestureDetector(
                  onTap: () => ctrl.setCategory(cat),
                  child: Container(
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: on ? BK.ink : BK.card, borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: on ? BK.ink : BK.line),
                    ),
                    child: Text(cat, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: on ? Colors.white : BK.ink2)),
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: GridView.count(
              crossAxisCount: 2,
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
              mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.92,
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
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Row(children: [
                    Text('${ctrl.cartCount} item', style: const TextStyle(fontSize: 13, color: BK.ink2)),
                    const Spacer(),
                    Text('Rp${rupiah(ctrl.cartTotal)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
                  ]),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
                      onPressed: ctrl.submitting ? null : _checkout,
                      child: ctrl.submitting
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Bayar & cetak nota', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ]),
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
      padding: const EdgeInsets.all(11),
      border: qty > 0 ? BK.accent : BK.line,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          height: 54,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFFFBE2B0), Color(0xFFF0C268)]),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(child: Icon(Icons.restaurant, color: Colors.white70, size: 22)),
        ),
        const SizedBox(height: 8),
        Text(m.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: BK.ink)),
        const SizedBox(height: 2),
        Text('Rp${rupiah(m.price)}', style: const TextStyle(fontSize: 12, color: BK.ink3)),
        const SizedBox(height: 8),
        qty == 0
            ? SizedBox(
                width: double.infinity, height: 34,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accentSoft, foregroundColor: BK.accent, padding: EdgeInsets.zero),
                  onPressed: () => ctrl.add(m),
                  child: const Text('Tambah', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                ),
              )
            : Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                _stepBtn(Icons.remove, () => ctrl.remove(m)),
                Text('$qty', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: BK.ink)),
                _stepBtn(Icons.add, () => ctrl.add(m)),
              ]),
      ]),
    );
  }

  Widget _stepBtn(IconData i, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: Container(
          width: 34, height: 34,
          decoration: BoxDecoration(color: BK.accent, borderRadius: BorderRadius.circular(9)),
          child: Icon(i, color: Colors.white, size: 18),
        ),
      );
}
