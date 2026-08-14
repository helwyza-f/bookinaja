import '../models/catalog.dart';

/// Satu sumber kebenaran untuk perhitungan slot booking berbasis jam/sesi —
/// dipakai bersama oleh booking flow (`CustomerBookingController`) dan peek
/// ketersediaan di halaman detail resource. Sebelumnya logika ini diduplikasi
/// di dua tempat dan rawan melenceng saat salah satu diubah.

/// Satu slot mulai (per 1 unit) beserta statusnya.
class DaySlot {
  final String label; // "HH:mm"
  final int startMin; // menit dari 00:00
  final bool available;
  final bool past;
  const DaySlot(
    this.label, {
    required this.startMin,
    required this.available,
    required this.past,
  });
}

/// Rentang jam operasional (menit dari 00:00). Menangani `close <= open`
/// (lewat tengah malam / 24 jam) dengan menaikkan close ke 24:00.
({int open, int close}) operatingWindow(
  String openTime,
  String closeTime, {
  int openFallback = 8 * 60,
  int closeFallback = 22 * 60,
}) {
  final open = parseHm(openTime, openFallback);
  var close = parseHm(closeTime, closeFallback);
  if (close <= open) close = 24 * 60;
  return (open: open, close: close);
}

/// Bangun daftar slot (per 1 unit) untuk satu hari.
List<DaySlot> buildDaySlots({
  required int openMin,
  required int closeMin,
  required int stepMin,
  required DateTime date,
  required List<BusySlot> busy,
  DateTime? now,
}) {
  final step = stepMin > 0 ? stepMin : 60;
  final n = now ?? DateTime.now();
  final isToday = date.year == n.year && date.month == n.month && date.day == n.day;
  final nowMin = n.hour * 60 + n.minute;
  final out = <DaySlot>[];
  for (var s = openMin; s + step <= closeMin; s += step) {
    final end = s + step;
    final overlaps = busy.any((b) => s < b.endMin && end > b.startMin);
    final past = isToday && s < nowMin;
    out.add(DaySlot(
      _fmt(s),
      startMin: s,
      available: !overlaps && !past,
      past: past,
    ));
  }
  return out;
}

/// Durasi maksimum (dalam unit) mulai dari [startMin], dibatasi jam tutup &
/// slot busy terdekat setelahnya. Minimal 1.
int maxUnitsFrom({
  required int startMin,
  required int closeMin,
  required int stepMin,
  required List<BusySlot> busy,
}) {
  final step = stepMin > 0 ? stepMin : 60;
  var availableMin = closeMin - startMin;
  int? nextBusy;
  for (final b in busy) {
    if (b.startMin > startMin && (nextBusy == null || b.startMin < nextBusy)) {
      nextBusy = b.startMin;
    }
  }
  if (nextBusy != null) {
    final gap = nextBusy - startMin;
    if (gap < availableMin) availableMin = gap;
  }
  final max = availableMin ~/ step;
  return max > 0 ? max : 1;
}

int parseHm(String hm, int fallback) {
  if (hm.isEmpty) return fallback;
  final parts = hm.split(':');
  if (parts.length < 2) return fallback;
  final h = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  if (h == null || m == null) return fallback;
  return h * 60 + m;
}

int hmToMin(String hm) {
  final parts = hm.split(':');
  return int.parse(parts[0]) * 60 + int.parse(parts[1]);
}

String _fmt(int min) =>
    '${(min ~/ 60).toString().padLeft(2, '0')}:${(min % 60).toString().padLeft(2, '0')}';
