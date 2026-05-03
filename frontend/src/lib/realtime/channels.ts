export function tenantBookingsChannel(tenantId: string) {
  return `tenant:${tenantId}:bookings`;
}

export function tenantBookingChannel(tenantId: string, bookingId: string) {
  return `tenant:${tenantId}:booking:${bookingId}`;
}

export function tenantDashboardChannel(tenantId: string) {
  return `tenant:${tenantId}:dashboard`;
}

export function tenantDevicesChannel(tenantId: string) {
  return `tenant:${tenantId}:devices`;
}

export function tenantDeviceChannel(tenantId: string, deviceId: string) {
  return `tenant:${tenantId}:device:${deviceId}`;
}

export function customerBookingChannel(customerId: string, bookingId: string) {
  return `customer:${customerId}:booking:${bookingId}`;
}
