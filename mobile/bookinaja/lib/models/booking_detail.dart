/// Bukti/percobaan pembayaran (manual verification).
class PaymentAttempt {
  final String id;
  final String methodLabel;
  final int amount;
  final String status; // submitted | awaiting_verification | verified | rejected | ...
  final String paymentScope; // deposit | settlement
  final String referenceCode;
  final String proofUrl;
  final String payerNote;
  final String adminNote;
  final String createdAt;
  final String verifiedAt;
  final String rejectedAt;

  const PaymentAttempt({
    required this.id,
    required this.methodLabel,
    required this.amount,
    required this.status,
    this.paymentScope = '',
    required this.referenceCode,
    required this.proofUrl,
    required this.payerNote,
    this.adminNote = '',
    this.createdAt = '',
    this.verifiedAt = '',
    this.rejectedAt = '',
  });

  bool get isPending => status == 'submitted' || status == 'awaiting_verification';
  bool get isVerified => status == 'verified';
  bool get isRejected => status == 'rejected' || status == 'denied' || status == 'failed';

  String get statusLabel => switch (status) {
        'verified' => 'Terverifikasi',
        'rejected' || 'denied' => 'Ditolak',
        'submitted' || 'awaiting_verification' => 'Menunggu verifikasi',
        'failed' => 'Gagal',
        'expired' => 'Kadaluarsa',
        _ => status.isEmpty ? '-' : status,
      };

  String get scopeLabel => switch (paymentScope) {
        'settlement' => 'Pelunasan',
        'deposit' => 'DP',
        _ => '',
      };

  // Waktu paling relevan untuk ditampilkan di riwayat.
  String get stampIso => verifiedAt.isNotEmpty ? verifiedAt : (rejectedAt.isNotEmpty ? rejectedAt : createdAt);

  factory PaymentAttempt.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    return PaymentAttempt(
      id: '${j['id'] ?? ''}',
      methodLabel: '${j['method_label'] ?? j['method_code'] ?? 'Pembayaran'}',
      amount: money(j['amount']),
      status: '${j['status'] ?? ''}'.toLowerCase(),
      paymentScope: '${j['payment_scope'] ?? ''}'.toLowerCase(),
      referenceCode: '${j['reference_code'] ?? ''}',
      proofUrl: '${j['proof_url'] ?? ''}',
      payerNote: '${j['payer_note'] ?? ''}',
      adminNote: '${j['admin_note'] ?? ''}',
      createdAt: '${j['created_at'] ?? j['submitted_at'] ?? ''}',
      verifiedAt: '${j['verified_at'] ?? ''}',
      rejectedAt: '${j['rejected_at'] ?? ''}',
    );
  }
}

/// Metode pembayaran tenant yang bisa dipilih admin saat mencatat pembayaran.
class PaymentMethodOption {
  final String code;
  final String displayName;
  final String category;
  final String verificationType; // manual | auto
  final bool isActive;

  const PaymentMethodOption({
    required this.code,
    required this.displayName,
    required this.category,
    required this.verificationType,
    required this.isActive,
  });

  bool get isManual => verificationType == 'manual';
  // "cash" dilayani lewat settle-cash / record-deposit khusus, bukan attempt manual.
  bool get isCash => code == 'cash' || category == 'cash';

  factory PaymentMethodOption.fromJson(Map<String, dynamic> j) => PaymentMethodOption(
        code: '${j['code'] ?? ''}'.toLowerCase(),
        displayName: '${j['display_name'] ?? j['code'] ?? 'Metode'}',
        category: '${j['category'] ?? ''}'.toLowerCase(),
        verificationType: '${j['verification_type'] ?? ''}'.toLowerCase(),
        isActive: j['is_active'] != false,
      );
}

/// Item pesanan F&B / add-on yang sudah dibeli.
class OrderLine {
  final String name;
  final int quantity;
  final int subtotal;
  const OrderLine({required this.name, required this.quantity, required this.subtotal});

