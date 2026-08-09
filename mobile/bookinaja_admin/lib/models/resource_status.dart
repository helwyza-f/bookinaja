enum ResourceState { live, idle, off }

class ResourceStatus {
  final String name;
  final ResourceState state;
  final String? note; // mis. "Budi · sisa 24m" atau "maintenance"
  final String resourceId;
  final String bookingId; // id sesi aktif (kalau Live), untuk aksi "Kelola"

  const ResourceStatus({
    required this.name,
    required this.state,
    this.note,
    this.resourceId = '',
    this.bookingId = '',
  });
}
