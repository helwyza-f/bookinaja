import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/payment_method.dart';
import '../repositories/settings_repository.dart';
import '../state/settings_controller.dart';
import '../theme.dart';
import '../ui/toast.dart';

/// Layar admin: kelola metode pembayaran tenant. Semua metode bisa
/// di-on/off-kan; metode manual (transfer/e-wallet/QRIS) juga bisa diedit
/// detail rekening & instruksinya.
class PaymentMethodsSettingsScreen extends StatelessWidget {
  const PaymentMethodsSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => PaymentMethodsController(ctx.read<SettingsRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<PaymentMethodsController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Metode Pembayaran',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
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
        data: (items) => items.isEmpty
            ? const StateView(
                icon: Icons.account_balance_wallet_outlined,
                color: BK.ink3,
                title: 'Belum ada metode',
                hint: 'Metode pembayaran akan muncul di sini.')
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                children: [
                  const Text(
                    'Aktifkan metode yang dipakai. Untuk transfer/e-wallet, isi detail rekening agar tampil ke customer.',
                    style: TextStyle(fontSize: 12.5, color: BK.ink3, height: 1.35),
                  ),
                  const SizedBox(height: 14),
                  for (int i = 0; i < items.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _MethodCard(
                        key: ValueKey(items[i].id.isNotEmpty ? items[i].id : items[i].code),
                        method: items[i],
                        onChanged: (m) => c.editAt(i, m),
                      ),
                    ),
                ],
              ),
      ),
      bottomNavigationBar: c.state.hasData
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(vertical: 15)),
                  onPressed: c.saving
                      ? null
                      : () async {
                          final ok = await c.save();
                          if (!context.mounted) return;
                          if (ok) {
                            BkToast.success(context, 'Metode pembayaran disimpan');
                          } else {
                            BkToast.error(context, c.error ?? 'Gagal menyimpan');
                          }
                        },
                  child: c.saving
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Simpan', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            )
          : null,
    );
  }
}

class _MethodCard extends StatefulWidget {
  final PaymentMethod method;
  final ValueChanged<PaymentMethod> onChanged;
  const _MethodCard({super.key, required this.method, required this.onChanged});

  @override
  State<_MethodCard> createState() => _MethodCardState();
}

class _MethodCardState extends State<_MethodCard> {
  late final TextEditingController _bank;
  late final TextEditingController _accName;
  late final TextEditingController _accNumber;
  late final TextEditingController _instructions;

  @override
  void initState() {
    super.initState();
    final m = widget.method;
    _bank = TextEditingController(text: m.meta.bankName);
    _accName = TextEditingController(text: m.meta.accountName);
    _accNumber = TextEditingController(text: m.meta.accountNumber);
    _instructions = TextEditingController(text: m.instructions);
  }

  @override
  void dispose() {
    _bank.dispose();
    _accName.dispose();
    _accNumber.dispose();
    _instructions.dispose();
    super.dispose();
  }

  void _pushMeta() {
    widget.onChanged(widget.method.copyWith(
      instructions: _instructions.text,
      meta: widget.method.meta.copyWith(
        bankName: _bank.text,
        accountName: _accName.text,
        accountNumber: _accNumber.text,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final m = widget.method;
    final active = m.isActive;
    return BKCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: active ? BK.accentSoft : BK.card2,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(_iconFor(m), size: 20, color: active ? BK.accent : BK.ink3),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m.displayName.isNotEmpty ? m.displayName : m.code,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: BK.ink),
                    ),
                    const SizedBox(height: 2),
                    Text(_typeLabel(m),
                        style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
                  ],
                ),
              ),
              Switch(
                value: active,
                activeThumbColor: BK.accent,
                onChanged: (v) => widget.onChanged(m.copyWith(isActive: v)),
              ),
            ],
          ),
          if (m.isManual && active) ...[
            const SizedBox(height: 6),
            Divider(height: 1, color: BK.line),
            const SizedBox(height: 12),
            _field('Nama bank / penyedia', _bank, hint: 'mis. BCA, DANA, GoPay'),
            const SizedBox(height: 10),
            _field('Nama pemilik rekening', _accName, hint: 'Nama sesuai rekening'),
            const SizedBox(height: 10),
            _field('Nomor rekening / HP', _accNumber, hint: 'Nomor tujuan transfer'),
            const SizedBox(height: 10),
            _field('Instruksi (opsional)', _instructions,
                hint: 'Catatan untuk customer', maxLines: 2),
          ],
        ],
      ),
    );
  }

  Widget _field(String label, TextEditingController controller, {String? hint, int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          maxLines: maxLines,
          onChanged: (_) => _pushMeta(),
          style: const TextStyle(fontSize: 13.5, color: BK.ink),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: BK.ink3, fontSize: 13),
            isDense: true,
            filled: true,
            fillColor: BK.card2,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: BK.line),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: BK.line),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: BK.accent),
            ),
          ),
        ),
      ],
    );
  }

  IconData _iconFor(PaymentMethod m) {
    final c = m.category.toLowerCase();
    final code = m.code.toLowerCase();
    if (c.contains('cash') || code.contains('cash')) return Icons.payments_outlined;
    if (c.contains('qris') || code.contains('qris')) return Icons.qr_code_2_rounded;
    if (c.contains('ewallet') || c.contains('wallet')) return Icons.account_balance_wallet_outlined;
    if (m.verificationType.toLowerCase() == 'gateway') return Icons.credit_card_rounded;
    if (c.contains('transfer') || c.contains('bank')) return Icons.account_balance_outlined;
    return Icons.payment_rounded;
  }

  String _typeLabel(PaymentMethod m) {
    switch (m.verificationType.toLowerCase()) {
      case 'manual':
        return 'Verifikasi manual · bukti transfer';
      case 'gateway':
        return 'Otomatis · ${m.provider.isNotEmpty ? m.provider : 'payment gateway'}';
      case 'cash':
        return 'Tunai di kasir';
      default:
        return m.category.isNotEmpty ? m.category : m.verificationType;
    }
  }
}
