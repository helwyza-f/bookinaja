/// Kebijakan pembatalan per tenant (GET/PUT /admin/cancellation-settings).
class CancellationPolicy {
  final bool customerCancelEnabled;
  final int cutoffHours;
  final String refundMode; // forfeit | full
  final bool requireReason;
  final String allowedStatuses; // comma-separated

  const CancellationPolicy({
    required this.customerCancelEnabled,
    required this.cutoffHours,
    required this.refundMode,
    required this.requireReason,
    required this.allowedStatuses,
  });

  static const initial = CancellationPolicy(
    customerCancelEnabled: false,
    cutoffHours: 0,
    refundMode: 'forfeit',
    requireReason: false,
    allowedStatuses: 'pending,confirmed',
  );

  factory CancellationPolicy.fromJson(Map<String, dynamic> j) => CancellationPolicy(
        customerCancelEnabled: j['customer_cancel_enabled'] == true,
        cutoffHours: (j['cutoff_hours'] is num) ? (j['cutoff_hours'] as num).toInt() : 0,
        refundMode: '${j['refund_mode'] ?? 'forfeit'}',
        requireReason: j['require_reason'] == true,
        allowedStatuses: '${j['allowed_statuses'] ?? 'pending,confirmed'}',
      );

  Map<String, dynamic> toJson() => {
        'customer_cancel_enabled': customerCancelEnabled,
        'cutoff_hours': cutoffHours,
        'refund_mode': refundMode,
        'require_reason': requireReason,
        'allowed_statuses': allowedStatuses,
      };

  CancellationPolicy copyWith({
    bool? customerCancelEnabled,
    int? cutoffHours,
    String? refundMode,
    bool? requireReason,
    String? allowedStatuses,
  }) =>
      CancellationPolicy(
        customerCancelEnabled: customerCancelEnabled ?? this.customerCancelEnabled,
        cutoffHours: cutoffHours ?? this.cutoffHours,
        refundMode: refundMode ?? this.refundMode,
        requireReason: requireReason ?? this.requireReason,
        allowedStatuses: allowedStatuses ?? this.allowedStatuses,
      );
}
