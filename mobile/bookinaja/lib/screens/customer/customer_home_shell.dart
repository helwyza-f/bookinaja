import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme.dart';
import '../../state/auth_controller.dart';
import '../../state/customer_shell_tab.dart';
import 'discover_screen.dart';
import 'my_bookings_screen.dart';

/// Shell utama sisi pelanggan: Discover · Booking Saya · Profil.
/// Body tiap tab diisi bertahap (Fase 1: discovery & booking read-only).
class CustomerHomeShell extends StatefulWidget {
  const CustomerHomeShell({super.key});
  @override
  State<CustomerHomeShell> createState() => _CustomerHomeShellState();
}

class _CustomerHomeShellState extends State<CustomerHomeShell> {
  @override
  void initState() {
    super.initState();
    CustomerShellTab.index.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    CustomerShellTab.index.removeListener(_onTabChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const pages = [
      DiscoverScreen(),
      MyBookingsScreen(),
      _CustomerProfileTab(),
    ];
    final i = CustomerShellTab.index.value;
    return Scaffold(
      body: IndexedStack(index: i, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: i,
        onDestinationSelected: CustomerShellTab.go,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Discover'),
          NavigationDestination(icon: Icon(Icons.event_note_outlined), selectedIcon: Icon(Icons.event_note), label: 'Booking'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}

class _CustomerProfileTab extends StatelessWidget {
  const _CustomerProfileTab();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final c = auth.customer;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 8),
          CircleAvatar(
            radius: 36,
            backgroundColor: BK.accentSoft,
            backgroundImage: (c?.avatarUrl.isNotEmpty ?? false) ? NetworkImage(c!.avatarUrl) : null,
            child: (c?.avatarUrl.isEmpty ?? true)
                ? Text(
                    (c?.name.isNotEmpty ?? false) ? c!.name.trim()[0].toUpperCase() : '?',
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: BK.accent),
                  )
                : null,
          ),
          const SizedBox(height: 14),
          Center(child: Text(c?.name ?? 'Pelanggan', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.ink))),
          const SizedBox(height: 2),
          Center(child: Text(c?.phone ?? '', style: const TextStyle(fontSize: 13, color: BK.ink3))),
          const SizedBox(height: 4),
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(color: BK.pendSoft, borderRadius: BorderRadius.circular(20)),
              child: Text('${c?.tier ?? 'NEW'} · ${c?.loyaltyPoints ?? 0} poin',
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFFB8860B))),
            ),
          ),
          const SizedBox(height: 28),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: BK.crit, side: const BorderSide(color: BK.line), padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: () => context.read<AuthController>().logout(),
            icon: const Icon(Icons.logout, size: 18),
            label: const Text('Keluar', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
