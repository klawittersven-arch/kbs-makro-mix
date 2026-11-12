// Verbindung zum Klassenraum (WebSocket mit automatischem Wiederverbinden und Uhrabgleich)
export const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(n) {
  const a = new Uint32Array(n); crypto.getRandomValues(a);
  return [...a].map(v => ALPHA[v % ALPHA.length]).join('');
}
export function randomId(n) {
  const a = new Uint32Array(n); crypto.getRandomValues(a);
  return [...a].map(v => (v % 36).toString(36)).join('');
}
export function store(key, val) {
  try {
    if (val === undefined) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
  } catch (e) { return null; }
}

/**
 * opts: { code, params: {role, pid|key}, onMessage(msg), onStatus('online'|'offline'|'connecting') }
 */
export function KNet(opts) {
  let ws = null, wanted = false, retry = 0, pingT = 0, retryT = 0;
  const queue = [];
  const net = {
    offset: 0, rtt: 1e9, status: 'offline', stopped: null,
    serverNow() { return Date.now() + net.offset; },
    open() { if (wanted) return; wanted = true; net.stopped = null; connect(); },
    close() {
      wanted = false; clearTimeout(retryT); clearInterval(pingT);
      if (ws) { try { ws.close(1000, 'bye'); } catch (e) {} ws = null; }
      setStatus('offline');
    },
    send(obj, important) {
      if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; }
      if (important) { queue.push(obj); if (!wanted) net.open(); }
      return false;
    },
    get connected() { return !!ws && ws.readyState === 1; },
  };
  function setStatus(s) { if (net.status !== s) { net.status = s; opts.onStatus && opts.onStatus(s); } }
  function url() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/ws/' + opts.code + '?' + new URLSearchParams(opts.params);
  }
  function connect() {
    clearTimeout(retryT);
    setStatus('connecting');
    let sock;
    try { sock = new WebSocket(url()); } catch (e) { schedule(); return; }
    ws = sock;
    sock.onopen = () => {
      if (ws !== sock) return;
      retry = 0; setStatus('online');
      while (queue.length && sock.readyState === 1) sock.send(JSON.stringify(queue.shift()));
      // Uhren abgleichen: drei Messungen, die schnellste zählt
      for (let i = 0; i < 3; i++) setTimeout(() => { if (sock.readyState === 1) sock.send(JSON.stringify({ t: 'sync', c: Date.now() })); }, i * 250);
      clearInterval(pingT);
      pingT = setInterval(() => { if (sock.readyState === 1) sock.send('ping'); }, 25000);
    };
    sock.onmessage = ev => {
      if (ev.data === 'pong') return;
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'sync') {
        const now = Date.now(), rtt = now - m.c;
        if (rtt >= 0 && rtt < net.rtt) { net.rtt = rtt; net.offset = m.s - (m.c + rtt / 2); }
        return;
      }
      opts.onMessage && opts.onMessage(m);
    };
    sock.onclose = ev => {
      if (ws !== sock) return;
      ws = null; clearInterval(pingT); setStatus('offline');
      if (ev.code === 4001 || ev.code === 4000) { wanted = false; net.stopped = ev.reason || 'closed'; return; }
      if (wanted) schedule();
    };
    sock.onerror = () => {};
  }
  function schedule() {
    clearTimeout(retryT);
    const wait = Math.min(8000, 600 * Math.pow(1.7, retry++)) * (0.8 + Math.random() * 0.4);
    retryT = setTimeout(() => { if (wanted) connect(); }, wait);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && wanted && (!ws || ws.readyState > 1)) { retry = 0; connect(); }
  });
  addEventListener('online', () => { if (wanted && (!ws || ws.readyState > 1)) { retry = 0; connect(); } });
  return net;
}

