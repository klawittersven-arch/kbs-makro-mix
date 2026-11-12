// Lokaler Server ohne Zusatzpakete: für Tests und als Notlösung im Klassenraum.
// Start:  node server/local.mjs      (Port ändern: PORT=9000 node server/local.mjs)
// Danach im Browser: http://localhost:8787/lehrer
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { RoomLogic } from '../src/room.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT) || 8787;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// ---------- Statische Dateien (wie Cloudflare: /lehrer liefert lehrer.html)
async function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    let st = await fs.stat(file).catch(() => null);
    if (!st && !path.extname(file)) { file += '.html'; st = await fs.stat(file).catch(() => null); }
    if (!st || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Nicht gefunden'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(await fs.readFile(file));
  } catch (e) { res.writeHead(500); res.end(); }
}

// ---------- Minimaler WebSocket-Server (RFC 6455, nur Textnachrichten)
function wsAccept(req, socket) {
  const key = req.headers['sec-websocket-key'];
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const ws = { socket, open: true, onmessage: null, onclose: null };
  let buf = Buffer.alloc(0), frag = [];
  const frame = (op, payload) => {
    const len = payload.length;
    let head;
    if (len < 126) head = Buffer.from([0x80 | op, len]);
    else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
    return Buffer.concat([head, payload]);
  };
  ws.send = str => { if (ws.open) try { socket.write(frame(1, Buffer.from(str))); } catch (e) {} };
  ws.close = (code = 1000, reason = '') => {
    if (!ws.open) return; ws.open = false;
    const b = Buffer.alloc(2 + Buffer.byteLength(reason)); b.writeUInt16BE(code, 0); b.write(reason, 2);
    try { socket.write(frame(8, b)); socket.end(); } catch (e) {}
    ws.onclose && ws.onclose();
  };
  socket.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > 1 << 20) { ws.close(1009, 'too big'); return; }
      const need = off + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      let payload = buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) { const m = buf.subarray(off, off + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
      buf = buf.subarray(need);
      if (op === 8) { if (ws.open) { ws.open = false; try { socket.write(frame(8, Buffer.alloc(0))); socket.end(); } catch (e) {} ws.onclose && ws.onclose(); } return; }
      if (op === 9) { try { socket.write(frame(10, payload)); } catch (e) {} continue; }
      if (op === 10) continue;
      if (op === 1 || op === 0) {
        frag.push(payload);
        if (fin) { const text = Buffer.concat(frag).toString('utf8'); frag = []; ws.onmessage && ws.onmessage(text); }
      }
    }
  });
  const gone = () => { if (ws.open) { ws.open = false; ws.onclose && ws.onclose(); } };
  socket.on('close', gone); socket.on('error', gone);
  return ws;
}

// ---------- Räume im Arbeitsspeicher
const rooms = new Map();
function room(code) {
  let r = rooms.get(code);
  if (!r) {
    const conns = new Set();
    let saved = null;
    const logic = new RoomLogic({
      load: async () => saved,
      save: async s => { saved = JSON.parse(JSON.stringify(s)); },
      wipe: async () => { saved = null; rooms.delete(code); },
      conns: () => [...conns],
      setMeta: (conn, meta) => { conn.meta = meta; },
      now: () => Date.now(),
    });
    r = { logic, conns, queue: Promise.resolve() };
    rooms.set(code, r);
  }
  return r;
}

const server = http.createServer((req, res) => serveStatic(req, res));
server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, 'http://x');
  const m = url.pathname.match(/^\/ws\/([A-Z0-9]{5})$/);
  if (!m || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const r = room(m[1]);
  const ws = wsAccept(req, socket);
  const conn = { ws, meta: {}, sendRaw: s => ws.send(s), send: o => ws.send(JSON.stringify(o)), close: (c, why) => ws.close(c, why) };
  r.conns.add(conn);
  // Nachrichten eines Raums nacheinander abarbeiten (wie im Durable Object)
  const run = fn => { r.queue = r.queue.then(fn).catch(e => console.error(e)); };
  const q = Object.fromEntries(url.searchParams); q.code = m[1];
  run(() => r.logic.open(conn, q));
  ws.onmessage = text => { if (text === 'ping') { ws.send('pong'); return; } run(() => r.logic.message(conn, text)); };
  ws.onclose = () => run(async () => { r.conns.delete(conn); await r.logic.close(conn); });
});

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('KBS Makro-Mix läuft.');
  console.log('  Lehrkraft:  http://localhost:' + PORT + '/lehrer');
  for (const ip of ips) console.log('  Im Netz:    http://' + ip + ':' + PORT + '/lehrer');
});
