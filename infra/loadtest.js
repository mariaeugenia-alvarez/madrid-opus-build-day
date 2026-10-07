// Prueba de carga: N clientes Socket.IO (solo WebSocket) contra una URL.
// Uso: node infra/loadtest.js [url] [clientes] [segundos]
//   url por defecto: la del último túnel (infra/.tunnel-url) o localhost:3000
// Mide: conexiones OK/fallidas (y por qué), latencia p50/p95/p99 y ticks/s recibidos.

import fs from 'node:fs';
import { io } from 'socket.io-client';

const urlFile = new URL('./.tunnel-url', import.meta.url);
const URL = process.argv[2]
  || (fs.existsSync(urlFile) ? fs.readFileSync(urlFile, 'utf8').trim() : 'http://localhost:3000');
const N = Number(process.argv[3]) || 200;
const DURATION_S = Number(process.argv[4]) || 30;
const RAMP_MS = 20; // una conexión nueva cada 20 ms

const rtts = [];
const errors = {};
let connected = 0;
let everConnected = 0;
let disconnects = 0;
let ticks = 0;
const sockets = [];
const bump = (k) => { errors[k] = (errors[k] || 0) + 1; };

const pct = (arr, p) => {
  if (!arr.length) return '–';
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
};

console.log(`Carga: ${N} clientes → ${URL} durante ${DURATION_S}s`);

for (let i = 0; i < N; i++) {
  setTimeout(() => {
    const socket = io(URL, { transports: ['websocket'], reconnection: false, timeout: 10000 });
    sockets.push(socket);
    socket.on('connect', () => { connected += 1; everConnected += 1; });
    socket.on('connect_error', (err) => bump(err.description?.message || err.message || String(err)));
    socket.on('state', () => { ticks += 1; });
    const timer = setInterval(() => {
      if (!socket.connected) return;
      const t = Date.now();
      socket.timeout(5000).emit('rtt', t, (err) => {
        if (err) bump('rtt timeout');
        else rtts.push(Date.now() - t);
      });
    }, 2000);
    socket.on('disconnect', (reason) => {
      connected -= 1;
      disconnects += 1;
      bump(`disconnect: ${reason}`);
      clearInterval(timer);
    });
  }, i * RAMP_MS);
}

let lastTicks = 0;
const progress = setInterval(() => {
  const tps = connected ? Math.round((ticks - lastTicks) / connected) : 0;
  lastTicks = ticks;
  console.log(`  conectados ${connected}/${N} · ticks/s por cliente ${tps} · rtt p95 ${pct(rtts.slice(-500), 95)} ms`);
}, 1000);

setTimeout(() => {
  clearInterval(progress);
  console.log('\nResultado');
  console.log(`  conectados al final: ${connected}/${N} (alguna vez: ${everConnected}, desconexiones: ${disconnects})`);
  console.log(`  rtt ms  p50 ${pct(rtts, 50)} · p95 ${pct(rtts, 95)} · p99 ${pct(rtts, 99)}  (${rtts.length} muestras)`);
  const errEntries = Object.entries(errors);
  console.log(errEntries.length ? '  errores:' : '  errores: ninguno');
  for (const [k, v] of errEntries) console.log(`    ${v} × ${k}`);
  sockets.forEach((s) => s.close());
  process.exit(connected === N ? 0 : 1);
}, N * RAMP_MS + DURATION_S * 1000);
