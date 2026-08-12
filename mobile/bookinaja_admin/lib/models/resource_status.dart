enum ResourceState { live, idle, off }

class ResourceBookingSummary {
  final String id;
  final String customerName;
  final String startTime;
  final String endTime;
  final String status;
  final String paymentStatus;
  final String code;
  const ResourceBookingSummary({
    required this.id,
    required this.customerName,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.paymentStatus,
    required this.code,
  });
}

class ResourceStatus {
  final String name;
  final ResourceState state;
  final String? note; // mis. "Budi · sisa 24m" atau "maintenance"
  final String resourceId;
  final String bookingId; // id sesi aktif (kalau Live), untuk aksi "Kelola"
  final String? liveCustomerName;
  final String? liveEndsAt;
  final int liveRemainingMinutes;
  final int bookingsToday;
  final int liveCountForResource;
  final String? nextBookingCustomerName;
  final String? nextBookingTimeLabel;
  final String? nextBookingStatus;
  final List<ResourceBookingSummary> todayTimeline;

  const ResourceStatus({
    required this.name,
    required this.state,
    this.note,
    this.resourceId = '',
    this.bookingId = '',
    this.liveCustomerName,
    this.liveEndsAt,
    this.liveRemainingMinutes = 0,
    this.bookingsToday = 0,
    this.liveCountForResource = 0,
    this.nextBookingCustomerName,
    this.nextBookingTimeLabel,
    this.nextBookingStatus,
    this.todayTimeline = const [],
  });
}
