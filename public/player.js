// Cliente jugador — La sala es el código (Persona 2).
// El móvil es un mando: no pinta la arena. Envía su joystick y su embestida,
// y muestra sus propios datos (`me`), la fase del match, la votación y los avisos.

import { EV, FASES, LIMITES, ARENA, REGLAS_BASE } from '/shared/contract.js';

const $ = (id) => document.getElementById(id);
const COLORES = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#a855f7', '#ec4899'];
const CLAVE_GUARDADO = 'sala:jugador';

// ------------------------------------------------------------------ estado
// Lo último que ha llegado del servidor. La interfaz se pinta a partir de aquí.
const estado = {
  dentro: false,        // ha hecho join con éxito
  alias: '',
  color: '#ffffff',
  conectado: false,
  equipo: null,         // 'azul' | 'naranja'
  espectador: false,
  fase: null,           // último payload de `fase`
  faseHasta: 0,         // performance.now() en que acaba la fase
  me: null,             // último `me`
  candidatas: [],
};

// ------------------------------------------------------------------ net
// Único punto de contacto con el servidor. Si cambia el contrato, se toca aquí.
const socket = io({ transports: ['websocket'], autoConnect: false });

function pedir(evento, datos) {
  return new Promise((resolver) => {
    socket.timeout(5000).emit(evento, datos, (err, respuesta) => {
      resolver(err ? { ok: false, error: 'El servidor no responde' } : respuesta);
    });
  });
}

const net = {
  conectar: () => socket.connect(),
  entrar: (alias, color) => pedir(EV.JOIN, { alias, color }),
  mover: (dx, dy, accion) => socket.emit(EV.INPUT, [dx, dy, accion]),
  proponer: (texto) => pedir(EV.PROPUESTA, { texto }),
  votar: (id) => pedir(EV.VOTO, { id }),
};

socket.on('connect', async () => {
  estado.conectado = true;
  pintarConexion();
  // Si ya estábamos dentro, volvemos a entrar solos con el alias guardado.
  if (estado.dentro) {
    await entrar(estado.alias, estado.color);
  }
});

socket.on('disconnect', () => {
  estado.conectado = false;
  pintarConexion();
});

socket.on(EV.FASE, (f) => {
  // Al empezar una ronda, el servidor da entrada a todos los espectadores.
  const empiezaJuego = f.fase !== estado.fase?.fase && (f.fase === FASES.RONDA || f.fase === FASES.FINAL);
  if (estado.dentro && estado.fase && empiezaJuego) estado.espectador = false;
  estado.fase = f;
  estado.faseHasta = performance.now() + (f.restanteMs ?? f.duracionMs ?? 0);
  if (f.fase === FASES.PARCHE) estado.candidatas = f.datos?.candidatas ?? [];
  actualizar();
});

socket.on(EV.ME, (me) => {
  const cambioEspectador = estado.me?.espectador !== me.espectador;
  const cambioVoto = estado.me?.voto !== me.voto;
  estado.me = me;
  estado.espectador = me.espectador;
  estado.equipo = me.equipo;
  // Recarga: el servidor manda lo que falta y la contamos en local. Justo después
  // de pulsar puede llegar un `me` anterior a la embestida: no pisamos la predicción.
  const ahora = performance.now();
  const recienPulsado = ahora - controles.pulsadoEn < 400;
  const hastaServidor = ahora + me.recargaMs;
  controles.recargaHasta = recienPulsado ? Math.max(controles.recargaHasta, hastaServidor) : hastaServidor;
  if (cambioEspectador) actualizar();
  if (cambioVoto) pintarCandidatas();
  pintarHud();
});

socket.on(EV.VOTACION, (candidatas) => {
  estado.candidatas = candidatas;
  pintarCandidatas();
});

socket.on(EV.ANUNCIO, ({ titulo, texto }) => {
  // El servidor acompaña cada `parche` con un anuncio «PARCHE INSTALADO»: no lo repetimos.
  if (/^PARCHE/i.test(titulo) && performance.now() - avisos.ultimoParche < 2000) return;
  avisos.mostrar(titulo, texto);
});

