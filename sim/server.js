// Simulador del servidor del juego (Persona 6).
// Implementa el contrato provisional de shared/contract.js con bots y un juego base
// simplificado, para que móvil (P2), visor (P3) y estadísticas (P4) trabajen sin
// esperar al servidor real (P1). No es el servidor de la demo.
//
// Variables: PORT=3000 BOTS=40 VISOR_KEY=demo AUTO=1 RONDAS=3
//            LOBBY_S=10 RONDA_S=90 RESULTADOS_S=10 PARCHE_S=20 FINAL_S=90 CEREMONIA_S=20
// AUTO=1: las fases avanzan solas y los bots proponen y votan. AUTO=0: LOBBY y PARCHE
// esperan a `control: iniciar` desde el visor.

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const C = require('../shared/contract');

const { EV, FASES, ARENA, REGLAS_BASE: R, LIMITES, HEATMAP, EQUIPOS } = C;
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

const PORT = num(process.env.PORT, 3000);
const BOTS = num(process.env.BOTS, 40);
const VISOR_KEY = process.env.VISOR_KEY || 'demo';
const AUTO = process.env.AUTO !== '0';
const RONDAS = num(process.env.RONDAS, 3);
const DUR = {
  [FASES.LOBBY]: num(process.env.LOBBY_S, 10),
  [FASES.COUNTDOWN]: 3,
  [FASES.RONDA]: num(process.env.RONDA_S, 90),
  [FASES.RESULTADOS]: num(process.env.RESULTADOS_S, 10),
  [FASES.PARCHE]: num(process.env.PARCHE_S, 20),
  [FASES.FINAL]: num(process.env.FINAL_S, 90),
  [FASES.CEREMONIA]: num(process.env.CEREMONIA_S, 20),
};
const MANUALES = new Set([FASES.LOBBY, FASES.PARCHE]); // esperan al visor si AUTO=0
const JUEGO = new Set([FASES.RONDA, FASES.FINAL]);

const NOMBRES = ['Ana', 'Luis', 'Marta', 'Javi', 'Lucía', 'Pablo', 'Sara', 'Dani', 'Elena', 'Hugo',
  'Carmen', 'Álex', 'Irene', 'Raúl', 'Nuria', 'Óscar', 'Paula', 'Iván', 'Alba', 'Mario'];
const IDEAS = ['Gravedad invertida', 'El líder se vuelve jefe final', 'Modo zombis',
  'Orbes dorados x5', 'El mapa se encoge', 'Niebla de guerra'];
const COLORES = ['#ef4444', '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899', '#f8fafc', '#22c55e'];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => Date.now();
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// ------------------------------------------------------------------ estado
const jugadores = new Map(); // id → jugador
let nextId = 1;
let orbes = [];
let fase = FASES.LOBBY;
let faseHasta = now() + DUR[fase] * 1000;
let pausado = false;
let pausaRestante = 0;
let ronda = 0;
let siguienteJuego = FASES.RONDA;
let tick = 0;
let ultimaFase = { fase, ronda, rondas: RONDAS, duracionMs: DUR[fase] * 1000, datos: {} };
const propuestas = []; // { id, texto, autor, estado, votos }
let nextPropId = 1;
const parches = [];
const evento = { embestidas: 0, propuestas: 0, votos: 0 };
let rondaSt = nuevaRonda();
let lider = null;
let margenMax = 0;
let votacionSucia = false;
let rosterSucio = false;

function nuevaRonda() {
  return { embestidas: 0, firstBlood: false, rachaMax: null, heat: new Array(HEATMAP.ancho * HEATMAP.alto).fill(0) };
}

const activos = () => [...jugadores.values()].filter((j) => !j.espectador);
const reales = () => [...jugadores.values()].filter((j) => !j.bot);
const resumen = (j) => j && { id: j.id, alias: j.alias, color: j.color, equipo: EQUIPOS[j.equipo], puntos: j.puntos };

