import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/subscription_view.dart';
import '../theme.dart';
import '../models/workspace.dart';
import '../state/auth_controller.dart';
import 'create_workspace_screen.dart';

/// Langkah 2: pilih workspace setelah login account.
class WorkspacePickerScreen extends StatefulWidget {
  const WorkspacePickerScreen({super.key});
  @override
  State<WorkspacePickerScreen> createState() => _WorkspacePickerScreenState();
}

class _WorkspacePickerScreenState extends State<WorkspacePickerScreen> {
  // Cegah auto-buka form berulang saat daftar kosong (rebuild).
  bool _autoOpenedEmpty = false;

  /// Buka form buat workspace. Saat berhasil, AuthController meng-set workspace
  /// aktif → root beralih ke dashboard sendiri, jadi cukup reload daftar di sini.
  Future<void> _openCreate() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CreateWorkspaceScreen()),
    );
    if (mounted) context.read<AuthController>().loadWorkspaces();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthController>();
      if (!auth.workspaces.hasData) auth.loadWorkspaces();
    });
  }

  Future<void> _confirmLogout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: BK.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Keluar akun?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: BK.ink)),
        content: const Text('Kamu akan kembali ke halaman login.', style: TextStyle(color: BK.ink2, fontSize: 13.5)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal', style: TextStyle(color: BK.ink2))),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.crit),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
    if (ok == true && mounted) context.read<AuthController>().logout();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final name = auth.account?.name.trim().isNotEmpty == true ? auth.account!.name.trim() : 'Admin';
    final email = auth.account?.email ?? '';

    return Scaffold(
      backgroundColor: BK.bg,
      body: SafeArea(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _Header(name: name, email: email, onLogout: _confirmLogout),
          Expanded(
            child: auth.workspaces.when(
              loading: () => const LoadingList(),
              error: (e) => StateView(
                icon: Icons.wifi_off_rounded,
                color: BK.crit,
                title: 'Gagal memuat workspace',
                hint: '$e',
                action: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent),
                  onPressed: () => context.read<AuthController>().loadWorkspaces(),
                  child: const Text('Coba lagi'),
                ),
              ),
              data: (list) {
                if (list.isEmpty) {
                  // Kosong → langsung tuntun buat workspace pertama (sekali,
                  // saat frame pertama), sambil tetap sediakan tombolnya.
                  if (!_autoOpenedEmpty) {
                    _autoOpenedEmpty = true;
                    WidgetsBinding.instance.addPostFrameCallback((_) => _openCreate());
                  }
                  return _EmptyState(onCreate: _openCreate);
                }
                return ListView(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 4, bottom: 12),
                      child: Text(
                        '${list.length} WORKSPACE',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: BK.ink3),
                      ),
                    ),
                    for (final w in list) ...[
                      _WorkspaceCard(w),
                      const SizedBox(height: 12),
                    ],
                    const SizedBox(height: 4),
                    _AddWorkspaceTile(onTap: _openCreate),
                  ],
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}

/// Header sambutan — avatar inisial, nama, email, dan tombol keluar.
class _Header extends StatelessWidget {
  final String name;
  final String email;
  final VoidCallback onLogout;
  const _Header({required this.name, required this.email, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'A';
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 16, 18),
      child: Row(children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [BoxShadow(color: BK.accent.withValues(alpha: .28), blurRadius: 16, offset: const Offset(0, 6))],
          ),
          child: Center(child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 22))),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Halo, $name 👋', maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 2),
            Text(email.isNotEmpty ? email : 'Pilih workspace untuk mulai',
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
          ]),
        ),
        const SizedBox(width: 6),
        IconButton(
          onPressed: onLogout,
          tooltip: 'Keluar',
          style: IconButton.styleFrom(backgroundColor: BK.card, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: BK.line))),
          icon: const Icon(Icons.logout_rounded, size: 20, color: BK.ink2),
        ),
      ]),
    );
  }
}

/// Kartu tambah workspace — CTA bergaya dashed di bawah daftar.
class _AddWorkspaceTile extends StatelessWidget {
  final VoidCallback onTap;
  const _AddWorkspaceTile({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: onTap,
      child: DottedBorder(
        color: BK.accent.withValues(alpha: .5),
        radius: BK.radius,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 14),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.add_rounded, color: BK.accent, size: 22),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text('Tambah workspace baru',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: BK.accent)),
            ),
          ]),
        ),
      ),
    );
  }
}