socket.on(EV.PARCHE, ({ version, regla }) => {
  avisos.ultimoParche = performance.now();
  avisos.mostrar(`PARCHE v${version} INSTALADO`, regla);
});

// ------------------------------------------------------------------ entrada
const ADJETIVOS = ['Veloz', 'Rojo', 'Sabio', 'Loco', 'Ninja', 'Turbo', 'Épico', 'Feroz'];
const ANIMALES = ['Zorro', 'Lince', 'Búho', 'Puma', 'Orca', 'Koala', 'Tigre', 'Panda', 'Halcón', 'Nutria'];
const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
const aliasAleatorio = () => `${azar(ANIMALES)}${azar(ADJETIVOS)}${Math.floor(Math.random() * 10)}`.slice(0, LIMITES.alias);

function leerGuardado() {
  try { return JSON.parse(localStorage.getItem(CLAVE_GUARDADO)); } catch { return null; }
}
function guardar(alias, color) {
  try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify({ alias, color })); } catch { /* modo privado */ }
}

let colorElegido = COLORES[0];

function prepararEntrada() {
  const guardado = leerGuardado();
  $('alias').maxLength = LIMITES.alias;
  $('alias').value = guardado?.alias || aliasAleatorio();
  colorElegido = COLORES.includes(guardado?.color) ? guardado.color : azar(COLORES);

  for (const color of COLORES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'color';
    b.style.background = color;
    b.dataset.color = color;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', color);
    b.addEventListener('click', () => { colorElegido = color; pintarColores(); });
    $('colores').append(b);
  }
  pintarColores();

  $('form-entrada').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alias = $('alias').value.trim();
    if (!alias) return mostrarError('error-entrada', 'Escribe un alias');
    const boton = e.submitter;
    if (boton) boton.disabled = true;
    const r = await entrar(alias, colorElegido);
    if (boton) boton.disabled = false;
    if (!r.ok) mostrarError('error-entrada', r.error);
  });
}

function pintarColores() {
  for (const b of $('colores').children) {
    b.setAttribute('aria-checked', String(b.dataset.color === colorElegido));
  }
  document.body.style.setProperty('--color', colorElegido);
}

async function entrar(alias, color) {
  const r = await net.entrar(alias, color);
  if (!r?.ok) return r ?? { ok: false, error: 'Error al entrar' };
  guardar(alias, color);
  Object.assign(estado, { dentro: true, alias, color });
  estado.equipo = r.equipo;
  estado.espectador = r.espectador;
  mantenerPantallaEncendida();
  actualizar();
  return r;
}

// ------------------------------------------------------------------ pantallas
const PANTALLA_POR_FASE = {
  [FASES.LOBBY]: 'lobby',
  [FASES.COUNTDOWN]: 'countdown',
  [FASES.RONDA]: 'juego',
  [FASES.FINAL]: 'juego',
  [FASES.RESULTADOS]: 'resultados',
  [FASES.PARCHE]: 'parche',
  [FASES.CEREMONIA]: 'ceremonia',
};

function pantallaActual() {
  if (!estado.dentro) return 'entrada';
  const pantalla = PANTALLA_POR_FASE[estado.fase?.fase] ?? 'lobby';
  return pantalla === 'juego' && estado.espectador ? 'espectador' : pantalla;
}

// Cambia de pantalla y la repinta. Se llama cuando cambia la fase o el rol.
function actualizar() {
  const pantalla = pantallaActual();
  for (const s of document.querySelectorAll('section[data-pantalla]')) {
    s.hidden = s.dataset.pantalla !== pantalla;
  }
  document.body.dataset.pantalla = pantalla;
  document.body.dataset.equipo = estado.equipo ?? '';
  $('pausa').hidden = !estado.fase?.pausado;
  if (pantalla !== 'juego') controles.soltar();

  const f = estado.fase;
  const datos = f?.datos ?? {};
  if (pantalla === 'lobby') pintarLobby(f);
  if (pantalla === 'countdown') {
    $('cuenta-texto').textContent = datos.siguiente === FASES.FINAL ? '¡Llega la gran final!' : '¡Prepárate!';
  }
  if (pantalla === 'juego') pintarJuego(datos);
  if (pantalla === 'resultados') pintarResultados(datos);
  if (pantalla === 'parche') pintarParche(datos);
  if (pantalla === 'ceremonia') pintarCeremonia(datos);
  pintarHud();
}

