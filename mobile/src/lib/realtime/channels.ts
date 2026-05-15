export function customerBookingChannel(customerId: string, bookingId: string) {
  return `customer:${customerId}:booking:${bookingId}`;
}

export function customerBookingsChannel(customerId: string) {
  return `customer:${customerId}:bookings`;
}

export function customerOrdersChannel(customerId: string) {
  return `customer:${customerId}:orders`;
}
