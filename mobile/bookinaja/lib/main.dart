import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api/api_client.dart';
import 'data/token_store.dart';
import 'repositories/auth_repository.dart';
import 'repositories/customer_auth_repository.dart';
import 'repositories/booking_repository.dart';
import 'repositories/pos_repository.dart';
import 'repositories/customers_repository.dart';
import 'repositories/pos_feed_repository.dart';
import 'repositories/catalog_repository.dart';
import 'repositories/settings_repository.dart';
import 'repositories/fnb_repository.dart';
import 'repositories/reports_repository.dart';
import 'repositories/resource_admin_repository.dart';
import 'repositories/discovery_repository.dart';
import 'repositories/customer_booking_repository.dart';
import 'repositories/customer_reservation_repository.dart';
import 'repositories/customer_payment_repository.dart';
import 'realtime/realtime_channels.dart';
import 'realtime/realtime_client.dart';
import 'state/auth_controller.dart';
import 'state/bookings_controller.dart';
import 'state/dashboard_controller.dart';
import 'state/pos_controller.dart';
import 'state/customers_controller.dart';
import 'state/pos_feed_controller.dart';
import 'state/discovery_controller.dart';
import 'state/my_bookings_controller.dart';
import 'theme.dart';
import 'screens/landing_screen.dart';
import 'screens/customer/customer_home_shell.dart';
import 'screens/workspace_picker_screen.dart';
import 'screens/dashboard.dart';
import 'screens/bookings.dart';
import 'screens/operations.dart';
import 'screens/more_hub.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient();
  final tokenStore = TokenStore();

  runApp(
    BookinajaAdmin(
      authController: AuthController(
        AuthRepository(api, tokenStore),
        CustomerAuthRepository(api, tokenStore),
      )..bootstrap(),
      bookingRepo: BookingRepository(api),
      posRepo: PosRepository(api),
      customersRepo: CustomersRepository(api),
      posFeedRepo: PosFeedRepository(api),
      catalogRepo: CatalogRepository(api),
      settingsRepo: SettingsRepository(api),
      fnbRepo: FnbRepository(api),
      reportsRepo: ReportsRepository(api),
      resourceAdminRepo: ResourceAdminRepository(api),
      discoveryRepo: DiscoveryRepository(api),
      customerBookingRepo: CustomerBookingRepository(api),
      customerReservationRepo: CustomerReservationRepository(api),
      customerPaymentRepo: CustomerPaymentRepository(api),
    ),
  );
}

class BookinajaAdmin extends StatelessWidget {
  final AuthController authController;
  final BookingRepository bookingRepo;
  final PosRepository posRepo;
  final CustomersRepository customersRepo;
  final PosFeedRepository posFeedRepo;
  final CatalogRepository catalogRepo;
  final SettingsRepository settingsRepo;
  final FnbRepository fnbRepo;
  final ReportsRepository reportsRepo;
  final ResourceAdminRepository resourceAdminRepo;
  final DiscoveryRepository discoveryRepo;
  final CustomerBookingRepository customerBookingRepo;
  final CustomerReservationRepository customerReservationRepo;
  final CustomerPaymentRepository customerPaymentRepo;
  const BookinajaAdmin({
    super.key,
    required this.authController,
    required this.bookingRepo,
    required this.posRepo,
    required this.customersRepo,
    required this.posFeedRepo,
    required this.catalogRepo,
    required this.settingsRepo,
    required this.fnbRepo,
    required this.reportsRepo,
    required this.resourceAdminRepo,
    required this.discoveryRepo,
    required this.customerBookingRepo,
    required this.customerReservationRepo,
    required this.customerPaymentRepo,
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
        Provider<FnbRepository>.value(value: fnbRepo),
        Provider<ReportsRepository>.value(value: reportsRepo),
        Provider<ResourceAdminRepository>.value(value: resourceAdminRepo),
        Provider<DiscoveryRepository>.value(value: discoveryRepo),
        Provider<CustomerBookingRepository>.value(value: customerBookingRepo),
        Provider<CustomerReservationRepository>.value(value: customerReservationRepo),
        Provider<CustomerPaymentRepository>.value(value: customerPaymentRepo),
        ChangeNotifierProvider.value(value: authController),
        ChangeNotifierProvider(create: (_) => DiscoveryController(discoveryRepo)),
        ChangeNotifierProvider(create: (_) => MyBookingsController(customerBookingRepo)),
        ChangeNotifierProvider(create: (_) => BookingsController(bookingRepo)),
        ChangeNotifierProvider(create: (_) => DashboardController(bookingRepo)),
        ChangeNotifierProvider(create: (_) => PosController(posRepo)),
        ChangeNotifierProvider(
          create: (_) => CustomersController(customersRepo),
        ),
        ChangeNotifierProvider(create: (_) => PosFeedController(posFeedRepo)),
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
    if (!auth.isLoggedIn) return const LandingScreen();
    if (auth.isCustomer) return const CustomerHomeShell();
    // Staff tenant (account-first): pilih workspace dulu, lalu operasional.
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
    // Kasir tidak pernah jadi tab bottom nav — letaknya konsisten sebagai
    // quick action (dashboard) / tile More hub saja di semua mode F&B.
    final pages = [
      const DashboardScreen(),
      const BookingsScreen(),
      const OperationsScreen(),
      const MoreHubScreen(),
    ];
    final safeIndex = _i >= pages.length ? 0 : _i;
    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: safeIndex, children: pages),
      bottomNavigationBar: _NavBar(
        index: safeIndex,
        onTap: (v) => setState(() => _i = v),
      ),
    );
  }
}

/// Bottom nav custom: bar putih + hairline & shadow halus; ikon terpilih di
/// dalam kotak accentSoft (senada chip/avatar app), label selalu tampil.
class _NavBar extends StatelessWidget {
  final int index;
  final ValueChanged<int> onTap;
  const _NavBar({required this.index, required this.onTap});

  static const _home = (off: Icons.grid_view_outlined, on: Icons.grid_view_rounded, label: 'Home');
  static const _booking = (off: Icons.event_note_outlined, on: Icons.event_note, label: 'Booking');
  static const _ops = (off: Icons.sensors_outlined, on: Icons.sensors, label: 'POS');
  static const _more = (off: Icons.more_horiz, on: Icons.more_horiz, label: 'Lainnya');

  static const _items = <({IconData off, IconData on, String label})>[
    _home,
    _booking,
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