function crearJugador({ alias, color, bot = false, socketId = null }) {
  const cuenta = [0, 0];
  for (const o of jugadores.values()) cuenta[o.equipo] += 1;
  const j = {
    id: nextId++, alias, color, bot, socketId,
    equipo: cuenta[0] <= cuenta[1] ? 0 : 1,
    x: rnd(50, ARENA.ancho - 50), y: rnd(50, ARENA.alto - 50),
    puntos: 0, total: 0, racha: 0, recargaHasta: 0, voto: null,
    espectador: !bot && JUEGO.has(fase),
    input: { dx: 0, dy: 0, accion: 0 },
    objetivo: null, cambioObjetivo: 0,
  };
  jugadores.set(j.id, j);
  rosterSucio = true;
  return j;
}

function reponerOrbes() {
  while (orbes.length < R.orbesEnArena) orbes.push({ x: rnd(20, ARENA.ancho - 20), y: rnd(20, ARENA.alto - 20) });
}

function puntosEquipos() {
  const p = [0, 0];
  for (const j of activos()) p[j.equipo] += j.puntos;
  return p;
}

function rivalCercano(j, radio) {
  let mejor = null;
  let md = radio * radio;
  for (const o of jugadores.values()) {
    if (o === j || o.espectador || o.equipo === j.equipo) continue;
    const d = d2(o, j);
    if (d <= md) { md = d; mejor = o; }
  }
  return mejor;
}

// ------------------------------------------------------------------ emisiones
const anuncio = (titulo, texto = '') => io.emit(EV.ANUNCIO, { titulo, texto });
const ticker = (tipo, texto) => io.to('visor').emit(EV.EVENTO, { tipo, texto, t: now() });
const restante = () => (pausado ? pausaRestante : Math.max(0, faseHasta - now()));
const payloadFase = () => ({ ...ultimaFase, restanteMs: restante(), pausado });
const emitirFase = () => io.emit(EV.FASE, payloadFase());
const roster = () => [...jugadores.values()].map((j) => ({
  id: j.id, alias: j.alias, color: j.color, equipo: EQUIPOS[j.equipo], bot: j.bot, espectador: j.espectador,
}));
const listaPropuestas = () => propuestas.map(({ id, texto, autor, estado, votos }) => ({ id, texto, autor, estado, votos }));
const candidatas = () => propuestas.filter((p) => p.estado === 'aprobada').map(({ id, texto, votos }) => ({ id, texto, votos }));

// ------------------------------------------------------------------ juego
function pensarBot(j) {
  const t = now();
  if (t > j.cambioObjetivo || !j.objetivo || (j.objetivo.orbe && !orbes.includes(j.objetivo))) {
    j.objetivo = Math.random() < 0.7 && orbes.length ? pick(orbes) : { x: rnd(0, ARENA.ancho), y: rnd(0, ARENA.alto) };
    if (orbes.includes(j.objetivo)) j.objetivo.orbe = true;
    j.cambioObjetivo = t + rnd(800, 2500);
  }
  const dx = j.objetivo.x - j.x;
  const dy = j.objetivo.y - j.y;
  const d = Math.hypot(dx, dy) || 1;
  j.input.dx = dx / d;
  j.input.dy = dy / d;
  j.input.accion = t >= j.recargaHasta && Math.random() < 0.08 && rivalCercano(j, R.embestida.radio) ? 1 : 0;
}

function sumar(j, n) { j.puntos += n; j.total += n; }

function registrarRacha(j) {
  if (j.racha > 0 && j.racha % 5 === 0) ticker('racha', `Racha de ${j.racha} de ${j.alias}`);
  if (!rondaSt.rachaMax || j.racha > rondaSt.rachaMax.valor) rondaSt.rachaMax = { alias: j.alias, valor: j.racha };
}

function comprobarRemontada() {
  const [a, b] = puntosEquipos();
  const diff = a - b;
  const nuevo = diff > 0 ? 0 : diff < 0 ? 1 : lider;
  if (lider !== null && nuevo !== lider && margenMax >= 10) anuncio('REMONTADA', `Equipo ${EQUIPOS[nuevo]}`);
  if (nuevo !== lider) { lider = nuevo; margenMax = 0; }
  margenMax = Math.max(margenMax, Math.abs(diff));
}

