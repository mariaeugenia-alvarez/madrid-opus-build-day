# Persona 4 — Estadísticas · «La sala es el código»

Oct 7, 2026 · Ficha, prompt para Claude Code y anexo de integración

**Cómo usar este archivo**

1. **Ficha respondida** (sección 1): para revisarla en equipo. Son las decisiones de la Persona 4.
2. **Prompt** (sección 2): se copia entero en Claude Code. No depende de este archivo: todo lo que necesita está dentro.
3. **Anexo de integración** (sección 3): lo que la Persona 4 pide a cada compañero y lo que le entrega. Es lo que hay que cerrar para que los seis prompts encajen.
4. **Uso en directo** (sección 4): chuleta del comentarista.

Los nombres de archivos, eventos y frecuencias vienen del documento de diseño (*Demo Claude Community*). **Si el `CLAUDE.md` común dice otra cosa, manda `CLAUDE.md`.**

**Única desviación propuesta respecto al diseño:** el resumen se guarda en `data/stats.json` en lugar de `stats.json` en la raíz. Si queda en la raíz, nodemon reinicia el servidor cada vez que se escribe y el archivo se cuela en los commits de cada parche. Hay que cerrarlo con las personas 5 y 6 (ver anexo).

---

## 1. Ficha respondida

### ¿Qué estadísticas se muestran en directo y cuáles solo al final de cada ronda?

| Momento | Visor (pantalla grande) | Móvil (jugador) |
| --- | --- | --- |
| LOBBY | Contador de conectados con pulso y pico de la noche (estilo HQ Trivia) | Puesto acumulado del evento, si ya ha jugado |
| RONDA (en directo, 1/s) | Top 10 con flechas ▲▼, rachas activas 🔥, gráfica de ventaja Azul vs Naranja con favorito en %, contadores (orbes, embestidas, puntos robados), ticker, anuncios | Mini-HUD: puesto, puntos, cambio de puesto, racha y avisos personales |
| RESULTADOS | MVP (Star Player), medallas, mapa de calor por equipo, jugada de la ronda, racha más larga, récords | Tarjeta personal: puesto, cambio respecto a la ronda anterior, medalla o «tu mejor dato» con percentil |
| PARCHE | Votos en vivo (barras estilo Kahoot), cronómetro del parche frente al mejor tiempo (fantasma estilo Mario Kart), curiosidades rotativas, notas del parche | Cómo va la propuesta propia y a qué se ha votado |
| CEREMONIA | La noche en números → medallas de la noche → Claude en números → equipo ganador → podio 3·2·1 | «Tu noche»: 4 tarjetas al estilo Wrapped |

### ¿Qué cuenta como «momento destacado» y cómo se detecta?

| Momento | Se detecta cuando | Prioridad | Dónde | Anuncio |
| --- | --- | --- | --- | --- |
| First blood | Primera embestida de la ronda | 5 | Pantalla | FIRST BLOOD |
| Remontada | Un equipo que perdía por ≥ máx(10 puntos, 15 % de los puntos de la ronda) pasa a liderar. Una vez por equipo y ronda | 5 | Pantalla | REMONTADA |
| Clutch | En los últimos 10 s cambia el equipo líder (si coincide con una remontada, gana el clutch) | 5 | Pantalla | ¡CLUTCH! |
| Multi-embestida | 2.ª o 3.ª embestida del mismo jugador, cada una a < 5 s de la anterior | 3 (doble) / 4 (triple) | Pantalla | DOBLE / TRIPLE EMBESTIDA |
| Shutdown | Embestir a alguien con racha ≥ 5 | 4 | Pantalla | SHUTDOWN |
| Racha | La racha llega a 5 / 10 / 15 orbes sin ser embestido | 2 / 3 / 4 | x5 en el ticker; x10 y x15 en pantalla | EN RACHA / IMPARABLE / LEGENDARIO |
| Nuevo líder | Cambia el n.º 1 de la ronda (no en los primeros 10 s; cooldown de 10 s) | 3 | Pantalla | NUEVO LÍDER |
| Récord | Se bate un récord de la noche (racha, puntos en una ronda, embestidas en una ronda) | 3 | Ticker en RONDA; pantalla en RESULTADOS | RÉCORD DE LA NOCHE |
| Venganza | Embestir a quien te embistió hace < 10 s | 2 | Ticker | — |
| De regla | Una regla nueva emite un evento `momento` (p. ej. «ZOMBI INFECTA») | La que indique (máx. 4) | Según prioridad | Texto de la regla |

- **Para no saturar la pantalla:** máximo 1 anuncio a pantalla completa cada 3 s y 3 en cola.
  - El de mayor prioridad sale primero.
  - Si un anuncio lleva más de 4 s en cola, baja al ticker.
  - El mismo jugador no sale a pantalla completa más de una vez cada 10 s, salvo con prioridad 5.
- **Jugada de la ronda** (como el «Play of the Game» de Overwatch): gana el momento con más puntuación.
  - Puntuación = prioridad × 20, ×1,5 si ocurre en los últimos 15 s y ×1,3 si implica a alguien del top 3.
  - En caso de empate, gana el más tardío.

### ¿Qué datos del motor necesito y con qué frecuencia? (con la Persona 1)

- **Hechos sueltos:** el motor llama a `stats.record(evento)` en cuanto ocurre cada hecho: entrada, salida, fase, orbe, embestida, puntos, propuesta, voto, aprobación, parche y revert. El coste es O(1).
- **Cada tick:** el motor llama a `stats.tick(state)` a 20/s.
  - Cada 10 ticks (500 ms) stats muestrea las posiciones para el mapa de calor.
  - Cada 20 ticks (1 s) prepara la instantánea.
