export function customerBookingChannel(customerId: string, bookingId: string) {
  return `customer:${customerId}:booking:${bookingId}`;
}
