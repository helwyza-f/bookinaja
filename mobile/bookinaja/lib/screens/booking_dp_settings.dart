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
              const Text('MODE DP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
              const SizedBox(height: 10),
              _modeOption('Nonaktif', 'off', p.mode == 'off', () => c.edit(p.copyWith(mode: 'off'))),
              const SizedBox(height: 10),
              _modeOption('Persentase dari harga', 'percentage', p.mode == 'percentage', () => c.edit(p.copyWith(mode: 'percentage'))),
              const SizedBox(height: 10),
              _modeOption('Nominal tetap', 'fixed', p.mode == 'fixed', () => c.edit(p.copyWith(mode: 'fixed'))),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Input DP value (hanya tampil kalau mode aktif)
        if (p.mode != 'off') ...[
          BKCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.mode == 'percentage' ? 'PERSENTASE' : 'NOMINAL',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: TextEditingController(text: '${p.value}'),
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: p.mode == 'percentage' ? '0-100' : '0',
                          hintStyle: const TextStyle(color: BK.ink3),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        onChanged: (v) {
                          final val = int.tryParse(v) ?? 0;
                          c.edit(p.copyWith(value: val.clamp(0, p.mode == 'percentage' ? 100 : 999999999)));
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      p.mode == 'percentage' ? '%' : 'Rp',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: BK.ink),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  p.mode == 'percentage'
                      ? 'Customer bayar ${p.value}% dari harga resource saat booking.'
                      : 'Customer bayar Rp${(p.value).toStringAsFixed(0)} sebagai DP untuk setiap booking.',
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(children: [
                Icon(Icons.info_outline, size: 16, color: BK.accent),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'DP ditampilkan di halaman booking customer. Sisa pembayaran dibayar saat kedatangan atau sesuai policy.',
                    style: TextStyle(fontSize: 12, color: BK.ink2, height: 1.4),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              const Text('Tip: Override per-resource ada di detail resource (advanced).', style: TextStyle(fontSize: 11, color: BK.ink3, fontStyle: FontStyle.italic)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _modeOption(String label, String mode, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? BK.accentSoft : BK.card2,
          border: Border.all(color: selected ? BK.accent : BK.line),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Icon(
              selected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              size: 20,
              color: selected ? BK.accent : BK.ink3,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(label, style: TextStyle(fontSize: 13.5, color: selected ? BK.accent : BK.ink, fontWeight: selected ? FontWeight.w700 : FontWeight.w500)),
            ),
          ],
        ),
      ),
    );
  }
}

// --- Controller ---

class BookingDpPolicy {
  final String mode; // off | percentage | fixed
  final int value; // persentase (0-100) atau nominal (Rp)

  const BookingDpPolicy({
    this.mode = 'off',
    this.value = 0,
  });

  BookingDpPolicy copyWith({String? mode, int? value}) {
    return BookingDpPolicy(
      mode: mode ?? this.mode,
      value: value ?? this.value,
    );
  }

  factory BookingDpPolicy.fromJson(Map json) {
    final m = '${json['dp_mode'] ?? 'off'}'.toLowerCase();
    return BookingDpPolicy(
      mode: m,
      value: (json['dp_value'] is num) ? (json['dp_value'] as num).toInt() : 0,
    );
  }

  Map toJson() => {
        'dp_mode': mode,
        'dp_value': value,
      };
}

class BookingDpSettingsController extends ChangeNotifier {
  final SettingsRepository _repo;
  AsyncValue<BookingDpPolicy> state = const AsyncValue.loading();
  BookingDpPolicy _policy = const BookingDpPolicy();
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
      await _repo.saveBookingDpPolicy(_policy.toJson());
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
