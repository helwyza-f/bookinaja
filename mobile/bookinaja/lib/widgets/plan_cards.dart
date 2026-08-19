import 'package:flutter/material.dart';

import '../models/subscription.dart';
import '../theme.dart';

/// Toggle interval bulanan / tahunan (badge hemat pada tahunan).
class IntervalToggle extends StatelessWidget {
  final BillingInterval value;
  final ValueChanged<BillingInterval> onChanged;
  const IntervalToggle({super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final saving = annualSavingsPercent();
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: BK.line, borderRadius: BorderRadius.circular(10)),
      child: Row(children: [
        _seg('Bulanan', BillingInterval.monthly),
        _seg(saving > 0 ? 'Tahunan · hemat $saving%' : 'Tahunan', BillingInterval.annual),
      ]),
    );
  }

  Widget _seg(String label, BillingInterval interval) {
    final active = value == interval;
    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(interval),
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active ? BK.card : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: active ? FontWeight.w700 : FontWeight.w500,
              color: active ? BK.ink : BK.ink3,
            ),
          ),
        ),
      ),
    );
  }
}

/// Daftar kartu paket Starter & Pro (Pro disorot). CTA per paket memanggil
/// [onSelect] dengan key paket. [busyPlan] menandai paket yang sedang diproses.
/// [primaryStyle] = tombol solid untuk paket yang dipilih (dipakai di paywall).
class PlanCards extends StatelessWidget {
  final BillingInterval interval;
  final ValueChanged<String> onSelect;
  final String? busyPlan;
  final String selectCtaPrefix; // "Pilih" | "Upgrade"
  const PlanCards({
    super.key,
    required this.interval,
    required this.onSelect,
    this.busyPlan,
    this.selectCtaPrefix = 'Pilih',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final p in kSellablePlans) ...[
          _card(p),
          const SizedBox(height: 10),
        ],
      ],
    );
  }

  Widget _card(PlanDef p) {
    final rec = p.recommended;
    final busy = busyPlan == p.key;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: BK.card,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: rec ? BK.accent : BK.line, width: rec ? 2 : 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Text(p.name,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink)),
                  ),
                  Text('Rp${rupiah(p.monthlyDisplay(interval))}',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink)),
                  const Text('/bln', style: TextStyle(fontSize: 11, color: BK.ink3)),
                ],
              ),
              if (interval.isAnnual) ...[
                const SizedBox(height: 2),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text('Ditagih Rp${rupiah(p.annual)}/tahun',
                      style: const TextStyle(fontSize: 11, color: BK.ink3)),
                ),
              ],
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                runSpacing: 4,
                children: [
                  for (final h in p.highlights)
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.check, size: 13, color: BK.live),
                      const SizedBox(width: 3),
                      Text(h, style: const TextStyle(fontSize: 11.5, color: BK.ink2)),
                    ]),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: rec
                    ? FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: BK.accent,
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: busy ? null : () => onSelect(p.key),
                        child: busy
                            ? const _BtnSpinner(color: Colors.white)
                            : Text('$selectCtaPrefix ${p.name}',
                                style: const TextStyle(fontWeight: FontWeight.w700)),
                      )
                    : OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: BK.ink,
                          backgroundColor: BK.card2,
                          side: const BorderSide(color: BK.line),
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: busy ? null : () => onSelect(p.key),
                        child: busy
                            ? const _BtnSpinner(color: BK.ink)
                            : Text('$selectCtaPrefix ${p.name}',
                                style: const TextStyle(fontWeight: FontWeight.w700)),
                      ),
              ),
            ],
          ),
        ),
        if (rec)
          Positioned(
            top: -9,
            left: 13,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(6)),
              child: const Text('Paling masuk akal',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: BK.accent)),
            ),
          ),
      ],
    );
  }
}

/// Baris "Scale — konsultasi" (paket enterprise, tak dijual langsung).
class ScaleConsultRow extends StatelessWidget {
  final VoidCallback onTap;
  const ScaleConsultRow({super.key, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: BKCard(
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
              Text('Scale', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: BK.ink)),
              Text('Membership & loyalty', style: TextStyle(fontSize: 11, color: BK.ink3)),
            ]),
          ),
          const Text('Konsultasi', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: BK.accent)),
          const SizedBox(width: 4),
          const Icon(Icons.open_in_new, size: 15, color: BK.accent),
        ]),
      ),
    );
  }
}

class _BtnSpinner extends StatelessWidget {
  final Color color;
  const _BtnSpinner({required this.color});
  @override
  Widget build(BuildContext context) => SizedBox(
        height: 18,
        width: 18,
        child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(color)),
      );
}
