/// Deskriptor tampilan langganan — SATU sumber kebenaran untuk hero & kartu
/// status, biar copy tak drift dan state selalu jelas. Tiga state saja
/// (trial / aktif / non-aktif); tak ada "Free" (non-aktif = grace).
library;

enum SubKind { trial, active, inactive, unknown }

/// Nada visual kartu langganan — menaik seiring fase grace agar tekanan terasa
/// tanpa memindah UI ke tab lain. soft=amber, friksi=orange, lock=merah.
enum SubTone { active, trial, soft, friction, locked, unknown }

class SubView {
  final SubKind kind;
  final SubTone tone; // warna/urgensi kartu (fase-aware)
  final String pill; // label pill: Trial | Aktif | Non-aktif | Belum aktif
  final String headline; // negara state, ringkas
  final String meaning; // satu baris: apa artinya
  final String? countdown; // baris terpisah: sisa waktu (null = tak ditampilkan)
  final String cta; // aksi utama

  const SubView({
    required this.kind,
    required this.tone,
    required this.pill,
    required this.headline,
    required this.meaning,
    required this.cta,
    this.countdown,
  });

  bool get isInactive => kind == SubKind.inactive;
  bool get isTrial => kind == SubKind.trial;
  bool get isActive => kind == SubKind.active;

  /// Bangun dari primitif (dipasok dari AuthController / SubscriptionInfo) agar
  /// model tetap bebas dependency UI. [grace] didahulukan: trial yang sudah
  /// lewat masih berstatus 'trial' tapi non-aktif.
  factory SubView.of({
    required bool grace,
    required String status,
    required String plan,
    required int? trialDaysLeft,
    DateTime? periodEnd,
    int gracePhase = 0,
    int daysToLock = 0,
  }) {
    final s = status.toLowerCase();
    if (grace) {
      // Fase lock (3): transaksi baru dikunci.
      if (gracePhase >= 3) {
        return const SubView(
          kind: SubKind.inactive,
          tone: SubTone.locked,
          pill: 'Terkunci',
          headline: 'Operasi dikunci',
          meaning: 'Transaksi, booking, & order baru dikunci. Upgrade untuk lanjut operasi.',
          cta: 'Upgrade sekarang',
        );
      }
      // Fase friksi (2): kenyamanan dicabut + hitung mundur menuju lock.
      if (gracePhase >= 2) {
        return SubView(
          kind: SubKind.inactive,
          tone: SubTone.friction,
          pill: 'Dibatasi',
          headline: 'Fitur mulai dibatasi',
          meaning: 'Export laporan, nota WhatsApp, & analitik dinonaktifkan.',
          countdown: daysToLock > 0
              ? 'Operasi terkunci dalam $daysToLock hari'
              : 'Operasi akan segera dikunci',
          cta: 'Upgrade',
        );
      }
      // Fase soft (1): fitur masih penuh, hanya "buat baru" terkunci.
      return const SubView(
        kind: SubKind.inactive,
        tone: SubTone.soft,
        pill: 'Berakhir',
        headline: 'Langganan berakhir',
        meaning: 'Transaksi & booking tetap jalan, tapi menambah item baru terkunci.',
        cta: 'Perpanjang',
      );
    }
    if (s == 'trial') {
      return SubView(
        kind: SubKind.trial,
        tone: SubTone.trial,
        pill: 'Trial',
        headline: 'Mencicipi Pro',
        meaning: 'Semua fitur Pro terbuka selama masa coba.',
        countdown: trialDaysLeft == null
            ? null
            : trialDaysLeft == 0
                ? 'Berakhir hari ini'
                : 'Sisa $trialDaysLeft hari',
        cta: 'Pilih paket',
      );
    }
    if (s == 'active') {
      return SubView(
        kind: SubKind.active,
        tone: SubTone.active,
        pill: 'Aktif',
        headline: _planLabel(plan),
        meaning: 'Langganan aktif.',
        countdown: periodEnd == null ? null : 'Berlaku sampai ${_fmtDate(periodEnd)}',
        cta: 'Kelola langganan',
      );
    }
    return const SubView(
      kind: SubKind.unknown,
      tone: SubTone.unknown,
      pill: 'Belum aktif',
      headline: 'Belum berlangganan',
      meaning: 'Pilih paket untuk buka fitur premium.',
      cta: 'Pilih paket',
    );
  }

  static String _planLabel(String plan) => switch (plan.toLowerCase()) {
        'starter' => 'Starter',
        'pro' => 'Pro',
        'scale' => 'Scale',
        _ => 'Aktif',
      };

  static String _fmtDate(DateTime d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }
}