  factory OrderLine.fnb(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    final qty = (j['quantity'] is num) ? (j['quantity'] as num).toInt() : 1;
    return OrderLine(name: '${j['item_name'] ?? '-'}', quantity: qty, subtotal: money(j['subtotal'] ?? (money(j['price_at_purchase']) * qty)));
  }
  factory OrderLine.option(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    final qty = (j['quantity'] is num) ? (j['quantity'] as num).toInt() : 1;
    // price_at_booking sudah TOTAL baris (unit × durasi) dari backend — jangan
    // dikali qty lagi. Fallback ke unit_price × qty kalau tak ada.
    final subtotal = j['price_at_booking'] != null ? money(j['price_at_booking']) : money(j['unit_price']) * qty;
    return OrderLine(name: '${j['item_name'] ?? '-'}', quantity: qty, subtotal: subtotal);
  }
}

/// Satu entri timeline audit.
class TimelineEvent {
  final String title;
  final String description;
  final String actorType;
  final String actorName;
  final String createdAt;
  const TimelineEvent({required this.title, required this.description, required this.actorType, required this.actorName, required this.createdAt});

  factory TimelineEvent.fromJson(Map<String, dynamic> j) => TimelineEvent(
        title: '${j['title'] ?? j['event_type'] ?? 'Aktivitas'}',
        description: '${j['description'] ?? ''}',
        actorType: '${j['actor_type'] ?? 'system'}',
        actorName: '${j['actor_name'] ?? ''}',
        createdAt: '${j['created_at'] ?? ''}',
      );
}

/// Detail booking lengkap (GET /bookings/:id) + turunan state (mengikuti web admin).
class BookingDetail {
  final String id;
  final String resourceId;
  final String statusRaw; // pending | confirmed | active | completed | cancelled
  final String paymentStatus; // unpaid | awaiting_verification | partial_paid | paid | settled | ...
  final String customerName;
  final String customerPhone;
  final String resourceName;
  final String startTime;
  final String endTime;
  final int grandTotal;
  final int paidAmount;
  final int balanceDue;
  final int depositAmount;
  final int unitPrice; // harga per unit paket utama (untuk hitung perpanjangan)
  final int unitDurationMin; // menit per unit
  final bool depositOverrideActive;
  final String depositOverrideReason;
  final String depositOverrideBy;
  final String cancellationReason;
  final String paymentMode; // partial | none | full
  final bool enableFnb;
  final bool enableAddons;
  final String internalNote;
  final int rescheduleCount;
  final List<PaymentAttempt> attempts;
  final List<OrderLine> orders;
  final List<OrderLine> options;
  final List<TimelineEvent> events;
  final List<PaymentMethodOption> paymentMethods;

  const BookingDetail({
    required this.id,
    this.resourceId = '',
    required this.statusRaw,
    required this.paymentStatus,
    required this.customerName,
    required this.customerPhone,
    required this.resourceName,
    required this.startTime,
    required this.endTime,
    required this.grandTotal,
    required this.paidAmount,
    required this.balanceDue,
    required this.depositAmount,
    this.unitPrice = 0,
    this.unitDurationMin = 60,
    required this.depositOverrideActive,
    this.depositOverrideReason = '',
    this.depositOverrideBy = '',
    this.cancellationReason = '',
    this.paymentMode = 'partial',
    this.enableFnb = true,
    this.enableAddons = true,
    this.internalNote = '',
    this.rescheduleCount = 0,
    this.attempts = const [],
    this.orders = const [],
    this.options = const [],
    this.events = const [],
    this.paymentMethods = const [],
  });

  // --- turunan status ---
  bool get isActive => statusRaw == 'active' || statusRaw == 'ongoing';
  bool get isFinal => statusRaw == 'completed' || statusRaw == 'cancelled';
  bool get hasPaidDp => paymentStatus == 'partial_paid' || paymentStatus == 'paid' || paymentStatus == 'settled' || depositAmount == 0;
  bool get isPaymentSettled => paymentStatus == 'settled' || (paymentStatus == 'paid' && balanceDue == 0);
  bool get hasPendingVerification => attempts.any((a) => a.isPending);
  bool get hasBalance => balanceDue > 0;

