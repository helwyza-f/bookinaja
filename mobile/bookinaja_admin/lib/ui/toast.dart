import 'dart:async';
import 'package:flutter/material.dart';
import '../theme.dart';

/// Sistem toast global untuk Bookinaja — kartu mengambang (overlay) dengan 5
/// tipe: success, error, warning, info, loading. Auto-hilang, bisa ditumpuk,
/// tap/geser untuk tutup. Loading bertahan sampai di-dismiss / diganti.
///
/// Pakai:
///   BkToast.success(context, 'Tersimpan', subtitle: 'Perubahan disimpan.');
///   final t = BkToast.loading(context, 'Memproses…');
///   ... t.success('Selesai');  // ganti loading jadi sukses
enum BkToastType { success, error, warning, info, loading }

class BkToast {
  static void success(BuildContext c, String title, {String? subtitle, Duration? duration}) =>
      _Toaster.instance.show(c, BkToastType.success, title, subtitle, duration);
  static void error(BuildContext c, String title, {String? subtitle, Duration? duration}) =>
      _Toaster.instance.show(c, BkToastType.error, title, subtitle, duration);
  static void warning(BuildContext c, String title, {String? subtitle, Duration? duration}) =>
      _Toaster.instance.show(c, BkToastType.warning, title, subtitle, duration);
  static void info(BuildContext c, String title, {String? subtitle, Duration? duration}) =>
      _Toaster.instance.show(c, BkToastType.info, title, subtitle, duration);

  /// Toast loading yang bertahan — pakai handle-nya untuk .success()/.error()/.dismiss().
  static ToastHandle loading(BuildContext c, String title, {String? subtitle}) =>
      _Toaster.instance.show(c, BkToastType.loading, title, subtitle, null);

  /// Tutup semua toast yang tampil.
  static void clear() => _Toaster.instance.clear();
}

/// Kendali untuk satu toast (khususnya loading yang mau diganti hasilnya).
class ToastHandle {
  ToastHandle._(this._id);
  final String _id;
  void dismiss() => _Toaster.instance.dismiss(_id);
  void success(String title, {String? subtitle}) => _Toaster.instance.replace(_id, BkToastType.success, title, subtitle);
  void error(String title, {String? subtitle}) => _Toaster.instance.replace(_id, BkToastType.error, title, subtitle);
  void info(String title, {String? subtitle}) => _Toaster.instance.replace(_id, BkToastType.info, title, subtitle);
  void warning(String title, {String? subtitle}) => _Toaster.instance.replace(_id, BkToastType.warning, title, subtitle);
}

// --- internal ---

class _ToastItem {
  _ToastItem(this.id, this.type, this.title, this.subtitle);
  final String id;
  BkToastType type;
  String title;
  String? subtitle;
  final GlobalKey<_ToastCardState> key = GlobalKey<_ToastCardState>();
}

class _Toaster {
  _Toaster._();
  static final _Toaster instance = _Toaster._();

  static const _max = 4; // batas kartu tampil sekaligus
  final ValueNotifier<List<_ToastItem>> _items = ValueNotifier<List<_ToastItem>>(const []);
  OverlayEntry? _entry;
  int _seq = 0;

  ToastHandle show(BuildContext context, BkToastType type, String title, String? subtitle, Duration? duration) {
    _ensureOverlay(context);
    final item = _ToastItem('t${_seq++}', type, title, subtitle);
    final next = [..._items.value, item];
    // Buang yang terlama kalau melebihi batas.
    while (next.length > _max) {
      next.removeAt(0);
    }
    _items.value = next;
    return ToastHandle._(item.id);
  }

  void replace(String id, BkToastType type, String title, String? subtitle) {
    final item = _find(id);
    if (item == null) return;
    item
      ..type = type
      ..title = title
      ..subtitle = subtitle;
    _items.value = [..._items.value]; // trigger rebuild
    item.key.currentState?.onReplaced();
  }

  void dismiss(String id) {
    final item = _find(id);
    if (item == null) return;
    final st = item.key.currentState;
    if (st != null) {
      st.exit();
    } else {
      _purge(id);
    }
  }

  void clear() {
    for (final it in [..._items.value]) {
      it.key.currentState?.exit();
    }
  }

