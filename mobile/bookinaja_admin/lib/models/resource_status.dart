enum ResourceState { live, idle, off }

class ResourceStatus {
  final String name;
  final ResourceState state;
  final String? note; // mis. "Budi · sisa 24m" atau "maintenance"

  const ResourceStatus({required this.name, required this.state, this.note});
}