function paso(dt) {
  const lista = activos();
  for (const j of lista) {
    if (j.bot) pensarBot(j);
    const { dx, dy } = j.input;
    const mag = Math.hypot(dx, dy);
    const k = mag > 1 ? 1 / mag : 1;
    j.x = clamp(j.x + dx * k * R.velocidad * dt, R.radioJugador, ARENA.ancho - R.radioJugador);
    j.y = clamp(j.y + dy * k * R.velocidad * dt, R.radioJugador, ARENA.alto - R.radioJugador);
  }
  const rr = (R.radioJugador + R.radioOrbe) ** 2;
  for (const j of lista) {
    for (let i = orbes.length - 1; i >= 0; i--) {
      if (d2(orbes[i], j) <= rr) {
        orbes.splice(i, 1);
        sumar(j, 1);
        j.racha += 1;
        registrarRacha(j);
      }
    }
  }
  reponerOrbes();
  const t = now();
  for (const j of lista) {
    if (!j.input.accion) continue;
    j.input.accion = 0;
    if (t < j.recargaHasta) continue;
    j.recargaHasta = t + R.embestida.recargaMs;
    const v = rivalCercano(j, R.embestida.radio);
    if (!v) continue;
    const robo = Math.min(R.embestida.robo, v.puntos);
    v.puntos -= robo;
    v.total -= robo;
    v.racha = 0;
    sumar(j, robo);
    rondaSt.embestidas += 1;
    evento.embestidas += 1;
    ticker('embestida', `${j.alias} embiste a ${v.alias} (+${robo})`);
    if (!rondaSt.firstBlood) { rondaSt.firstBlood = true; anuncio('FIRST BLOOD', j.alias); }
  }
  comprobarRemontada();
}

let siguienteHeat = 0;
function muestrearHeat() {
  const t = now();
  if (t < siguienteHeat) return;
  siguienteHeat = t + HEATMAP.cadaMs;
  const cw = ARENA.ancho / HEATMAP.ancho;
  const ch = ARENA.alto / HEATMAP.alto;
  for (const j of activos()) {
    const cx = clamp(Math.floor(j.x / cw), 0, HEATMAP.ancho - 1);
    const cy = clamp(Math.floor(j.y / ch), 0, HEATMAP.alto - 1);
    rondaSt.heat[cy * HEATMAP.ancho + cx] += 1;
  }
}

// ------------------------------------------------------------------ fases
const siguienteVersion = () => `0.${parches.length + 1}`;

function resultados() {
  const orden = activos().sort((a, b) => b.puntos - a.puntos);
  const [azul, naranja] = puntosEquipos();
  const mvp = resumen(orden[0]) || null;
  return {
    mvp,
    equipos: { azul, naranja },
    rachaMax: rondaSt.rachaMax,
    embestidas: rondaSt.embestidas,
    heatmap: { ancho: HEATMAP.ancho, alto: HEATMAP.alto, celdas: rondaSt.heat },
    destacado: mvp ? `${mvp.alias} se lleva la ronda con ${mvp.puntos} puntos` : '',
  };
}

function ceremonia() {
  const orden = [...jugadores.values()].sort((a, b) => b.total - a.total);
  const tot = [0, 0];
  for (const j of jugadores.values()) tot[j.equipo] += j.total;
  const masVotada = [...parches].sort((a, b) => b.votos - a.votos)[0] || null;
  return {
    podio: orden.slice(0, 3).map((j) => ({ ...resumen(j), puntos: j.total })),
    ganador: tot[0] === tot[1] ? 'empate' : EQUIPOS[tot[0] > tot[1] ? 0 : 1],
    parches: parches.length,
    lineas: parches.reduce((s, p) => s + p.lineas, 0),
    masVotada: masVotada && masVotada.regla,
  };
}

function prepararVotacion() {
  if (AUTO) {
    const usadas = new Set(propuestas.map((p) => p.texto));
    for (const idea of IDEAS) {
      if (candidatas().length >= 3) break;
      if (usadas.has(idea)) continue;
      propuestas.push({ id: nextPropId++, texto: idea, autor: pick(NOMBRES), estado: 'aprobada', votos: 0 });
      evento.propuestas += 1;
    }
  }
  for (const p of propuestas) if (p.estado === 'aprobada') p.votos = 0;
  for (const j of jugadores.values()) j.voto = null;
  votacionSucia = true;
}

