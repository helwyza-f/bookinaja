import 'package:flutter/material.dart';

/// Anggota tim (staff) tenant. Bentuk dari backend `User`:
/// {id, name, email, role, role_id?, created_at}.
class StaffMember {
  final String id;
  final String name;
  final String email;
  final String role; // label peran (mis. "Kasir"), turunan dari role
  final String? roleId; // uuid peran; null = owner/tanpa peran khusus
  final DateTime? createdAt;

  const StaffMember({
    required this.id,
    required this.name,
    required this.email,
    this.role = '',
    this.roleId,
    this.createdAt,
  });

  factory StaffMember.fromJson(Map<String, dynamic> j) => StaffMember(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        email: '${j['email'] ?? ''}',
        role: '${j['role'] ?? ''}',
        roleId: (j['role_id'] == null || '${j['role_id']}'.isEmpty) ? null : '${j['role_id']}',
        createdAt: DateTime.tryParse('${j['created_at'] ?? ''}'),
      );

  String get initial => name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : '?';
}

/// Peran (role) tenant — kumpulan permission yang diberikan ke staff.
/// Backend `StaffRole`: {id, name, description, permission_keys[], is_default,...}.
class StaffRole {
  final String id;
  final String name;
  final String description;
  final List<String> permissionKeys;
  final bool isDefault;

  const StaffRole({
    required this.id,
    required this.name,
    this.description = '',
    this.permissionKeys = const [],
    this.isDefault = false,
  });

  factory StaffRole.fromJson(Map<String, dynamic> j) => StaffRole(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        description: '${j['description'] ?? ''}',
        permissionKeys: (j['permission_keys'] is List)
            ? (j['permission_keys'] as List).map((e) => '$e').toList()
            : const [],
        isDefault: j['is_default'] == true,
      );

  StaffRole copyWith({String? name, String? description, List<String>? permissionKeys, bool? isDefault}) =>
      StaffRole(
        id: id,
        name: name ?? this.name,
        description: description ?? this.description,
        permissionKeys: permissionKeys ?? this.permissionKeys,
        isDefault: isDefault ?? this.isDefault,
      );
}

/// Satu izin yang bisa dicentang di editor peran.
class PermissionDef {
  final String key;
  final String label;
  const PermissionDef(this.key, this.label);
}

/// Scope mode aplikasi tempat sekelompok izin relevan. Editor peran menyaring
/// grup sesuai mode workspace (booking_pos/booking_only/pos_only) supaya izin
/// yang tak berlaku tak muncul.
enum PermScope { booking, kasir, always }

/// Sekelompok izin dengan tema yang sama (untuk grouping di UI).
class PermissionGroup {
  final String title;
  final IconData icon;
  final List<PermissionDef> perms;
  final PermScope scope;
  const PermissionGroup(this.title, this.icon, this.perms, {this.scope = PermScope.always});
}

/// Katalog izin yang ditampilkan di editor peran. Sengaja tidak menyertakan
/// key legacy (bookings.write, pos.manage, dst.) — backend memperluas implikasi
/// sendiri. Sumber key: backend AllowedPermissionKeys.
const List<PermissionGroup> kPermissionCatalog = [
  PermissionGroup('Booking', Icons.event_note_outlined, [
    PermissionDef('bookings.read', 'Lihat booking'),
    PermissionDef('bookings.create', 'Buat booking'),
    PermissionDef('bookings.update', 'Ubah booking'),
    PermissionDef('bookings.confirm', 'Konfirmasi booking'),
    PermissionDef('bookings.cancel', 'Batalkan booking'),
    PermissionDef('bookings.delete', 'Hapus booking'),
  ], scope: PermScope.booking),
  PermissionGroup('Sesi', Icons.play_circle_outline, [
    PermissionDef('sessions.start', 'Mulai sesi'),
    PermissionDef('sessions.extend', 'Perpanjang sesi'),
    PermissionDef('sessions.complete', 'Selesaikan sesi'),
  ], scope: PermScope.booking),
  PermissionGroup('Kasir / POS', Icons.point_of_sale_outlined, [
    PermissionDef('pos.read', 'Lihat kasir'),
    PermissionDef('pos.order.add', 'Tambah item order'),
    PermissionDef('pos.checkout', 'Checkout / bayar'),
    PermissionDef('pos.cash.settle', 'Setor kas'),
  ], scope: PermScope.kasir),
  PermissionGroup('Resource', Icons.storefront_outlined, [
    PermissionDef('resources.read', 'Lihat resource'),
    PermissionDef('resources.create', 'Tambah resource'),
    PermissionDef('resources.update', 'Ubah resource'),
    PermissionDef('resources.delete', 'Hapus resource'),
  ], scope: PermScope.booking),
  PermissionGroup('Menu F&B', Icons.ramen_dining_outlined, [
    PermissionDef('fnb.read', 'Lihat menu'),
    PermissionDef('fnb.create', 'Tambah menu'),
    PermissionDef('fnb.update', 'Ubah menu'),
    PermissionDef('fnb.delete', 'Hapus menu'),
  ], scope: PermScope.kasir),
  PermissionGroup('Perangkat pintar', Icons.devices_other_outlined, [
    PermissionDef('devices.read', 'Lihat perangkat'),
    PermissionDef('devices.claim', 'Klaim perangkat'),
    PermissionDef('devices.assign', 'Tautkan ke resource'),
    PermissionDef('devices.control', 'Kontrol perangkat'),
    PermissionDef('devices.manage', 'Kelola perangkat'),
  ], scope: PermScope.booking),
  PermissionGroup('Pelanggan', Icons.people_outline, [
    PermissionDef('customers.read', 'Lihat pelanggan'),
  ], scope: PermScope.booking),
  PermissionGroup('Biaya operasional', Icons.payments_outlined, [
    PermissionDef('expenses.read', 'Lihat biaya'),
    PermissionDef('expenses.create', 'Catat biaya'),
    PermissionDef('expenses.update', 'Ubah biaya'),
    PermissionDef('expenses.delete', 'Hapus biaya'),
  ]),
  PermissionGroup('Laporan & nota', Icons.bar_chart, [
    PermissionDef('analytics.read', 'Lihat analitik'),
    PermissionDef('reports.read', 'Lihat laporan'),
    PermissionDef('receipts.print', 'Cetak nota'),
    PermissionDef('receipts.send', 'Kirim nota'),
  ]),
];

/// Katalog izin yang relevan untuk mode workspace. [booking]/[kasir] mengikuti
/// AuthController.bookingEnabled / kasirEnabled. Grup `always` selalu muncul.
List<PermissionGroup> permissionCatalogFor({required bool booking, required bool kasir}) {
  return kPermissionCatalog.where((g) {
    switch (g.scope) {
      case PermScope.booking:
        return booking;
      case PermScope.kasir:
        return kasir;
      case PermScope.always:
        return true;
    }
  }).toList();
}