function pintarLobby(f) {
  $('lobby-alias').textContent = estado.alias;
  $('lobby-equipo').textContent = (estado.equipo ?? '').toUpperCase();
  $('lobby-ronda').textContent = f?.rondas ? `Ronda ${Math.max(1, f.ronda + 1)} de ${f.rondas}` : '';
}

function pintarJuego(datos) {
  $('gran-final').hidden = !datos.final;
  const reglas = $('reglas');
  reglas.replaceChildren(...(datos.reglas ?? []).map((texto) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = texto;
    return chip;
  }));
}

function pintarResultados(datos) {
  const { azul = 0, naranja = 0 } = datos.equipos ?? {};
  $('res-ganador').textContent = azul === naranja ? 'Empate' : `Gana ${azul > naranja ? 'AZUL' : 'NARANJA'}`;
  $('res-marcador').textContent = `${azul} — ${naranja}`;
  $('res-mvp').textContent = datos.mvp ? `MVP: ${datos.mvp.alias} (${datos.mvp.puntos})` : '';
  $('res-destacado').textContent = datos.destacado ?? '';
}

function pintarParche(datos) {
  $('parche-version').textContent = datos.version ? `Parche v${datos.version}` : 'Parche';
  $('msg-voto').textContent = '';
  pintarCandidatas();
}

function pintarCandidatas() {
  const lista = $('candidatas');
  const miVoto = estado.me?.voto ?? null;
  if (!estado.candidatas.length) {
    const vacio = document.createElement('li');
    vacio.className = 'sutil';
    vacio.textContent = 'Esperando propuestas aprobadas…';
    lista.replaceChildren(vacio);
    return;
  }
  // El texto lo escribe el público: siempre textContent, nunca innerHTML.
  lista.replaceChildren(...estado.candidatas.map((c) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'candidata';
    b.disabled = miVoto !== null;
    b.setAttribute('aria-pressed', String(miVoto === c.id));
    const texto = document.createElement('span');
    texto.textContent = c.texto;
    const votos = document.createElement('span');
    votos.className = 'votos';
    votos.textContent = `${c.votos}${miVoto === c.id ? ' ✓' : ''}`;
    b.append(texto, votos);
    b.addEventListener('click', () => votar(c.id));
    li.append(b);
    return li;
  }));
}

async function votar(id) {
  const r = await net.votar(id);
  if (!r.ok) return mostrarError('msg-voto', r.error);
  if (estado.me) estado.me.voto = id; // se confirma con el siguiente `me`
  pintarCandidatas();
}

function prepararPropuesta() {
  const campo = $('propuesta');
  campo.maxLength = LIMITES.propuesta;
  const contar = () => { $('contador').textContent = `${campo.value.length}/${LIMITES.propuesta}`; };
  campo.addEventListener('input', contar);
  contar();

  $('form-propuesta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = campo.value.trim();
    if (!texto) return;
    const r = await net.proponer(texto);
    if (!r.ok) return mostrarError('msg-propuesta', r.error);
    campo.value = '';
    contar();
    $('msg-propuesta').textContent = '¡Enviada! El presentador la revisará.';
  });
  // Enter envía en lugar de saltar de línea.
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('form-propuesta').requestSubmit(); }
  });
}

function pintarCeremonia(datos) {
  const g = datos.ganador;
  $('cer-ganador').textContent = g === 'empate' ? '🏆 Empate' : `🏆 Gana ${(g ?? '').toUpperCase()}`;
  $('cer-podio').replaceChildren(...(datos.podio ?? []).map((j) => {
    const li = document.createElement('li');
    const alias = document.createElement('span');
    alias.textContent = j.alias;
    const puntos = document.createElement('strong');
    puntos.textContent = j.puntos;
    li.append(alias, puntos);
    return li;
  }));
  const parches = datos.parches ?? 0;
  $('cer-parches').textContent = parches
    ? `${parches} parches · ${datos.lineas ?? 0} líneas escritas por Claude`
    : '';
}

