import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../models/staff.dart';
import '../repositories/settings_repository.dart';

/// State layar Staff & akses — memuat staff + peran sekaligus (keduanya dipakai
/// bersamaan: kartu staff menampilkan peran, form staff memilih peran).
class StaffController extends ChangeNotifier {
  final SettingsRepository _repo;
  StaffController(this._repo) {
    load();
  }

  bool loading = true;
  bool busy = false; // aksi tulis sedang berjalan
  String? error;
  bool locked = false; // 403 → fitur tak tersedia di paket ini

  List<StaffMember> staff = const [];
  List<StaffRole> roles = const [];

  StaffRole? roleById(String? id) {
    if (id == null) return null;
    for (final r in roles) {
      if (r.id == id) return r;
    }
    return null;
  }

  Future<void> load() async {
    loading = true;
    error = null;
    locked = false;
    notifyListeners();
    try {
      final results = await Future.wait([_repo.getStaff(), _repo.getRoles()]);
      staff = results[0] as List<StaffMember>;
      roles = results[1] as List<StaffRole>;
    } on ApiException catch (e) {
      if (e.statusCode == 403) {
        locked = true;
      } else {
        error = e.message;
      }
    } catch (e) {
      error = '$e';
    }
    loading = false;
    notifyListeners();
  }

  /// Bungkus aksi tulis: set busy, jalankan, reload senyap. Mengembalikan null
  /// bila sukses atau pesan error bila gagal (untuk toast di UI).
  Future<String?> _run(Future<void> Function() action) async {
    busy = true;
    notifyListeners();
    String? err;
    try {
      await action();
      await _reloadSilent();
    } on ApiException catch (e) {
      err = e.message;
    } catch (e) {
      err = '$e';
    }
    busy = false;
    notifyListeners();
    return err;
  }

  Future<void> _reloadSilent() async {
    try {
      final results = await Future.wait([_repo.getStaff(), _repo.getRoles()]);
      staff = results[0] as List<StaffMember>;
      roles = results[1] as List<StaffRole>;
    } catch (_) {}
  }

  Future<String?> createStaff({
    required String name,
    required String email,
    required String password,
    required String roleId,
  }) =>
      _run(() => _repo.createStaff(name: name, email: email, password: password, roleId: roleId));

  Future<String?> updateStaff({
    required String id,
    required String name,
    required String email,
    required String roleId,
  }) =>
      _run(() => _repo.updateStaff(id: id, name: name, email: email, roleId: roleId));

  Future<String?> deleteStaff(String id) => _run(() => _repo.deleteStaff(id));

  Future<String?> saveRole(StaffRole r) =>
      _run(() => r.id.isEmpty ? _repo.createRole(r) : _repo.updateRole(r));

  Future<String?> deleteRole(String id) => _run(() => _repo.deleteRole(id));
}
