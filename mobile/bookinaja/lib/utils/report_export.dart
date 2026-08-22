import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../models/report.dart';
import '../ui/toast.dart';

/// Bungkus satu sel CSV: escape kutip & bungkus bila mengandung koma/kutip/newline.
String _cell(Object? v) {
  final s = '${v ?? ''}';
  if (s.contains(',') || s.contains('"') || s.contains('\n')) {
    return '"${s.replaceAll('"', '""')}"';
  }
  return s;
}

String _date(DateTime? d) {
  if (d == null) return '';
  final l = d.toLocal();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${l.year}-${two(l.month)}-${two(l.day)} ${two(l.hour)}:${two(l.minute)}';
}

/// Susun CSV laporan (transaksi + biaya + ringkasan) dari [bundle].
String buildReportCsv(ReportBundle b, String periodLabel) {
  final sb = StringBuffer();
  sb.writeln('Laporan,$periodLabel');
  sb.writeln('');
  sb.writeln('Ringkasan');
  sb.writeln('Omzet,${b.omzet}');
  sb.writeln('Diterima,${b.diterima}');
  sb.writeln('Piutang,${b.piutang}');
  sb.writeln('Transaksi,${b.transaksi}');
  sb.writeln('Biaya,${b.biaya}');
  sb.writeln('');

  sb.writeln('Transaksi');
  sb.writeln('Tanggal,Tipe,Ref,Customer,Resource,Metode,Status,Total,Dibayar,Sisa');
  for (final t in b.transactions) {
    sb.writeln([
      _date(t.date), t.type, _cell(t.ref), _cell(t.customer), _cell(t.resource),
      t.paymentMethod, t.paymentStatus, t.total, t.paid, t.outstanding,
    ].map(_cell).join(','));
  }

  if (b.expenses.isNotEmpty) {
    sb.writeln('');
    sb.writeln('Biaya operasional');
    sb.writeln('Tanggal,Ref,Judul,Kategori,Vendor,Jumlah');
    for (final e in b.expenses) {
      sb.writeln([
        _date(e.date), _cell(e.ref), _cell(e.title), _cell(e.category), _cell(e.vendor), e.amount,
      ].map(_cell).join(','));
    }
  }
  return sb.toString();
}

/// Tulis CSV ke file sementara lalu buka share sheet OS. Menampilkan toast bila
/// gagal. [periodLabel] dipakai untuk nama file & judul share.
Future<void> shareReportCsv(BuildContext context, ReportBundle bundle, String periodLabel) async {
  try {
    final csv = buildReportCsv(bundle, periodLabel);
    final dir = await getTemporaryDirectory();
    final stamp = DateTime.now().toLocal().toString().substring(0, 10);
    final slug = periodLabel.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-');
    final file = File('${dir.path}/laporan-$slug-$stamp.csv');
    await file.writeAsString(csv);
    await Share.shareXFiles([XFile(file.path, mimeType: 'text/csv')], subject: 'Laporan $periodLabel');
  } catch (e) {
    if (context.mounted) {
      BkToast.error(context, 'Gagal export', subtitle: '$e'.replaceFirst('Exception: ', ''));
    }
  }
}
