import 'package:flutter_test/flutter_test.dart';

import 'package:bookinaja/api/api_client.dart';
import 'package:bookinaja/models/catalog.dart';
import 'package:bookinaja/models/customer_booking.dart';
import 'package:bookinaja/models/discovery.dart';
import 'package:bookinaja/repositories/customer_booking_repository.dart';
import 'package:bookinaja/repositories/customer_reservation_repository.dart';
import 'package:bookinaja/state/customer_booking_controller.dart';
import 'package:bookinaja/state/my_bookings_controller.dart';

class _FakeReservationRepo extends CustomerReservationRepository {
  _FakeReservationRepo() : super(ApiClient(baseUrl: 'http://localhost'));

  int availabilityCalls = 0;
  int promoCalls = 0;
  int createCalls = 0;

  @override
  Future<List<BusySlot>> availability(String resourceId, DateTime date) async {
    availabilityCalls += 1;
    return const [];
  }

  @override
  Future<
    ({bool valid, int discount, int finalAmount, String label, String message})
  >
  promoPreview({
    required String code,
    required String tenantId,
    required String resourceId,
    required DateTime startLocal,
    required int subtotal,
  }) async {
    promoCalls += 1;
    return (
      valid: true,
      discount: 10000,
      finalAmount: subtotal - 10000,
      label: code,
      message: 'ok',
    );
  }

  @override
  Future<CreatedBooking> createBooking({
    required String tenantSlug,
    required String resourceId,
    required String customerName,
    required String customerPhone,
    required List<String> itemIds,
    required DateTime startLocal,
    required int durationUnits,
    String promoCode = '',
  }) async {
    createCalls += 1;
    return const CreatedBooking(
      id: 'booking-1',
      code: 'BK-001',
      accessToken: 'token-1',
    );
  }
}

class _FakeBookingRepo extends CustomerBookingRepository {
  _FakeBookingRepo() : super(ApiClient(baseUrl: 'http://localhost'));

  int activeCalls = 0;
  int historyCalls = 0;

  @override
  Future<List<CustomerBookingItem>> active() async {
    activeCalls += 1;
    return const [];
  }

  @override
  Future<List<CustomerBookingItem>> history() async {
    historyCalls += 1;
    return const [];
  }
}

void main() {
  test('TenantResource.bookablePackages filters interday packages', () {
    final resource = TenantResource(
      id: 'r1',
      name: 'Room A',
      packages: const [
        TenantPackage(
          id: 'p1',
          name: 'Hourly',
          itemType: 'package',
          price: 50000,
          priceUnit: 'hour',
        ),
        TenantPackage(
          id: 'p2',
          name: 'Daily',
          itemType: 'package',
          price: 200000,
          priceUnit: 'day',
        ),
        TenantPackage(
          id: 'p3',
          name: 'Session',
          itemType: 'service',
          price: 75000,
          priceUnit: 'session',
        ),
      ],
    );

    expect(resource.bookablePackages.map((p) => p.id), ['p1', 'p3']);
  });

  test('TenantResource.fromJson accepts backend main_option package types', () {
    final resource = TenantResource.fromJson({
      'id': 'r1',
      'name': 'Room A',
      'items': [
        {
          'id': 'p1',
          'name': 'Hourly',
          'item_type': 'main_option',
          'price': 50000,
          'price_unit': 'hour',
        },
        {
          'id': 'p2',
          'name': 'Addon',
          'item_type': 'add_on',
          'price': 10000,
          'price_unit': 'pcs',
        },
      ],
    });

    expect(resource.packages.map((p) => p.id), ['p1']);
    expect(resource.bookablePackages.map((p) => p.id), ['p1']);
  });

  test(
    'CustomerBookingController preselects the only bookable package',
    () async {
      final repo = _FakeReservationRepo();
      final tenant = TenantProfile(
        id: 't1',
        name: 'Tenant',
        slug: 'tenant',
        openTime: '08:00',
        closeTime: '22:00',
      );
      final resource = TenantResource(
        id: 'r1',
        name: 'Room A',
        packages: const [
          TenantPackage(
            id: 'p1',
            name: 'Daily',
            itemType: 'package',
            price: 200000,
            priceUnit: 'day',
          ),
          TenantPackage(
            id: 'p2',
            name: 'Hourly',
            itemType: 'package',
            price: 50000,
            priceUnit: 'hour',
          ),
        ],
      );

      final controller = CustomerBookingController(
        repo,
        tenant: tenant,
        resource: resource,
      );

      expect(controller.packages.map((p) => p.id), ['p2']);
      expect(controller.pkg?.id, 'p2');

      await controller.selectPackage(controller.packages.first);
      expect(repo.availabilityCalls, 1);
    },
  );

  test(
    'MyBookingsController.refresh reloads both active and history',
    () async {
      final repo = _FakeBookingRepo();
      final controller = MyBookingsController(repo);

      await controller.refresh();

      expect(repo.activeCalls, 1);
      expect(repo.historyCalls, 1);
    },
  );
}
