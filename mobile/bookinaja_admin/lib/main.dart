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
import 'screens/customers.dart';
import 'screens/more_hub.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient();
  final tokenStore = TokenStore();

  runApp(BookinajaAdmin(
    authController: AuthController(AuthRepository(api, tokenStore))..bootstrap(),
    bookingRepo: BookingRepository(api),
    posRepo: PosRepository(api),
    customersRepo: CustomersRepository(api),
    opsRepo: OpsRepository(api),
    catalogRepo: CatalogRepository(api),
    settingsRepo: SettingsRepository(api),
  ));
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
        ChangeNotifierProvider(create: (_) => CustomersController(customersRepo)),
        ChangeNotifierProvider(create: (_) => OpsController(opsRepo)),
      ],
      child: MaterialApp(
        title: 'Bookinaja Admin',
        debugShowCheckedModeBanner: false,
        theme: BK.theme(),
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
    const pages = [
      DashboardScreen(),
      BookingsScreen(),
      OperationsScreen(),
      CustomersScreen(),
      MoreHubScreen(),
    ];
    return Scaffold(
      body: IndexedStack(index: _i, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _i,
        onDestinationSelected: (v) => setState(() => _i = v),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.event_note_outlined), selectedIcon: Icon(Icons.event_note), label: 'Booking'),
          NavigationDestination(icon: Icon(Icons.sensors_outlined), selectedIcon: Icon(Icons.sensors), label: 'Ops'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Customer'),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'Lainnya'),
        ],
      ),
    );
  }
}