/// Empty state — belum punya workspace sama sekali.
class _EmptyState extends StatelessWidget {
  final VoidCallback onCreate;
  const _EmptyState({required this.onCreate});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 84, height: 84,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [BK.accentSoft, BK.accentSoft.withValues(alpha: .4)]),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(Icons.storefront_rounded, color: BK.accent, size: 40),
          ),
          const SizedBox(height: 20),
          const Text('Mulai bisnis pertamamu', textAlign: TextAlign.center,
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: BK.ink)),
          const SizedBox(height: 8),
          const Text('Buat workspace untuk mengelola booking, jadwal, dan pembayaran dari satu tempat.',
              textAlign: TextAlign.center, style: TextStyle(color: BK.ink3, fontSize: 13.5, height: 1.4)),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: BK.accent,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: onCreate,
              icon: const Icon(Icons.add_rounded, size: 20),
              label: const Text('Buat workspace', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            ),
          ),
        ]),
      ),
    );
  }
}

class _WorkspaceCard extends StatelessWidget {
  final Workspace w;
  const _WorkspaceCard(this.w);

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(BK.radius),
        onTap: () => context.read<AuthController>().selectWorkspace(w),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: BK.card,
            borderRadius: BorderRadius.circular(BK.radius),
            border: Border.all(color: BK.line),
            boxShadow: [BoxShadow(color: BK.ink.withValues(alpha: .04), blurRadius: 14, offset: const Offset(0, 6))],
          ),
          child: Row(children: [
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(15),
              ),
              child: Center(child: Text(w.name.isNotEmpty ? w.name[0].toUpperCase() : 'W',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20))),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(w.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5, color: BK.ink)),
                const SizedBox(height: 7),
                Wrap(spacing: 8, runSpacing: 5, crossAxisAlignment: WrapCrossAlignment.center, children: [
                  _rolePill,
                  _subPill,
                ]),
              ]),
            ),
            const SizedBox(width: 6),
            Container(
              width: 30, height: 30,
              decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: BK.ink3),
            ),
          ]),
        ),
      ),
    );
  }

  /// Peran anggota di workspace, huruf kapital rapi (Owner / Staff / …).
  Widget get _rolePill {
    final r = w.role.trim();
    if (r.isEmpty) return const SizedBox.shrink();
    final label = r[0].toUpperCase() + r.substring(1).toLowerCase();
    final owner = r.toLowerCase() == 'owner';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(owner ? Icons.verified_user_outlined : Icons.badge_outlined, size: 12, color: BK.ink3),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
      ]),
    );
  }

  /// Badge langganan ringkas (Aktif / Trial / Berakhir / Dibatasi / Terkunci),
  /// warna naik bertingkat sesuai fase grace.
  Widget get _subPill {
    final v = w.subView;
    final color = switch (v.tone) {
      SubTone.active => BK.live,
      SubTone.trial => BK.accent,
      SubTone.soft => BK.pend,
      SubTone.friction => const Color(0xFFEA6D24),
      SubTone.locked => BK.crit,
      SubTone.unknown => BK.ink3,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.13), borderRadius: BorderRadius.circular(20)),
      child: Text(v.pill, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

/// Border putus-putus ringan untuk kartu "tambah" (tanpa dependensi eksternal).
class DottedBorder extends StatelessWidget {
  final Widget child;
  final Color color;
  final double radius;
  const DottedBorder({super.key, required this.child, required this.color, this.radius = 12});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DashedRectPainter(color: color, radius: radius),
      child: child,
    );
  }
}

class _DashedRectPainter extends CustomPainter {
  final Color color;
  final double radius;
  _DashedRectPainter({required this.color, required this.radius});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    final rrect = RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius));
    final path = Path()..addRRect(rrect);
    const dash = 6.0, gap = 5.0;
    for (final metric in path.computeMetrics()) {
      double d = 0;
      while (d < metric.length) {
        final seg = metric.extractPath(d, (d + dash).clamp(0, metric.length));
        canvas.drawPath(seg, paint);
        d += dash + gap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRectPainter old) => old.color != color || old.radius != radius;
}
