import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/report.dart';
import '../repositories/reports_repository.dart';
import '../state/reports_controller.dart';
import '../theme.dart';

/// Layar admin: laporan tenant. Ringkasan omzet/biaya/laba per periode + daftar
/// transaksi & biaya. Read-only.
class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => ReportsController(ctx.read<ReportsRepository>()),
      child: const _View(),
    );
  }
}

class _View extends StatelessWidget {
  const _View();

  @override
  Widget build(BuildContext context) {
    final c = context.watch<ReportsController>();
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Laporan',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: Column(
        children: [
          _periodSelector(c),
          Expanded(
            child: RefreshIndicator(
              color: BK.accent,
              onRefresh: c.load,
              child: c.state.when(
                loading: () => const _ReportsSkeleton(),
                error: (e) => ListView(children: [
                  const SizedBox(height: 40),
                  StateView(
                    icon: Icons.wifi_off_rounded,
                    color: BK.crit,
                    title: 'Gagal memuat laporan',
                    hint: '$e',
                    action: FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: BK.accent),
                      onPressed: c.load,
                      child: const Text('Coba lagi'),
                    ),
                  ),
                ]),
                data: (b) => _content(context, b),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _periodSelector(ReportsController c) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: BK.card,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: BK.line),
        ),
        child: Row(
          children: [
            for (final p in ReportPeriod.values)
              Expanded(
                child: GestureDetector(
                  onTap: () => c.setPeriod(p),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: c.period == p ? BK.accent : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      p.label,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: c.period == p ? Colors.white : BK.ink2,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _content(BuildContext context, ReportBundle b) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 28),
      children: [
        _labaHero(b),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _statCard('Omzet', b.omzet, BK.accent, Icons.trending_up_rounded)),
          const SizedBox(width: 10),
          Expanded(child: _statCard('Biaya', b.biaya, BK.crit, Icons.trending_down_rounded)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _statCard('Diterima', b.diterima, BK.live, Icons.check_circle_outline)),
          const SizedBox(width: 10),
          Expanded(child: _statCard('Piutang', b.piutang, BK.pend, Icons.hourglass_bottom_rounded)),
        ]),
        const SizedBox(height: 22),
        _sectionLabel('TRANSAKSI', b.transaksi),
        const SizedBox(height: 8),
        if (b.transactions.isEmpty)
          _empty('Belum ada transaksi pada periode ini.')
        else
          BKCard(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            child: Column(children: [
              for (int i = 0; i < b.transactions.length; i++) ...[
                _TxnRowTile(b.transactions[i]),
                if (i < b.transactions.length - 1) const Divider(height: 1, color: BK.line),
              ],
            ]),
          ),
        const SizedBox(height: 22),
        _sectionLabel('BIAYA OPERASIONAL', b.expenses.length),
        const SizedBox(height: 8),
        if (b.expenses.isEmpty)
          _empty('Belum ada biaya tercatat pada periode ini.')
        else
          BKCard(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            child: Column(children: [
              for (int i = 0; i < b.expenses.length; i++) ...[
                _ExpenseRowTile(b.expenses[i]),
                if (i < b.expenses.length - 1) const Divider(height: 1, color: BK.line),
              ],
            ]),
          ),
      ],
    );
  }

  Widget _labaHero(ReportBundle b) {
    final positive = b.laba >= 0;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: positive
              ? [const Color(0xFF12B76A), const Color(0xFF0E9F5C)]
              : [const Color(0xFFF04438), const Color(0xFFD92D20)],
        ),
        borderRadius: BorderRadius.circular(BK.radius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.account_balance_wallet_outlined, color: Colors.white70, size: 18),
            const SizedBox(width: 7),
            Text(positive ? 'Laba kotor' : 'Rugi',
                style: const TextStyle(color: Colors.white70, fontSize: 12.5, fontWeight: FontWeight.w600)),
          ]),
          const SizedBox(height: 8),
          Text('Rp ${rupiah(b.laba)}',
              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('Diterima Rp ${rupiah(b.diterima)} − Biaya Rp ${rupiah(b.biaya)}',
              style: const TextStyle(color: Colors.white70, fontSize: 11.5)),
        ],
      ),
    );
  }

  Widget _statCard(String label, int value, Color color, IconData icon) {
    return BKCard(
      padding: const EdgeInsets.all(13),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(label, style: const TextStyle(fontSize: 12, color: BK.ink3, fontWeight: FontWeight.w600)),
          ]),
          const SizedBox(height: 8),
          Text('Rp ${rupiah(value)}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text, int count) {
    return Row(children: [
      Text(text,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
      const SizedBox(width: 8),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(20)),
        child: Text('$count', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3)),
      ),
    ]);
  }

  Widget _empty(String msg) {
    return BKCard(
      child: Row(children: [
        const Icon(Icons.inbox_outlined, color: BK.ink3, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(msg, style: const TextStyle(fontSize: 13, color: BK.ink3))),
      ]),
    );
  }
}

