/// Pengaturan nota/struk tenant (`/admin/receipt-settings`). Backend menerima
/// objek Tenant utuh tapi hanya field nota/printer yang diproses; kita cukup
/// kirim subset ini.
class ReceiptSettings {
  final String title;
  final String subtitle;
  final String footer;
  final String whatsappText;
  final String template;
  final String channel; // 'whatsapp' | 'printer'
  final bool printerEnabled;
  final String printerName;
  final String printerMode; // 'bluetooth'
  final bool printerAutoPrint;
  final String printerStatus; // 'connected' | 'disconnected' | 'selected'
  final String tenantName;
  final String whatsappNumber;

  const ReceiptSettings({
    this.title = '',
    this.subtitle = '',
    this.footer = '',
    this.whatsappText = '',
    this.template = '',
    this.channel = 'whatsapp',
    this.printerEnabled = false,
    this.printerName = '',
    this.printerMode = 'bluetooth',
    this.printerAutoPrint = false,
    this.printerStatus = 'disconnected',
    this.tenantName = '',
    this.whatsappNumber = '',
  });

  static const defaultTemplate = '{tenant_name}\n'
      '{receipt_title}\n'
      '{receipt_subtitle}\n'
      '--------------------------------\n'
      'No. Booking : {booking_id}\n'
      'Tanggal     : {booking_time}\n'
      'Pelanggan   : {customer_name}\n'
      'Unit        : {resource_name}\n'
      'Kasir       : {cashier_name}\n'
      '\n'
      '{line_items}\n'
      '--------------------------------\n'
      'Total      : {grand_total}\n'
      'DP         : {deposit_amount}\n'
      'Dibayar    : {paid_amount}\n'
      'Sisa       : {balance_due}\n'
      'Metode     : {payment_method}\n'
      'Status     : {payment_status}\n'
      '\n'
      '--------------------------------\n'
      '{receipt_footer}';

  factory ReceiptSettings.fromJson(Map<String, dynamic> j) {
    String s(String k) => '${j[k] ?? ''}';
    return ReceiptSettings(
      title: s('receipt_title').isEmpty ? 'Struk Bookinaja' : s('receipt_title'),
      subtitle: s('receipt_subtitle').isEmpty ? 'Bukti transaksi resmi' : s('receipt_subtitle'),
      footer: s('receipt_footer').isEmpty ? 'Terima kasih sudah berkunjung' : s('receipt_footer'),
      whatsappText: s('receipt_whatsapp_text').isEmpty
          ? 'Berikut struk transaksi Anda dari Bookinaja.'
          : s('receipt_whatsapp_text'),
      template: s('receipt_template').isEmpty ? defaultTemplate : s('receipt_template'),
      channel: s('receipt_channel').isEmpty ? 'whatsapp' : s('receipt_channel'),
      printerEnabled: j['printer_enabled'] == true,
      printerName: s('printer_name'),
      printerMode: s('printer_mode').isEmpty ? 'bluetooth' : s('printer_mode'),
      printerAutoPrint: j['printer_auto_print'] == true,
      printerStatus: s('printer_status').isEmpty ? 'disconnected' : s('printer_status'),
      tenantName: s('name'),
      whatsappNumber: s('whatsapp_number'),
    );
  }

  Map<String, dynamic> toJson() => {
        'receipt_title': title,
        'receipt_subtitle': subtitle,
        'receipt_footer': footer,
        'receipt_whatsapp_text': whatsappText,
        'receipt_template': template,
        'receipt_channel': printerEnabled ? 'printer' : 'whatsapp',
        'printer_enabled': printerEnabled,
        'printer_name': printerName,
        'printer_mode': 'bluetooth',
        'printer_endpoint': '',
        'printer_auto_print': printerAutoPrint,
        'printer_status': printerStatus,
      };

  ReceiptSettings copyWith({
    String? title,
    String? subtitle,
    String? footer,
    String? whatsappText,
    String? template,
    String? channel,
    bool? printerEnabled,
    String? printerName,
    bool? printerAutoPrint,
    String? printerStatus,
  }) =>
      ReceiptSettings(
        title: title ?? this.title,
        subtitle: subtitle ?? this.subtitle,
        footer: footer ?? this.footer,
        whatsappText: whatsappText ?? this.whatsappText,
        template: template ?? this.template,
        channel: channel ?? this.channel,
        printerEnabled: printerEnabled ?? this.printerEnabled,
        printerName: printerName ?? this.printerName,
        printerMode: printerMode,
        printerAutoPrint: printerAutoPrint ?? this.printerAutoPrint,
        printerStatus: printerStatus ?? this.printerStatus,
        tenantName: tenantName,
        whatsappNumber: whatsappNumber,
      );

  /// Render template dengan data contoh untuk preview.
  String renderPreview() {
    final sample = <String, String>{
      'tenant_name': tenantName.isEmpty ? 'Bookinaja Arena' : tenantName,
      'receipt_title': title,
      'receipt_subtitle': subtitle,
      'cashier_name': 'Admin',
      'customer_name': 'Helwiza',
      'booking_id': 'BK-1024',
      'resource_name': 'Lapangan Futsal',
      'booking_time': '15 Mei 2026 19:00-20:00',
      'line_items': 'RINCIAN\n'
          'Lapangan Futsal        Rp 120.000\n'
          '  1 x Rp 120.000\n'
          '\n'
          'ADD-ON\n'
          'Sewa Bola               Rp 30.000\n'
          '  1 x Rp 30.000',
      'grand_total': 'Rp 150.000',
      'deposit_amount': 'Rp 50.000',
      'paid_amount': 'Rp 150.000',
      'balance_due': 'Rp 0',
      'payment_method': 'QRIS',
      'payment_status': 'Lunas',
      'receipt_footer': footer,
    };
    var out = template.isEmpty ? defaultTemplate : template;
    sample.forEach((k, v) => out = out.replaceAll('{$k}', v));
    return out;
  }
}