- **Quién envía:** stats no abre sockets. Devuelve los payloads y el servidor de la Persona 1 los emite.

### ¿Qué datos necesita el visor y en qué formato? (con la Persona 3)

- **Evento `stats`** a 1/s, en JSON versionado (`v: 1`). Ocupa menos de 8 KB durante la ronda.
  - Los bloques `resultados` y `ceremonia` solo viajan en su fase.
- **Evento `anuncio`** con los momentos a pantalla completa.
- **Componentes listos para montar** en `public/stats/stats-visor.js`.
  - La Persona 3 decide dónde van. Los componentes deciden cómo se ven las estadísticas.

### ¿Cómo se mide el trabajo de Claude en directo?

- **Por cada parche:**
  - Versión, regla y propuesta de origen.
  - Líneas añadidas y quitadas (`git diff --shortstat` entre el commit anterior y el del parche, ejecutado en segundo plano).
  - Archivos tocados.
  - Tiempo desde que el presentador aprueba hasta que la regla queda cargada.
- **Totales:**
  - Número de parches y de reverts.
  - Líneas totales.
  - Tiempo medio por parche.
  - Parche más rápido, que hace de «fantasma» para el siguiente.
  - Regla más votada de la noche.

### ¿Qué se guarda del evento para el nivel final? (con la Persona 5)

- **Archivo:** `data/stats.json`, escrito de forma atómica y asíncrona al terminar cada ronda, tras cada parche y en la ceremonia.
- **Contenido:**
  - Clasificación y top 3 con su arquetipo.
  - Resumen de cada ronda con sus reglas activas.
  - Zonas calientes y frías del mapa.
  - La rivalidad de la noche.
  - Propuestas moderadas con sus votos, y la más votada que no se programó.
  - Parches, récords y los 10 mejores momentos.
- **Si el servidor se reinicia,** las estadísticas del evento se recuperan desde ese archivo.

### ¿Qué se enseña en la ceremonia final?

- **En el visor,** cinco pantallas que el presentador pasa a su ritmo:
  1. **La noche en números:** jugadores únicos, pico de conectados, orbes, embestidas, puntos robados y «la sala ha recorrido la arena N veces».
  2. **Medallas de la noche.**
  3. **Claude en números:** parches, líneas, tiempo medio, parche más rápido y regla más votada.
  4. **Equipo ganador:** rondas ganadas y puntos.
  5. **Podio,** revelado 3 → 2 → 1.
- **En cada móvil,** «Tu noche»:
  - Tu puesto final y percentil.
  - Tu mejor ronda y tus medallas.
  - Tu némesis y tu víctima favorita.
  - Tu arquetipo y, si tu propuesta se programó, «tu idea es el parche v0.X».

### Inspiraciones (juegos móviles de éxito)

| Juego | Qué tomamos |
| --- | --- |
| agar.io / slither.io | Top 10 en vivo con flechas de subida y bajada |
| League of Legends: Wild Rift / Mobile Legends | El anunciador (FIRST BLOOD, SHUTDOWN, rachas) y la gráfica de ventaja entre equipos |
| Brawl Stars | El «Star Player» como MVP y la tarjeta de fin de partida |
| Call of Duty: Mobile | MVP con tres datos destacados |
| Clash Royale | La tarjeta personal tras cada ronda, con el cambio de puesto |
| Mario Kart Tour | El fantasma: el cronómetro del parche contra el mejor tiempo |
| HQ Trivia / Kahoot | El contador de la sala en directo y los votos en barras |
| Rocket League / Halo (premios y medallas) | Las medallas de fin de ronda |
| Overwatch | La «jugada de la ronda» |
| Spotify Wrapped | La ceremonia y «Tu noche» |

---

## 2. Prompt para Claude Code

````text
ROL Y CONTEXTO
Eres el desarrollador del sistema de ESTADÍSTICAS (Persona 4) de «La sala es el código»: una demo en directo de 60 minutos para Claude Community en la que 100–150 personas juegan desde el navegador del móvil a una arena 2D multijugador, mientras Claude Code reprograma el juego en directo según lo que vota la sala. Tu trabajo convierte el juego en un evento de eSports con historia: clasificación en vivo, rachas, remontadas, MVP, medallas, métricas del trabajo de Claude y una ceremonia final. El estilo se inspira en juegos móviles de éxito: agar.io (top 10 en vivo), Wild Rift y Mobile Legends (anunciador y gráfica de ventaja), Brawl Stars y Clash Royale (Star Player y tarjeta de fin de partida), Mario Kart Tour (fantasma), Kahoot (votos en vivo) y Spotify Wrapped (resumen final).

Antes de empezar, lee CLAUDE.md. Si algo de este prompt contradice CLAUDE.md (nombres de eventos, rutas, frecuencias o la forma del estado), manda CLAUDE.md: adáptalo y dime qué has adaptado.

Resumen del juego, por si CLAUDE.md aún no lo detalla:
- Arena 2D vista desde arriba. Cada jugador es un círculo de color, en el equipo Azul o en el Naranja.
- Un orbe da +1 punto. La embestida (botón de acción) roba 3 puntos y tiene 2 s de recarga.
- Fases: LOBBY → COUNTDOWN (3 s) → RONDA (90 s) → RESULTADOS → PARCHE → … → FINAL → CEREMONIA. Hay 4 rondas más la final.
- El servidor Node.js 20 + Express + Socket.IO es autoritativo y va a 20 ticks/s. Los móviles mandan entradas y pintan lo que reciben.
- Las reglas nuevas viven en game/rules/ y se recargan en caliente. Pueden cambiar la puntuación (orbes x5, zombis, jefe final…), así que nunca supongas que un orbe vale 1 ni que una embestida roba 3: usa los valores de cada evento.

