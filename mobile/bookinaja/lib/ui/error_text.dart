import '../api/api_client.dart';

/// Ubah exception mentah jadi pesan yang aman & manusiawi untuk customer.
/// Tidak pernah membocorkan jejak teknis (Exception/URL/SocketException) ke UI.
String friendlyError(
  Object? e, {
  String fallback = 'Terjadi kesalahan. Coba lagi.',
}) {
  if (e is ApiException) {
    if (e.isUnauthorized) return 'Sesi berakhir. Masuk ulang untuk melanjutkan.';
    final m = e.message.trim();
    if (m.isEmpty || _looksTechnical(m)) return fallback;
    return _humanize(m);
  }
  final s = '$e';
  if (s.contains('SocketException') ||
      s.contains('Failed host lookup') ||
      s.contains('Connection') ||
      s.contains('Network')) {
    return 'Koneksi bermasalah. Cek internet lalu coba lagi.';
  }
  if (s.contains('TimeoutException')) {
    return 'Server lambat merespons. Coba lagi sebentar.';
  }
  return fallback;
}

/// True bila error ini kemungkinan konflik slot (sudah terisi orang lain).
bool isSlotConflict(Object? e) {
  if (e is ApiException && e.statusCode == 409) return true;
  final s = '$e'.toLowerCase();
  return s.contains('terisi') ||
      s.contains('tidak tersedia') ||
      s.contains('sudah dibooking') ||
      s.contains('bentrok') ||
      s.contains('overlap');
}

bool _looksTechnical(String m) =>
    m.startsWith('Exception') ||
    m.startsWith('http') ||
    m.contains('SocketException') ||
    m.contains('TimeoutException') ||
    m.contains('at ') && m.contains('.dart');

/// Pesan backend sering ALL-CAPS ("SLOT SUDAH TERISI"). Turunkan jadi
/// kapital-awal saja agar tidak terbaca membentak.
String _humanize(String m) {
  final letters = m.replaceAll(RegExp('[^A-Za-z]'), '');
  final isShouty = letters.isNotEmpty && letters == letters.toUpperCase();
  if (!isShouty) return m;
  final lower = m.toLowerCase();
  return '${lower[0].toUpperCase()}${lower.substring(1)}';
}
