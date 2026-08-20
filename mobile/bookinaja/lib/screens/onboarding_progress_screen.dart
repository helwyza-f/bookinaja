import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../repositories/settings_repository.dart';
import '../state/async_value.dart';
import '../theme.dart';
import '../ui/toast.dart';
import 'business_branding_screen.dart';
import 'business_identity_screen.dart';
import 'payment_setup_wizard_screen.dart' show PaymentSetupWizardScreen;
import 'resources_screen.dart';

/// Setup Bisnis — gerbang menuju "tayang". Menampilkan langkah wajib/opsional
/// (actionable: tap membuka layar terkait), lalu tombol Terbitkan begitu semua
/// langkah wajib beres. Tenant hanya muncul ke customer setelah diterbitkan.
class OnboardingProgressScreen extends StatelessWidget {
  const OnboardingProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => OnboardingProgressController(ctx.read<SettingsRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<OnboardingProgressController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Setup Bisnis', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: c.state.when(
        loading: () => const LoadingList(),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded,
          color: BK.crit,
          title: 'Gagal memuat',
          hint: '$e',
          action: FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.accent),
            onPressed: c.load,
            child: const Text('Coba lagi'),
          ),
        ),
        data: (p) => _content(context, c, p),
      ),
    );
  }

  Widget _content(BuildContext context, OnboardingProgressController c, OnboardingProgress p) {
    final required = p.tasks.where((t) => t.required).toList();
    final optional = p.tasks.where((t) => !t.required).toList();

    Future<void> openThenReload(Widget? screen) async {
      if (screen == null) return;
      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
      await c.load();
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        _PublishCard(progress: p, controller: c),
        const SizedBox(height: 20),
        if (required.isNotEmpty) ...[
          _label('LANGKAH WAJIB'),
          const SizedBox(height: 8),
          for (final t in required) ...[
            _TaskCard(task: t, onTap: () => openThenReload(_screenFor(t.id))),
            const SizedBox(height: 10),
          ],
        ],
        if (optional.isNotEmpty) ...[
          const SizedBox(height: 8),
          _label('OPSIONAL'),
          const SizedBox(height: 8),
          for (final t in optional) ...[
            _TaskCard(task: t, onTap: () => openThenReload(_screenFor(t.id))),
            const SizedBox(height: 10),
          ],
        ],
      ],
    );
  }

  /// Peta langkah → layar mobile terkait (backend memberi id: identity /
  /// resources / payments / branding).
  Widget? _screenFor(String id) {
    switch (id) {
      case 'identity':
        return const BusinessIdentityScreen();
      case 'resources':
        return const ResourcesScreen();
      case 'payments':
        // Wizard menuntun langkah demi langkah (transfer/QRIS wajib, gateway
        // opsional) — sejalan dgn definisi kesiapan bayar di gerbang publikasi.
        return const PaymentSetupWizardScreen();
      case 'branding':
        return const BusinessBrandingScreen();
      default:
        return null;
    }
  }

  Widget _label(String t) => Text(t,
      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3));
}

/// Kartu status publikasi — tiga keadaan (tayang / siap terbit / belum siap).
class _PublishCard extends StatelessWidget {
  final OnboardingProgress progress;
  final OnboardingProgressController controller;
  const _PublishCard({required this.progress, required this.controller});

  @override
  Widget build(BuildContext context) {
    final required = progress.tasks.where((t) => t.required).toList();
    final doneRequired = required.where((t) => t.completed).length;
    final totalRequired = required.length;

    if (progress.isPublished) {
      return _shell(
        bg: BK.liveSoft,
        border: BK.live,
        icon: Icons.check_circle,
        iconColor: BK.live,
        title: 'Bisnismu tayang',
        titleColor: BK.live,
        body: 'Pelanggan bisa menemukan dan memesan bisnismu.',
        action: OutlinedButton(
          style: OutlinedButton.styleFrom(
            foregroundColor: BK.ink2,
            side: const BorderSide(color: BK.line),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          onPressed: controller.busy ? null : () => _confirmUnpublish(context),
          child: const Text('Sembunyikan dari customer', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
      );
    }

    if (progress.canPublish) {
      return _shell(
        bg: BK.accentSoft,
        border: BK.accent,
        icon: Icons.rocket_launch_outlined,
        iconColor: BK.accent,
        title: 'Siap terbit!',
        titleColor: BK.ink,
        body: 'Semua langkah wajib beres. Terbitkan agar bisnismu muncul ke pelanggan.',
        action: FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: BK.accent,
            padding: const EdgeInsets.symmetric(vertical: 13),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          onPressed: controller.busy ? null : () => _publish(context),
          child: controller.busy
              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Terbitkan bisnis', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
      );
    }

    // Belum siap: tampilkan progres langkah wajib.
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(BK.radius), border: Border.all(color: BK.line)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.storefront_outlined, color: BK.ink3, size: 24),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Belum tayang', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink)),
              const SizedBox(height: 2),
              Text('Lengkapi ${totalRequired - doneRequired} langkah wajib agar bisa diterbitkan.',
                  style: const TextStyle(fontSize: 12, color: BK.ink2, height: 1.35)),
            ]),
          ),
          Text('$doneRequired/$totalRequired', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: BK.ink3)),
        ]),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            minHeight: 5,
            value: totalRequired > 0 ? doneRequired / totalRequired : 0,
            backgroundColor: BK.line,
            valueColor: const AlwaysStoppedAnimation<Color>(BK.accent),
          ),
        ),
      ]),
    );
  }

  Future<void> _publish(BuildContext context) async {
    final err = await controller.publish();
    if (!context.mounted) return;
    if (err == null) {
      BkToast.success(context, 'Bisnis diterbitkan', subtitle: 'Sekarang tampil di sisi pelanggan.');
    } else {
      BkToast.error(context, 'Belum bisa diterbitkan', subtitle: err);
    }
  }

  Future<void> _confirmUnpublish(BuildContext context) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: BK.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sembunyikan bisnis?', style: TextStyle(fontWeight: FontWeight.w800, color: BK.ink, fontSize: 16)),
        content: const Text('Bisnismu tak akan muncul di direktori & tak bisa dipesan pelanggan sampai diterbitkan lagi.',
            style: TextStyle(fontSize: 13, color: BK.ink2, height: 1.4)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal', style: TextStyle(color: BK.ink2))),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.crit),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sembunyikan'),
          ),
        ],
      ),
    );
    if (yes != true || !context.mounted) return;
    final err = await controller.unpublish();
    if (!context.mounted) return;
    if (err == null) {
      BkToast.info(context, 'Bisnis disembunyikan');
    } else {
      BkToast.error(context, 'Gagal menyembunyikan', subtitle: err);
    }
  }

  Widget _shell({
    required Color bg,
    required Color border,
    required IconData icon,
    required Color iconColor,
    required String title,
    required Color titleColor,
    required String body,
    required Widget action,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(BK.radius), border: Border.all(color: border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: iconColor, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: titleColor)),
              const SizedBox(height: 2),
              Text(body, style: const TextStyle(fontSize: 12.5, color: BK.ink2, height: 1.4)),
            ]),
          ),
        ]),
        const SizedBox(height: 14),
        SizedBox(width: double.infinity, child: action),
      ]),
    );
  }
}

