// Contrato de comunicación PROVISIONAL — La sala es el código.
// Propuesto por Persona 6 a partir del documento de la demo; se cierra en la sesión inicial.
// Es la fuente de verdad de nombres de evento, fases, límites y forma de los mensajes:
// servidor (P1), móvil (P2), visor (P3) y estadísticas (P4) importan de aquí.
// Módulo ES: en Node `import { EV } from '../shared/contract.js'` y en el navegador
// `<script type="module">import * as CONTRATO from '/shared/contract.js'</script>`.
//
// DECISIÓN PROVISIONAL (medida con infra/loadtest.js a través del túnel):
//   el estado completo a 20 Hz va SOLO al visor. Enviarlo a 150 móviles satura la subida
//   (1 KB × 20 Hz × 150 ≈ 24 Mbit/s → latencias de segundos; con ~200 B baja a ~26 ms).
//   Los móviles son mandos: miran la pantalla grande y reciben `me` (su estado) a 10 Hz.
//
// PENDIENTE DE P1 (adevex-drone). Añadidos compatibles que ya implementa el simulador:
//   · reconexión con `token` en join (P2 y P4: playerId estable, no perder puntos);
//   · `finEn` en fase (P2: contar el tiempo en local);
//   · `parche` con nombre, reglaId, propuestaId, commit, aprobadoEn y desplegadoEn (P4).
// PENDIENTE DE DECIDIR (P1 + P2 + P4):
//   · `me`: el contrato y P2 lo quieren a 10 Hz con x, y y recargaMs (minimapa y anillo de recarga);
//     P4 genera sus datos de estadística con stats.drainMe(), máx. 2/s y solo si cambian.
//     Propuesta: x, y y recargaMs salen del motor a 10 Hz y se fusionan con lo último de drainMe().
//   · `stats`: la forma final la define P4 (prompts/04-estadisticas.md, versión `v: 1`).
//     `ejemploStats` y el simulador son provisionales hasta que exista game/stats.js.

export const TICK_HZ = 20; // bucle del servidor y `state` al visor
export const ME_HZ = 10; // `me` a cada móvil
export const STATS_HZ = 1; // `stats` al visor

export const ARENA = { ancho: 1000, alto: 600 }; // coordenadas enteras, origen arriba-izquierda
export const EQUIPOS = ['azul', 'naranja']; // en mensajes compactos: 0 = azul, 1 = naranja
export const LIMITES = { alias: 12, propuesta: 80 };
// Vecindario que recibe cada móvil en `me.cerca` para ver a sus rivales sin enviarle el estado completo.
export const CERCA = { radio: 260, maxJugadores: 14, maxOrbes: 12 };
export const HEATMAP = { ancho: 20, alto: 12, cadaMs: 500 }; // celdas de 50×50 px

export const REGLAS_BASE = {
  velocidad: 220, // px/s con el joystick a fondo
  radioJugador: 12,
  radioOrbe: 6,
  orbesEnArena: 40,
  // La embestida es un sprint: sprintMs a velocidad × sprint en la última dirección; roba al primer rival que toque.
  embestida: { radio: 36, robo: 3, recargaMs: 2000, sprintMs: 300, sprint: 3 },
};

export const FASES = {
  LOBBY: 'LOBBY',
  COUNTDOWN: 'COUNTDOWN',
  RONDA: 'RONDA',
  RESULTADOS: 'RESULTADOS',
  PARCHE: 'PARCHE',
  FINAL: 'FINAL',
  CEREMONIA: 'CEREMONIA',
};

// Flujo: LOBBY → COUNTDOWN → RONDA → RESULTADOS → PARCHE → COUNTDOWN → RONDA … → PARCHE
//        → COUNTDOWN → FINAL → CEREMONIA → LOBBY

