// Zero-dependency static server for dist/ on 127.0.0.1:5917.
// GET /__alive is a keep-alive ping; the server exits 45 s after the last ping
// (the page pings every 10 s). Usage: node serve.mjs [distDir]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] ?? path.join(here, '..', 'dist'));
const PORT = Number(process.env.HOLLOWMERE_PORT ?? 5917);
const IDLE_MS = 45_000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
};

let lastPing = Date.now();

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/__alive') {
    lastPing = Date.now();
    res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
    res.end('ok');
    return;
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, path.normalize(rel));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') process.exit(0); // already running — fine
  console.error(e);
  process.exit(1);
});
server.listen(PORT, '127.0.0.1', () => console.log(`Hollowmere on http://127.0.0.1:${PORT}`));

setInterval(() => {
  if (Date.now() - lastPing > IDLE_MS) {
    console.log('no page pinging — shutting down');
    process.exit(0);
  }
}, 5000).unref?.();
