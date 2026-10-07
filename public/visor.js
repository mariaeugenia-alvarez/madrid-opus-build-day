// Visor de retransmisión — Persona 3 (andrsbayona).
// Tematización: Coliseo Romano. La lógica de red sigue el contrato (shared/contract.js);
// este archivo solo decide cómo se presenta cada fase en pantalla.
import * as CONTRATO from '/shared/contract.js';

const { EV, FASES, ARENA } = CONTRATO;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const romano = (n) => {
  const tabla = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let r = '';
  let v = Math.max(0, Math.round(n));
  for (const [val, sym] of tabla) while (v >= val) { r += sym; v -= val; }
  return r || '—';
};
const NOMBRE_FASE = {
  [FASES.LOBBY]: 'Las Puertas se Abren',
  [FASES.COUNTDOWN]: 'Silencio en la Arena',
  [FASES.RONDA]: 'Combate',
  [FASES.RESULTADOS]: 'Laureles de la Ronda',
  [FASES.PARCHE]: 'El Senado Delibera',
  [FASES.FINAL]: 'La Gran Final',
  [FASES.CEREMONIA]: 'Coronación del César',
};

const key = new URLSearchParams(location.search).get('key') || prompt('Clave del visor') || '';
const socket = io({ transports: ['websocket'] });

const canvas = $('arena');
const ctx = canvas.getContext('2d');
canvas.width = ARENA.ancho;
canvas.height = ARENA.alto;
const COLOR_EQ = { azul: '#2563eb', naranja: '#ea580c' };

let roster = new Map();
let estado = null;
let finFase = 0;
let pausado = false;
let faseActual = null;

socket.on('connect', () => socket.emit(EV.VISOR_JOIN, { key }, (r) => { if (!r.ok) alert(r.error); }));
socket.on(EV.JUGADORES, (l) => { roster = new Map(l.map((j) => [j.id, j])); });
socket.on(EV.STATE, (s) => { estado = s; });

socket.on(EV.STATS, (s) => {
  $('pAzul').textContent = s.equipos.azul;
  $('pNaranja').textContent = s.equipos.naranja;
  $('conectados').textContent = s.conectados;
  $('bots').textContent = s.bots;
  $('lobby-conectados').textContent = s.conectados;
  $('top10').innerHTML = s.top10.map((j) => `<li><span style="color:${j.color}">●</span> ${esc(j.alias)} <b>${j.puntos}</b></li>`).join('');
});

socket.on(EV.PROPUESTAS, (l) => {
  $('edictos').innerHTML = l.slice(-12).reverse().map((p) => `
    <li>${esc(p.texto)} <small>· ${p.estado} · ${p.votos}v</small>
    ${p.estado === 'pendiente'
      ? `<span class="edicto-botones"><button onclick="window.__ctl('aprobar',${p.id})">✔</button><button onclick="window.__ctl('rechazar',${p.id})">✖</button></span>`
      : ''}</li>`).join('');
});

socket.on(EV.EVENTO, (e) => {
  const d = document.createElement('div');
  d.textContent = e.texto;
  $('pregon').prepend(d);
  while ($('pregon').children.length > 14) $('pregon').lastChild.remove();
});

socket.on(EV.ANUNCIO, (a) => {
  $('anuncio-titulo').textContent = a.titulo;
  $('anuncio-texto').textContent = a.texto || '';
  mostrarSolo('overlay-anuncio', { exclusivo: false });
  clearTimeout(window.__an);
  window.__an = setTimeout(() => ocultar('overlay-anuncio'), 2400);
});

socket.on(EV.FASE, (f) => {
  faseActual = f.fase;
  $('fase-nombre').textContent = NOMBRE_FASE[f.fase] || f.fase;
  $('fase-ronda').textContent = [FASES.RONDA, FASES.RESULTADOS].includes(f.fase) ? `Ronda ${romano(f.ronda)} de ${romano(f.rondas)}` : (f.fase === FASES.FINAL ? 'Enfrentamiento final' : '');
  finFase = performance.now() + f.restanteMs;
  pausado = f.pausado;

  ocultarTodosLosOverlays();
  if (f.fase === FASES.LOBBY) mostrarSolo('overlay-puertas');
  if (f.fase === FASES.COUNTDOWN) iniciarCuentaAtras(f.restanteMs);
  if (f.fase === FASES.RESULTADOS) pintarResultados(f.datos);
  if (f.fase === FASES.CEREMONIA) pintarCeremonia(f.datos);
});

function ocultarTodosLosOverlays() {
  for (const id of ['overlay-puertas', 'overlay-countdown', 'overlay-resultados', 'overlay-ceremonia']) ocultar(id);
}
function mostrarSolo(id) { $(id).classList.remove('oculto'); }
function ocultar(id) { $(id).classList.add('oculto'); }