  List<PaymentAttempt> get pendingAttempts => attempts.where((a) => a.isPending).toList();
  // Riwayat pembayaran (sudah diverifikasi/ditolak) — terbaru dulu.
  List<PaymentAttempt> get historyAttempts {
    final list = attempts.where((a) => !a.isPending).toList();
    list.sort((a, b) => b.stampIso.compareTo(a.stampIso));
    return list;
  }

  // --- gating aksi (persis web admin) ---
  bool get canConfirm => statusRaw == 'pending' && paymentStatus != 'awaiting_verification';
  bool get canStart => (statusRaw == 'pending' || statusRaw == 'confirmed') && (hasPaidDp || depositOverrideActive);
  bool get canComplete => isActive;
  bool get canSettle =>
      statusRaw == 'completed' && !isPaymentSettled && !hasPendingVerification && paymentStatus != 'awaiting_verification' && balanceDue > 0;
  bool get canCancel => statusRaw == 'pending' || statusRaw == 'confirmed';
  bool get canRecordDeposit =>
      (statusRaw == 'pending' || statusRaw == 'confirmed') && depositAmount > 0 && !hasPaidDp && !hasPendingVerification && !depositOverrideActive;
  bool get canOverrideDeposit => canRecordDeposit;
  bool get canExtend => isActive;
  bool get canSendReceipt => isPaymentSettled;
  // Reschedule hanya untuk booking yang belum berjalan — sesi aktif/selesai/batal
  // harus lewat cancel/complete biasa, bukan pindah jadwal diam-diam.
  bool get canReschedule => statusRaw == 'pending' || statusRaw == 'confirmed';
  // No-show: hanya booking yang sudah confirmed/aktif dan jadwal mulainya
  // sudah lewat (mencerminkan aturan backend).
  bool get canMarkNoShow {
    if (statusRaw != 'confirmed' && statusRaw != 'active') return false;
    final start = startLocal;
    return start != null && start.isBefore(DateTime.now());
  }

  // Metode manual (transfer/e-wallet dgn verifikasi manual) yang tersedia utk
  // dicatatkan admin atas nama customer → menghasilkan attempt awaiting_verification.
  List<PaymentMethodOption> get manualMethods =>
      paymentMethods.where((m) => m.isActive && m.isManual && !m.isCash).toList();

  // Catat DP non-tunai: sama gating dgn cash DP, tapi butuh metode manual tersedia.
  bool get canManualDeposit => canRecordDeposit && manualMethods.isNotEmpty;
  // Catat pelunasan non-tunai: sama gating dgn cash settle.
  bool get canManualSettlement => canSettle && manualMethods.isNotEmpty;

  // --- label meta (mengikuti web) ---
  String get sessionLabel => switch (statusRaw) {
        'active' || 'ongoing' => 'Sedang berjalan',
        'completed' => 'Selesai',
        'confirmed' => 'Siap mulai',
        'cancelled' => 'Dibatalkan',
        'no_show' => 'Tidak hadir',
        _ => 'Menunggu',
      };

  // Mode pembayaran (mengikuti web): full = bayar penuh di awal.
  bool get isFullMode => paymentMode == 'full';
  bool get isNoneMode => paymentMode == 'none';

  // Istilah tahap bayar di muka menyesuaikan mode (web: "Bayar Penuh" vs "DP").
  String get depositTerm => isFullMode ? 'Pembayaran' : 'DP';
  String get depositActionLabel => isFullMode ? 'Bayar Penuh' : 'Bayar DP';

  String get paymentLabel {
    if (isPaymentSettled) return 'Lunas';
    if (paymentStatus == 'partial_paid' || paymentStatus == 'paid') {
      return isFullMode ? 'Pembayaran masuk' : 'DP masuk';
    }
    if (paymentStatus == 'awaiting_verification') return 'Menunggu verifikasi';
    if (paymentStatus == 'expired') return 'Kadaluarsa';
    if (paymentStatus == 'failed' || paymentStatus == 'denied') return 'Gagal';
    if (depositOverrideActive || isNoneMode) return 'Tanpa DP';
    return 'Menunggu pembayaran';
  }

