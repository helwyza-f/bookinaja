import 'package:flutter_test/flutter_test.dart';
import 'package:bookinaja/models/catalog.dart';
import 'package:bookinaja/utils/slot_engine.dart';

void main() {
  group('operatingWindow', () {
    test('parses normal open/close', () {
      final w = operatingWindow('08:00', '22:00');
      expect(w.open, 8 * 60);
      expect(w.close, 22 * 60);
    });

    test('raises close to 24:00 when close <= open (overnight/24h)', () {
      final w = operatingWindow('10:00', '02:00');
      expect(w.open, 10 * 60);
      expect(w.close, 24 * 60);
    });

    test('falls back on empty/garbage input', () {
      final w = operatingWindow('', 'x');
      expect(w.open, 8 * 60);
      expect(w.close, 22 * 60);
    });
  });

  group('buildDaySlots', () {
    // Hari besok (bukan hari ini) supaya cek "past" tidak ikut campur.
    final tomorrow = DateTime.now().add(const Duration(days: 1));

    test('generates hourly slots within window', () {
      final slots = buildDaySlots(
        openMin: 8 * 60,
        closeMin: 11 * 60,
        stepMin: 60,
        date: tomorrow,
        busy: const [],
      );
      expect(slots.map((s) => s.label), ['08:00', '09:00', '10:00']);
      expect(slots.every((s) => s.available), isTrue);
    });

    test('marks slots overlapping a busy range as unavailable', () {
      final busy = [BusySlot(9 * 60, 10 * 60)];
      final slots = buildDaySlots(
        openMin: 8 * 60,
        closeMin: 11 * 60,
        stepMin: 60,
        date: tomorrow,
        busy: busy,
      );
      expect(slots.firstWhere((s) => s.label == '09:00').available, isFalse);
      expect(slots.firstWhere((s) => s.label == '08:00').available, isTrue);
    });

    test('marks earlier slots as past when date is today', () {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day, 12, 0);
      final slots = buildDaySlots(
        openMin: 8 * 60,
        closeMin: 14 * 60,
        stepMin: 60,
        date: today,
        busy: const [],
        now: today,
      );
      expect(slots.firstWhere((s) => s.label == '08:00').past, isTrue);
      expect(slots.firstWhere((s) => s.label == '13:00').past, isFalse);
    });
  });

  group('maxUnitsFrom', () {
    test('capped by closing time', () {
      final max = maxUnitsFrom(
        startMin: 20 * 60,
        closeMin: 22 * 60,
        stepMin: 60,
        busy: const [],
      );
      expect(max, 2);
    });

    test('capped by the next busy slot', () {
      final busy = [BusySlot(12 * 60, 13 * 60)];
      final max = maxUnitsFrom(
        startMin: 10 * 60,
        closeMin: 22 * 60,
        stepMin: 60,
        busy: busy,
      );
      expect(max, 2); // 10:00 & 11:00, lalu 12:00 terisi
    });

    test('never below 1', () {
      final max = maxUnitsFrom(
        startMin: 22 * 60,
        closeMin: 22 * 60,
        stepMin: 60,
        busy: const [],
      );
      expect(max, 1);
    });
  });
}
