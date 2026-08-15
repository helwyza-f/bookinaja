// Model laporan tenant. Endpoint: /admin/reports/{revenue,expenses}.
// Backend mengembalikan {items:[...], total, summary:{...}} dengan nilai
// numerik sering berupa string (numeric Postgres) — parsing di sini defensif.

int _money(dynamic v) {
  if (v is num) return v.round();
  if (v is String) {
    final d = double.tryParse(v);
    if (d != null) return d.round();
  }
  return 0;
}

DateTime? _date(dynamic v) {
  if (v == null) return null;
  return DateTime.tryParse('$v')?.toLocal();
}

/// Satu baris transaksi (booking / POS) dari laporan pendapatan.
class TxnRow {
  final String type; // booking | pos
  final String ref;
  final String customer;
  final String resource;
  final String paymentStatus;
  final String paymentMethod;
  final int total;
  final int paid;
  final int outstanding;
  final DateTime? date;

  const TxnRow({
    required this.type,
    this.ref = '',
    this.customer = '',
    this.resource = '',
    this.paymentStatus = '',
    this.paymentMethod = '',
    this.total = 0,
    this.paid = 0,
    this.outstanding = 0,
    this.date,
  });

  factory TxnRow.fromJson(Map<String, dynamic> j) => TxnRow(
        type: '${j['tipe'] ?? ''}',
        ref: '${j['ref'] ?? ''}',
        customer: '${j['customer'] ?? ''}',
        resource: '${j['resource'] ?? ''}',
        paymentStatus: '${j['status_bayar'] ?? ''}',
        paymentMethod: '${j['payment_method'] ?? ''}',
        total: _money(j['total']),
        paid: _money(j['paid']),
        outstanding: _money(j['sisa']),
        date: _date(j['tanggal']),
      );
}

/// Satu baris biaya operasional.
class ExpenseRow {
  final String ref;
  final String title;
  final String category;
  final String vendor;
  final int amount;
  final DateTime? date;

  const ExpenseRow({
    this.ref = '',
    this.title = '',
    this.category = '',
    this.vendor = '',
    this.amount = 0,
    this.date,
  });

  factory ExpenseRow.fromJson(Map<String, dynamic> j) => ExpenseRow(
        ref: '${j['ref'] ?? ''}',
        title: '${j['judul'] ?? ''}',
        category: '${j['kategori'] ?? ''}',
        vendor: '${j['vendor'] ?? ''}',
        amount: _money(j['jumlah']),
        date: _date(j['tanggal']),
      );
}

/// Laporan gabungan untuk satu periode: pendapatan + biaya + laba.
class ReportBundle {
  final int omzet; // total pendapatan (grand total)
  final int diterima; // sudah dibayar
  final int piutang; // sisa tagihan
  final int transaksi; // jumlah transaksi
  final int biaya; // total biaya operasional
  final List<TxnRow> transactions;
  final List<ExpenseRow> expenses;

  const ReportBundle({
    this.omzet = 0,
    this.diterima = 0,
    this.piutang = 0,
    this.transaksi = 0,
    this.biaya = 0,
    this.transactions = const [],
    this.expenses = const [],
  });

  /// Laba kotor = pendapatan diterima − biaya operasional.
  int get laba => diterima - biaya;

  static int summaryInt(dynamic summary, String key) {
    if (summary is Map && summary[key] != null) return _money(summary[key]);
    return 0;
  }

  static List<TxnRow> parseTxns(dynamic res) {
    final items = (res is Map && res['items'] is List) ? res['items'] as List : const [];
    return items
        .whereType<Map>()
        .map((e) => TxnRow.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  static List<ExpenseRow> parseExpenses(dynamic res) {
    final items = (res is Map && res['items'] is List) ? res['items'] as List : const [];
    return items
        .whereType<Map>()
        .map((e) => ExpenseRow.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}
