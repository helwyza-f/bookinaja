import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../config.dart';
import 'realtime_bus.dart';
import 'realtime_event.dart';

class RealtimeClient {
  RealtimeClient._();
  static final RealtimeClient instance = RealtimeClient._();

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  String? _token;
  String? _tenantSlug;

  final Map<String, Set<String>> _channelSources = <String, Set<String>>{};
  final Set<String> _desiredChannels = <String>{};
  final Set<String> _activeChannels = <String>{};

  Timer? _reconnectTimer;
  bool _connecting = false;
  bool _manuallyClosed = true;
  int _reconnectAttempt = 0;

  void updateContext({String? token, String? tenantSlug}) {
    _token = token;
    _tenantSlug = tenantSlug;
    _log('context', 'token=${_token?.isNotEmpty == true ? "set" : "empty"} tenant=${_tenantSlug ?? "-"}');
    if (_token == null || _token!.isEmpty || _tenantSlug == null || _tenantSlug!.isEmpty) {
      close();
    } else if (_desiredChannels.isNotEmpty) {
      _ensureConnected();
    }
  }

  void setChannels(Iterable<String> channels, {String source = 'default'}) {
    _channelSources[source] = channels.map((e) => e.trim()).where((e) => e.isNotEmpty).toSet();
    _log('channels:set', 'source=$source desired=${_channelSources[source]?.join(",") ?? "-"}');
    _rebuildDesiredChannels();
  }

  void clearChannels({String source = 'default'}) {
    _channelSources.remove(source);
    _log('channels:clear', 'source=$source');
    _rebuildDesiredChannels();
  }

  void _rebuildDesiredChannels() {
    final previous = Set<String>.from(_desiredChannels);
    _desiredChannels
      ..clear()
      ..addAll(_channelSources.values.expand((set) => set));

    if (_desiredChannels.isEmpty) {
      _log('channels:empty', 'closing socket because no desired channels remain');
      close();
      return;
    }

    _ensureConnected();
    _syncSubscriptions(previous: previous);
  }

  void _ensureConnected() {
    if (_connecting) return;
    if (_token == null || _token!.isEmpty || _tenantSlug == null || _tenantSlug!.isEmpty) {
      RealtimeBus.instance.setStatus(RealtimeConnectionState.idle);
      return;
    }
    if (_channel != null) return;

    _manuallyClosed = false;
    _connecting = true;
    RealtimeBus.instance.setStatus(
      _reconnectAttempt > 0 ? RealtimeConnectionState.reconnecting : RealtimeConnectionState.connecting,
    );

    final uri = _buildUri();
    _log('connect:start', uri.toString());
    final channel = WebSocketChannel.connect(uri);
    _channel = channel;
    _subscription?.cancel();
    _subscription = channel.stream.listen(
      _handleMessage,
      onError: (_) => _handleDisconnect(),
      onDone: () => _handleDisconnect(),
      cancelOnError: true,
    );

    // Tunggu handshake WS benar-benar sukses sebelum menandai connected
    // dan mengirim subscribe. Tanpa await ready, error handshake (mis. respons
    // non-101 dari proxy) muncul sebagai unhandled exception dan status
    // "connected" jadi palsu.
    channel.ready.then((_) {
      if (_channel != channel) return;
      _connecting = false;
      _reconnectAttempt = 0;
      _syncSubscriptions(forceResubscribe: true);
      _log('connect:ready', 'subscribed=${_desiredChannels.join(",")}');
      RealtimeBus.instance.setStatus(RealtimeConnectionState.connected);
    }).catchError((Object err) {
      if (_channel != channel) return;
      _log('connect:error', err.toString());
      _handleDisconnect();
    });
  }

  void close() {
    _manuallyClosed = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _subscription?.cancel();
    _subscription = null;
    _channel?.sink.close();
    _channel = null;
    _connecting = false;
    _reconnectAttempt = 0;
    _activeChannels.clear();
    _log('close', 'manual=$_manuallyClosed');
    RealtimeBus.instance.setStatus(RealtimeConnectionState.idle);
  }