TAREA
Construye tres piezas:
A. Motor de estadísticas (game/stats.js + game/stats/). Es un módulo puro: recibe hechos del motor del juego y devuelve payloads listos para enviar. No abre sockets ni bloquea el bucle.
B. Capa de espectáculo: momentos destacados con anunciador, medallas, MVP, gráfica de ventaja, mapa de calor, métricas de los parches de Claude, curiosidades para el comentarista y el resumen persistente del evento en data/stats.json.
C. Interfaz autocontenida en public/stats/:
   - componentes para el visor de la Persona 3 y para el móvil de la Persona 2, que se montan con 3 líneas o menos;
   - una página de demo con datos falsos;
   - una chuleta para el comentarista.

Archivos que puedes crear y modificar:
- game/stats.js: fachada con la API pública.
- game/stats/: adaptador.js, contadores.js, momentos.js, medallas.js, ventaja.js, mapa-calor.js, claude.js, resumen.js, curiosidades.js (puedes reorganizarlos si lo justificas en el plan).
- public/stats/: stats-visor.js, stats-mobile.js, stats.css, esquema.js, datos-falsos.js, demo.html, comentarista.html, comentarista.js.
- test/stats/: tests, fixtures y banco de pruebas.
- data/stats.json (lo genera el módulo; no se versiona).

Archivos que NO puedes tocar: server.js, game/state.js, game/rules/, game/levels/, public/index.html, public/player.js, public/visor.html, public/visor.js, public/styles.css, package.json, CLAUDE.md. Si necesitas algo de ellos, escríbelo en la lista de peticiones (ver «Primer paso»).

REQUISITOS

1. API pública (game/stats.js)
   const stats = createStats({ now, arena: { ancho, alto }, rutaResumen: 'data/stats.json', repo: process.cwd(), restaurar: true });
   - stats.record(evento): un hecho del motor. Coste O(1). Nunca lanza excepciones.
   - stats.tick(state): se llama en cada tick (20/s). Coste O(1), salvo cada 10 ticks (muestreo de posiciones, O(n)) y cada 20 ticks (instantánea, O(n log n)).
   - stats.snapshot(): devuelve el payload `stats` para el visor. El servidor lo emite 1/s.
   - stats.drainMe(): devuelve un Map<playerId, payloadMe> solo con los jugadores que han cambiado, con un máximo de 2 envíos por segundo y jugador.
   - stats.drainMomentos(): devuelve { pantalla: Momento[], ticker: Momento[] } con lo ocurrido desde la última llamada; los momentos `pantalla` ya respetan la cola del requisito 4.
   - stats.resumen(): devuelve el objeto completo de data/stats.json.
   - stats.debug(): devuelve el estado interno para verificar a mano en una partida de prueba.
   Uso esperado en el bucle del servidor (lo escribe la Persona 1; inclúyelo en tu documentación):
     stats.tick(state);
     if (tick % 20 === 0) io.to('visor').emit('stats', stats.snapshot());
     for (const [id, me] of stats.drainMe()) io.to(id).emit('me', me);
     for (const m of stats.drainMomentos().pantalla) io.emit('anuncio', m);
   Toda la dependencia con la forma de `state` (jugadores, posiciones, fase, tiempo restante) va en game/stats/adaptador.js. Si la Persona 1 cambia state.js, solo se toca ese archivo.

2. Eventos de entrada (stats.record). Todos llevan `type` y `t` (ms); si falta `t`, usa now().
   | type        | campos                                                        |
   | join        | playerId, alias, color, equipo                                |
   | leave       | playerId                                                      |
   | fase        | fase, ronda, duracionMs                                       |
   | orb         | playerId, valor, x, y                                         |
   | ram         | atacanteId, victimaId, robado, x, y                           |
   | accion      | playerId, acierto (opcional, para la medalla Kamikaze)        |
   | puntos      | playerId, delta, motivo (cualquier otro cambio de puntos que haga una regla) |
   | momento     | tipo, texto, jugadores[], prioridad (≤ 4), emitido por una regla |
   | propuesta   | id, autorId, texto, visible (true solo si pasó la moderación) |
   | voto        | propuestaId, playerId                                         |
   | aprobada    | propuestaId (el presentador la aprueba para programarla)      |
   | parche      | version, reglaId, nombre, propuestaId, commit, aprobadoEn, desplegadoEn |
   | revert      | commit, version                                               |
   - Un jugador que entra con la ronda en curso es espectador: no cuenta en las estadísticas de esa ronda.
   - Las estadísticas van por playerId: si alguien se desconecta y vuelve con el mismo id, conserva sus datos.
   - Los eventos con datos inválidos (ids desconocidos, NaN, tipos raros) se descartan y se cuentan en debug().errores, sin lanzar.

