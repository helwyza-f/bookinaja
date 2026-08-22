/// Kunci izin kanonik — cermin backend (internal/tenant/permissions.go).
/// Dipakai untuk gating UI sadar-izin via AuthController.can()/canAny().
class Perm {
  Perm._();

  // Booking
  static const bookingsRead = 'bookings.read';
  static const bookingsCreate = 'bookings.create';
  static const bookingsUpdate = 'bookings.update';
  static const bookingsConfirm = 'bookings.confirm';
  static const bookingsCancel = 'bookings.cancel';
  static const bookingsDelete = 'bookings.delete';

  // Sesi
  static const sessionsStart = 'sessions.start';
  static const sessionsExtend = 'sessions.extend';
  static const sessionsComplete = 'sessions.complete';

  // Kasir / POS
  static const posRead = 'pos.read';
  static const posOrderAdd = 'pos.order.add';
  static const posCheckout = 'pos.checkout';
  static const posCashSettle = 'pos.cash.settle';

  // Resource
  static const resourcesRead = 'resources.read';
  static const resourcesCreate = 'resources.create';
  static const resourcesUpdate = 'resources.update';
  static const resourcesDelete = 'resources.delete';

  // Menu F&B
  static const fnbRead = 'fnb.read';
  static const fnbCreate = 'fnb.create';
  static const fnbUpdate = 'fnb.update';
  static const fnbDelete = 'fnb.delete';

  // Pelanggan
  static const customersRead = 'customers.read';

  // Biaya
  static const expensesRead = 'expenses.read';
  static const expensesCreate = 'expenses.create';
  static const expensesUpdate = 'expenses.update';
  static const expensesDelete = 'expenses.delete';

  // Laporan & nota
  static const analyticsRead = 'analytics.read';
  static const reportsRead = 'reports.read';
  static const receiptsPrint = 'receipts.print';
  static const receiptsSend = 'receipts.send';
}