export const EV = {
  // ---------------- jugador → servidor ----------------
  // join      { alias: string(1..12), color: '#rrggbb', token?: string }
  //           ack → { ok: true, id, equipo: 'azul'|'naranja', espectador: bool, token, reconectado: bool }
  //                 | { ok: false, error }
  //           Si la ronda está en curso entra como espectador hasta la siguiente.
  //           Reconexión: guarda `token` (localStorage) y reenvíalo en join; con un token válido vuelve
  //           el mismo jugador (mismo id, equipo y puntos) y se ignoran alias y color. El servidor lo
  //           guarda 60 s tras desconectarse. Si el token entra desde otra pestaña, gana la última.
  JOIN: 'join',
  // input     [dx, dy, accion]   dx, dy ∈ [-1, 1]; accion 0|1 (1 = intento de embestida)
  //           Máx. 20/s. Array y no objeto para ahorrar bytes.
  INPUT: 'input',
  // propuesta { texto: string(1..80) }  ack → { ok, id } — entra en la cola de moderación del visor
  PROPUESTA: 'propuesta',
  // voto      { id }  solo en PARCHE, sobre propuestas aprobadas. Un voto por jugador y no se puede
  //           cambiar. ack → { ok } | { ok: false, error }
  VOTO: 'voto',

  // ---------------- visor → servidor ----------------
  // visor:join { key }  ack → { ok } — después recibe `jugadores`, `propuestas`, `state`, `stats`
  VISOR_JOIN: 'visor:join',
  // control   { accion: 'iniciar'|'pausar'|'reiniciar'|'final'|'saltar'|'aprobar'|'rechazar', id? }
  //           iniciar: sale de LOBBY / RESULTADOS / PARCHE / CEREMONIA. pausar: alterna pausa.
  //           aprobar|rechazar: { id } de propuesta. ack → { ok } | { ok: false, error }
  CONTROL: 'control',

  // ---------------- servidor → visor ----------------
  // state     { tick, restanteMs, j: [[id, x, y, equipo, puntos, sprint(0|1)], …], o: [[x, y], …] }  20/s
  STATE: 'state',
  // jugadores [{ id, alias, color, equipo, bot, espectador, conectado }, …]  al cambiar el roster
  JUGADORES: 'jugadores',
  // stats     ver `ejemploStats` abajo. 1/s
  STATS: 'stats',
  // propuestas [{ id, texto, autor, estado: 'pendiente'|'aprobada'|'rechazada'|'instalada', votos }]
  //           al cambiar — es la cola de moderación
  PROPUESTAS: 'propuestas',
  // evento    { tipo: 'embestida'|'racha'|'entra'|'sale', texto, t }  para el ticker inferior
  //           embestida añade { x, y, atacanteId, victimaId, equipo } para pintar el impacto
  EVENTO: 'evento',

  // ---------------- servidor → jugador ----------------
  // me        { id, equipo, espectador, x, y, puntos, total, posicion, de, recargaMs, voto }  10/s
  //           posicion = puesto por puntos totales del evento entre `de` jugadores
  //           cerca = { r, j: [[x, y, equipo], …], o: [[x, y], …] }: jugadores (máx. CERCA.maxJugadores)
  //           y orbes a menos de CERCA.radio, solo en RONDA/FINAL. ≈200 B: el móvil ve a sus rivales sin `state`.
  ME: 'me',
  // clasificacion { jugando, top: [{ id, alias, color, equipo, puntos }, …8] }  1/s a todos (también antes
  //           de entrar): lista de jugadores en el móvil y en la portada. ≈400 B.
  CLASIFICACION: 'clasificacion',

  // ---------------- servidor → todos ----------------
  // fase      { fase, ronda, rondas, duracionMs, restanteMs, finEn, pausado, datos }
  //           finEn = hora de fin en ms del reloj del servidor (null en pausa). Para contar en local,
  //           usa restanteMs al recibir el mensaje: no depende del reloj del móvil.
  //           al cambiar de fase, al pausar y al conectarse. `datos` según la fase:
  //             COUNTDOWN  { siguiente: 'RONDA'|'FINAL' }
  //             RONDA/FINAL { ronda, final: bool, reglas: [texto, …] }
  //             RESULTADOS { mvp, equipos: { azul, naranja }, rachaMax, embestidas, heatmap, destacado }
  //             PARCHE     { version, candidatas: [{ id, texto, votos }] }
  //             CEREMONIA  { podio: [3 jugadores], ganador, parches, lineas, masVotada }
  FASE: 'fase',
  // votacion  [{ id, texto, votos }]  durante PARCHE, máx. 2/s
  VOTACION: 'votacion',
  // anuncio   { titulo, texto }  pantalla completa: FIRST BLOOD, REMONTADA, PARCHE INSTALADO, GRAN FINAL
  ANUNCIO: 'anuncio',
  // parche    { version: '0.N', regla, nombre, reglaId, propuestaId, votos, lineas, ms, commit,
  //             aprobadoEn, desplegadoEn }   (regla = nombre; ms = desplegadoEn − aprobadoEn)
  PARCHE: 'parche',
};

// Forma de `stats` (1/s al visor). Lo detalla Persona 4.
export const ejemploStats = {
  fase: 'RONDA',
  ronda: 1,
  conectados: 0, // sockets con rol jugador (personas reales)
  bots: 40,
  equipos: { azul: 0, naranja: 0 }, // puntos de la ronda
  miembros: { azul: 0, naranja: 0 },
  top10: [{ id: 1, alias: 'Ana', color: '#ef4444', equipo: 'azul', puntos: 0 }],
  mvp: null, // mismo formato que una entrada de top10
  rachaMax: null, // { alias, valor } — orbes seguidos sin ser embestido, en la ronda
  embestidas: { ronda: 0, total: 0 },
  propuestas: { enviadas: 0, votos: 0 },
  parches: [], // lista de `parche`
  heatmap: { ancho: 20, alto: 12, celdas: [] }, // conteos por celda en la ronda, fila a fila
};