  void _handleMessage(dynamic message) {
    try {
      final decoded = jsonDecode(message is String ? message : utf8.decode(message as List<int>));
      if (decoded is Map<String, dynamic>) {
        final event = RealtimeEvent.fromJson(decoded);
        final extra = event.type == 'subscription_error'
            ? ' channel=${event.summary['channel'] ?? "-"} message=${event.summary['message'] ?? "-"}'
            : '';
        _log('event', '${event.type} channel=${event.channel ?? "-"} entity=${event.entityId ?? "-"}$extra');
        RealtimeBus.instance.publish(event);
        return;
      }
      if (decoded is Map) {
        final event = RealtimeEvent.fromJson(Map<String, dynamic>.from(decoded));
        final extra = event.type == 'subscription_error'
            ? ' channel=${event.summary['channel'] ?? "-"} message=${event.summary['message'] ?? "-"}'
            : '';
        _log('event', '${event.type} channel=${event.channel ?? "-"} entity=${event.entityId ?? "-"}$extra');
        RealtimeBus.instance.publish(event);
      }
    } catch (_) {
      // malformed frame diabaikan; backend bisa mengirim frame sistem lama
    }
  }

  void _handleDisconnect() {
    _subscription?.cancel();
    _subscription = null;
    _channel = null;
    _connecting = false;
    _activeChannels.clear();
    _log('disconnect', 'manual=$_manuallyClosed desired=${_desiredChannels.length}');
    if (_manuallyClosed || _desiredChannels.isEmpty) {
      RealtimeBus.instance.setStatus(RealtimeConnectionState.idle);
      return;
    }

    _reconnectAttempt += 1;
    RealtimeBus.instance.setStatus(RealtimeConnectionState.reconnecting);
    _reconnectTimer?.cancel();
    final delayMs = (1000 * _reconnectAttempt).clamp(1000, 10000).toInt();
    _reconnectTimer = Timer(Duration(milliseconds: delayMs), _ensureConnected);
  }

  void _syncSubscriptions({Set<String>? previous, bool forceResubscribe = false}) {
    final socket = _channel;
    if (socket == null) return;

    final desired = Set<String>.from(_desiredChannels);
    final added = forceResubscribe ? desired : (previous == null ? desired : desired.difference(previous));
    final removed = forceResubscribe ? <String>{} : (previous == null ? <String>{} : previous.difference(desired));

    if (added.isNotEmpty) {
      _log('subscribe', added.join(","));
      _send({'action': 'subscribe', 'channels': added.toList()});
    }
    if (removed.isNotEmpty) {
      _log('unsubscribe', removed.join(","));
      _send({'action': 'unsubscribe', 'channels': removed.toList()});
    }

    _activeChannels
      ..clear()
      ..addAll(desired);
  }

  void _send(Map<String, Object?> payload) {
    final ch = _channel;
    if (ch == null) return;
    try {
      ch.sink.add(jsonEncode(payload));
    } catch (_) {
      // ignore send errors during reconnect
    }
  }

  Uri _buildUri() {
    final base = Uri.parse(AppConfig.apiBaseUrl);
    final secure = base.scheme == 'https' || base.scheme == 'wss';
    final path = base.path.replaceAll(RegExp(r'/$'), '');
    // Bangun Uri secara eksplisit: base.replace(scheme: 'wss') tidak menyisakan
    // port default sehingga menghasilkan authority "host:0" yang ditolak proxy.
    return Uri(
      scheme: secure ? 'wss' : 'ws',
      host: base.host,
      port: base.hasPort ? base.port : (secure ? 443 : 80),
      path: '$path/realtime/ws',
      queryParameters: {
        'token': _token!,
        'slug': _tenantSlug!,
      },
    );
  }

  void _log(String tag, String message) {
    debugPrint('[realtime.$tag] $message');
  }
}
