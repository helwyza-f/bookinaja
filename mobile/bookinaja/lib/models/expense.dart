/// Kategori pengeluaran (sinkron dengan web app).
const List<String> kExpenseCategories = [
  'Operasional',
  'Gaji',
  'Marketing',
  'Maintenance',
  'Inventory',
  'Lainnya',
];

String _fmtDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Satu catatan biaya operasional / pengeluaran tenant.
class Expense {
  final String id;
  final String title;
  final String category;
  final int amount;
  final DateTime? expenseDate;
  final String paymentMethod;
  final String vendor;
  final String notes;
  final String receiptUrl;

  const Expense({
    this.id = '',
    this.title = '',
    this.category = 'Operasional',
    this.amount = 0,
    this.expenseDate,
    this.paymentMethod = 'Cash',
    this.vendor = '',
    this.notes = '',
    this.receiptUrl = '',
  });

  bool get hasReceipt => receiptUrl.trim().isNotEmpty;

  factory Expense.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return Expense(
      id: '${j['id'] ?? ''}',
      title: '${j['title'] ?? ''}',
      category: '${j['category'] ?? 'Lainnya'}'.trim().isEmpty ? 'Lainnya' : '${j['category']}',
      amount: money(j['amount']),
      expenseDate: DateTime.tryParse('${j['expense_date'] ?? ''}')?.toLocal(),
      paymentMethod: '${j['payment_method'] ?? ''}',
      vendor: '${j['vendor'] ?? ''}',
      notes: '${j['notes'] ?? ''}',
      receiptUrl: '${j['receipt_url'] ?? ''}'.trim() == 'null' ? '' : '${j['receipt_url'] ?? ''}',
    );
  }

  Map<String, dynamic> toInput() => {
        'title': title.trim(),
        'category': category,
        'amount': amount,
        'expense_date': _fmtDate(expenseDate ?? DateTime.now()),
        'payment_method': paymentMethod.trim().isEmpty ? 'Cash' : paymentMethod.trim(),
        'vendor': vendor.trim(),
        'notes': notes.trim(),
        'receipt_url': receiptUrl.trim(),
      };

  Expense copyWith({
    String? title,
    String? category,
    int? amount,
    DateTime? expenseDate,
    String? paymentMethod,
    String? vendor,
    String? notes,
    String? receiptUrl,
  }) {
    return Expense(
      id: id,
      title: title ?? this.title,
      category: category ?? this.category,
      amount: amount ?? this.amount,
      expenseDate: expenseDate ?? this.expenseDate,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      vendor: vendor ?? this.vendor,
      notes: notes ?? this.notes,
      receiptUrl: receiptUrl ?? this.receiptUrl,
    );
  }
}

/// Ringkasan pengeluaran (dari GET /expenses/summary).
class ExpenseSummary {
  final int total;
  final int entries;
  const ExpenseSummary({this.total = 0, this.entries = 0});

  factory ExpenseSummary.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return ExpenseSummary(total: money(j['total']), entries: money(j['entries']));
  }
}
