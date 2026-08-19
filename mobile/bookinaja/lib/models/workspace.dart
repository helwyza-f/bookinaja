import 'subscription_view.dart';

/// Workspace (bisnis) yang bisa diakses account. Dipilih setelah login.
class Workspace {
  final String id;
  final String slug;
  final String name;
  final String role;
  final String plan;
  final String status;
  // Fase grace (0 aktif | 1 soft | 2 friksi | 3 lock) & akhir masa — dari
  // tenants (server), untuk badge langganan di picker.
  final int gracePhase;
  final DateTime? periodEnd;

  const Workspace({
    required this.id,
    required this.slug,
    required this.name,
    required this.role,
    required this.plan,
    required this.status,
    this.gracePhase = 0,
    this.periodEnd,
  });

  factory Workspace.fromJson(Map<String, dynamic> j) => Workspace(
        id: '${j['id'] ?? ''}',
        slug: '${j['slug'] ?? ''}',
        name: '${j['name'] ?? j['slug'] ?? 'Workspace'}',
        role: '${j['role'] ?? 'staff'}',
        plan: '${j['plan'] ?? ''}',
        status: '${j['subscription_status'] ?? j['status'] ?? ''}',
        gracePhase: (j['grace_phase'] is num) ? (j['grace_phase'] as num).toInt() : 0,
        periodEnd: (j['subscription_period_end'] is String && (j['subscription_period_end'] as String).isNotEmpty)
            ? DateTime.tryParse(j['subscription_period_end'] as String)
            : null,
      );

  int? get _trialDaysLeft {
    if (status.toLowerCase() != 'trial' || periodEnd == null) return null;
    final d = periodEnd!.difference(DateTime.now()).inDays;
    return d < 0 ? 0 : d;
  }

  /// Deskriptor langganan untuk badge picker — sumber label/warna yang sama
  /// dengan hero di hub Lainnya.
  SubView get subView => SubView.of(
        grace: gracePhase != 0,
        status: status,
        plan: plan,
        trialDaysLeft: _trialDaysLeft,
        periodEnd: periodEnd,
        gracePhase: gracePhase,
      );
}