3. Cómo se cuenta (definiciones exactas)
   - Puntos de ronda = Σ valor de orbes + Σ robado como atacante − Σ robado como víctima + Σ delta de `puntos`.
   - Puntos del evento = suma de los puntos de todas las rondas, la final incluida.
   - Si `state` trae la puntuación del motor, compárala en cada instantánea. Si no coincide, manda el motor: el descuadre se cuenta en debug().descuadres.
   - Puesto de ronda: orden por puntos de la ronda. Desempate: menos veces embestido y, después, quien llegó antes a esa puntuación.
   - Puesto del evento: el mismo criterio con los puntos del evento.
   - Racha = orbes seguidos sin ser embestido. Se reinicia al ser embestido y al empezar una ronda.
   - Cambio de puesto (flechas ▲▼): diferencia con el puesto de hace 5 s.
   - Ventaja = puntos de Azul − puntos de Naranja, una muestra por segundo. Máximo 120 muestras por ronda; si la ronda dura más, se submuestrea.
   - Probabilidad del favorito: logística y monótona. Punto de partida:
     p(azul) = 1 / (1 + e^(−7 · (dif / máx(total, 20)) · √(T / (restante + 5)))), donde T es la duración de la ronda en segundos.
     Objetivos (calíbrala con el banco de pruebas):
       · 50 % con empate;
       · 65–75 % con un 10 % de ventaja a mitad de ronda;
       · ≥ 90 % con un 15 % de ventaja en los últimos 10 s.
   - Mapa de calor:
     · rejilla de 32×18 sobre las dimensiones de la arena;
     · cada 500 ms se suma 1 a la celda de cada jugador activo, en una capa por equipo;
     · se guarda una versión de la ronda y otra acumulada del evento;
     · se envía normalizado a enteros 0–255.
   - Distancia recorrida: suma de distancias entre muestras consecutivas del mismo jugador, expresada en «arenas recorridas» (distancia / ancho de la arena).

4. Momentos destacados (game/stats/momentos.js)
   Catálogo declarativo: cada momento es un objeto { tipo, prioridad, alEvento, detecta(ev, ctx), textos(ev, ctx) }. Para añadir uno basta con añadir una entrada.
   | tipo            | condición                                                                 | prio | destino                  | anuncio |
   | first-blood     | primera embestida de la ronda                                             | 5    | pantalla                 | FIRST BLOOD |
   | remontada       | equipo que perdía por ≥ máx(10, 15 % del total de la ronda) pasa a liderar; 1 vez por equipo y ronda | 5 | pantalla | REMONTADA |
   | clutch          | cambia el equipo líder en los últimos 10 s (anula una remontada simultánea) | 5  | pantalla                 | ¡CLUTCH! |
   | multi-embestida | 2.ª o 3.ª embestida del mismo jugador, cada una a < 5 s de la anterior    | 3 / 4 | pantalla                | DOBLE / TRIPLE EMBESTIDA |
   | shutdown        | embestir a alguien con racha ≥ 5                                          | 4    | pantalla                 | SHUTDOWN |
   | racha           | la racha llega a 5 / 10 / 15                                              | 2 / 3 / 4 | x5 ticker; x10 y x15 pantalla | EN RACHA / IMPARABLE / LEGENDARIO |
   | nuevo-lider     | cambia el n.º 1 de la ronda; no en los primeros 10 s; cooldown 10 s       | 3    | pantalla                 | NUEVO LÍDER |
   | record          | se bate un récord de la noche (racha, puntos en una ronda, embestidas en una ronda) | 3 | ticker en RONDA, pantalla en RESULTADOS | RÉCORD DE LA NOCHE |
   | venganza        | embestir a quien te embistió hace < 10 s                                  | 2    | ticker                   | — |
   | regla           | evento `momento` de una regla                                             | la suya (≤ 4) | según prioridad | su texto |
   Forma de un Momento:
     { id, tipo, prioridad, t, ronda,
       jugadores: [{ id, alias, color, equipo }],
       anuncio: 'SHUTDOWN' | null,                                  // ≤ 18 caracteres, en mayúsculas
       sub: 'Luis corta la racha x8 de Marta',                      // subtítulo del anuncio
       ticker: 'Luis corta la racha x8 de Marta (+3)',
       narracion: '¡Se acabó la fiesta! Luis le corta a Marta una racha de 8.',
       x, y,                                                        // posición normalizada 0–1 o null
       puntuacion }
   Cola de pantalla:
   - máximo 1 anuncio cada 3 s y 3 en espera, el de mayor prioridad primero;
   - si un momento lleva más de 4 s en espera, pasa al ticker;
   - un mismo jugador no sale a pantalla más de una vez cada 10 s, salvo con prioridad 5;
   - no hay anuncios de pantalla en COUNTDOWN, PARCHE ni CEREMONIA.
   El ticker guarda los últimos 8 momentos.
   Jugada de la ronda: el momento con mayor puntuación. La puntuación es prioridad × 20, ×1,5 si ocurre en los últimos 15 s y ×1,3 si implica a alguien del top 3; si hay empate, gana el más tardío.
   Los avisos personales (tu racha, te han embestido, has hecho first blood…) van en me.aviso del jugador implicado, no en la cola global.

5. Medallas de fin de ronda (game/stats/medallas.js)
   | medalla          | icono | criterio                                              | mínimo |
   | mvp (Star Player)| ⭐    | más puntos de ronda                                   | —      |
   | recolector       | 🧲    | más orbes                                             | 5      |
   | depredador       | 🦈    | más embestidas con éxito                              | 2      |
   | ladron           | 💰    | más puntos robados netos                              | 6      |
   | en-llamas        | 🔥    | racha más larga                                       | 5      |
   | cazarrecompensas | 🎯    | cortó la racha más alta de la ronda                   | racha ≥ 5 |
   | intocable        | 🛡️    | 0 veces embestido y más puntos (≥ 60 s jugados)       | —      |
   | escalador        | 🚀    | más puestos subidos en los últimos 30 s               | 5      |
   | kamikaze         | 💥    | más embestidas fallidas (solo si llega `accion`)      | 3      |
   | saco-de-boxeo    | 🥊    | más veces embestido (medalla de humor)                | 4      |
   Los empates se resuelven con los criterios de desempate del puesto. Si nadie llega al mínimo, la medalla no se entrega.
   El MVP lleva 3 datos destacados, que son sus 3 mejores percentiles en la sala.
   Todo jugador recibe en su tarjeta su mejor dato con percentil («Top 12 % en orbes»), aunque no gane ninguna medalla.
   Arquetipo de la noche:
   - Recolector, si más del 70 % de sus puntos vienen de orbes;
   - Depredador, si el robo supera el 40 %;
   - Superviviente, si está en el 20 % menos embestido;
   - Equilibrado, en el resto de casos.

