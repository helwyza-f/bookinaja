import 'dart:io';

import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

/// Satu printer Bluetooth (nama + alamat MAC).
class BtPrinter {
  final String name;
  final String mac;
  const BtPrinter(this.name, this.mac);
}

/// Bungkus tipis di atas print_bluetooth_thermal + esc_pos_utils_plus untuk
/// cetak struk ke printer thermal 58mm. Bekerja di Android (Bluetooth classic)
/// & iOS (BLE) lewat plugin yang sama.
class ThermalPrinter {
  ThermalPrinter._();
  static final ThermalPrinter instance = ThermalPrinter._();

  /// Minta izin Bluetooth runtime (Android 12+: scan/connect; lama: lokasi).
  /// iOS: izin diminta otomatis oleh sistem saat akses pertama.
  Future<bool> ensurePermissions() async {
    if (!Platform.isAndroid) return true;
    final statuses = await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.locationWhenInUse,
    ].request();
    // Cukup salah satu jalur (baru / lama) yang granted.
    final newOk = (statuses[Permission.bluetoothConnect]?.isGranted ?? false) &&
        (statuses[Permission.bluetoothScan]?.isGranted ?? false);
    final legacyOk = statuses[Permission.locationWhenInUse]?.isGranted ?? false;
    return newOk || legacyOk;
  }

  Future<bool> get bluetoothEnabled => PrintBluetoothThermal.bluetoothEnabled;

  Future<bool> get isConnected => PrintBluetoothThermal.connectionStatus;

  /// Daftar printer yang sudah dipasangkan (paired) di setelan HP.
  Future<List<BtPrinter>> pairedPrinters() async {
    final list = await PrintBluetoothThermal.pairedBluetooths;
    return list.map((e) => BtPrinter(e.name, e.macAdress)).toList();
  }

  Future<bool> connect(String mac) async {
    // Putuskan koneksi lama dulu agar tidak menumpuk sesi.
    if (await isConnected) {
      await PrintBluetoothThermal.disconnect;
    }
    return PrintBluetoothThermal.connect(macPrinterAddress: mac);
  }

  Future<void> disconnect() async {
    await PrintBluetoothThermal.disconnect;
  }

  /// Cetak teks struk (per baris) sebagai ESC/POS. Judul & footer di-bold/center.
  /// Mengembalikan true bila byte terkirim.
  Future<bool> printReceipt({
    required String title,
    required String body,
    String footer = '',
  }) async {
    if (!await isConnected) return false;
    final profile = await CapabilityProfile.load();
    final gen = Generator(PaperSize.mm58, profile);
    List<int> bytes = [];

    if (title.trim().isNotEmpty) {
      bytes += gen.text(title.trim(),
          styles: const PosStyles(
              align: PosAlign.center, bold: true, height: PosTextSize.size2, width: PosTextSize.size2));
      bytes += gen.hr();
    }

    for (final line in body.split('\n')) {
      bytes += gen.text(line, styles: const PosStyles(align: PosAlign.left));
    }

    if (footer.trim().isNotEmpty) {
      bytes += gen.hr();
      bytes += gen.text(footer.trim(), styles: const PosStyles(align: PosAlign.center, bold: true));
    }

    bytes += gen.feed(2);
    bytes += gen.cut();
    return PrintBluetoothThermal.writeBytes(bytes);
  }
}
