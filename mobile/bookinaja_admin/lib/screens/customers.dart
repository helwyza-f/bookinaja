import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models/customer.dart';
import '../state/customers_controller.dart';
import 'customer_detail.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});
  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final c = context.read<CustomersController>();
      if (!c.state.hasData) c.load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<CustomersController>();
    return SafeArea(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Text('Customer', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            onChanged: ctrl.search,
            decoration: InputDecoration(
              hintText: 'Cari nama / nomor…',
              prefixIcon: const Icon(Icons.search, size: 20, color: BK.ink3),
              isDense: true,
              filled: true, fillColor: BK.card,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: BK.line)),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ctrl.state.when(
            loading: () => const LoadingList(),
            error: (e) => StateView(
              icon: Icons.wifi_off_rounded, color: BK.crit, title: 'Gagal memuat', hint: '$e',
              action: FilledButton(style: FilledButton.styleFrom(backgroundColor: BK.accent), onPressed: ctrl.load, child: const Text('Coba lagi')),
            ),
            data: (_) {
              final list = ctrl.filtered;
              if (list.isEmpty) {
                return const StateView(icon: Icons.person_off_outlined, color: BK.ink3, title: 'Tidak ada customer', hint: 'Coba kata kunci lain.');
              }
              return RefreshIndicator(
                onRefresh: ctrl.load,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                  itemCount: list.length,
                  separatorBuilder: (_, i) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _CustomerRow(list[i]),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }
}

Pill tierPill(String tier) {
  switch (tier) {
    case 'vip':
      return Pill.acc('VIP');
    case 'baru':
      return Pill.mut('Baru');
    default:
      return Pill.mut('Reguler');
  }
}

class _CustomerRow extends StatelessWidget {
  final Customer c;
  const _CustomerRow(this.c);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CustomerDetailScreen(customer: c))),
      child: BKCard(
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [BK.accent, Color(0xFF7AA2FF)]), borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(c.name.isNotEmpty ? c.name[0].toUpperCase() : '?', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(c.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
              const SizedBox(height: 2),
              Text('${c.sessions} sesi · ${c.phone}', style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          tierPill(c.tier),
        ]),
      ),
    );
  }
}
