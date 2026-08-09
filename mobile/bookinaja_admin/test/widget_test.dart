import 'package:flutter_test/flutter_test.dart';

import 'package:bookinaja_admin/api/api_client.dart';
import 'package:bookinaja_admin/data/token_store.dart';
import 'package:bookinaja_admin/repositories/auth_repository.dart';
import 'package:bookinaja_admin/repositories/booking_repository.dart';
import 'package:bookinaja_admin/repositories/pos_repository.dart';
import 'package:bookinaja_admin/repositories/customers_repository.dart';
import 'package:bookinaja_admin/repositories/ops_repository.dart';
import 'package:bookinaja_admin/repositories/catalog_repository.dart';
import 'package:bookinaja_admin/repositories/settings_repository.dart';
import 'package:bookinaja_admin/state/auth_controller.dart';
import 'package:bookinaja_admin/main.dart';

void main() {
  testWidgets('App builds with all providers wired', (tester) async {
    final api = ApiClient();
    await tester.pumpWidget(BookinajaAdmin(
      authController: AuthController(AuthRepository(api, TokenStore())),
      bookingRepo: BookingRepository(api),
      posRepo: PosRepository(api),
      customersRepo: CustomersRepository(api),
      opsRepo: OpsRepository(),
      catalogRepo: CatalogRepository(api),
      settingsRepo: SettingsRepository(api),
    ));
    expect(find.byType(BookinajaAdmin), findsOneWidget);
  });
}