function iniciarCuentaAtras(duracionMs) {
  mostrarSolo('overlay-countdown');
  construirLaurel();
  const paso = () => {
    const restante = Math.max(0, finFase - performance.now());
    const n = Math.ceil(restante / 1000);
    $('numero-cuenta').textContent = n > 0 ? romano(n) : '¡YA!';
    if (!$('overlay-countdown').classList.contains('oculto') && restante > 0) requestAnimationFrame(paso);
  };
  paso();
}

function construirLaurel() {
  const cont = $('laurel');
  if (cont.dataset.listo) return;
  cont.dataset.listo = '1';
  const hojas = 24;
  for (let i = 0; i < hojas; i++) {
    const ladoIzq = i < hojas / 2;
    const t = (i % (hojas / 2)) / (hojas / 2 - 1);
    const angulo = 20 + t * 150; // arco abierto por abajo, como una corona de laurel clásica
    const h = document.createElement('div');
    h.className = 'hoja';
    const signo = ladoIzq ? -1 : 1;
    h.style.transform = `rotate(${signo * angulo - 90}deg) translate(130px, 0) rotate(${signo * 30}deg)`;
    cont.appendChild(h);
  }
}

function pintarResultados(d) {
  if (!d) return;
  $('res-mvp').textContent = d.mvp ? `${d.mvp.alias} — Gladiador de la ronda` : 'Sin gladiador destacado';
  $('res-azul').textContent = d.equipos?.azul ?? 0;
  $('res-naranja').textContent = d.equipos?.naranja ?? 0;
  $('res-destacado').textContent = d.destacado || '';
  mostrarSolo('overlay-resultados');
}

function pintarCeremonia(d) {
  if (!d) return;
  const medallas = ['II', 'I', 'III'];
  const clases = ['p2', 'p1', 'p3'];
  const orden = [d.podio?.[1], d.podio?.[0], d.podio?.[2]];
  $('podio').innerHTML = orden.map((j, i) => j ? `
    <div class="pedestal ${clases[i]}">
      <div class="numero">${medallas[i]}</div>
      <div class="alias">${esc(j.alias)}</div>
      <div class="puntos">${j.puntos} pts</div>
    </div>` : '').join('');
  $('ceremonia-resumen').innerHTML = `
    <div>Equipo vencedor: <b>${esc(d.ganador)}</b></div>
    <div>Edictos promulgados: <b>${d.parches}</b></div>
    <div>Líneas escritas por Claude: <b>${d.lineas}</b></div>
    ${d.masVotada ? `<div>Edicto más aclamado: <b>${esc(d.masVotada)}</b></div>` : ''}`;
  mostrarSolo('overlay-ceremonia');
}

// -------- control del César --------
window.__ctl = ctl;
function ctl(accion, id) {
  socket.emit(EV.CONTROL, { accion, id }, (r) => { if (!r.ok) console.warn(r.error); });
}
document.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => ctl(b.dataset.a)));
addEventListener('keydown', (e) => {
  const m = { ' ': 'iniciar', p: 'pausar', r: 'reiniciar', f: 'final' }[e.key.toLowerCase()];
  if (m) { e.preventDefault(); ctl(m); }
});

// Si no hay /qr.svg (todavía no lo expone el servidor real), muestra la URL pública como texto.
fetch('/qr.svg').then((r) => { if (!r.ok) throw 0; }).catch(() => {
  $('qr-fallback').textContent = location.origin;
  $('qr-fallback').style.display = 'block';
  $('qr-img').style.display = 'none';
});

// -------- bucle de dibujo de la arena --------
function dibujar() {
  const rest = pausado ? null : Math.max(0, finFase - performance.now());
  if (rest !== null && [FASES.RONDA, FASES.FINAL].includes(faseActual)) {
    $('reloj').textContent = `${Math.ceil(rest / 1000)}s`;
  } else if (![FASES.RONDA, FASES.FINAL].includes(faseActual)) {
    $('reloj').textContent = '—';
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // suelo de arena
  ctx.fillStyle = '#c9a66b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(80,50,20,.25)';
  for (let x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

  if (estado) {
    ctx.fillStyle = '#d4af37';
    for (const [x, y] of estado.o) {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a6d1f'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.font = '11px Georgia, serif';
    ctx.textAlign = 'center';
    for (const [id, x, y, eq, puntos] of estado.j) {
      const info = roster.get(id);
      const colorEquipo = eq === 0 ? COLOR_EQ.azul : COLOR_EQ.naranja;
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fillStyle = info?.color || '#999'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = colorEquipo; ctx.stroke();
      if (info && !info.bot) {
        ctx.fillStyle = '#2a1a10';
        ctx.fillText(info.alias, x, y - 20);
      }
    }
  }
  requestAnimationFrame(dibujar);
}
dibujar();
