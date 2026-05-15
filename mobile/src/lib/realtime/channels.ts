export function customerBookingChannel(customerId: string, bookingId: string) {
  return `customer:${customerId}:booking:${bookingId}`;
}

export function customerBookingsChannel(customerId: string) {
  return `customer:${customerId}:bookings`;
}

export function customerOrdersChannel(customerId: string) {
  return `customer:${customerId}:orders`;
}

export function tenantBookingsChannel(tenantId: string) {
  return `tenant:${tenantId}:bookings`;
}

export function tenantBookingChannel(tenantId: string, bookingId: string) {
  return `tenant:${tenantId}:booking:${bookingId}`;
}

export function tenantOrdersChannel(tenantId: string) {
  return `tenant:${tenantId}:orders`;
}

export function tenantDashboardChannel(tenantId: string) {
  return `tenant:${tenantId}:dashboard`;
}
