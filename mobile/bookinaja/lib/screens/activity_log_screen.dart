import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/activity.dart';
import '../repositories/settings_repository.dart';
import '../theme.dart';

/// Log Aktivitas (owner) — siapa melakukan apa & kapan. Membaca
/// /admin/settings/activity (tenant_audit_logs): perubahan staff, peran,
/// pengaturan, publish. Akuntabilitas tindakan tim.
class ActivityLogScreen extends StatefulWidget {
  const ActivityLogScreen({super.key});
  @override
  State<ActivityLogScreen> createState() => _ActivityLogScreenState();
}

class _ActivityLogScreenState extends State<ActivityLogScreen> {
  late Future<List<ActivityEntry>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<SettingsRepository>().getActivity();
  }

  Future<void> _reload() async {
    setState(() => _future = context.read<SettingsRepository>().getActivity());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('Log aktivitas',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: SafeArea(
        child: FutureBuilder<List<ActivityEntry>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: BK.accent));
            }
            if (snap.hasError) {
              return _error('${snap.error}'.replaceFirst('Exception: ', ''));
            }
            final items = snap.data ?? const [];
            if (items.isEmpty) return _empty();
            return RefreshIndicator(
              color: BK.accent,
              onRefresh: _reload,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _row(items[i]),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _row(ActivityEntry e) {
    return BKCard(
      child: Row(children: [
        Container(
          width: 40, height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(11)),
          child: Icon(e.icon, color: BK.accent, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(e.label,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
            const SizedBox(height: 2),
            Text('${e.actor}${e.createdAt != null ? ' · ${_when(e.createdAt!)}' : ''}',
                style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ]),
        ),
      ]),
    );
  }

  Widget _empty() => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(20)),
              child: const Icon(Icons.history, color: BK.ink3, size: 30),
            ),
            const SizedBox(height: 14),
            const Text('Belum ada aktivitas',
                style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 4),
            const Text('Perubahan staff, peran, dan pengaturan akan tercatat di sini.',
                textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: BK.ink3, height: 1.4)),
          ]),
        ),
      );

  Widget _error(String msg) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.wifi_off_rounded, color: BK.crit, size: 30),
            const SizedBox(height: 10),
            const Text('Gagal memuat', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink)),
            const SizedBox(height: 4),
            Text(msg, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12.5, color: BK.ink3)),
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: BK.accent),
              onPressed: _reload,
              child: const Text('Coba lagi'),
            ),
          ]),
        ),
      );

  String _when(DateTime d) {
    final l = d.toLocal();
    final now = DateTime.now();
    final diff = now.difference(l);
    if (diff.inMinutes < 1) return 'baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} mnt lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    if (diff.inDays < 7) return '${diff.inDays} hari lalu';
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    final hm = '${l.hour.toString().padLeft(2, '0')}.${l.minute.toString().padLeft(2, '0')}';
    return '${l.day} ${mon[l.month - 1]} · $hm';
  }
}