function instalarParche() {
  const ganadora = candidatas().sort((a, b) => b.votos - a.votos)[0];
  if (!ganadora) return;
  const p = propuestas.find((x) => x.id === ganadora.id);
  p.estado = 'instalada';
  const parche = {
    version: siguienteVersion(), regla: p.texto, votos: p.votos,
    lineas: Math.round(rnd(15, 140)), ms: Math.round(rnd(20000, 90000)),
  };
  parches.push(parche);
  io.emit(EV.PARCHE, parche);
  anuncio('PARCHE INSTALADO', `v${parche.version} · ${parche.regla}`);
  votacionSucia = true;
}

function reiniciarEvento() {
  ronda = 0;
  parches.length = 0;
  propuestas.length = 0;
  Object.assign(evento, { embestidas: 0, propuestas: 0, votos: 0 });
  for (const j of jugadores.values()) Object.assign(j, { puntos: 0, total: 0, racha: 0, voto: null });
  votacionSucia = true;
}

function entrar(nueva) {
  fase = nueva;
  faseHasta = now() + DUR[nueva] * 1000;
  pausado = false;
  let datos = {};
  switch (nueva) {
    case FASES.LOBBY:
      reiniciarEvento();
      break;
    case FASES.COUNTDOWN:
      datos = { siguiente: siguienteJuego };
      break;
    case FASES.RONDA:
    case FASES.FINAL:
      if (nueva === FASES.RONDA) ronda += 1;
      for (const j of jugadores.values()) Object.assign(j, { espectador: false, puntos: 0, racha: 0, recargaHasta: 0 });
      rosterSucio = true;
      rondaSt = nuevaRonda();
      lider = null;
      margenMax = 0;
      orbes = [];
      reponerOrbes();
      if (nueva === FASES.FINAL) anuncio('GRAN FINAL', `${parches.length} parches activos`);
      datos = { ronda, final: nueva === FASES.FINAL, reglas: parches.map((p) => p.regla) };
      break;
    case FASES.RESULTADOS:
      datos = resultados();
      break;
    case FASES.PARCHE:
      prepararVotacion();
      datos = { version: siguienteVersion(), candidatas: candidatas() };
      break;
    case FASES.CEREMONIA:
      datos = ceremonia();
      break;
    default:
  }
  ultimaFase = { fase, ronda, rondas: RONDAS, duracionMs: DUR[nueva] * 1000, datos };
  emitirFase();
  console.log(`[fase] ${fase}${JUEGO.has(fase) ? ` (ronda ${ronda})` : ''}`);
}

function avanzar() {
  switch (fase) {
    case FASES.LOBBY:
      siguienteJuego = RONDAS > 0 ? FASES.RONDA : FASES.FINAL;
      return entrar(FASES.COUNTDOWN);
    case FASES.COUNTDOWN: return entrar(siguienteJuego);
    case FASES.RONDA: return entrar(FASES.RESULTADOS);
    case FASES.RESULTADOS: return entrar(FASES.PARCHE);
    case FASES.PARCHE:
      instalarParche();
      siguienteJuego = ronda < RONDAS ? FASES.RONDA : FASES.FINAL;
      return entrar(FASES.COUNTDOWN);
    case FASES.FINAL: return entrar(FASES.CEREMONIA);
    case FASES.CEREMONIA: return entrar(FASES.LOBBY);
    default: return undefined;
  }
}

// ------------------------------------------------------------------ red
const app = express();
const server = http.createServer(app);
const io = new Server(server, { transports: ['websocket'], cors: { origin: '*' } });
const publicDir = path.join(__dirname, '..', 'public');

app.get('/health', (_req, res) => res.json({
  ok: true, fase, ronda, jugadores: jugadores.size, reales: reales().length,
  visores: io.sockets.adapter.rooms.get('visor')?.size || 0,
}));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));
app.use('/sim', express.static(path.join(__dirname, 'pages'), { extensions: ['html'] }));
if (fs.existsSync(publicDir)) app.use(express.static(publicDir, { extensions: ['html'] }));
app.get('/', (_req, res) => res.redirect('/sim/jugar'));
app.get('/visor', (req, res) => res.redirect(`/sim/visor${req.url.slice('/visor'.length)}`));

