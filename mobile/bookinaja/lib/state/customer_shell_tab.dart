import 'package:flutter/foundation.dart';

/// Notifier ringan untuk memindah tab [CustomerHomeShell] dari luar tanpa
/// menyimpan referensi state — mis. setelah pembayaran sukses, lompat ke
/// "Booking Saya" agar customer langsung melihat booking yang baru dibuat.
class CustomerShellTab {
  CustomerShellTab._();

  static final ValueNotifier<int> index = ValueNotifier<int>(discover);

  static const int discover = 0;
  static const int bookings = 1;
  static const int profile = 2;

  static void go(int i) => index.value = i;
}
