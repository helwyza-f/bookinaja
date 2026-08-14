import 'dart:async';
import 'realtime_event.dart';

enum RealtimeConnectionState { idle, connecting, connected, reconnecting }

class RealtimeBus {
  RealtimeBus._();
  static final RealtimeBus instance = RealtimeBus._();

  final StreamController<RealtimeEvent> _events = StreamController<RealtimeEvent>.broadcast();
  final StreamController<RealtimeConnectionState> _status =
      StreamController<RealtimeConnectionState>.broadcast();

  Stream<RealtimeEvent> get events => _events.stream;
  Stream<RealtimeConnectionState> get status => _status.stream;

  void publish(RealtimeEvent event) {
    if (!_events.isClosed) _events.add(event);
  }

  void setStatus(RealtimeConnectionState state) {
    if (!_status.isClosed) _status.add(state);
  }
}
