import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api/api_client.dart';
import 'data/token_store.dart';
import 'repositories/auth_repository.dart';
import 'repositories/booking_repository.dart';
import 'repositories/pos_repository.dart';
import 'repositories/customers_repository.dart';
import 'repositories/ops_repository.dart';
import 'repositories/catalog_repository.dart';
import 'repositories/settings_repository.dart';
import 'realtime/realtime_channels.dart';
import 'realtime/realtime_client.dart';
import 'state/auth_controller.dart';
import 'state/bookings_controller.dart';
import 'state/dashboard_controller.dart';
import 'state/pos_controller.dart';
import 'state/customers_controller.dart';
import 'state/ops_controller.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/workspace_picker_screen.dart';
import 'screens/dashboard.dart';
import 'screens/bookings.dart';
import 'screens/operations.dart';
import 'screens/kasir.dart';
import 'screens/more_hub.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient();
  final tokenStore = TokenStore();

  runApp(
    BookinajaAdmin(
      authController: AuthController(AuthRepository(api, tokenStore))
        ..bootstrap(),
      bookingRepo: BookingRepository(api),
      posRepo: PosRepository(api),
      customersRepo: CustomersRepository(api),
      opsRepo: OpsRepository(api),
      catalogRepo: CatalogRepository(api),
      settingsRepo: SettingsRepository(api),
    ),
  );
}

class BookinajaAdmin extends StatelessWidget {
  final AuthController authController;
  final BookingRepository bookingRepo;
  final PosRepository posRepo;
  final CustomersRepository customersRepo;
  final OpsRepository opsRepo;
  final CatalogRepository catalogRepo;
  final SettingsRepository settingsRepo;
  const BookinajaAdmin({
    super.key,
    required this.authController,
    required this.bookingRepo,
    required this.posRepo,
    required this.customersRepo,
    required this.opsRepo,
    required this.catalogRepo,
    required this.settingsRepo,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<BookingRepository>.value(value: bookingRepo),
        Provider<CatalogRepository>.value(value: catalogRepo),
        Provider<PosRepository>.value(value: posRepo),
        Provider<CustomersRepository>.value(value: customersRepo),
        Provider<SettingsRepository>.value(value: settingsRepo),
        ChangeNotifierProvider.value(value: authController),
        ChangeNotifierProvider(create: (_) => BookingsController(bookingRepo)),
        ChangeNotifierProvider(create: (_) => DashboardController(bookingRepo)),
        ChangeNotifierProvider(create: (_) => PosController(posRepo)),
        ChangeNotifierProvider(
          create: (_) => CustomersController(customersRepo),
        ),
        ChangeNotifierProvider(create: (_) => OpsController(opsRepo)),
      ],
      child: MaterialApp(
        title: 'Bookinaja Admin',
        debugShowCheckedModeBanner: false,
        theme: BK.theme(),
        // Tutup keyboard saat tap di area kosong (penting di iOS yang tak
        // menyediakan tombol "done" bawaan pada keyboard).
        builder: (context, child) => GestureDetector(
          behavior: HitTestBehavior.translucent,
          onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
          child: child,
        ),
        home: const _AuthGate(),
      ),
    );
  }
}

/// Menentukan layar awal: booting → splash, belum login → LoginScreen, sudah → HomeShell.
class _AuthGate extends StatelessWidget {
  const _AuthGate();
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (auth.booting) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!auth.isLoggedIn) return const LoginScreen();
    if (!auth.hasWorkspace) return const WorkspacePickerScreen();
    return const HomeShell();
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _i = 0;

  @override
  void initState() {
    super.initState();
    // Muat data awal setelah frame pertama.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingsController>().load();
      context.read<DashboardController>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final workspaceSlug = auth.workspace?.slug ?? '';
    if (workspaceSlug.isNotEmpty) {
      RealtimeClient.instance.setChannels([
        tenantBookingsChannel(workspaceSlug),
        tenantDashboardChannel(workspaceSlug),
        tenantDevicesChannel(workspaceSlug),
      ], source: 'shell');
    }
    // Kasir hanya naik jadi tab bottom nav saat mode F&B "POS Menu terpisah"
    // (standalone) — di mode lain dia tetap quick action / tile More hub saja.
    final showKasirTab = auth.showKasirTab;
    final pages = [
      const DashboardScreen(),
      const BookingsScreen(),
      if (showKasirTab) const KasirScreen(),
      const OperationsScreen(),
      const MoreHubScreen(),
    ];
    if (_i >= pages.length) _i = 0;
    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _i, children: pages),
      bottomNavigationBar: _NavBar(
        index: _i,
        showKasir: showKasirTab,
        onTap: (v) => setState(() => _i = v),
      ),
    );
  }
}

/// Bottom nav custom: bar putih + hairline & shadow halus; ikon terpilih di
/// dalam kotak accentSoft (senada chip/avatar app), label selalu tampil.
class _NavBar extends StatelessWidget {
  final int index;
  final bool showKasir;
  final ValueChanged<int> onTap;
  const _NavBar({required this.index, required this.showKasir, required this.onTap});

  static const _home = (off: Icons.grid_view_outlined, on: Icons.grid_view_rounded, label: 'Home');
  static const _booking = (off: Icons.event_note_outlined, on: Icons.event_note, label: 'Booking');
  static const _kasir = (off: Icons.shopping_cart_outlined, on: Icons.shopping_cart, label: 'Kasir');
  static const _ops = (off: Icons.sensors_outlined, on: Icons.sensors, label: 'POS');
  static const _more = (off: Icons.more_horiz, on: Icons.more_horiz, label: 'Lainnya');

  List<({IconData off, IconData on, String label})> get _items => [
        _home,
        _booking,
        if (showKasir) _kasir,
        _ops,
        _more,
      ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: BK.card,
        border: Border(top: BorderSide(color: BK.line)),
        boxShadow: [
          BoxShadow(
            color: Color(0x0A0D1526),
            blurRadius: 16,
            offset: Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(6, 8, 6, 10),
          child: Row(
            children: [
              for (int i = 0; i < _items.length; i++) Expanded(child: _item(i)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _item(int i) {
    final it = _items[i];
    final on = i == index;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => onTap(i),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: on ? BK.accentSoft : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 44,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: on ? BK.card : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  on ? it.on : it.off,
                  size: 21,
                  color: on ? BK.accent : BK.ink3,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                it.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: on ? FontWeight.w700 : FontWeight.w500,
                  color: on ? BK.accent : BK.ink3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
