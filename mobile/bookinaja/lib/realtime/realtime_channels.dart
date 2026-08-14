String tenantBookingsChannel(String tenantId) => 'tenant:$tenantId:bookings';
String tenantDashboardChannel(String tenantId) => 'tenant:$tenantId:dashboard';
String tenantDevicesChannel(String tenantId) => 'tenant:$tenantId:devices';
String tenantBookingChannel(String tenantId, String bookingId) => 'tenant:$tenantId:booking:$bookingId';

// Channel milik customer (lintas-tenant, tanpa slug). Otorisasi backend
// mencocokkan segmen id dengan customer_id pada JWT — hanya pemilik yang boleh.
String customerBookingChannel(String customerId, String bookingId) => 'customer:$customerId:booking:$bookingId';
String customerOrderChannel(String customerId, String orderId) => 'customer:$customerId:order:$orderId';
// Channel koleksi (semua booking/order milik customer) — untuk auto-update list.
String customerBookingsChannel(String customerId) => 'customer:$customerId:bookings';
String customerOrdersChannel(String customerId) => 'customer:$customerId:orders';
