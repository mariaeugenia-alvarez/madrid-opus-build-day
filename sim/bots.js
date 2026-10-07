// Cerebro de los bots del simulador (Persona 6).
// Da personalidad y movimiento con aspecto humano a los bots: reacciona con
// retardo, gira suave (sin giros de 180º instantáneos), evita las paredes y
// coordina un poco con el equipo para no amontonarse en el mismo orbe.
//
// Variables: BOTS_IA=1 (0 vuelve al bot simple de antes, sin personalidades)
//            BOTS_MEZCLA="recolector:0.35,cazador:0.3,escapista:0.2,novato:0.15"
//            (pesos relativos de personalidad; no hace falta que sumen 1)

const BOTS_IA = process.env.BOTS_IA !== '0';

const PESOS_DEFECTO = { recolector: 0.35, cazador: 0.3, escapista: 0.2, novato: 0.15 };

function parsearMezcla(s) {
  if (!s) return PESOS_DEFECTO;
  const out = {};
  for (const par of s.split(',')) {
    const [k, v] = par.split(':');
    const n = Number(v);
    if (k && Number.isFinite(n) && n > 0) out[k.trim()] = n;
  }
  return Object.keys(out).length ? out : PESOS_DEFECTO;
}

const PESOS = parsearMezcla(process.env.BOTS_MEZCLA);

function elegirPersonalidad() {
  const entradas = Object.entries(PESOS);
  const total = entradas.reduce((a, [, p]) => a + p, 0);
  let r = Math.random() * total;
  for (const [nombre, peso] of entradas) {
    r -= peso;
    if (r <= 0) return nombre;
  }
  return entradas[0][0];
}

const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// Reclamos de orbes para que el equipo no converja todo al mismo orbe.
// Se limpian solos por caducidad; el tamaño está acotado por R.orbesEnArena.
const reclamoOrbe = new Map(); // orbe → { jugadorId, hasta }
let proximaLimpieza = 0;

function limpiarReclamos(t) {
  if (t < proximaLimpieza) return;
  proximaLimpieza = t + 3000;
  for (const [orbe, c] of reclamoOrbe) if (t > c.hasta) reclamoOrbe.delete(orbe);
}

function reclamadoPorOtro(orbe, j, t) {
  const c = reclamoOrbe.get(orbe);
  return Boolean(c && c.jugadorId !== j.id && t <= c.hasta);
}

function reclamar(orbe, j, t) {
  reclamoOrbe.set(orbe, { jugadorId: j.id, hasta: t + 1200 });
}

// Busca el mejor orbe para j: cerca, en lo posible libre, y con bonus si hay
// más orbes alrededor (cluster), sin recorrer dos veces todos los orbes.
function mejorOrbe(j, orbes, t) {
  if (!orbes.length) return null;
  const candidatos = [...orbes].sort((a, b) => d2(a, j) - d2(b, j)).slice(0, 6);
  let mejor = null;
  let mejorScore = Infinity;
  for (const o of candidatos) {
    let cluster = 0;
    for (const o2 of orbes) if (o2 !== o && d2(o2, o) < 90 * 90) cluster += 1;
    const penalizacion = reclamadoPorOtro(o, j, t) ? 450 : 0;
    const score = Math.sqrt(d2(o, j)) - cluster * 25 + penalizacion;
    if (score < mejorScore) { mejorScore = score; mejor = o; }
  }
  return mejor;
}

// Rival (de otro equipo) más cercano en una lista ya filtrada de activos.
function rivalMasCercano(j, activos, radio, soloConPuntos) {
  let mejor = null;
  let md = radio * radio;
  for (const o of activos) {
    if (o === j || o.equipo === j.equipo) continue;
    if (soloConPuntos && o.puntos <= 0) continue;
    const d = d2(o, j);
    if (d <= md) { md = d; mejor = o; }
  }
  return mejor;
}

function puntoAleatorio(ARENA) {
  return { x: rnd(0, ARENA.ancho), y: rnd(0, ARENA.alto) };
}

function iniciarEstado(j) {
  const personalidad = elegirPersonalidad();
  j.ia = {
    personalidad,
    proximaDecision: 0,
    objetivo: null,
    huyendo: false,
    dir: { x: 0, y: 0 },
    velFactor: personalidad === 'novato' ? rnd(0.55, 1) : rnd(0.85, 1),
    reaccionMs: personalidad === 'novato' ? rnd(300, 600) : rnd(150, 400),
  };
  return j.ia;
}