6. Métricas de Claude (game/stats/claude.js)
   - Al recibir `parche`:
     · ejecuta en segundo plano `git diff --shortstat <commit previo> <commit>` y `git diff --name-only` con execFile, con un timeout de 2 s y sin await en el tick;
     · si falla, las líneas quedan en null y se muestra «—».
   - Tiempo del parche = desplegadoEn − aprobadoEn.
   - Registro: número de parches, número de reverts, líneas totales, tiempo medio y parche más rápido (el «fantasma» del siguiente).
   - Mientras hay un parche en curso (llegó `aprobada` pero aún no `parche`), el payload lleva enCurso para que el visor muestre un cronómetro contra el fantasma.
   - Regla más votada de la noche: la que tiene más votos, solo entre propuestas visibles.

7. Payload `stats` → visor (1/s). JSON con v: 1. Menos de 8 KB en RONDA y menos de 16 KB en RESULTADOS.
   { v, t, fase, ronda, tiempoRestanteMs,
     conectados: { ahora, pico },
     equipos: { azul: { puntos, jugadores, rondasGanadas }, naranja: { … } },
     ventaja: { serie: [dif por segundo], favorito: 'azul'|'naranja'|null, probabilidad },
     top10: [{ id, alias, color, equipo, puntos, puesto, cambio, racha }],
     rachas: [top 3 rachas activas ≥ 3: { id, alias, racha }],
     contadores: { orbes, embestidas, puntosRobados },
     ticker: [últimos 8 momentos: { id, tipo, texto, t }],
     curiosidades: [máx. 5 frases],
     resultados: null | { ronda, ganador, marcador, mvp: { …jugador, puntos, destacados: [{ etiqueta, valor }] },
                          medallas: [{ medalla, nombre, icono, …jugador, valor }], jugada: Momento,
                          rachaMasLarga: { alias, valor }, mapaCalor: { ancho: 32, alto: 18, azul: [576], naranja: [576] },
                          records: [frases] },
     parche: { propuestas: [solo en PARCHE y solo visibles: { id, texto, votos, pct }], votosTotales, propuestasRecibidas,
               enCurso: null | { version, nombre, aprobadoEn }, mejorTiempoMs,
               historial: [{ version, nombre, lineasMas, lineasMenos, archivos, tiempoMs, revertido }] },
     ceremonia: null | { noche: { jugadoresUnicos, picoConectados, orbes, embestidas, puntosRobados, arenasRecorridas, rondas },
                         equipoGanador: { equipo, rondasGanadas, puntos },
                         podio: [3 × { puesto, alias, color, equipo, puntos, arquetipo, medallas }],
                         medallasNoche: [...], claude: { parches, lineasMas, lineasMenos, tiempoMedioMs, masRapido, revertidos, reglaMasVotada: { texto, votos, programada } },
                         momentoDeLaNoche: Momento } }
   resultados solo viaja en RESULTADOS y ceremonia solo en CEREMONIA; el resto del tiempo valen null.

8. Payload `me` → cada jugador. Menos de 400 B en RONDA.
   { v, fase, equipo, puntos, puesto, de, cambio, racha, puestoEvento,
     aviso: null | { texto: '¡RACHA x5!', tipo, vibrar: true|false },
     ronda: null | { puesto, de, cambioVsAnterior, puntos, orbes, embestidas, robado, recibidas,
                     medalla: null | { medalla, nombre, icono }, destacado: { etiqueta, percentil }, resultadoEquipo: 'victoria'|'derrota'|'empate' },
     parche: null | { votado: propuestaId | null, propia: null | { id, votos, puesto } },
     noche: null | { puestoFinal, de, percentil, mejorRonda: { ronda, puesto }, medallas: [...], arquetipo,
                     nemesis: null | { alias, veces }, victimaFavorita: null | { alias, veces },
                     propuestaProgramada: null | { version, texto }, votosEmitidos } }
   ronda se envía una vez al entrar en RESULTADOS, noche una vez al entrar en CEREMONIA y parche cuando cambia durante PARCHE.

9. Resumen persistente data/stats.json (game/stats/resumen.js)
   { v, generado, evento: { inicio, rondasJugadas, jugadoresUnicos, picoConectados },
     clasificacion: [top 20: { alias, equipo, puntos, medallas, arquetipo }], top3: [...],
     rondas: [{ ronda, reglasActivas, ganador, marcador, mvp, jugada, rachaMasLarga }],
     zonas: { calientes: [3 × { x, y } normalizados 0–1], frias: [3 × { x, y }] },
     rivalidad: null | { a, b, embestidas },              // la pareja con más embestidas entre sí
     propuestas: [solo visibles: { texto, votos, programada, version }],
     masVotadaNoProgramada: null | { texto, votos },
     parches: [...], records: { rachaMax, puntosRonda, embestidasRonda }, momentos: [los 10 mejores de la noche] }
   - Se escribe de forma asíncrona y atómica (archivo temporal + rename): al terminar cada RESULTADOS, tras cada `parche` y al entrar en CEREMONIA.
   - Con restaurar: true, al arrancar se recupera el acumulado del evento si el archivo existe. Si el servidor se reinicia, como mucho se pierde la ronda en curso.
   - Los textos de propuestas no moderadas (visible: false) no aparecen nunca en ningún payload ni en el archivo; solo se cuentan.

