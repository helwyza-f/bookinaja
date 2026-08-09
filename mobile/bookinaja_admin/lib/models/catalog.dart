/// Satu paket harga milik resource (main pricing item).
class ResourcePackage {
  final String resourceId;
  final String resourceName;
  final String itemId; // dipakai sebagai item_ids[0]
  final String name;
  final int price;
  final int unitDuration; // menit per unit (untuk paket berbasis jam/sesi)
  final String priceUnit; // hour | session | day | week | month | year | ...

  const ResourcePackage({
    required this.resourceId,
    required this.resourceName,
    required this.itemId,
    required this.name,
    required this.price,
    required this.unitDuration,
    required this.priceUnit,
  });

  /// Paket antar-hari (durasi berbasis kalender, bukan slot jam).
  bool get isInterday => const ['day', 'week', 'month', 'year'].contains(priceUnit.toLowerCase());

  /// Label satuan durasi untuk UI.
  String get unitLabel {
    switch (priceUnit.toLowerCase()) {
      case 'hour':
        return 'jam';
      case 'session':
      case 'sesi':
        return 'sesi';
      case 'day':
        return 'hari';
      case 'week':
        return 'minggu';
      case 'month':
        return 'bulan';
      case 'year':
        return 'tahun';
      default:
        return priceUnit.isEmpty ? 'unit' : priceUnit;
    }
  }
}

/// Resource beserta daftar paketnya.
class ResourceEntry {
  final String resourceId;
  final String resourceName;
  final String category;
  final String status;
  final List<ResourcePackage> packages;

  const ResourceEntry({
    required this.resourceId,
    required this.resourceName,
    required this.category,
    required this.status,
    required this.packages,
  });
}

/// Add-on yang bisa ditambahkan ke booking.
class Addon {
  final String resourceId;
  final String itemId;
  final String name;
  final int price;
  const Addon({required this.resourceId, required this.itemId, required this.name, required this.price});
}

/// Rentang waktu terpakai (menit dari 00:00) untuk hitung slot kosong.
class BusySlot {
  final int startMin;
  final int endMin;
  const BusySlot(this.startMin, this.endMin);

  factory BusySlot.fromJson(Map<String, dynamic> j) {
    int toMin(String hhmm) {
      final parts = hhmm.split(':');
      if (parts.length < 2) return 0;
      return (int.tryParse(parts[0]) ?? 0) * 60 + (int.tryParse(parts[1]) ?? 0);
    }
    return BusySlot(toMin('${j['start_time'] ?? '00:00'}'), toMin('${j['end_time'] ?? '00:00'}'));
  }
}