  factory BookingDetail.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    final total = money(j['grand_total']);
    final paid = money(j['paid_amount']);
    List asList(dynamic v) => v is List ? v : const [];
    final rawAttempts = asList(j['payment_attempts']);
    return BookingDetail(
      id: '${j['id'] ?? ''}',
      resourceId: '${j['resource_id'] ?? ''}',
      statusRaw: '${j['status'] ?? ''}'.toLowerCase(),
      paymentStatus: '${j['payment_status'] ?? ''}'.toLowerCase(),
      customerName: '${j['customer_name'] ?? 'Tanpa nama'}',
      customerPhone: '${j['customer_phone'] ?? ''}',
      resourceName: '${j['resource_name'] ?? '-'}',
      startTime: '${j['start_time'] ?? ''}',
      endTime: '${j['end_time'] ?? ''}',
      grandTotal: total,
      paidAmount: paid,
      balanceDue: j['balance_due'] != null ? money(j['balance_due']) : (total - paid).clamp(0, total),
      depositAmount: money(j['deposit_amount']),
      unitPrice: money(j['unit_price']),
      unitDurationMin: (j['unit_duration'] is num) ? (j['unit_duration'] as num).toInt() : 60,
      depositOverrideActive: j['deposit_override_active'] == true,
      depositOverrideReason: '${j['deposit_override_reason'] ?? ''}',
      depositOverrideBy: '${j['deposit_override_by'] ?? ''}',
      cancellationReason: '${j['cancellation_reason'] ?? ''}',
      paymentMode: '${j['payment_mode'] ?? 'partial'}'.toLowerCase(),
      enableFnb: (j['controller_features'] is Map)
          ? (j['controller_features'] as Map)['enable_fnb'] != false
          : true,
      enableAddons: (j['controller_features'] is Map)
          ? (j['controller_features'] as Map)['enable_addons'] != false
          : true,
      internalNote: '${j['internal_note'] ?? ''}',
      rescheduleCount: (j['reschedule_count'] is num) ? (j['reschedule_count'] as num).toInt() : 0,
      attempts: rawAttempts.whereType<Map>().map((e) => PaymentAttempt.fromJson(Map<String, dynamic>.from(e))).toList(),
      orders: asList(j['orders']).whereType<Map>().map((e) => OrderLine.fnb(Map<String, dynamic>.from(e))).toList(),
      options: asList(j['options']).whereType<Map>().map((e) => OrderLine.option(Map<String, dynamic>.from(e))).toList(),
      events: asList(j['events']).whereType<Map>().map((e) => TimelineEvent.fromJson(Map<String, dynamic>.from(e))).toList(),
      paymentMethods: asList(j['payment_methods']).whereType<Map>().map((e) => PaymentMethodOption.fromJson(Map<String, dynamic>.from(e))).toList(),
    );
  }

  // --- format jadwal (dipakai di hero) ---
  static const _dow = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  static const _mon = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  String get dateLabel {
    final d = DateTime.tryParse(startTime)?.toLocal();
    if (d == null) return '-';
    return '${_dow[d.weekday - 1]}, ${d.day} ${_mon[d.month - 1]} ${d.year}';
  }

  String get timeRangeLabel {
    final s = DateTime.tryParse(startTime)?.toLocal();
    if (s == null) return '-';
    final e = DateTime.tryParse(endTime)?.toLocal();
    String hm(DateTime t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return e == null ? hm(s) : '${hm(s)} – ${hm(e)}';
  }

  bool get hasSchedule => DateTime.tryParse(startTime) != null;

  // Untuk perpanjangan sesi.
  String get unitLabel => unitDurationMin == 60 ? 'jam' : 'sesi';
  DateTime? get startLocal => DateTime.tryParse(startTime)?.toLocal();
  DateTime? get endLocal => DateTime.tryParse(endTime)?.toLocal();
  int? get endMinutes {
    final e = endLocal;
    return e == null ? null : e.hour * 60 + e.minute;
  }

  /// Sisa menit sesi (dari end_time). null kalau tak ada / sudah lewat.
  int? get remainingMinutes {
    final end = DateTime.tryParse(endTime);
    if (end == null) return null;
    final diff = end.difference(DateTime.now()).inMinutes;
    return diff > 0 ? diff : 0;
  }
}