// HUD: datos que cambian con cada `me`.
function pintarHud() {
  const me = estado.me;
  const tu = me ? `#${me.posicion} de ${me.de} · ${me.total} pts` : '–';
  $('res-tu').textContent = me ? `#${me.posicion} · ${me.puntos} pts en la ronda` : '–';
  $('cer-tu').textContent = tu;
  if (!me) return;
  $('hud-puntos').textContent = me.puntos;
  $('hud-posicion').textContent = `#${me.posicion}/${me.de}`;
}

function pintarConexion() {
  $('conexion').dataset.estado = estado.conectado ? 'ok' : 'ko';
  $('reconectando').hidden = estado.conectado || !estado.dentro;
}

function mostrarError(id, texto) {
  $(id).textContent = texto;
  setTimeout(() => { if ($(id).textContent === texto) $(id).textContent = ''; }, 4000);
}

// ------------------------------------------------------------------ controles
// Joystick flotante (mitad izquierda) y botón de embestida. Cada dedo se sigue
// por su pointerId, así se puede mover y embestir a la vez.
const RADIO_JOYSTICK = 56; // px de recorrido máximo de la palanca
const ENVIO_MS = 1000 / 20; // como mucho 20 entradas por segundo

const controles = {
  dedo: null,           // pointerId del joystick
  origen: { x: 0, y: 0 },
  dx: 0,
  dy: 0,
  accion: 0,            // embestida pendiente de enviar
  enviado: '0,0,0',
  recargaHasta: 0,
  pulsadoEn: -Infinity, // cuándo se pulsó la embestida por última vez

  soltar() {
    this.dedo = null;
    this.dx = 0;
    this.dy = 0;
    $('joystick').hidden = true;
  },
};

function prepararControles() {
  const zona = $('zona-joystick');

  zona.addEventListener('pointerdown', (e) => {
    if (controles.dedo !== null) return;
    controles.dedo = e.pointerId;
    controles.origen = { x: e.clientX, y: e.clientY };
    const base = $('joystick');
    base.style.left = `${e.clientX}px`;
    base.style.top = `${e.clientY}px`;
    base.hidden = false;
    moverPalanca(0, 0);
    zona.setPointerCapture(e.pointerId);
  });

  zona.addEventListener('pointermove', (e) => {
    if (e.pointerId !== controles.dedo) return;
    let x = e.clientX - controles.origen.x;
    let y = e.clientY - controles.origen.y;
    const largo = Math.hypot(x, y);
    if (largo > RADIO_JOYSTICK) { x *= RADIO_JOYSTICK / largo; y *= RADIO_JOYSTICK / largo; }
    moverPalanca(x, y);
    // Dos decimales: suficiente precisión y menos mensajes por ruido del dedo.
    controles.dx = Math.round((x / RADIO_JOYSTICK) * 100) / 100;
    controles.dy = Math.round((y / RADIO_JOYSTICK) * 100) / 100;
  });

  const fin = (e) => { if (e.pointerId === controles.dedo) controles.soltar(); };
  zona.addEventListener('pointerup', fin);
  zona.addEventListener('pointercancel', fin);

  $('embestida').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (performance.now() < controles.recargaHasta) return;
    controles.accion = 1;
    controles.pulsadoEn = performance.now();
    // Predicción local: el servidor arranca la recarga aunque no haya rival cerca.
    controles.recargaHasta = performance.now() + REGLAS_BASE.embestida.recargaMs;
    if (navigator.vibrate) navigator.vibrate(30);
  });

  // Envío de entradas: solo si cambian, y como mucho a 20/s.
  setInterval(() => {
    if (!estado.conectado || pantallaActual() !== 'juego') return;
    const actual = `${controles.dx},${controles.dy},${controles.accion}`;
    if (actual === controles.enviado) return;
    net.mover(controles.dx, controles.dy, controles.accion);
    controles.enviado = actual;
    controles.accion = 0;
  }, ENVIO_MS);
}

