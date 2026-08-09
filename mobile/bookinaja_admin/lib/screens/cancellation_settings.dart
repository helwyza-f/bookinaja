import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/cancellation_policy.dart';
import '../repositories/settings_repository.dart';
import '../state/settings_controller.dart';

/// Layar admin: atur kebijakan pembatalan per tenant.
class CancellationSettingsScreen extends StatelessWidget {
  const CancellationSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => CancellationSettingsController(ctx.read<SettingsRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<CancellationSettingsController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(backgroundColor: BK.bg, elevation: 0, title: const Text('Kebijakan Pembatalan', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink))),
      body: c.state.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e) => StateView(
          icon: Icons.wifi_off_rounded, color: BK.crit, title: 'Gagal memuat', hint: '$e',
          action: FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.accent), onPressed: c.load, child: const Text('Coba lagi')),
        ),
        data: (p) => _form(context, c, p),
      ),
      bottomNavigationBar: c.state.hasData
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                  onPressed: c.saving ? null : () async {
                    final ok = await c.save();
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(ok ? 'Kebijakan disimpan' : (c.error ?? 'Gagal menyimpan')),
                      behavior: SnackBarBehavior.floating, backgroundColor: ok ? BK.live : BK.crit,
                    ));
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

  Widget _form(BuildContext context, CancellationSettingsController c, CancellationPolicy p) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
      children: [
        BKCard(child: Column(children: [
          _switchRow('Izinkan customer batalkan sendiri', 'Kalau mati, hanya admin yang bisa membatalkan.',
              p.customerCancelEnabled, (v) => c.edit(p.copyWith(customerCancelEnabled: v))),
        ])),
        const SizedBox(height: 11),

        const Text('BATAS WAKTU', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
        const SizedBox(height: 8),
        BKCard(child: Row(children: [
          const Expanded(child: Text('Tak bisa cancel jika kurang dari …', style: TextStyle(fontSize: 13.5, color: BK.ink))),
          _stepBtn(Icons.remove, () => c.edit(p.copyWith(cutoffHours: (p.cutoffHours - 1).clamp(0, 168)))),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('${p.cutoffHours} jam', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: BK.ink))),
          _stepBtn(Icons.add, () => c.edit(p.copyWith(cutoffHours: (p.cutoffHours + 1).clamp(0, 168)))),
        ])),
        Padding(padding: const EdgeInsets.only(top: 6, left: 4), child: Text(p.cutoffHours == 0 ? 'Bisa dibatalkan kapan saja.' : 'Contoh: 24 = tak bisa cancel < 24 jam sebelum mulai.', style: const TextStyle(fontSize: 11.5, color: BK.ink3))),
        const SizedBox(height: 16),

        const Text('REFUND DP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
        const SizedBox(height: 8),
        Row(children: [
          _refundOpt('DP hangus', 'forfeit', p.refundMode == 'forfeit', () => c.edit(p.copyWith(refundMode: 'forfeit'))),
          const SizedBox(width: 10),
          _refundOpt('DP kembali penuh', 'full', p.refundMode == 'full', () => c.edit(p.copyWith(refundMode: 'full'))),
        ]),
        const SizedBox(height: 16),

        BKCard(child: _switchRow('Wajib isi alasan pembatalan', 'Customer harus tulis alasan saat membatalkan.',
            p.requireReason, (v) => c.edit(p.copyWith(requireReason: v)))),
        const SizedBox(height: 14),

        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(12), border: Border.all(color: BK.line)),
          child: const Row(children: [
            Icon(Icons.info_outline, size: 18, color: BK.ink3),
            SizedBox(width: 9),
            Expanded(child: Text('Hanya booking pending/terkonfirmasi yang bisa dibatalkan. Sesi yang sudah berjalan harus diakhiri.', style: TextStyle(fontSize: 12, color: BK.ink2))),
          ]),
        ),
      ],
    );
  }

  Widget _switchRow(String title, String sub, bool value, ValueChanged<bool> onChanged) => Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
          const SizedBox(height: 2),
          Text(sub, style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
        ])),
        const SizedBox(width: 10),
        Switch(value: value, activeThumbColor: BK.accent, onChanged: onChanged),
      ]);

  Widget _refundOpt(String label, String val, bool on, VoidCallback onTap) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
            decoration: BoxDecoration(color: on ? BK.accentSoft : BK.card, borderRadius: BorderRadius.circular(13), border: Border.all(color: on ? BK.accent : BK.line)),
            child: Row(children: [
              Icon(on ? Icons.radio_button_checked : Icons.radio_button_unchecked, size: 18, color: on ? BK.accent : BK.ink3),
              const SizedBox(width: 8),
              Expanded(child: Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: on ? BK.accent : BK.ink2))),
            ]),
          ),
        ),
      );

  Widget _stepBtn(IconData i, VoidCallback onTap) => InkWell(
        onTap: onTap, borderRadius: BorderRadius.circular(10),
        child: Container(width: 38, height: 38, decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(10), border: Border.all(color: BK.line)), child: Icon(i, size: 18, color: BK.ink)),
      );
}
