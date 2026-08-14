/// Workspace (bisnis) yang bisa diakses account. Dipilih setelah login.
class Workspace {
  final String id;
  final String slug;
  final String name;
  final String role;
  final String plan;
  final String status;

  const Workspace({
    required this.id,
    required this.slug,
    required this.name,
    required this.role,
    required this.plan,
    required this.status,
  });

  factory Workspace.fromJson(Map<String, dynamic> j) => Workspace(
        id: '${j['id'] ?? ''}',
        slug: '${j['slug'] ?? ''}',
        name: '${j['name'] ?? j['slug'] ?? 'Workspace'}',
        role: '${j['role'] ?? 'staff'}',
        plan: '${j['plan'] ?? ''}',
        status: '${j['status'] ?? ''}',
      );
}