10. Curiosidades (game/stats/curiosidades.js)
   - Al menos 12 plantillas, calculadas en la instantánea, con un máximo de 5 activas. Ejemplos:
     · «Naranja no ha liderado en toda la ronda».
     · «Ana lleva 3 rondas seguidas en el top 3».
     · «Esta noche se han robado 429 puntos».
     · «El parche v0.3 cambió 34 líneas en 2:41».
     · «Luis y Marta se han embestido 7 veces: hay rivalidad».
   - Se usan en el visor durante PARCHE (para rellenar mientras Claude programa) y en la chuleta del comentarista.

11. Componentes del visor (public/stats/stats-visor.js, módulo ES nativo)
    - Interfaz común: cada mountX(el, opciones) devuelve { update(statsPayload), destroy() }. update es idempotente y cada componente toma su parte del payload. Los componentes con varios pasos exponen además siguiente(), para que el presentador marque el ritmo.
    - Componentes:
      · mountLeaderboard: top 10 con reordenación animada FLIP de 400 ms, flechas ▲▼ visibles 3 s, chip 🔥 con racha ≥ 5 y franja del color del equipo.
      · mountVentaja: gráfica de área centrada (Azul arriba, Naranja abajo), marcas en remontadas y clutch, y favorito con su %.
      · mountConectados: contador grande con pulso al subir y el pico de la noche.
      · mountResultados: revelado por pasos con siguiente():
        1) MVP en tarjeta grande estilo Star Player con 3 datos;
        2) medallas;
        3) mapa de calor por equipo (Azul y Naranja superpuestos, «territorio») con la jugada de la ronda marcada con un pulso en su x, y.
      · mountVotos: barras en vivo estilo Kahoot que se reordenan, con el % y el total de votos.
      · mountParche: cronómetro del parche en curso contra el fantasma (mejor tiempo), con delta en verde o rojo. Al terminar muestra las notas del parche: versión, nombre, +líneas/−líneas, archivos y tiempo.
      · mountCuriosidades: una frase cada 8 s con transición.
      · mountCeremonia: 5 pantallas con siguiente(), que son la noche en números, las medallas de la noche, Claude en números, el equipo ganador y el podio revelado 3 → 2 → 1. Las cifras suben con una animación de contador.
    - Legibilidad: legible desde la última fila. Las cifras principales miden 48 px o más y los textos 24 px o más a 1920×1080, con contraste AA o mejor sobre fondo oscuro.
    - Integración en el visor de la Persona 3 (≤ 3 líneas por componente):
        import { mountLeaderboard } from '/stats/stats-visor.js';
        const top = mountLeaderboard(document.querySelector('#top10'));
        socket.on('stats', s => top.update(s));

12. Componentes del móvil (public/stats/stats-mobile.js)
    - mountHud(el), en RONDA:
      · franja superior que ocupa menos del 15 % del alto (≤ 64 px) y no tapa la zona del joystick;
      · muestra «#7 / 134», un ▲3 verde o ▼2 rojo durante 2 s, los puntos con un pop de +N y un chip 🔥 xN desde racha 3;
      · los avisos personales (me.aviso) salen en un banner de 1,5 s y, si vibrar es true, llaman a navigator.vibrate(40) cuando existe.
    - mountRoundCard(el), en RESULTADOS: tarjeta estilo Brawl Stars y Clash Royale con:
      · el resultado del equipo en su color (VICTORIA / DERROTA);
      · un puesto grande con contador animado de 1,5 s como máximo;
      · el cambio respecto a la ronda anterior;
      · la medalla, o «tu mejor dato» con percentil;
      · 3 mini-datos: orbes, embestidas y robado.
    - mountWrapped(el), en CEREMONIA: «Tu noche en números», 4 tarjetas deslizables con CSS scroll-snap:
      1) puesto final y «mejor que el N % de la sala»;
      2) mejor ronda y medallas;
      3) némesis y víctima favorita;
      4) arquetipo y, si su propuesta se programó, «tu idea es el parche v0.X»; si no, «has votado N veces».
    - mountVotoPropio(el), en PARCHE: «tu propuesta va 2.ª con 12 votos» o «has votado: …».
    - Restricciones del móvil:
      · legible a 360 px de ancho;
      · objetivos táctiles de 44 px o más;
      · sin peticiones al servidor: solo pinta `me`;
      · con prefers-reduced-motion se quitan las animaciones y se muestran directamente los valores finales.
    - Integración en el cliente de la Persona 2:
        import { mountHud } from '/stats/stats-mobile.js';
        const hud = mountHud(document.querySelector('#hud'));
        socket.on('me', d => hud.update(d));

13. Estilo e interfaz común
    - public/stats/stats.css: todas las clases llevan el prefijo .st-.
    - Colores mediante variables que el visor o el cliente pueden sobrescribir: --st-azul, --st-naranja, --st-fondo, --st-texto, --st-oro, --st-plata, --st-bronce.
    - DOM y Canvas nativos.
    - Animaciones solo con transform y opacity, a 60 fps en un portátil normal. El canvas se redibuja solo cuando cambian los datos.
    - public/stats/esquema.js: validadores de la forma de `stats`, `me` y del resumen, compartidos por los tests y por la demo.