io.on('connection', (socket) => {
  let jugador = null;
  let esVisor = false;
  const responder = (ack) => (typeof ack === 'function' ? ack : () => {});
  socket.emit(EV.FASE, payloadFase());

  socket.on(EV.JOIN, (data, ack) => {
    const reply = responder(ack);
    if (jugador) return reply({ ok: true, id: jugador.id, equipo: EQUIPOS[jugador.equipo], espectador: jugador.espectador });
    const alias = typeof data?.alias === 'string' ? data.alias.trim() : '';
    if (!alias || alias.length > LIMITES.alias) return reply({ ok: false, error: `alias de 1 a ${LIMITES.alias} caracteres` });
    const color = /^#[0-9a-f]{6}$/i.test(data?.color || '') ? data.color : pick(COLORES);
    jugador = crearJugador({ alias, color, socketId: socket.id });
    socket.join('jugadores');
    ticker('entra', `${alias} entra en el equipo ${EQUIPOS[jugador.equipo]}`);
    return reply({ ok: true, id: jugador.id, equipo: EQUIPOS[jugador.equipo], espectador: jugador.espectador });
  });

  socket.on(EV.INPUT, (v) => {
    if (!jugador || !Array.isArray(v)) return;
    jugador.input.dx = clamp(Number(v[0]) || 0, -1, 1);
    jugador.input.dy = clamp(Number(v[1]) || 0, -1, 1);
    if (v[2]) jugador.input.accion = 1;
  });

  socket.on(EV.PROPUESTA, (data, ack) => {
    const reply = responder(ack);
    if (!jugador) return reply({ ok: false, error: 'primero join' });
    const texto = typeof data?.texto === 'string' ? data.texto.trim() : '';
    if (!texto || texto.length > LIMITES.propuesta) return reply({ ok: false, error: `texto de 1 a ${LIMITES.propuesta} caracteres` });
    const p = { id: nextPropId++, texto, autor: jugador.alias, estado: 'pendiente', votos: 0 };
    propuestas.push(p);
    evento.propuestas += 1;
    votacionSucia = true;
    return reply({ ok: true, id: p.id });
  });

  socket.on(EV.VOTO, (data, ack) => {
    const reply = responder(ack);
    if (!jugador) return reply({ ok: false, error: 'primero join' });
    if (fase !== FASES.PARCHE) return reply({ ok: false, error: 'solo se vota en PARCHE' });
    if (jugador.voto !== null) return reply({ ok: false, error: 'ya has votado' });
    const p = propuestas.find((x) => x.id === data?.id && x.estado === 'aprobada');
    if (!p) return reply({ ok: false, error: 'propuesta no votable' });
    p.votos += 1;
    jugador.voto = p.id;
    evento.votos += 1;
    votacionSucia = true;
    return reply({ ok: true });
  });

  socket.on(EV.VISOR_JOIN, (data, ack) => {
    const reply = responder(ack);
    if (data?.key !== VISOR_KEY) return reply({ ok: false, error: 'clave incorrecta' });
    esVisor = true;
    socket.join('visor');
    socket.emit(EV.JUGADORES, roster());
    socket.emit(EV.PROPUESTAS, listaPropuestas());
    return reply({ ok: true });
  });

  socket.on(EV.CONTROL, (msg, ack) => {
    const reply = responder(ack);
    if (!esVisor) return reply({ ok: false, error: 'solo el visor' });
    switch (msg?.accion) {
      case 'iniciar':
        if (![FASES.LOBBY, FASES.RESULTADOS, FASES.PARCHE, FASES.CEREMONIA].includes(fase)) {
          return reply({ ok: false, error: `no se puede iniciar desde ${fase}` });
        }
        avanzar();
        break;
      case 'saltar': avanzar(); break;
      case 'pausar':
        if (pausado) { faseHasta = now() + pausaRestante; pausado = false; } else { pausaRestante = restante(); pausado = true; }
        emitirFase();
        break;
      case 'reiniciar': entrar(FASES.LOBBY); break;
      case 'final': siguienteJuego = FASES.FINAL; entrar(FASES.COUNTDOWN); break;
      case 'aprobar':
      case 'rechazar': {
        const p = propuestas.find((x) => x.id === msg.id);
        if (!p || p.estado !== 'pendiente') return reply({ ok: false, error: 'propuesta no pendiente' });
        p.estado = msg.accion === 'aprobar' ? 'aprobada' : 'rechazada';
        votacionSucia = true;
        break;
      }
      default: return reply({ ok: false, error: 'accion desconocida' });
    }
    return reply({ ok: true });
  });

  socket.on('disconnect', () => {
    if (!jugador) return;
    jugadores.delete(jugador.id);
    rosterSucio = true;
    ticker('sale', `${jugador.alias} sale`);
  });
});

