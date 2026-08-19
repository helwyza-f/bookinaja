import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme.dart';
import '../ui/toast.dart';
import '../repositories/settings_repository.dart';
import '../state/async_value.dart';

/// Pengaturan DP (Down Payment) global untuk booking — persentase atau nominal
/// yang wajib dibayar customer saat booking. Hanya tampil saat booking aktif.
class BookingDpSettingsScreen extends StatelessWidget {
  const BookingDpSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => BookingDpSettingsController(ctx.read<SettingsRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<BookingDpSettingsController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Kebijakan DP', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
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
        data: (policy) => _form(context, c, policy),
      ),
      bottomNavigationBar: c.state.hasData
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                  onPressed: c.saving
                      ? null
                      : () async {
                          final ok = await c.save();
                          if (!context.mounted) return;
                          if (ok) {
                            BkToast.success(context, 'Kebijakan DP disimpan');
                          } else {
                            BkToast.error(context, c.error ?? 'Gagal menyimpan');
                          }
                        },
                  child: c.saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Simpan', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            )
          : null,
    );
  }

  Widget _form(BuildContext context, BookingDpSettingsController c, BookingDpPolicy p) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
      children: [
        BKCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Aktifkan DP', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
                        SizedBox(height: 2),
                        Text('Customer bayar % dari harga saat booking',
                            style: TextStyle(fontSize: 11.5, color: BK.ink3)),
                      ],
                    ),
                  ),
                  Transform.scale(
                    scale: 0.85,
                    child: Switch(
                      value: p.dpEnabled,
                      activeThumbColor: BK.live,
                      onChanged: (v) => c.edit(p.copyWith(dpEnabled: v)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Percentage input (hanya tampil kalau enabled)
        if (p.dpEnabled) ...[
          BKCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('PERSENTASE DP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: TextEditingController(text: p.dpPercentage == 0 ? '' : p.dpPercentage.toStringAsFixed(0)),
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: '0-100',
                          hintStyle: const TextStyle(color: BK.ink3),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        onChanged: (v) {
                          final val = double.tryParse(v) ?? 0;
                          c.edit(p.copyWith(dpPercentage: val.clamp(0, 100)));
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text('%', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: BK.ink)),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Customer wajib bayar ${p.dpPercentage.toStringAsFixed(0)}% dari harga booking sebagai DP.',
                  style: const TextStyle(fontSize: 11.5, color: BK.ink3, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Info card
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(12), border: Border.all(color: BK.line)),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Icon(Icons.info_outline, size: 16, color: BK.accent),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'DP global berlaku untuk semua resource. Override per-resource tersedia di advanced settings resource detail.',
                    style: TextStyle(fontSize: 12, color: BK.ink2, height: 1.4),
                  ),
                ),
              ]),
            ],
          ),
        ),
      ],
    );
  }

}

// --- Controller ---

/// Global DP policy dari backend (/deposit-settings).
/// dp_enabled: true jika DP wajib, false = nonaktif.
/// dp_percentage: % dari harga resource yang harus dibayar sebagai DP.
class BookingDpPolicy {
  final bool dpEnabled;
  final double dpPercentage; // 0-100
  final List<ResourceDpOverride> resourceConfigs;

  const BookingDpPolicy({
    this.dpEnabled = false,
    this.dpPercentage = 0,
    this.resourceConfigs = const [],
  });

  BookingDpPolicy copyWith({bool? dpEnabled, double? dpPercentage, List<ResourceDpOverride>? resourceConfigs}) {
    return BookingDpPolicy(
      dpEnabled: dpEnabled ?? this.dpEnabled,
      dpPercentage: dpPercentage ?? this.dpPercentage,
      resourceConfigs: resourceConfigs ?? this.resourceConfigs,
    );
  }

  factory BookingDpPolicy.fromJson(Map json) {
    final configs = (json['resource_configs'] is List)
        ? (json['resource_configs'] as List).whereType<Map>().map((e) => ResourceDpOverride.fromJson(Map<String, dynamic>.from(e))).toList()
        : <ResourceDpOverride>[];
    return BookingDpPolicy(
      dpEnabled: json['dp_enabled'] == true,
      dpPercentage: (json['dp_percentage'] is num) ? (json['dp_percentage'] as num).toDouble() : 0,
      resourceConfigs: configs,
    );
  }

  Map toJson() => {
        'dp_enabled': dpEnabled,
        'dp_percentage': dpPercentage,
        'resource_configs': resourceConfigs.map((e) => e.toJson()).toList(),
      };
}

/// Per-resource DP override (optional).
class ResourceDpOverride {
  final String resourceId;
  final bool overrideDp;
  final bool dpEnabled;
  final double dpPercentage;

  const ResourceDpOverride({
    required this.resourceId,
    this.overrideDp = false,
    this.dpEnabled = false,
    this.dpPercentage = 0,
  });

  factory ResourceDpOverride.fromJson(Map<String, dynamic> json) {
    return ResourceDpOverride(
      resourceId: '${json['resource_id'] ?? ''}',
      overrideDp: json['override_dp'] == true,
      dpEnabled: json['dp_enabled'] == true,
      dpPercentage: (json['dp_percentage'] is num) ? (json['dp_percentage'] as num).toDouble() : 0,
    );
  }

  Map toJson() => {
        'resource_id': resourceId,
        'override_dp': overrideDp,
        'dp_enabled': dpEnabled,
        'dp_percentage': dpPercentage,
      };
}

class BookingDpSettingsController extends ChangeNotifier {
  final SettingsRepository _repo;
  AsyncValue<BookingDpPolicy> state = const AsyncValue.loading();
  BookingDpPolicy _policy = const BookingDpPolicy(dpEnabled: false, dpPercentage: 0);
  bool saving = false;
  String? error;

  BookingDpSettingsController(this._repo) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      final data = await _repo.getBookingDpPolicy();
      _policy = BookingDpPolicy.fromJson(data is Map ? data : {});
      state = AsyncValue.data(_policy);
    } catch (e) {
      state = AsyncValue.error(e.toString());
    }
    notifyListeners();
  }

  void edit(BookingDpPolicy policy) {
    _policy = policy;
    state = AsyncValue.data(policy);
    notifyListeners();
  }

  Future<bool> save() async {
    saving = true;
    error = null;
    notifyListeners();
    try {
      final json = Map<String, dynamic>.from(_policy.toJson());
      await _repo.saveBookingDpPolicy(json);
      saving = false;
      notifyListeners();
      return true;
    } catch (e) {
      error = '$e';
      saving = false;
      notifyListeners();
      return false;
    }
  }
}

// --- UI Components (reuse dari existing) ---

class LoadingList extends StatelessWidget {
  const LoadingList({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        for (int i = 0; i < 3; i++) ...[
          const BKSkeleton(height: 100, radius: 12),
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
