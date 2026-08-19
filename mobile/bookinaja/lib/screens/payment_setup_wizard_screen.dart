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
    final completed = [
      status.hasGateway,
      status.hasPaymentMethod,
      status.hasTestPayment,
    ].where((x) => x).length;
    final total = 3;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        // Header dengan progress
        BKCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Setup Progress', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
                        const SizedBox(height: 6),
                        Text('$completed/$total selesai', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
                      ],
                    ),
                  ),
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: completed == total ? BK.liveSoft : BK.accentSoft,
                      border: Border.all(color: completed == total ? BK.live : BK.accent, width: 2),
                    ),
                    child: Center(
                      child: Text('${((completed / total) * 100).toStringAsFixed(0)}%',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: completed == total ? BK.live : BK.accent)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  minHeight: 4,
                  value: completed / total,
                  backgroundColor: BK.line,
                  valueColor: const AlwaysStoppedAnimation<Color>(BK.live),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),

        // Step 1: Gateway
        _stepCard(
          number: 1,
          title: 'Setup Payment Gateway',
          description: 'Hubungkan Midtrans atau Xendit',
          completed: status.hasGateway,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const PaymentGatewaySettingsScreen()),
          ),
        ),
        const SizedBox(height: 12),

        // Step 2: Payment Methods
        _stepCard(
          number: 2,
          title: 'Tambah Metode Pembayaran',
          description: 'Setup transfer, e-wallet, QRIS, dsb',
          completed: status.hasPaymentMethod,
          enabled: status.hasGateway,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const PaymentMethodsSettingsScreen()),
          ),
        ),
        const SizedBox(height: 12),

        // Step 3: Test Payment
        _stepCard(
          number: 3,
          title: 'Tes Pembayaran',
          description: 'Lakukan test transaction untuk pastikan setup bekerja',
          completed: status.hasTestPayment,
          enabled: status.hasPaymentMethod,
          onTap: () {
            // TODO: Buka payment test flow
          },
        ),
        const SizedBox(height: 18),

        // Status message
        if (completed == total)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: BK.liveSoft,
              border: Border.all(color: BK.live),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: BK.live, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Pembayaran sudah siap! Pelanggan bisa memilih metode pembayaran di booking.',
                    style: TextStyle(fontSize: 12, color: BK.live, height: 1.4),
                  ),
                ),
              ],
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: BK.accentSoft,
              border: Border.all(color: BK.accent),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: BK.accent, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Selesaikan setup agar pembayaran online dapat diterima.',
                    style: const TextStyle(fontSize: 12, color: BK.accent, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _stepCard({
    required int number,
    required String title,
    required String description,
    required bool completed,
    bool enabled = true,
    VoidCallback? onTap,
  }) {
    final bgColor = completed ? BK.liveSoft : (enabled ? BK.card : BK.card2);
    final borderColor = completed ? BK.live : (enabled ? BK.accent : BK.line);
    final textColor = enabled ? BK.ink : BK.ink3;

    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: bgColor,
          border: Border.all(color: borderColor, width: 1.5),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: completed ? BK.live : BK.accent,
              ),
              child: Center(
                child: completed
                    ? const Icon(Icons.check, color: Colors.white, size: 20)
                    : Text(number.toString(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.white)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: textColor)),
                  Text(description, style: TextStyle(fontSize: 11.5, color: textColor, fontWeight: FontWeight.w500)),
                ],
              ),
            ),
            if (enabled && !completed) const Icon(Icons.arrow_forward_ios, size: 16, color: BK.accent),
          ],
        ),
      ),
    );
  }
}

// --- Models ---

class PaymentSetupStatus {
  final bool hasGateway; // Midtrans or Xendit configured
  final bool hasPaymentMethod; // Min 1 payment method setup
  final bool hasTestPayment; // At least 1 successful test transaction

  const PaymentSetupStatus({
    this.hasGateway = false,
    this.hasPaymentMethod = false,
    this.hasTestPayment = false,
  });

  factory PaymentSetupStatus.fromJson(Map json) {
    return PaymentSetupStatus(
      hasGateway: json['has_gateway'] == true,
      hasPaymentMethod: json['has_payment_method'] == true,
      hasTestPayment: json['has_test_payment'] == true,
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
