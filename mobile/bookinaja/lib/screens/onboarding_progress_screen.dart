import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../repositories/settings_repository.dart';
import '../theme.dart';
import '../state/async_value.dart';

/// Onboarding progress checklist — track setup tasks (payment, profile, etc).
/// Endpoint: GET /admin/tenant/onboarding-summary
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
        data: (progress) => _content(context, c, progress),
      ),
    );
  }

  Widget _content(BuildContext context, OnboardingProgressController c, OnboardingProgress progress) {
    final completed = progress.tasks.where((t) => t.completed).length;
    final total = progress.tasks.length;
    final percent = total > 0 ? (completed / total * 100).toStringAsFixed(0) : '0';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        // Progress header
        BKCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Setup Progress', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
                        const SizedBox(height: 6),
                        Text('$completed dari $total selesai', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
                      ],
                    ),
                  ),
                  Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: BK.accentSoft,
                      border: Border.all(color: BK.accent, width: 2),
                    ),
                    child: Center(
                      child: Text('$percent%', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: BK.accent)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  minHeight: 4,
                  value: total > 0 ? completed / total : 0,
                  backgroundColor: BK.line,
                  valueColor: const AlwaysStoppedAnimation<Color>(BK.live),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),

        // Tasks
        const Text('SETUP TASKS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
        const SizedBox(height: 8),
        for (final task in progress.tasks) ...[
          _taskCard(task),
          const SizedBox(height: 10),
        ],

        // Motivasi
        if (completed < total) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: BK.accentSoft,
              border: Border.all(color: BK.accent),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.lightbulb_outline, color: BK.accent, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Selesaikan setup agar tenant kamu siap operasional penuh.',
                    style: const TextStyle(fontSize: 12, color: BK.accent, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _taskCard(OnboardingTask task) {
    final icon = task.completed ? Icons.check_circle : Icons.radio_button_unchecked;
    final iconColor = task.completed ? BK.live : BK.ink3;
    final titleColor = task.completed ? BK.ink3 : BK.ink;
    final titleWeight = task.completed ? FontWeight.w500 : FontWeight.w700;

    return BKCard(
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(task.name, style: TextStyle(fontSize: 13.5, fontWeight: titleWeight, color: titleColor, decoration: task.completed ? TextDecoration.lineThrough : null)),
                Text(task.description, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
              ],
            ),
          ),
          if (!task.completed)
            const Icon(Icons.arrow_forward_ios, size: 16, color: BK.ink3),
        ],
      ),
    );
  }
}

// --- Models ---

class OnboardingProgress {
  final List<OnboardingTask> tasks;

  const OnboardingProgress({this.tasks = const []});

  factory OnboardingProgress.fromJson(Map json) {
    final rawTasks = json['tasks'] is List ? json['tasks'] as List : const [];
    final tasks = rawTasks
        .whereType<Map>()
        .map((e) => OnboardingTask.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return OnboardingProgress(tasks: tasks);
  }
}

class OnboardingTask {
  final String id;
  final String name;
  final String description;
  final bool completed;
  final String? actionUrl; // optional link untuk complete task

  const OnboardingTask({
    required this.id,
    required this.name,
    required this.description,
    this.completed = false,
    this.actionUrl,
  });

  factory OnboardingTask.fromJson(Map<String, dynamic> j) {
    return OnboardingTask(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      description: '${j['description'] ?? ''}',
      completed: j['completed'] == true,
      actionUrl: j['action_url'] is String ? j['action_url'] as String : null,
    );
  }
}

// --- Controller ---

class OnboardingProgressController extends ChangeNotifier {
  final SettingsRepository _repo;
  AsyncValue<OnboardingProgress> state = const AsyncValue.loading();

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
}

// --- UI Components ---

class LoadingList extends StatelessWidget {
  const LoadingList({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        const BKSkeleton(height: 100, radius: 12),
        const SizedBox(height: 12),
        for (int i = 0; i < 4; i++) ...[
          const BKSkeleton(height: 70, radius: 12),
          const SizedBox(height: 10),
        ]
      ],
    );
  }
}

class StateView extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String hint;
  final Widget? action;

  const StateView({super.key, required this.icon, required this.color, required this.title, required this.hint, this.action});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 48, color: color),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
          const SizedBox(height: 6),
          Text(hint, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: BK.ink3)),
          if (action != null) ...[
            const SizedBox(height: 16),
            action!,
          ]
        ],
      ),
    );
  }
}
