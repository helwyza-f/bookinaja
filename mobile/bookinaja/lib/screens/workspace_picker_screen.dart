import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/subscription_view.dart';
import '../theme.dart';
import '../models/workspace.dart';
import '../state/auth_controller.dart';

/// Langkah 2: pilih workspace setelah login account.
class WorkspacePickerScreen extends StatefulWidget {
  const WorkspacePickerScreen({super.key});
  @override
  State<WorkspacePickerScreen> createState() => _WorkspacePickerScreenState();
}

class _WorkspacePickerScreenState extends State<WorkspacePickerScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthController>();
      if (!auth.workspaces.hasData) auth.loadWorkspaces();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return Scaffold(
      body: SafeArea(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Halo, ${auth.account?.name ?? 'Admin'}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
                  const SizedBox(height: 2),
                  const Text('Pilih workspace untuk mulai', style: TextStyle(fontSize: 13, color: BK.ink3)),
                ]),
              ),
              TextButton(onPressed: () => context.read<AuthController>().logout(), child: const Text('Keluar')),
            ]),
          ),
          Expanded(
            child: auth.workspaces.when(
              loading: () => const LoadingList(),
              error: (e) => StateView(
                icon: Icons.wifi_off_rounded, color: BK.crit, title: 'Gagal memuat workspace', hint: '$e',
                action: FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.accent), onPressed: () => context.read<AuthController>().loadWorkspaces(), child: const Text('Coba lagi')),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return const StateView(icon: Icons.workspaces_outline, color: BK.ink3, title: 'Belum punya workspace', hint: 'Buat workspace lewat web dulu.');
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  itemCount: list.length,
                  separatorBuilder: (_, i) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _WorkspaceCard(list[i]),
                );
              },
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
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: () => context.read<AuthController>().selectWorkspace(w),
      child: BKCard(
        padding: const EdgeInsets.all(13),
        child: Row(children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)]), borderRadius: BorderRadius.circular(14)),
            child: Center(child: Text(w.name.isNotEmpty ? w.name[0].toUpperCase() : 'W', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(w.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: BK.ink)),
              const SizedBox(height: 6),
              // Peran + badge langganan. State langganan (plan/grace) kini
              // disertakan di list workspace (dari tenants), jadi bisa dipratinjau
              // sebelum masuk. State detail tetap di hero "Langganan" di dalam.
              Wrap(spacing: 8, runSpacing: 5, crossAxisAlignment: WrapCrossAlignment.center, children: [
                _rolePill,
                _subPill,
              ]),
            ]),
          ),
          const SizedBox(width: 4),
          const Icon(Icons.arrow_forward_ios, size: 15, color: BK.ink3),
        ]),
      ),
    );
  }

  /// Peran anggota di workspace, huruf kapital rapi (Owner / Staff / …).
  Widget get _rolePill {
    final r = w.role.trim();
    if (r.isEmpty) return const SizedBox.shrink();
    final label = r[0].toUpperCase() + r.substring(1).toLowerCase();
    final owner = r.toLowerCase() == 'owner';
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(owner ? Icons.verified_user_outlined : Icons.badge_outlined, size: 13, color: BK.ink3),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: BK.ink2)),
    ]);
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
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(v.pill,
          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color)),
    );
  }
}