class _TaskCard extends StatelessWidget {
  final OnboardingTask task;
  final VoidCallback onTap;
  const _TaskCard({required this.task, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final done = task.completed;
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: onTap,
      child: BKCard(
        color: done ? BK.liveSoft : BK.card,
        border: done ? BK.live.withValues(alpha: 0.3) : BK.line,
        child: Row(children: [
          Container(
            width: 38, height: 38,
            decoration: BoxDecoration(shape: BoxShape.circle, color: done ? BK.live : BK.accentSoft),
            child: Icon(done ? Icons.check : Icons.chevron_right, color: done ? Colors.white : BK.accent, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(task.name,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: done ? BK.ink3 : BK.ink,
                    decoration: done ? TextDecoration.lineThrough : null,
                  )),
              const SizedBox(height: 2),
              Text(task.description, style: const TextStyle(fontSize: 11.5, color: BK.ink3, height: 1.3)),
            ]),
          ),
          const SizedBox(width: 6),
          Icon(done ? Icons.edit_outlined : Icons.arrow_forward_ios, size: 15, color: BK.ink3),
        ]),
      ),
    );
  }
}

// --- Models ---

class OnboardingProgress {
  final List<OnboardingTask> tasks;
  final bool isPublished;
  final bool canPublish;

  const OnboardingProgress({this.tasks = const [], this.isPublished = false, this.canPublish = false});

  /// Backend (tenant.TenantOnboardingSummary) mengirim `steps` + is_published +
  /// can_publish.
  factory OnboardingProgress.fromJson(Map json) {
    final raw = json['steps'] is List ? json['steps'] as List : const [];
    return OnboardingProgress(
      tasks: raw.whereType<Map>().map((e) => OnboardingTask.fromJson(Map<String, dynamic>.from(e))).toList(),
      isPublished: json['is_published'] == true,
      canPublish: json['can_publish'] == true,
    );
  }
}

class OnboardingTask {
  final String id;
  final String name;
  final String description;
  final bool completed;
  final bool required;

  const OnboardingTask({
    required this.id,
    required this.name,
    required this.description,
    this.completed = false,
    this.required = true,
  });

  /// Backend TenantOnboardingStep: {id, label, description, href, complete, required}.
  factory OnboardingTask.fromJson(Map<String, dynamic> j) {
    return OnboardingTask(
      id: '${j['id'] ?? ''}',
      name: '${j['label'] ?? ''}',
      description: '${j['description'] ?? ''}',
      completed: j['complete'] == true,
      required: j['required'] != false,
    );
  }
}

// --- Controller ---

class OnboardingProgressController extends ChangeNotifier {
  final SettingsRepository _repo;
  AsyncValue<OnboardingProgress> state = const AsyncValue.loading();
  bool busy = false;

  OnboardingProgressController(this._repo) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      final res = await _repo.getOnboardingProgress();
      state = AsyncValue.data(OnboardingProgress.fromJson(res));
    } catch (e) {
      state = AsyncValue.error(e.toString());
    }
    notifyListeners();
  }

  /// Terbitkan. Mengembalikan null bila sukses, atau pesan error (mis. setup
  /// belum lengkap) bila gagal.
  Future<String?> publish() async {
    busy = true;
    notifyListeners();
    String? err;
    try {
      await _repo.publishTenant();
      await _reloadSilently();
    } on ApiException catch (e) {
      err = e.message;
    } catch (e) {
      err = '$e';
    }
    busy = false;
    notifyListeners();
    return err;
  }

  Future<String?> unpublish() async {
    busy = true;
    notifyListeners();
    String? err;
    try {
      await _repo.unpublishTenant();
      await _reloadSilently();
    } on ApiException catch (e) {
      err = e.message;
    } catch (e) {
      err = '$e';
    }
    busy = false;
    notifyListeners();
    return err;
  }

  Future<void> _reloadSilently() async {
    try {
      final res = await _repo.getOnboardingProgress();
      state = AsyncValue.data(OnboardingProgress.fromJson(res));
    } catch (_) {}
  }
}
