class RealtimeEvent {
  final String type;
  final String? tenantId;
  final String? channel;
  final String? entityType;
  final String? entityId;
  final DateTime? occurredAt;
  final int? version;
  final Map<String, dynamic> summary;
  final Map<String, dynamic> refs;
  final Map<String, dynamic> meta;

  const RealtimeEvent({
    required this.type,
    this.tenantId,
    this.channel,
    this.entityType,
    this.entityId,
    this.occurredAt,
    this.version,
    this.summary = const {},
    this.refs = const {},
    this.meta = const {},
  });

  factory RealtimeEvent.fromJson(Map<String, dynamic> j) {
    Map<String, dynamic> mapOf(dynamic v) {
      if (v is Map) return Map<String, dynamic>.from(v);
      return const {};
    }

    return RealtimeEvent(
      type: '${j['type'] ?? ''}',
      tenantId: '${j['tenant_id'] ?? ''}',
      channel: '${j['channel'] ?? ''}',
      entityType: '${j['entity_type'] ?? ''}',
      entityId: '${j['entity_id'] ?? ''}',
      occurredAt: DateTime.tryParse('${j['occurred_at'] ?? ''}'),
      version: j['version'] is num ? (j['version'] as num).toInt() : int.tryParse('${j['version'] ?? ''}'),
      summary: mapOf(j['summary']),
      refs: mapOf(j['refs']),
      meta: mapOf(j['meta']),
    );
  }
}
