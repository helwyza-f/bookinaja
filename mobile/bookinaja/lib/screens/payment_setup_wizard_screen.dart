import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../repositories/settings_repository.dart';
import '../theme.dart';
import '../state/async_value.dart';
import 'payment_gateway_settings.dart';
import 'payment_methods_settings.dart';

/// Payment setup wizard — progress tracking untuk konfigurasi payment.
/// Endpoint: GET /admin/payment-setup/status
class PaymentSetupWizardScreen extends StatelessWidget {
  const PaymentSetupWizardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => PaymentSetupWizardController(ctx.read<SettingsRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<PaymentSetupWizardController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Setup Pembayaran', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
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
        data: (status) => _content(context, c, status),
      ),
    );
  }

  Widget _content(BuildContext context, PaymentSetupWizardController c, PaymentSetupStatus status) {
    // Kesiapan = ada minimal satu jalur online aktif. Jalur WAJIB (baseline)
    // adalah metode manual (transfer/QRIS) dgn verifikasi manual; payment
    // gateway otomatis adalah OPSIONAL (fitur lanjutan), bukan syarat.
    final ready = status.isReady;

    Future<void> openThenReload(Widget screen) async {
      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
      await c.load(); // auto-refresh progres begitu balik dari layar setting
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        // Hero kesiapan (bukan lagi "X/3" — gateway tak dihitung sbg syarat).
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: ready ? BK.liveSoft : BK.accentSoft,
            border: Border.all(color: ready ? BK.live : BK.accent),
            borderRadius: BorderRadius.circular(BK.radius),
          ),
          child: Row(children: [
            Icon(ready ? Icons.check_circle : Icons.storefront_outlined,
                color: ready ? BK.live : BK.accent, size: 30),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(ready ? 'Siap terima pembayaran online' : 'Belum bisa terima pembayaran online',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: ready ? BK.live : BK.ink)),
                const SizedBox(height: 3),
                Text(
                  ready
                      ? 'Pelanggan bisa bayar transfer atau QRIS, lalu kamu verifikasi manual.'
                      : 'Aktifkan minimal satu metode pembayaran di bawah.',
                  style: const TextStyle(fontSize: 12, color: BK.ink2, height: 1.4),
                ),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 20),

        _label('WAJIB'),
        const SizedBox(height: 8),
        _stepCard(
          icon: Icons.account_balance_wallet_outlined,
          title: 'Aktifkan transfer / QRIS',
          description: 'Pelanggan transfer atau scan QR, kamu konfirmasi manual. Cukup ini untuk mulai terima pembayaran online.',
          completed: status.hasPaymentMethod,
          onTap: () => openThenReload(const PaymentMethodsSettingsScreen()),
        ),
        const SizedBox(height: 20),

        _label('OPSIONAL · VERIFIKASI OTOMATIS'),
        const SizedBox(height: 8),
        _stepCard(
          icon: Icons.bolt_outlined,
          title: 'Payment gateway otomatis',
          description: 'Midtrans / Xendit memverifikasi pembayaran otomatis, tanpa cek manual. Fitur lanjutan (Pro).',
          completed: status.hasGateway,
          optional: true,
          onTap: () => openThenReload(const PaymentGatewaySettingsScreen()),
        ),
      ],
    );
  }

  Widget _label(String t) => Text(t,
      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3));

  Widget _stepCard({
    required IconData icon,
    required String title,
    required String description,
    required bool completed,
    bool optional = false,
    VoidCallback? onTap,
  }) {
    final accent = optional ? BK.ink2 : BK.accent;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: completed ? BK.liveSoft : BK.card,
          border: Border.all(color: completed ? BK.live : BK.line, width: 1.2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: completed ? BK.live : (optional ? BK.card2 : BK.accentSoft),
            ),
            child: Icon(completed ? Icons.check : icon, color: completed ? Colors.white : accent, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(child: Text(title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink))),
                if (optional && !completed) ...[
                  const SizedBox(width: 6),
                  Pill.mut('Opsional'),
                ],
              ]),
              const SizedBox(height: 2),
              Text(description, style: const TextStyle(fontSize: 11.5, color: BK.ink3, height: 1.35)),
            ]),
          ),
          const SizedBox(width: 6),
          Icon(completed ? Icons.edit_outlined : Icons.arrow_forward_ios, size: 15, color: BK.ink3),
        ]),
      ),
    );
  }
}

// --- Models ---

class PaymentSetupStatus {
  final bool hasGateway; // gateway BYO (Midtrans/Xendit) siap dipakai
  final bool hasPaymentMethod; // ≥1 metode manual (transfer/QRIS) siap dipakai
  final bool isReady; // minimal satu jalur pembayaran online aktif

  const PaymentSetupStatus({
    this.hasGateway = false,
    this.hasPaymentMethod = false,
    this.isReady = false,
  });

  /// Dipetakan dari kontrak backend (tenant.PaymentSetupStatus):
  ///   gateway_usable / manual_usable / has_online.
  factory PaymentSetupStatus.fromJson(Map json) {
    return PaymentSetupStatus(
      hasGateway: json['gateway_usable'] == true,
      hasPaymentMethod: json['manual_usable'] == true,
      isReady: json['has_online'] == true,
    );
  }
}

// --- Controller ---

class PaymentSetupWizardController extends ChangeNotifier {
  final SettingsRepository _repo;
  AsyncValue<PaymentSetupStatus> state = const AsyncValue.loading();

  PaymentSetupWizardController(this._repo) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    notifyListeners();
    try {
      final res = await _repo.getPaymentSetupStatus();
      state = AsyncValue.data(PaymentSetupStatus.fromJson(res));
    } catch (e) {
      state = AsyncValue.error(e.toString());
    }
    notifyListeners();
  }
}

// --- UI Components ---

class LoadingList extends StatelessWidget {
  const LoadingList({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        const BKSkeleton(height: 80, radius: 12),
        const SizedBox(height: 12),
        for (int i = 0; i < 3; i++) ...[
          const BKSkeleton(height: 70, radius: 12),
          const SizedBox(height: 12),
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
