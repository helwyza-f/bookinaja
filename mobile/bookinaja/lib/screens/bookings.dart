import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import '../theme.dart';
import '../models/booking.dart';
import '../state/bookings_controller.dart';
import 'booking_detail.dart';
import 'create_booking.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});
  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  bool _calendar = false; // false = List, true = Kalender
  DateTime _focused = DateTime.now();
  DateTime _selected = DateUtils.dateOnly(DateTime.now());
  CalendarFormat _format = CalendarFormat.month;

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<BookingsController>();
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Booking', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: BK.ink)),
                  SizedBox(height: 2),
                  Text('Semua booking · cari & kelola', style: TextStyle(fontSize: 12, color: BK.ink3, fontWeight: FontWeight.w500)),
                ],
              ),
              const Spacer(),
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: BK.accent, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10)),
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateBookingScreen())),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Baru'),
              ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: _viewToggle(),
          ),
          const SizedBox(height: 8),
          Expanded(child: _calendar ? _calendarView(ctrl) : _listView(ctrl)),
        ],
      ),
    );
  }

  // ── Toggle List | Kalender ──────────────────────────────────────────────────
  Widget _viewToggle() {
    Widget seg(bool cal, String label, IconData icon) {
      final on = _calendar == cal;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() => _calendar = cal),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: on ? BK.card : Colors.transparent,
              borderRadius: BorderRadius.circular(9),
              boxShadow: on ? [BoxShadow(color: BK.ink.withValues(alpha: .06), blurRadius: 6, offset: const Offset(0, 2))] : null,
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(icon, size: 15, color: on ? BK.accent : BK.ink3),
              const SizedBox(width: 6),
              Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: on ? BK.ink : BK.ink3)),
            ]),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: BK.card2, borderRadius: BorderRadius.circular(11)),
      child: Row(children: [
        seg(false, 'List', Icons.view_list_rounded),
        seg(true, 'Kalender', Icons.calendar_month_rounded),
      ]),
    );
  }

  // ── Mode List ───────────────────────────────────────────────────────────────
  static const _filters = ['Semua', 'Aktif', 'DP', 'Lunas', 'Batal'];

  Widget _listView(BookingsController ctrl) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: _SearchField(ctrl)),
        const SizedBox(height: 11),
        SizedBox(
          height: 34,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _filters.length,
            separatorBuilder: (_, _) => const SizedBox(width: 7),
            itemBuilder: (_, i) {
              final on = ctrl.filter == i;
              return GestureDetector(
                onTap: () => ctrl.setFilter(i),
                child: Container(
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(horizontal: 13),
                  decoration: BoxDecoration(
                    color: on ? BK.ink : BK.card,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: on ? BK.ink : BK.line),
                  ),
                  child: Text(_filters[i], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: on ? Colors.white : BK.ink2)),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: ctrl.state.when(
            loading: () => const LoadingList(),
            error: (e) => StateView(
              icon: Icons.wifi_off_rounded,
              color: BK.crit,
              title: 'Gagal memuat booking',
              hint: '$e',
              action: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: BK.accent),
                onPressed: () => ctrl.load(),
                child: const Text('Coba lagi'),
              ),
            ),
            data: (_) {
              final list = ctrl.filtered;
              if (list.isEmpty) {
                return const StateView(icon: Icons.event_busy, color: BK.ink3, title: 'Tidak ada booking', hint: 'Belum ada booking di filter ini.');
              }
              return RefreshIndicator(
                onRefresh: ctrl.load,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _BookingRow(list[i]),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ── Mode Kalender ───────────────────────────────────────────────────────────
  Widget _calendarView(BookingsController ctrl) {
    return ctrl.state.when(
      loading: () => const LoadingList(),
      error: (e) => StateView(
        icon: Icons.wifi_off_rounded,
        color: BK.crit,
        title: 'Gagal memuat booking',
        hint: '$e',
        action: FilledButton(
          style: FilledButton.styleFrom(backgroundColor: BK.accent),
          onPressed: () => ctrl.load(),
          child: const Text('Coba lagi'),
        ),
      ),
      data: (_) {
        final all = ctrl.state.data ?? const <Booking>[];
        // Kelompokkan per hari (berdasarkan startAt lokal) untuk marker & agenda.
        final byDay = <DateTime, List<Booking>>{};
        for (final b in all) {
          final d = b.startAt;
          if (d == null) continue;
          final key = DateUtils.dateOnly(d);
          (byDay[key] ??= []).add(b);
        }
        List<Booking> eventsFor(DateTime day) => byDay[DateUtils.dateOnly(day)] ?? const [];

        final agenda = [...eventsFor(_selected)]
          ..sort((a, b) => (a.startAt ?? DateTime(0)).compareTo(b.startAt ?? DateTime(0)));

        return RefreshIndicator(
          onRefresh: ctrl.load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
            children: [
              _calendarCard(eventsFor),
              const SizedBox(height: 14),
              Row(children: [
                Text(_agendaLabel(_selected),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: BK.ink)),
                const SizedBox(width: 8),
                if (agenda.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                    decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(999)),
                    child: Text('${agenda.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: BK.accent)),
                  ),
              ]),
              const SizedBox(height: 10),
              if (agenda.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 24),
                  child: Center(
                    child: Column(children: [
                      const Icon(Icons.event_available_outlined, size: 34, color: BK.ink3),
                      const SizedBox(height: 8),
                      const Text('Tidak ada booking', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: BK.ink)),
                      const SizedBox(height: 2),
                      Text('Tak ada jadwal di ${_agendaLabel(_selected).toLowerCase()}.',
                          style: const TextStyle(fontSize: 12, color: BK.ink3)),
                    ]),
                  ),
                )
              else
                for (final b in agenda) ...[
                  _AgendaRow(b),
                  const SizedBox(height: 10),
                ],
            ],
          ),
        );
      },
    );
  }

  Widget _calendarCard(List<Booking> Function(DateTime) eventsFor) {
    return BKCard(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
      child: TableCalendar<Booking>(
        firstDay: DateTime.utc(2020, 1, 1),
        lastDay: DateTime.utc(2035, 12, 31),
        focusedDay: _focused,
        currentDay: DateUtils.dateOnly(DateTime.now()),
        selectedDayPredicate: (d) => DateUtils.isSameDay(d, _selected),
        calendarFormat: _format,
        availableCalendarFormats: const {
          CalendarFormat.month: 'Bulan',
          CalendarFormat.twoWeeks: '2 Minggu',
          CalendarFormat.week: 'Minggu',
        },
        startingDayOfWeek: StartingDayOfWeek.monday,
        eventLoader: eventsFor,
        onDaySelected: (sel, foc) => setState(() {
          _selected = DateUtils.dateOnly(sel);
          _focused = foc;
        }),
        onFormatChanged: (f) => setState(() => _format = f),
        onPageChanged: (foc) => _focused = foc,
        headerStyle: const HeaderStyle(
          titleCentered: true,
          formatButtonShowsNext: false,
          titleTextStyle: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink),
          formatButtonTextStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.accent),
          formatButtonDecoration: BoxDecoration(
            color: BK.accentSoft,
            borderRadius: BorderRadius.all(Radius.circular(8)),
          ),
          leftChevronIcon: Icon(Icons.chevron_left, color: BK.ink2),
          rightChevronIcon: Icon(Icons.chevron_right, color: BK.ink2),
        ),
        daysOfWeekStyle: const DaysOfWeekStyle(
          weekdayStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3),
          weekendStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.ink3),
        ),
        calendarStyle: const CalendarStyle(
          outsideDaysVisible: false,
          todayDecoration: BoxDecoration(color: BK.accentSoft, shape: BoxShape.circle),
          todayTextStyle: TextStyle(color: BK.accent, fontWeight: FontWeight.w800),
          selectedDecoration: BoxDecoration(color: BK.accent, shape: BoxShape.circle),
          selectedTextStyle: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
          defaultTextStyle: TextStyle(color: BK.ink, fontWeight: FontWeight.w600),
          weekendTextStyle: TextStyle(color: BK.ink, fontWeight: FontWeight.w600),
          markersMaxCount: 1,
        ),
        calendarBuilders: CalendarBuilders<Booking>(
          markerBuilder: (context, day, events) {
            if (events.isEmpty) return null;
            final sel = DateUtils.isSameDay(day, _selected);
            return Positioned(
              bottom: 4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: sel ? Colors.white : BK.accent,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('${events.length}',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: sel ? BK.accent : Colors.white)),
              ),
            );
          },
        ),
      ),
    );
  }

  String _agendaLabel(DateTime d) {
    final today = DateUtils.dateOnly(DateTime.now());
    if (DateUtils.isSameDay(d, today)) return 'Hari ini';
    if (DateUtils.isSameDay(d, today.add(const Duration(days: 1)))) return 'Besok';
    if (DateUtils.isSameDay(d, today.subtract(const Duration(days: 1)))) return 'Kemarin';
    const dow = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return '${dow[d.weekday - 1]}, ${d.day} ${mon[d.month - 1]}';
  }
}