// ------------------------------------------------------------------ bucles
for (let i = 0; i < BOTS; i++) {
  const base = NOMBRES[i % NOMBRES.length];
  const alias = i < NOMBRES.length ? base : `${base}${Math.floor(i / NOMBRES.length)}`;
  crearJugador({ alias: alias.slice(0, LIMITES.alias), color: pick(COLORES), bot: true });
}
reponerOrbes();

setInterval(() => {
  tick += 1;
  if (JUEGO.has(fase) && !pausado) {
    paso(1 / C.TICK_HZ);
    muestrearHeat();
  }
  if (fase === FASES.PARCHE && !pausado && AUTO) {
    for (const j of jugadores.values()) {
      if (!j.bot || j.voto !== null || Math.random() > 0.01) continue;
      const c = candidatas();
      if (!c.length) break;
      const elegida = pick(c).id;
      const p = propuestas.find((x) => x.id === elegida);
      p.votos += 1;
      j.voto = p.id;
      evento.votos += 1;
      votacionSucia = true;
    }
  }
  if (!pausado && now() >= faseHasta && !(MANUALES.has(fase) && !AUTO)) avanzar();
  if (io.sockets.adapter.rooms.get('visor')?.size) {
    io.to('visor').volatile.emit(EV.STATE, {
      tick,
      restanteMs: restante(),
      j: activos().map((j) => [j.id, Math.round(j.x), Math.round(j.y), j.equipo, j.puntos]),
      o: JUEGO.has(fase) ? orbes.map((o) => [Math.round(o.x), Math.round(o.y)]) : [],
    });
  }
}, 1000 / C.TICK_HZ);

setInterval(() => {
  const orden = [...jugadores.values()].sort((a, b) => b.total - a.total);
  const t = now();
  orden.forEach((j, i) => {
    if (j.bot) return;
    io.to(j.socketId).volatile.emit(EV.ME, {
      id: j.id, equipo: EQUIPOS[j.equipo], espectador: j.espectador,
      x: Math.round(j.x), y: Math.round(j.y), puntos: j.puntos, total: j.total,
      posicion: i + 1, de: orden.length, recargaMs: Math.max(0, j.recargaHasta - t), voto: j.voto,
    });
  });
}, 1000 / C.ME_HZ);

setInterval(() => {
  if (rosterSucio) { rosterSucio = false; io.to('visor').emit(EV.JUGADORES, roster()); }
  if (votacionSucia) {
    votacionSucia = false;
    io.to('visor').emit(EV.PROPUESTAS, listaPropuestas());
    if (fase === FASES.PARCHE) io.emit(EV.VOTACION, candidatas());
  }
}, 500);

setInterval(() => {
  const lista = activos();
  const orden = [...lista].sort((a, b) => b.puntos - a.puntos);
  const [azul, naranja] = puntosEquipos();
  const miembros = [0, 0];
  for (const j of lista) miembros[j.equipo] += 1;
  io.to('visor').emit(EV.STATS, {
    fase, ronda,
    conectados: reales().length,
    bots: jugadores.size - reales().length,
    equipos: { azul, naranja },
    miembros: { azul: miembros[0], naranja: miembros[1] },
    top10: orden.slice(0, 10).map(resumen),
    mvp: resumen(orden[0]) || null,
    rachaMax: rondaSt.rachaMax,
    embestidas: { ronda: rondaSt.embestidas, total: evento.embestidas },
    propuestas: { enviadas: evento.propuestas, votos: evento.votos },
    parches,
    heatmap: { ancho: HEATMAP.ancho, alto: HEATMAP.alto, celdas: rondaSt.heat },
  });
}, 1000 / C.STATS_HZ);

server.listen(PORT, () => {
  console.log(`simulador en http://localhost:${PORT}  · visor /sim/visor?key=${VISOR_KEY} · jugar /sim/jugar`);
  console.log(`bots ${BOTS} · AUTO ${AUTO ? 'sí' : 'no'} · rondas ${RONDAS}`);
});
