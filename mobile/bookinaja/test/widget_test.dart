import 'package:flutter_test/flutter_test.dart';

import 'package:bookinaja/api/api_client.dart';
import 'package:bookinaja/data/token_store.dart';
import 'package:bookinaja/repositories/auth_repository.dart';
import 'package:bookinaja/repositories/customer_auth_repository.dart';
import 'package:bookinaja/repositories/booking_repository.dart';
import 'package:bookinaja/repositories/pos_repository.dart';
import 'package:bookinaja/repositories/customers_repository.dart';
import 'package:bookinaja/repositories/ops_repository.dart';
import 'package:bookinaja/repositories/catalog_repository.dart';
import 'package:bookinaja/repositories/settings_repository.dart';
import 'package:bookinaja/repositories/discovery_repository.dart';
import 'package:bookinaja/repositories/customer_booking_repository.dart';
import 'package:bookinaja/repositories/customer_reservation_repository.dart';
import 'package:bookinaja/repositories/customer_payment_repository.dart';
import 'package:bookinaja/state/auth_controller.dart';
import 'package:bookinaja/main.dart';

void main() {
  testWidgets('App builds with all providers wired', (tester) async {
    final api = ApiClient();
    await tester.pumpWidget(BookinajaAdmin(
      authController: AuthController(
        AuthRepository(api, TokenStore()),
        CustomerAuthRepository(api, TokenStore()),
      ),
      bookingRepo: BookingRepository(api),
      posRepo: PosRepository(api),
      customersRepo: CustomersRepository(api),
      opsRepo: OpsRepository(api),
      catalogRepo: CatalogRepository(api),
      settingsRepo: SettingsRepository(api),
      discoveryRepo: DiscoveryRepository(api),
      customerBookingRepo: CustomerBookingRepository(api),
      customerReservationRepo: CustomerReservationRepository(api),
      customerPaymentRepo: CustomerPaymentRepository(api),
    ));
    expect(find.byType(BookinajaAdmin), findsOneWidget);
  });
}
