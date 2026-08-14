import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';
import '../config.dart';

/// Error terstruktur dari API — pesan siap tampil ke user.
class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() => message;
}

/// Klien HTTP tipis untuk REST API Go. Menyisipkan bearer token &
/// header tenant, plus penanganan error & logging debug yang seragam.
class ApiClient {
  ApiClient({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final http.Client _client;
  final String _baseUrl;

  String? _token;
  String? _tenantSlug;

  String? get token => _token;
  String? get tenantSlug => _tenantSlug;

  void setToken(String? token) => _token = token;
  void setTenant(String? slug) => _tenantSlug = slug;
  void clearAuth() {
    _token = null;
    _tenantSlug = null;
  }

  Map<String, String> _headers() => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (_token != null && _token!.isNotEmpty) 'Authorization': 'Bearer $_token',
        if (_tenantSlug != null && _tenantSlug!.isNotEmpty) 'X-Tenant-Slug': _tenantSlug!,
      };

  Uri _uri(String path) => Uri.parse('$_baseUrl$path');

  Future<dynamic> get(String path) => _request('GET', path);
  Future<dynamic> post(String path, {Object? body}) => _request('POST', path, body: body);
  Future<dynamic> put(String path, {Object? body}) => _request('PUT', path, body: body);

  /// Upload satu file (multipart) — field 'image', dipakai untuk bukti pembayaran.
  /// Mengembalikan body JSON terurai (mis. {url, mime_type, size}).
  Future<dynamic> uploadFile(String path, String filePath, {String field = 'image'}) async {
    final uri = _uri(path);
    final sw = Stopwatch()..start();
    final req = http.MultipartRequest('POST', uri);
    if (_token != null && _token!.isNotEmpty) req.headers['Authorization'] = 'Bearer $_token';
    if (_tenantSlug != null && _tenantSlug!.isNotEmpty) req.headers['X-Tenant-Slug'] = _tenantSlug!;
    final mimeType = lookupMimeType(filePath) ?? 'image/jpeg';
    final parts = mimeType.split('/');
    req.files.add(await http.MultipartFile.fromPath(field, filePath, contentType: MediaType(parts.first, parts.last)));

    if (kDebugMode) debugPrint('┌── ▶ API UPLOAD ${uri.path}  file=$filePath');
    http.Response res;
    try {
      final streamed = await _client.send(req).timeout(AppConfig.requestTimeout);
      res = await http.Response.fromStream(streamed);
    } on TimeoutException {
      _logError('POST', uri, 'UPLOAD TIMEOUT setelah ${sw.elapsedMilliseconds}ms');
      throw ApiException(0, 'Upload timeout. Cek jaringan lalu coba lagi.');
    } catch (e) {
      _logError('POST', uri, 'UPLOAD ERROR: $e');
      throw ApiException(0, 'Gagal mengunggah file. Cek koneksi.');
    }

    _logResponse('POST', uri, res.statusCode, sw.elapsedMilliseconds, res.body);
    final parsed = res.body.isEmpty ? null : _tryDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return parsed;
    final msg = (parsed is Map && parsed['error'] is String) ? parsed['error'] as String : 'Gagal upload (${res.statusCode}).';
    throw ApiException(res.statusCode, msg);
  }

  Future<dynamic> _request(String method, String path, {Object? body}) async {
    final uri = _uri(path);
    final headers = _headers();
    final bodyStr = body == null ? null : jsonEncode(body);
    final sw = Stopwatch()..start();

    _logRequest(method, uri, headers, bodyStr);

    http.Response res;
    try {
      final future = switch (method) {
        'POST' => _client.post(uri, headers: headers, body: bodyStr ?? '{}'),
        'PUT' => _client.put(uri, headers: headers, body: bodyStr ?? '{}'),
        _ => _client.get(uri, headers: headers),
      };
      res = await future.timeout(AppConfig.requestTimeout);
    } on TimeoutException {
      _logError(method, uri, 'TIMEOUT setelah ${sw.elapsedMilliseconds}ms');
      throw ApiException(0, 'Koneksi timeout. Cek jaringan lalu coba lagi.');
    } catch (e) {
      _logError(method, uri, 'NETWORK ERROR: $e');
      throw ApiException(0, 'Tidak bisa terhubung ke server. Cek koneksi.');
    }

    _logResponse(method, uri, res.statusCode, sw.elapsedMilliseconds, res.body);

    final parsed = res.body.isEmpty ? null : _tryDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return parsed;

    final msg = (parsed is Map && parsed['error'] is String)
        ? parsed['error'] as String
        : 'Terjadi kesalahan (${res.statusCode}).';
    throw ApiException(res.statusCode, msg);
  }

  dynamic _tryDecode(String s) {
    try {
      return jsonDecode(s);
    } catch (_) {
      return s;
    }
  }

  // ---------------- Logging (hanya di debug) ----------------

  void _logRequest(String method, Uri uri, Map<String, String> headers, String? body) {
    if (!kDebugMode) return;
    final safeHeaders = Map<String, String>.from(headers);
    if (safeHeaders.containsKey('Authorization')) {
      safeHeaders['Authorization'] = 'Bearer ${_maskToken(_token)}';
    }
    debugPrint('┌── ▶ API $method ${uri.path}');
    debugPrint('│ URL     : $uri');
    debugPrint('│ Headers : $safeHeaders');
    if (body != null) debugPrint('│ Payload : ${_truncate(body)}');
    debugPrint('└──');
  }

  void _logResponse(String method, Uri uri, int status, int ms, String body) {
    if (!kDebugMode) return;
    final mark = (status >= 200 && status < 300) ? '✔' : '✖';
    debugPrint('┌── ◀ API $mark $status $method ${uri.path} (${ms}ms)');
    debugPrint('│ Response: ${_truncate(body)}');
    debugPrint('└──');
  }

  void _logError(String method, Uri uri, String msg) {
    if (!kDebugMode) return;
    debugPrint('┌── ✖ API $method ${uri.path}');
    debugPrint('│ $msg');
    debugPrint('└──');
  }

  String _maskToken(String? t) {
    if (t == null || t.isEmpty) return '';
    if (t.length <= 12) return '••••';
    return '${t.substring(0, 6)}…${t.substring(t.length - 4)}';
  }

  String _truncate(String s, [int max = 1200]) =>
      s.length <= max ? s : '${s.substring(0, max)}… (${s.length} chars)';

  void dispose() => _client.close();
}