14. Página de demo y chuleta del comentarista
    - public/stats/demo.html?vista=visor|movil|comentarista&fase=lobby|ronda|resultados|parche|ceremonia&jugadores=150
      monta los componentes con datos-falsos.js. Esos datos generan payloads que pasan esquema.js y se animan 1/s, para revisar el aspecto sin servidor.
    - public/stats/comentarista.html: una pantalla para el móvil del comentarista. Muestra:
      · líder y rachas activas;
      · las 5 curiosidades;
      · los últimos momentos con su frase de narración;
      · candidatos a medalla («Ana va camino de Recolector»);
      · el cronómetro del parche en curso.
      Letra grande y fondo oscuro. Recibe `stats` mediante el rol comentarista:join que se pide a la Persona 1. Mientras no exista, funciona con ?demo=1.

RESTRICCIONES
- No añadas librerías: solo los módulos integrados de Node 20 (node:test, node:perf_hooks, node:child_process, node:fs/promises).
- El módulo de estadísticas no emite por sockets ni cambia el estado del juego: solo observa. No modifica puntuaciones ni reglas. Si una idea lo requiere (por ejemplo, un botín extra por SHUTDOWN), la propones a la Persona 5 como regla.
- Nunca lanza excepciones hacia el bucle del juego: toda la API pública va envuelta en try/catch, cada tipo de error se registra una sola vez y se cuenta en debug().errores.
- Nada de entrada/salida síncrona en el tick: git y la escritura de archivos van en segundo plano y nunca se esperan dentro del tick.
- No cambies el contrato de comunicación de CLAUDE.md. Si necesitas un campo o un evento nuevo, añádelo a la lista de peticiones y espera.
- Solo se muestran alias, nunca otros datos personales. Las propuestas sin moderar no aparecen en ningún sitio.
- Textos visibles en español; FIRST BLOOD y SHUTDOWN se mantienen en inglés porque son jerga de eSports.
- El código se proyectará: funciones de 40 líneas o menos, nombres claros y comentarios breves en español.

CÓMO PROBARLO (sin depender del resto del equipo)
- Ejecuta los tests con `node --test test/stats/`.
- Partida guionizada (test/stats/fixtures/guion-ronda.json y esperado.json): 6 jugadores y una ronda de 90 s, con los valores esperados calculados a mano en los comentarios. Debe incluir:
  · first blood a los 4 s;
  · una doble embestida;
  · una racha de 5 cortada con SHUTDOWN;
  · una remontada de Naranja a los 70 s y un clutch a los 85 s;
  · un empate en el MVP que se resuelve por desempate;
  · un espectador que entra a mitad de ronda y no cuenta;
  · una desconexión con reconexión que conserva los datos;
  · una regla con orbes de valor 5;
  · una propuesta no moderada cuyo texto no aparece.
  El test comprueba cada estadística, cada medalla, el orden de los momentos y 0 descuadres.
- Tests de la cola de anuncios: 3 s entre anuncios, máximo 3 en espera, paso al ticker tras 4 s, límite de 10 s por jugador y prioridad.
- Test de persistencia: genera un resumen, simula un reinicio y comprueba que se restaura el acumulado del evento.
- Test de esquema: los payloads reales y los de datos-falsos.js pasan esquema.js.
- Banco de pruebas (test/stats/bench.js): 150 bots durante 1.800 ticks (90 s simulados), cada uno con 1 orbe/s y 0,15 embestidas/s. Mide:
  · p50 y p99 de tick(), instantáneas incluidas;
  · el tamaño de los payloads;
  · la memoria.
- Comprobación visual con demo.html: 360×640 y 390×844 (móvil) y 1920×1080 (visor), con prefers-reduced-motion activado y sin él.
- Para verificar con personas reales, `node game/stats/verificar.js data/stats.json` imprime un resumen legible que se compara a mano con una partida de prueba con 4 móviles.

CRITERIOS DE ACEPTACIÓN
- [ ] La partida guionizada da exactamente los valores de esperado.json, con 0 descuadres y 0 errores.
- [ ] Con 150 jugadores, tick() tiene un p99 por debajo de 1 ms y una media por debajo de 0,1 ms en un portátil normal.
- [ ] `stats` ocupa menos de 8 KB en RONDA y menos de 16 KB en RESULTADOS; `me` ocupa menos de 400 B en RONDA.
- [ ] Nunca hay más de un anuncio a pantalla completa cada 3 s.
- [ ] data/stats.json está completo al terminar el evento, sobrevive a un reinicio y contiene lo que necesita el nivel final (top3, zonas, masVotadaNoProgramada, rivalidad).
- [ ] Ningún texto de propuesta no moderada aparece en payloads ni en archivos.
- [ ] Cada componente se integra con 3 líneas o menos y no rompe estilos ajenos (todo lleva el prefijo .st-).
- [ ] La interfaz móvil es legible a 360 px, la del visor desde la última fila a 1080p, y se respeta prefers-reduced-motion.
- [ ] demo.html muestra todas las fases sin servidor.
- [ ] Los payloads respetan el contrato de CLAUDE.md, o las diferencias están en la lista de peticiones.

