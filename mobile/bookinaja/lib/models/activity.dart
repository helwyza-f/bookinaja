import 'package:flutter/material.dart';

/// Satu entri log aktivitas tenant (tenant_audit_logs). Menampilkan siapa
/// (actor) melakukan aksi apa & kapan — untuk akuntabilitas staff.
class ActivityEntry {
  final String action;
  final String actorName;
  final String actorEmail;
  final String resourceType;
  final DateTime? createdAt;

  const ActivityEntry({
    required this.action,
    this.actorName = '',
    this.actorEmail = '',
    this.resourceType = '',
    this.createdAt,
  });

  factory ActivityEntry.fromJson(Map<String, dynamic> j) => ActivityEntry(
        action: '${j['action'] ?? ''}',
        actorName: '${j['actor_name'] ?? ''}',
        actorEmail: '${j['actor_email'] ?? ''}',
        resourceType: '${j['resource_type'] ?? ''}',
        createdAt: DateTime.tryParse('${j['created_at'] ?? ''}'),
      );

  /// Label aksi manusiawi (Indonesia). Fallback: ubah snake_case jadi kalimat.
  String get label {
    const map = {
      // Area owner
      'create_staff': 'Menambah staff',
      'update_staff': 'Mengubah staff',
      'delete_staff': 'Menghapus staff',
      'create_role': 'Membuat peran',
      'update_role': 'Mengubah peran',
      'delete_role': 'Menghapus peran',
      'update_profile': 'Mengubah profil bisnis',
      'publish_tenant': 'Menerbitkan bisnis',
      'unpublish_tenant': 'Menyembunyikan bisnis',
      'update_payment_methods': 'Mengubah metode pembayaran',
      'update_settings': 'Mengubah pengaturan',
      // Booking (operasional)
      'booking_confirmed': 'Mengonfirmasi booking',
      'booking_active': 'Memulai sesi',
      'booking_completed': 'Menyelesaikan sesi',
      'booking_cancelled': 'Membatalkan booking',
      'booking_no_show': 'Menandai tidak hadir',
      'booking_rescheduled': 'Menjadwalkan ulang booking',
      'booking_deposit_recorded': 'Mencatat DP booking',
      'booking_deposit_override': 'Override DP booking',
      // Kasir & biaya
      'pos_order_created': 'Membuat order kasir',
      'expense_created': 'Mencatat biaya',
      'expense_updated': 'Mengubah biaya',
      'expense_deleted': 'Menghapus biaya',
    };
    final m = map[action];
    if (m != null) return m;
    return action.replaceAll('_', ' ').trim();
  }

  IconData get icon {
    if (action.contains('staff')) return Icons.person_outline;
    if (action.contains('role')) return Icons.shield_outlined;
    if (action.contains('publish')) return Icons.rocket_launch_outlined;
    if (action.contains('payment')) return Icons.account_balance_wallet_outlined;
    if (action.contains('profile') || action.contains('settings')) return Icons.tune;
    if (action.startsWith('booking')) return Icons.event_note_outlined;
    if (action.startsWith('pos')) return Icons.point_of_sale_outlined;
    if (action.startsWith('expense')) return Icons.payments_outlined;
    return Icons.history;
  }

  String get actor => actorName.isNotEmpty ? actorName : (actorEmail.isNotEmpty ? actorEmail : 'Sistem');
}
