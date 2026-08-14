String tenantBookingsChannel(String tenantId) => 'tenant:$tenantId:bookings';
String tenantDashboardChannel(String tenantId) => 'tenant:$tenantId:dashboard';
String tenantDevicesChannel(String tenantId) => 'tenant:$tenantId:devices';
String tenantBookingChannel(String tenantId, String bookingId) => 'tenant:$tenantId:booking:$bookingId';