PRIMER PASO
Antes de escribir código, preséntame un plan con:
1) la estructura de archivos;
2) la API final;
3) los esquemas de `stats`, `me` y del resumen, ajustados a CLAUDE.md;
4) la lista de peticiones a otras personas (P1: eventos y rol comentarista:join; P2 y P3: dónde montar los componentes; P5: ruta de data/stats.json; P6: ignorar data/ en nodemon y .gitignore).
Espera mi confirmación. Después implementa en este orden y haz commit al terminar cada paso:
1) contadores y partida guionizada;
2) momentos y medallas;
3) instantánea, `me`, resumen y banco de pruebas;
4) métricas de Claude;
5) componentes del visor;
6) componentes del móvil;
7) demo y chuleta del comentarista.
````

---

## 3. Anexo de integración

Lo que la Persona 4 necesita de cada compañero y lo que le entrega. Conviene cerrarlo en la sesión conjunta inicial.

### Persona 1 — Motor y servidor

**Necesito:**
- Llamar a `stats.record(evento)` en cada hecho de la tabla del requisito 2 del prompt, con los valores reales (`valor` del orbe y `robado` de la embestida), no supuestos.
- Llamar a `stats.tick(state)` en cada tick y emitir lo que devuelve, como en el ejemplo del requisito 1: `stats` al visor 1/s, `me` a cada jugador y `anuncio` a todos.
- Un `playerId` estable entre reconexiones.
- Exponer a las reglas una forma de emitir `momento` (p. ej. `state.emit('momento', {...})`), para que un parche pueda tener su propio anuncio.
- `aprobadoEn` (cuando el presentador aprueba) y `desplegadoEn` (cuando la regla queda cargada) en el evento `parche`, junto con el hash del commit.
- **Opcional:** el evento `accion` con `acierto` (para la medalla Kamikaze) y el rol de solo lectura `comentarista:join` con la misma clave del visor, que reciba `stats`.

**Te entrego:** un módulo que no lanza excepciones, no bloquea el bucle y no toca el estado.

### Persona 2 — Cliente jugador

**Te entrego:** `public/stats/stats-mobile.js` con:
- `mountHud`, para RONDA, en la franja superior de 64 px como máximo;
- `mountRoundCard`, para RESULTADOS;
- `mountVotoPropio`, para PARCHE;
- `mountWrapped`, para CEREMONIA.

Cada uno se monta con 3 líneas y se alimenta solo de `me`.

**Necesito:**
- Un contenedor por pantalla.
- Que la franja superior quede libre durante la ronda.
- Que cargues `/stats/stats.css`.
- Si quieres adaptar colores, sobrescribe las variables `--st-*`.

### Persona 3 — Visor de retransmisión

**Te entrego:** `public/stats/stats-visor.js` con estos componentes:
- `mountLeaderboard`
- `mountVentaja`
- `mountConectados`
- `mountResultados` (por pasos, con `siguiente()`)
- `mountVotos`
- `mountParche`
- `mountCuriosidades`
- `mountCeremonia` (con `siguiente()`)

Todos se alimentan del payload `stats`. También te paso los momentos a pantalla completa por `anuncio` y el ticker ya redactado en `stats.ticker`.

**Necesito:**
- Decidir juntos qué tecla avanza `siguiente()` en RESULTADOS y en CEREMONIA.
- Dónde va cada componente en tu maqueta.
- Que el marcador superior y el ticker sigan siendo tuyos: yo solo te paso los datos.

### Persona 5 — Reglas y nivel final

**Te entrego:** `data/stats.json` con:
- `top3`;
- `zonas.calientes` y `zonas.frias`;
- `rivalidad`;
- `masVotadaNoProgramada`;
- las reglas activas de cada ronda;
- el historial de parches.

Es justo lo que pide el prompt de la final.

**Necesito:**
- Cambiar en tu prompt de la final `stats.json` por `data/stats.json`.
- Que las reglas que den puntos por otra vía emitan `puntos` con un `motivo`.
- Que las reglas con un momento vistoso emitan `momento` (prioridad 4 como máximo).
- **Propuesta para tu banco de reglas:** «Cazarrecompensas», que da un botín extra al cortar una racha de 5 o más. Las estadísticas ya lo detectan.

### Persona 6 — Infraestructura y QA

**Necesito:**
- Añadir `data/` a `.gitignore` y a las rutas ignoradas por nodemon. Si no, cada escritura del resumen reinicia el servidor y se cuela en los commits de los parches.
- Que el simulador pueda grabar sus eventos en el formato del requisito 2 (JSON Lines). Así uso esas partidas como fixtures de replay.

**Te entrego:** `test/stats/bench.js`, para incluirlo en tu prueba de carga, y `node game/stats/verificar.js` para el ensayo con personas reales.

---

## 4. Uso en directo: chuleta del comentarista

La Persona 4 narra desde `public/stats/comentarista.html` en su móvil.

| Fase | Qué narrar |
| --- | --- |
| Lobby (5–8 min) | El contador sube: «¡ya somos 120!». Explicar en una frase las rachas y las embestidas. |
| Ronda | Leer los anuncios en el momento: first blood, shutdown, remontada. Nombrar a quien lidera y las rachas 🔥 activas. Sin silencios de más de 15 s. |
| Resultados | Presentar el MVP con sus 3 datos, cantar las medallas una a una (el presentador avanza con `siguiente()`) y señalar la jugada en el mapa. |
| Parche | Curiosidades mientras Claude programa: «¿batirá Claude su mejor tiempo de 2:41?». Al terminar, leer las notas del parche: líneas y tiempo. |
| Ceremonia | La noche en números → medallas → Claude en números → equipo ganador → podio. Pedir a la sala que mire «Tu noche» en su móvil. |