function moverPalanca(x, y) {
  $('palanca').style.transform = `translate(${x}px, ${y}px)`;
}

// ------------------------------------------------------------------ animación
// Un único bucle para lo que cambia cada frame: tiempo, cuenta atrás, recarga y minimapa.
const minimapa = { ctx: null, x: ARENA.ancho / 2, y: ARENA.alto / 2 };

function bucle() {
  const ahora = performance.now();
  const pantalla = pantallaActual();
  const restante = estado.fase?.pausado
    ? estado.fase.restanteMs
    : Math.max(0, estado.faseHasta - ahora);

  if (pantalla === 'countdown') $('cuenta').textContent = Math.max(1, Math.ceil(restante / 1000));
  if (pantalla === 'juego') {
    const s = Math.ceil(restante / 1000);
    $('hud-tiempo').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const falta = Math.max(0, controles.recargaHasta - ahora) / REGLAS_BASE.embestida.recargaMs;
    $('embestida').style.setProperty('--recarga', Math.min(1, falta));
    $('embestida').classList.toggle('lista', falta === 0);
    pintarMinimapa();
  }
  requestAnimationFrame(bucle);
}

function pintarMinimapa() {
  const canvas = $('minimapa');
  const dpr = window.devicePixelRatio || 1;
  const ancho = Math.round(canvas.clientWidth * dpr);
  const alto = Math.round(canvas.clientHeight * dpr);
  if (!ancho || !alto) return;
  if (canvas.width !== ancho || canvas.height !== alto) {
    canvas.width = ancho;
    canvas.height = alto;
  }
  const ctx = minimapa.ctx ??= canvas.getContext('2d');
  const me = estado.me;
  // `me` llega a 10/s: suavizamos el punto para que no vaya a saltos.
  if (me) {
    minimapa.x += (me.x - minimapa.x) * 0.25;
    minimapa.y += (me.y - minimapa.y) * 0.25;
  }
  ctx.clearRect(0, 0, ancho, alto);
  const px = (minimapa.x / ARENA.ancho) * ancho;
  const py = (minimapa.y / ARENA.alto) * alto;
  const r = Math.max(6 * dpr, (REGLAS_BASE.radioJugador / ARENA.ancho) * ancho);
  ctx.beginPath();
  ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = estado.color;
  ctx.fill();
  ctx.lineWidth = 2 * dpr;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}

// ------------------------------------------------------------------ avisos
// Cola de avisos a pantalla completa (anuncios y parches), 3 s cada uno.
const avisos = {
  cola: [],
  activo: false,
  ultimoParche: -Infinity,

  mostrar(titulo, texto = '') {
    this.cola.push({ titulo, texto });
    if (!this.activo) this.siguiente();
  },

  siguiente() {
    const aviso = this.cola.shift();
    if (!aviso) { this.activo = false; $('aviso').hidden = true; return; }
    this.activo = true;
    $('aviso-titulo').textContent = aviso.titulo;
    $('aviso-texto').textContent = aviso.texto;
    $('aviso').hidden = false;
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    setTimeout(() => this.siguiente(), 3000);
  },
};

// ------------------------------------------------------------------ móvil
// Que la pantalla no se apague a media ronda (Safari iOS 16.4+, Chrome Android).
let bloqueoPantalla = null;
async function mantenerPantallaEncendida() {
  try {
    if ('wakeLock' in navigator && !bloqueoPantalla) {
      bloqueoPantalla = await navigator.wakeLock.request('screen');
      bloqueoPantalla.addEventListener('release', () => { bloqueoPantalla = null; });
    }
  } catch { /* no disponible: no pasa nada */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && estado.dentro) mantenerPantallaEncendida();
});

// Sin zoom por gesto ni menú contextual durante el juego.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ------------------------------------------------------------------ arranque
prepararEntrada();
prepararPropuesta();
prepararControles();
pintarConexion();
actualizar();
net.conectar();
requestAnimationFrame(bucle);
