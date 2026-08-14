// Server statis sederhana untuk menyajikan folder build/web.
// Jalankan: dart serve.dart [port]
import 'dart:io';

Future<void> main(List<String> args) async {
  final port = args.isNotEmpty ? int.parse(args[0]) : 8080;
  final root = Directory('build/web');
  if (!root.existsSync()) {
    stderr.writeln('build/web tidak ada. Jalankan: flutter build web');
    exit(1);
  }
  final server = await HttpServer.bind(InternetAddress.anyIPv4, port);
  stdout.writeln('Serving build/web on http://0.0.0.0:$port');
  await for (final req in server) {
    var path = req.uri.path;
    if (path == '/' || path.isEmpty) path = '/index.html';
    var file = File('${root.path}$path');
    if (!file.existsSync()) file = File('${root.path}/index.html'); // SPA fallback
    try {
      final ext = file.path.split('.').last.toLowerCase();
      final ct = {
        'html': 'text/html; charset=utf-8',
        'js': 'application/javascript',
        'json': 'application/json',
        'css': 'text/css',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'svg': 'image/svg+xml',
        'wasm': 'application/wasm',
        'ttf': 'font/ttf',
        'otf': 'font/otf',
      }[ext] ?? 'application/octet-stream';
      req.response.headers.set('Content-Type', ct);
      await req.response.addStream(file.openRead());
    } catch (_) {
      req.response.statusCode = 404;
    }
    await req.response.close();
  }
}