/// Skeleton shimmer meniru bentuk konten laporan (hero laba, 4 stat, 2 daftar).
class _ReportsSkeleton extends StatelessWidget {
  const _ReportsSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 28),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        Container(
          height: 116,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: BK.card,
            borderRadius: BorderRadius.circular(BK.radius),
            border: Border.all(color: BK.line),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              BKSkeleton(width: 90, height: 12),
              SizedBox(height: 12),
              BKSkeleton(width: 180, height: 26),
              SizedBox(height: 10),
              BKSkeleton(width: 150, height: 10),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Row(children: [Expanded(child: _CardSkeleton()), SizedBox(width: 10), Expanded(child: _CardSkeleton())]),
        const SizedBox(height: 10),
        const Row(children: [Expanded(child: _CardSkeleton()), SizedBox(width: 10), Expanded(child: _CardSkeleton())]),
        const SizedBox(height: 22),
        const BKSkeleton(width: 120, height: 12),
        const SizedBox(height: 10),
        _listSkeleton(3),
        const SizedBox(height: 22),
        const BKSkeleton(width: 150, height: 12),
        const SizedBox(height: 10),
        _listSkeleton(2),
      ],
    );
  }

  Widget _listSkeleton(int n) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(BK.radius),
        border: Border.all(color: BK.line),
      ),
      child: Column(children: [
        for (int i = 0; i < n; i++) ...[
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Row(children: [
              BKSkeleton(width: 38, height: 38, radius: 10),
              SizedBox(width: 11),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  BKSkeleton(width: 130, height: 12),
                  SizedBox(height: 7),
                  BKSkeleton(width: 90, height: 10),
                ]),
              ),
              SizedBox(width: 8),
              BKSkeleton(width: 60, height: 14),
            ]),
          ),
          if (i < n - 1) const Divider(height: 1, color: BK.line),
        ],
      ]),
    );
  }
}

class _CardSkeleton extends StatelessWidget {
  const _CardSkeleton();
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 74,
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: BK.card,
        borderRadius: BorderRadius.circular(BK.radius),
        border: Border.all(color: BK.line),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          BKSkeleton(width: 60, height: 10),
          SizedBox(height: 10),
          BKSkeleton(width: 100, height: 16),
        ],
      ),
    );
  }
}

String _fmtDate(DateTime? d) {
  if (d == null) return '';
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  final hh = d.hour.toString().padLeft(2, '0');
  final mm = d.minute.toString().padLeft(2, '0');
  return '${d.day} ${months[d.month]} · $hh:$mm';
}

class _TxnRowTile extends StatelessWidget {
  final TxnRow t;
  const _TxnRowTile(this.t);

  @override
  Widget build(BuildContext context) {
    final isPos = t.type == 'pos';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: isPos ? BK.pendSoft : BK.accentSoft,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(isPos ? Icons.shopping_cart_outlined : Icons.event_note_outlined,
              size: 18, color: isPos ? BK.pend : BK.accent),
        ),
        const SizedBox(width: 11),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t.customer.isEmpty || t.customer == '-' ? (isPos ? 'Order kasir' : 'Booking') : t.customer,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
            const SizedBox(height: 2),
            Text('${t.resource.isEmpty ? '' : '${t.resource} · '}${_fmtDate(t.date)}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ]),
        ),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('Rp ${rupiah(t.total)}',
              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.ink)),
          const SizedBox(height: 3),
          _payPill(t.paymentStatus),
        ]),
      ]),
    );
  }

  Widget _payPill(String status) {
    final s = status.toLowerCase();
    if (s == 'settled' || s == 'paid' || s == 'lunas') return Pill.live('Lunas');
    if (s == 'partial' || s == 'dp') return Pill.pend('DP');
    if (s.isEmpty) return Pill.mut('-');
    return Pill.mut(status);
  }
}

class _ExpenseRowTile extends StatelessWidget {
  final ExpenseRow e;
  const _ExpenseRowTile(this.e);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(color: BK.critSoft, borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.receipt_long_outlined, size: 18, color: BK.crit),
        ),
        const SizedBox(width: 11),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(e.title.isEmpty ? 'Biaya' : e.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
            const SizedBox(height: 2),
            Text('${e.category.isEmpty ? '' : '${e.category} · '}${_fmtDate(e.date)}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
          ]),
        ),
        const SizedBox(width: 8),
        Text('− Rp ${rupiah(e.amount)}',
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: BK.crit)),
      ]),
    );
  }
}