// Decide el nuevo objetivo de movimiento según la personalidad. Se llama con
// poca frecuencia por bot (cada reaccionMs), no cada tick.
function decidirObjetivo(j, ia, ctx) {
  const { t, orbes, activos, ARENA } = ctx;
  const radioAmenaza = 200;
  const amenaza = rivalMasCercano(j, activos, radioAmenaza, false);

  if ((ia.personalidad === 'escapista' || ia.personalidad === 'recolector') && j.puntos >= 5 && amenaza) {
    const dAmenaza = Math.sqrt(d2(j, amenaza)) || 1;
    if (dAmenaza < 160) {
      ia.huyendo = true;
      const hx = j.x + ((j.x - amenaza.x) / dAmenaza) * 300;
      const hy = j.y + ((j.y - amenaza.y) / dAmenaza) * 300;
      ia.objetivo = { x: clamp(hx, 0, ARENA.ancho), y: clamp(hy, 0, ARENA.alto) };
      return;
    }
  }
  ia.huyendo = false;

  if (ia.personalidad === 'cazador') {
    const presa = rivalMasCercano(j, activos, 260, true);
    if (presa) { ia.objetivo = presa; return; }
  }

  if (ia.personalidad === 'novato' && Math.random() < 0.25) {
    ia.objetivo = puntoAleatorio(ARENA);
    return;
  }

  const orbe = mejorOrbe(j, orbes, t);
  if (orbe) {
    reclamar(orbe, j, t);
    ia.objetivo = orbe;
    return;
  }
  ia.objetivo = puntoAleatorio(ARENA);
}

function decidirRam(j, ia, ctx) {
  const { t, activos, R } = ctx;
  if (t < j.recargaHasta) return 0;
  if (ia.personalidad === 'novato') {
    const cualquiera = rivalMasCercano(j, activos, R.embestida.radio, false);
    return cualquiera && Math.random() < 0.18 ? 1 : 0;
  }
  const radio = ia.personalidad === 'cazador' ? R.embestida.radio * 1.1 : R.embestida.radio;
  const objetivo = rivalMasCercano(j, activos, radio, true);
  if (!objetivo) return 0;
  const prob = ia.personalidad === 'cazador' ? 0.85 : 0.35;
  return Math.random() < prob ? 1 : 0;
}

export function pensarBot(j, ctx) {
  limpiarReclamos(ctx.t);

  if (!BOTS_IA) {
    pensarBotSimple(j, ctx);
    return;
  }

  const ia = j.ia || iniciarEstado(j);
  const { t, ARENA } = ctx;

  if (t >= ia.proximaDecision || !ia.objetivo || (ia.objetivo.orbe !== undefined && !ctx.orbes.includes(ia.objetivo))) {
    decidirObjetivo(j, ia, ctx);
    ia.proximaDecision = t + ia.reaccionMs;
  }

  const objetivo = ia.objetivo || j;
  let dx = objetivo.x - j.x;
  let dy = objetivo.y - j.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d; dy /= d;

  // evita pegarse a las paredes
  const margen = 60;
  if (j.x < margen) dx += (margen - j.x) / margen;
  if (j.x > ARENA.ancho - margen) dx -= (margen - (ARENA.ancho - j.x)) / margen;
  if (j.y < margen) dy += (margen - j.y) / margen;
  if (j.y > ARENA.alto - margen) dy -= (margen - (ARENA.alto - j.y)) / margen;

  // un poco de ruido humano, más en el novato
  const ruido = ia.personalidad === 'novato' ? 0.35 : 0.12;
  dx += rnd(-ruido, ruido);
  dy += rnd(-ruido, ruido);

  const dNorm = Math.hypot(dx, dy) || 1;
  dx /= dNorm; dy /= dNorm;

  // giro suave: interpola hacia la dirección deseada en vez de saltar
  const suavizado = 0.18;
  ia.dir.x += (dx - ia.dir.x) * suavizado;
  ia.dir.y += (dy - ia.dir.y) * suavizado;

  const mag = Math.hypot(ia.dir.x, ia.dir.y) || 1;
  j.input.dx = (ia.dir.x / mag) * ia.velFactor;
  j.input.dy = (ia.dir.y / mag) * ia.velFactor;
  j.input.accion = decidirRam(j, ia, ctx);
}

// Comportamiento original (sin personalidades), para BOTS_IA=0.
function pensarBotSimple(j, ctx) {
  const { t, orbes, ARENA, R, activos } = ctx;
  if (t > j.cambioObjetivo || !j.objetivo || (j.objetivo.orbe && !orbes.includes(j.objetivo))) {
    j.objetivo = Math.random() < 0.7 && orbes.length
      ? orbes[Math.floor(Math.random() * orbes.length)]
      : puntoAleatorio(ARENA);
    if (orbes.includes(j.objetivo)) j.objetivo.orbe = true;
    j.cambioObjetivo = t + rnd(800, 2500);
  }
  const dx = j.objetivo.x - j.x;
  const dy = j.objetivo.y - j.y;
  const d = Math.hypot(dx, dy) || 1;
  j.input.dx = dx / d;
  j.input.dy = dy / d;
  j.input.accion = t >= j.recargaHasta && Math.random() < 0.08 && rivalMasCercano(j, activos, R.embestida.radio, false) ? 1 : 0;
}
