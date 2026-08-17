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
  late final TextEditingController _search;

  @override
  void initState() {
    super.initState();
    final c = context.read<CustomersController>();
    _search = TextEditingController(text: c.query);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!c.state.hasData) c.load();
    });
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<CustomersController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Customer', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 4),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            controller: _search,
            onChanged: ctrl.search,
            decoration: InputDecoration(
              hintText: 'Cari nama / nomor…',
              prefixIcon: const Icon(Icons.search, size: 20, color: BK.ink3),
              suffixIcon: _search.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close, size: 18, color: BK.ink3),
                      onPressed: () {
                        _search.clear();
                        ctrl.search('');
                      },
                    ),
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
                final searching = ctrl.query.trim().isNotEmpty;
                return StateView(
                  icon: searching ? Icons.person_search_outlined : Icons.people_outline,
                  color: BK.ink3,
                  title: searching ? 'Tidak ada hasil' : 'Belum ada customer',
                  hint: searching ? 'Coba kata kunci lain.' : 'Customer akan muncul setelah ada booking.',
                );
              }
              return RefreshIndicator(
                onRefresh: ctrl.load,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
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