  _ToastItem? _find(String id) {
    for (final it in _items.value) {
      if (it.id == id) return it;
    }
    return null;
  }

  void _purge(String id) {
    _items.value = _items.value.where((it) => it.id != id).toList();
  }

  void _ensureOverlay(BuildContext context) {
    if (_entry != null && _entry!.mounted) return;
    final overlay = Overlay.of(context, rootOverlay: true);
    _entry = OverlayEntry(builder: (_) => _ToastStack(items: _items, onRemove: _purge));
    overlay.insert(_entry!);
  }
}

class _ToastStack extends StatelessWidget {
  const _ToastStack({required this.items, required this.onRemove});
  final ValueNotifier<List<_ToastItem>> items;
  final void Function(String id) onRemove;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: ValueListenableBuilder<List<_ToastItem>>(
            valueListenable: items,
            builder: (_, list, _) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Terbaru di atas.
                for (final it in list.reversed)
                  Align(
                    alignment: Alignment.topCenter,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 480),
                      child: _ToastCard(key: it.key, item: it, onRemove: () => onRemove(it.id)),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ToastCard extends StatefulWidget {
  const _ToastCard({super.key, required this.item, required this.onRemove});
  final _ToastItem item;
  final VoidCallback onRemove;

  @override
  State<_ToastCard> createState() => _ToastCardState();
}

class _ToastCardState extends State<_ToastCard> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 260));
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _c.forward();
    _scheduleAutoDismiss();
  }

  Duration get _life => switch (widget.item.type) {
        BkToastType.error => const Duration(milliseconds: 4500),
        BkToastType.warning => const Duration(milliseconds: 4000),
        _ => const Duration(milliseconds: 3200),
      };

  void _scheduleAutoDismiss() {
    _timer?.cancel();
    if (widget.item.type == BkToastType.loading) return; // bertahan
    _timer = Timer(_life, exit);
  }

  // Dipanggil saat konten diganti (mis. loading → success): restart timer.
  void onReplaced() {
    if (!mounted) return;
    setState(() {});
    _scheduleAutoDismiss();
  }

  Future<void> exit() async {
    _timer?.cancel();
    if (!mounted) return;
    await _c.reverse();
    if (mounted) widget.onRemove();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _c.dispose();
    super.dispose();
  }

  ({Color bg, Color accent, IconData icon}) get _style => switch (widget.item.type) {
        BkToastType.success => (bg: BK.liveSoft, accent: BK.live, icon: Icons.check_rounded),
        BkToastType.error => (bg: BK.critSoft, accent: BK.crit, icon: Icons.close_rounded),
        BkToastType.warning => (bg: BK.pendSoft, accent: BK.pend, icon: Icons.priority_high_rounded),
        BkToastType.info => (bg: BK.accentSoft, accent: BK.accent, icon: Icons.info_outline_rounded),
        BkToastType.loading => (bg: BK.card2, accent: BK.ink3, icon: Icons.autorenew_rounded),
      };

  @override
  Widget build(BuildContext context) {
    final s = _style;
    final it = widget.item;
    final curved = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic, reverseCurve: Curves.easeInCubic);
    return SizeTransition(
      sizeFactor: curved,
      child: FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(begin: const Offset(0, -0.16), end: Offset.zero).animate(curved),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Dismissible(
              key: ValueKey('dismiss_${it.id}'),
              direction: DismissDirection.up,
              onDismissed: (_) => widget.onRemove(),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: exit,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                    decoration: BoxDecoration(
                      color: s.bg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: s.accent.withValues(alpha: .22)),
                      boxShadow: [BoxShadow(color: BK.ink.withValues(alpha: .10), blurRadius: 18, offset: const Offset(0, 6))],
                    ),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                      _badge(s.accent, s.icon, it.type == BkToastType.loading),
                      const SizedBox(width: 11),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                          Text(it.title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
                          if (it.subtitle != null && it.subtitle!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(it.subtitle!, style: const TextStyle(fontSize: 12, color: BK.ink2, height: 1.25)),
                          ],
                        ]),
                      ),
                    ]),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _badge(Color color, IconData icon, bool spinning) {
    final inner = spinning
        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
        : Icon(icon, size: 17, color: Colors.white);
    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: inner,
    );
  }
}
