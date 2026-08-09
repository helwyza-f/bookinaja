/// Identitas global (account-first). Satu account bisa punya banyak workspace.
class Account {
  final String id;
  final String name;
  final String email;

  const Account({required this.id, required this.name, required this.email});

  factory Account.fromJson(Map<String, dynamic> j) => Account(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? j['email'] ?? 'Admin'}',
        email: '${j['email'] ?? ''}',
      );
}

/// Hasil POST /auth/login → token account + profil.
class AuthResult {
  final String token;
  final Account account;
  const AuthResult({required this.token, required this.account});

  factory AuthResult.fromJson(Map<String, dynamic> j) {
    final acc = (j['account'] is Map) ? Map<String, dynamic>.from(j['account'] as Map) : <String, dynamic>{};
    return AuthResult(
      token: '${j['token'] ?? j['access_token'] ?? ''}',
      account: Account.fromJson(acc),
    );
  }
}
