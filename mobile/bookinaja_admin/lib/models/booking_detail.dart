/// Detail booking lengkap (GET /bookings/:id) + turunan untuk gating aksi.
/// Aturan transisi mengikuti validateBookingTransition di backend.
class BookingDetail {
  final String id;
  final String statusRaw; // pending | confirmed | active | completed | cancelled
  final String paymentStatus; // unpaid | partial_paid | paid | settled | ...
  final String customerName;
  final String customerPhone;
  final String resourceName;
  final String startTime;
  final String endTime;
  final int grandTotal;
  final int paidAmount;
  final int balanceDue;
  final int depositAmount;
  final bool depositOverrideActive;
  final String cancellationReason;

  const BookingDetail({
    required this.id,
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
    required this.depositOverrideActive,
    this.cancellationReason = '',
  });

  bool get isFinal => statusRaw == 'completed' || statusRaw == 'cancelled';
  bool get canConfirm => statusRaw == 'pending';
  bool get canStart => statusRaw == 'pending' || statusRaw == 'confirmed';
  bool get canEnd => statusRaw == 'active' || statusRaw == 'ongoing';
  bool get canCancel => statusRaw == 'pending' || statusRaw == 'confirmed';

  /// DP wajib dicatat dulu sebelum sesi bisa dimulai.
  bool get needsDeposit =>
      depositAmount > 0 &&
      !depositOverrideActive &&
      !(paymentStatus == 'partial_paid' || paymentStatus == 'paid' || paymentStatus == 'settled');

  bool get hasBalance => balanceDue > 0;

  factory BookingDetail.fromJson(Map<String, dynamic> j) {
    int money(dynamic v) => v is num ? v.round() : int.tryParse('$v') ?? 0;
    final total = money(j['grand_total']);
    final paid = money(j['paid_amount']);
    return BookingDetail(
      id: '${j['id'] ?? ''}',
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
      depositOverrideActive: j['deposit_override_active'] == true,
      cancellationReason: '${j['cancellation_reason'] ?? ''}',
    );
  }
}