/// Baris agenda kalender — menonjolkan jam, lalu customer & resource.
class _AgendaRow extends StatelessWidget {
  final Booking b;
  const _AgendaRow(this.b);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: () async {
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: b)));
        if (context.mounted) context.read<BookingsController>().load();
      },
      child: BKCard(
        child: Row(children: [
          SizedBox(
            width: 52,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(b.startAt != null
                      ? '${b.startAt!.hour.toString().padLeft(2, '0')}:${b.startAt!.minute.toString().padLeft(2, '0')}'
                      : '--:--',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: BK.ink)),
              if (b.endAt != null)
                Text('${b.endAt!.hour.toString().padLeft(2, '0')}:${b.endAt!.minute.toString().padLeft(2, '0')}',
                    style: const TextStyle(fontSize: 11, color: BK.ink3)),
            ]),
          ),
          Container(width: 1, height: 38, color: BK.line, margin: const EdgeInsets.symmetric(horizontal: 12)),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(b.customer, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
              const SizedBox(height: 2),
              Text(b.resource, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          const SizedBox(width: 8),
          statusPill(b.status),
        ]),
      ),
    );
  }
}

class _BookingRow extends StatelessWidget {
  final Booking b;
  const _BookingRow(this.b);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(BK.radius),
      onTap: () async {
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: b)));
        if (context.mounted) context.read<BookingsController>().load();
      },
      child: BKCard(
        child: Row(children: [
          _avatar(b.customer),
          const SizedBox(width: 11),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(b.customer, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: BK.ink)),
              const SizedBox(height: 2),
              Text('${b.resource} · ${b.time}', style: const TextStyle(fontSize: 11.5, color: BK.ink3)),
            ]),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            statusPill(b.status),
            const SizedBox(height: 4),
            Text('Rp${(b.total / 1000).round()}rb', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: BK.ink2)),
          ]),
        ]),
      ),
    );
  }
}

