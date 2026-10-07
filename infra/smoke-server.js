// Servidor de humo de infraestructura (Persona 6).
// NO es el servidor del juego: solo sirve para validar túnel, red y carga
// antes de que exista el servidor real. Emite un "estado" falso a TICK_HZ
// con un tamaño parecido al que tendrá el juego.

import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT) || 3000;
const TICK_HZ = Number(process.env.TICK_HZ) || 20;
const STATE_BYTES = Number(process.env.STATE_BYTES) || 1000;

const app = express();
const server = http.createServer(app);

// Solo WebSocket: el long-polling multiplica las peticiones HTTP y
// el Quick Tunnel de Cloudflare corta a partir de 200 en vuelo.
const io = new Server(server, {
  transports: ['websocket'],
  cors: { origin: '*' },
});

const startedAt = Date.now();
let peak = 0;

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    clients: io.engine.clientsCount,
    peak,
    uptimeS: Math.round((Date.now() - startedAt) / 1000),
    tickHz: TICK_HZ,
    stateBytes: STATE_BYTES,
  });
});

app.get('/', (_req, res) => res.type('html').send(PAGE));

io.on('connection', (socket) => {
  peak = Math.max(peak, io.engine.clientsCount);
  // Eco para medir latencia de ida y vuelta.
  socket.on('rtt', (t, ack) => typeof ack === 'function' && ack(t));
});

// Estado falso a TICK_HZ para todos.
const filler = 'x'.repeat(STATE_BYTES);
let tick = 0;
setInterval(() => {
  tick += 1;
  io.volatile.emit('state', { tick, t: Date.now(), filler });
}, 1000 / TICK_HZ);

// Contador de conectados una vez por segundo (no en cada conexión: O(n²)).
setInterval(() => io.emit('count', io.engine.clientsCount), 1000);

server.listen(PORT, () => {
  console.log(`smoke-server en http://localhost:${PORT}  (tick ${TICK_HZ} Hz, estado ${STATE_BYTES} B)`);
});

const PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>La sala es el código · prueba</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         font: 16px/1.4 system-ui, sans-serif; background: #0b0d12; color: #e8eaf0; text-align: center; }
  .big { font-size: 64px; font-weight: 700; }
  .ok { color: #4ade80; } .ko { color: #f87171; }
  small { color: #8b93a7; }
</style>
</head>
<body>
<main>
  <div id="status" class="ko">conectando…</div>
  <div class="big" id="count">–</div>
  <div>personas conectadas</div>
  <p><small>latencia <span id="rtt">–</span> ms · tick <span id="tick">–</span></small></p>
</main>
<script src="/socket.io/socket.io.js"></script>
<script>
  const $ = (id) => document.getElementById(id);
  const socket = io({ transports: ['websocket'] });
  socket.on('connect', () => { $('status').textContent = 'conectado'; $('status').className = 'ok'; });
  socket.on('disconnect', () => { $('status').textContent = 'desconectado'; $('status').className = 'ko'; });
  socket.on('count', (n) => { $('count').textContent = n; });
  socket.on('state', (s) => { $('tick').textContent = s.tick; });
  setInterval(() => {
    const t = performance.now();
    socket.emit('rtt', t, () => { $('rtt').textContent = Math.round(performance.now() - t); });
  }, 2000);
</script>
</body>
</html>`;
