// Comprobación de extremo a extremo del simulador: un visor y un jugador recorren
// un match completo y se verifica que llegan todos los eventos del contrato.
// Uso: node sim/check.js [url] [segundos]   (mejor con fases cortas: npm run sim:dev)
const { io } = require('socket.io-client');
const { EV, FASES } = require('../shared/contract');

const URL = process.argv[2] || 'http://localhost:3000';
const SEGUNDOS = Number(process.argv[3]) || 30;
const KEY = process.env.VISOR_KEY || 'demo';
const vistos = {};
const fases = [];
const fallos = [];
const contar = (k) => { vistos[k] = (vistos[k] || 0) + 1; };

const visor = io(URL, { transports: ['websocket'] });
visor.on('connect', () => visor.emit(EV.VISOR_JOIN, { key: KEY }, (r) => r.ok || fallos.push(`visor:join ${r.error}`)));
for (const ev of [EV.STATE, EV.STATS, EV.JUGADORES, EV.PROPUESTAS, EV.EVENTO, EV.ANUNCIO, EV.PARCHE]) visor.on(ev, () => contar(`visor ${ev}`));
visor.on(EV.PROPUESTAS, (l) => {
  const mia = l.find((p) => p.texto === 'Prueba e2e' && p.estado === 'pendiente');
  if (mia) visor.emit(EV.CONTROL, { accion: 'aprobar', id: mia.id }, (r) => (r.ok ? contar('aprobada') : fallos.push(r.error)));
});

const jug = io(URL, { transports: ['websocket'] });
jug.on('connect', () => jug.emit(EV.JOIN, { alias: 'e2e', color: '#ffffff' }, (r) => {
  if (!r.ok) return fallos.push(`join ${r.error}`);
  contar('join ok');
  jug.emit(EV.PROPUESTA, { texto: 'Prueba e2e' }, (p) => (p.ok ? contar('propuesta ok') : fallos.push(p.error)));
  setInterval(() => jug.emit(EV.INPUT, [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() < 0.2 ? 1 : 0]), 50);
}));
for (const ev of [EV.ME, EV.VOTACION, EV.ANUNCIO, EV.PARCHE]) jug.on(ev, () => contar(`jugador ${ev}`));
jug.on(EV.FASE, (f) => {
  if (fases[fases.length - 1] !== f.fase) fases.push(f.fase);
  if (f.fase === FASES.PARCHE && f.datos.candidatas?.length) {
    jug.emit(EV.VOTO, { id: f.datos.candidatas[0].id }, (r) => (r.ok ? contar('voto ok') : fallos.push(`voto ${r.error}`)));
  }
});

setTimeout(() => {
  console.log('fases:', fases.join(' → '));
  console.log('eventos:', vistos);
  const esperados = ['join ok', 'propuesta ok', 'aprobada', 'voto ok', `visor ${EV.STATE}`, `visor ${EV.STATS}`,
    `visor ${EV.JUGADORES}`, `visor ${EV.PROPUESTAS}`, `visor ${EV.EVENTO}`, `jugador ${EV.ME}`, `jugador ${EV.VOTACION}`];
  for (const e of esperados) if (!vistos[e]) fallos.push(`no llegó: ${e}`);
  console.log(fallos.length ? `FALLOS:\n  ${fallos.join('\n  ')}` : 'OK');
  process.exit(fallos.length ? 1 : 0);
}, SEGUNDOS * 1000);