/// Avatar inisial customer (menggantikan kotak gradient generik).
Widget _avatar(String name) {
  final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : '?';
  return Container(
    width: 44, height: 44, alignment: Alignment.center,
    decoration: BoxDecoration(color: BK.accentSoft, borderRadius: BorderRadius.circular(12)),
    child: Text(initial, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: BK.accent)),
  );
}

/// Kolom pencarian booking (nama / kode) — filter lokal, langsung.
class _SearchField extends StatefulWidget {
  final BookingsController ctrl;
  const _SearchField(this.ctrl);
  @override
  State<_SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<_SearchField> {
  final _c = TextEditingController();

  @override
  void initState() {
    super.initState();
    _c.text = widget.ctrl.query;
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BKCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      child: Row(children: [
        const Icon(Icons.search, size: 18, color: BK.ink3),
        const SizedBox(width: 10),
        Expanded(child: TextField(
          controller: _c,
          onChanged: widget.ctrl.setQuery,
          textInputAction: TextInputAction.search,
          style: const TextStyle(fontSize: 13.5, color: BK.ink),
          decoration: const InputDecoration(hintText: 'Cari nama / kode…', border: InputBorder.none, isDense: true, contentPadding: EdgeInsets.symmetric(vertical: 12)),
        )),
        if (_c.text.isNotEmpty)
          GestureDetector(
            onTap: () { _c.clear(); widget.ctrl.setQuery(''); setState(() {}); },
            child: const Icon(Icons.close, size: 17, color: BK.ink3),
          ),
      ]),
    );
  }
}

/// Pill status booking konsisten di seluruh app.
Pill statusPill(BookingStatus s) {
  switch (s) {
    case BookingStatus.live:
      return Pill.live('Live');
    case BookingStatus.review:
      return Pill.crit('Review');
    case BookingStatus.dp:
      return Pill.pend('DP');
    case BookingStatus.paid:
      return Pill.live('Lunas');
    case BookingStatus.cancelled:
      return Pill.mut('Batal');
    case BookingStatus.noShow:
      return Pill.mut('No-show');
    case BookingStatus.pending:
      return Pill.acc('Pending');
  }
}
