# Persona 3 — Visor de retransmisión

Responsable: andrsbayona

**Estado:** borrador

## Punto de partida

- **Tema: Coliseo Romano.** El visor es la pantalla grande proyectada y el mando del presentador, que se presenta como «El César» viendo la batalla desde su butaca (el «Palco del César»).
- **El visor es solo presentación.** Toda la lógica vive en el servidor; el visor únicamente escucha `fase`, `state`, `stats`, `jugadores`, `propuestas`, `votacion`, `evento`, `anuncio` y `parche`, y emite `control` (`iniciar`, `pausar`, `saltar`, `reiniciar`, `final`, `aprobar`, `rechazar`). Ningún dato se calcula en el visor; solo se redecora.
- **Contrato:** `shared/contract.js`. El visor importa `EV`, `FASES` y `ARENA` de `/shared/contract.js` con `<script type="module">`. Ningún nombre de evento como cadena suelta.
- **Las duraciones no se hardcodean.** La ronda pasó de 90 s a **120 s**, pero eso no toca el visor: la duración y el tiempo restante llegan siempre en el propio mensaje `fase` (`duracionMs`, `restanteMs`, `finEn`). Para probar con 120 s, arranca el simulador con `RONDA_S=120`.
- **QR del lobby:** el visor pide `/qr.svg` al servidor (ya implementado por Persona 6 en el simulador, leyendo `infra/.tunnel-url`); si no responde, cae a mostrar la URL en texto grande.
- **Sin servidor real todavía:** se desarrolla y se prueba contra `npm run sim:dev` / `npm run sim`, que sirve `public/` antes que sus páginas de depuración (`/sim/*`).

## Ficha

**¿Qué se ve en la pantalla grande en cada fase del match?**

| Fase | Pantalla grande |
| --- | --- |
| `LOBBY` | «Las Puertas de la Arena»: arco romano con el QR al centro y el contador de ciudadanos (`stats.conectados`) que van entrando |
| `COUNTDOWN` | Pantalla completa con una corona de laureles y la cuenta atrás en numeración romana (III, II, I) |
| `RONDA` / `FINAL` | Marcador superior centrado (Azul VS Naranja + reloj), arena con suelo de arena/piedra y graderío de público arriba y abajo; en `FINAL`, aviso «GRAN FINAL» |
| `RESULTADOS` | «Laureles de la Ronda»: tarjeta con el gladiador MVP, marcador de equipos y el momento destacado |
| `PARCHE` | «El Senado Delibera»: cola de edictos (propuestas) en el palco, con votos en vivo |
| `CEREMONIA` | «Coronación del César»: podio romano (I, II, III) con el top 3, equipo ganador, edictos promulgados, líneas escritas por Claude y el edicto más aclamado |

**¿Qué elementos de retransmisión de eSports se incluyen?**
Marcador estilo mármol en la parte superior centrada (no a un lado); clasificación «Gladiadores» (top 10) en el palco; «Pregón» como ticker de eventos (embestidas, rachas, entradas/salidas); banners imperiales a pantalla completa para `anuncio` (FIRST BLOOD, REMONTADA, PARCHE INSTALADO, GRAN FINAL); notas de cada parche con versión y nombre de la regla.

**¿Cómo se presenta un «parche» nuevo para que la sala lo viva como un momento?**
El servidor ya dispara `anuncio` con título «PARCHE INSTALADO» y el texto `v{version} · {regla}`; el visor lo muestra como banner imperial a pantalla completa 2,4 s. Pendiente de mejora (no bloqueante): un «edicto» en pergamino antes del banner, para alargar la tensión del momento.

**¿Cómo es la ceremonia final?**
Podio romano con tres pedestales de alturas distintas (I al centro y más alto, II a la izquierda, III a la derecha), alias y puntos de cada uno, y debajo un resumen: equipo vencedor, edictos promulgados, líneas escritas por Claude y el edicto más votado que no llegó a programarse.

**¿Qué controla el presentador y cómo, sin perder el ritmo?**
Desde el «Palco del César»: `Espacio` iniciar, `P` pausa, `R` reiniciar, `F` final, botón «Saltar fase», y aprobar/rechazar cada edicto con un clic — exactamente los mismos atajos y acciones que ya define `shared/contract.js`, solo re-rotulados.

**¿Cómo se moderan las propuestas del público antes de mostrarlas?**
La cola de `propuestas` se ve siempre en el palco con su estado (`pendiente` / `aprobada` / `rechazada` / `instalada`); solo lo aprobado por el César pasa a `votacion` y puede ganar un parche. Ninguna propuesta pendiente se proyecta al público en la arena.

**¿Cómo se reparte la pantalla con Claude Code mientras programa?**
Durante `PARCHE` («El Senado Delibera») el presentador comparte pantalla: Claude Code a un lado, el visor al otro. Esto es logística del local, no código — queda pendiente de decidir con quién opera el proyector (Persona 6) una vez se visite el espacio.

**¿Qué resolución y proyector hay en el local, y es legible desde el fondo?**
Pendiente de la visita al local (checklist de Persona 6). El visor usa unidades relativas y un layout en grid que se adapta, pero hay que validar legibilidad real a la resolución del proyector antes del ensayo.

## Qué falta (no bloqueante para el primer entregable)

- Mapa de calor de `stats.heatmap` en la pantalla de resultados (no implementado aún).
- Pulir la legibilidad del panel «Palco» a resoluciones de proyector reales.
- Decidir con Persona 1 si el servidor real también sirve `/qr.svg` igual que el simulador.

## Prompt

```text
Rol y contexto: soy la persona 3 del equipo, responsable del visor de retransmisión (la pantalla grande y el panel de control del presentador). Antes de empezar, lee CLAUDE.md, shared/AGENTS.md, shared/contract.js y prompts/03-visor-retransmision.md.

Tarea: construye o continúa el visor en public/visor.html y public/visor.js (y la parte de visor de public/styles.css, bajo el selector #coliseo para no chocar con los estilos de Persona 2 bajo .jugador). Solo puedes crear o modificar esos archivos.

Tema obligatorio — Coliseo Romano:
1. Lobby = «Las Puertas de la Arena»: arco romano con el QR (pide /qr.svg; si falla, muestra la URL en texto grande) y el contador de ciudadanos conectados.
2. Countdown a pantalla completa con una corona de laureles y la cuenta atrás en numeración romana (III, II, I), ambientada en la época romana.
3. Marcador superior CENTRADO (no lateral): Equipo Azul vs Equipo Naranja, estilo placa de mármol con reloj.
4. El presentador es «El César», que controla todo desde su «butaca» (el Palco del César), sin salir del visor.
5. Resultados de ronda = «gladiador de la ronda» con corona de laurel. Ceremonia final = podio romano (I, II, III).
6. Parche nuevo = banner imperial a pantalla completa con la versión y el nombre de la regla.

Requisitos técnicos:
1. Importa EV, FASES y ARENA de /shared/contract.js con <script type="module">. Ningún nombre de evento como cadena suelta.
2. Socket.IO solo por WebSocket: io({ transports: ['websocket'] }). Únete con EV.VISOR_JOIN y la clave de la URL (?key=) o, si falta, pídela.
3. NUNCA hardcodees duraciones de fase (ni 90 s ni 120 s): toma siempre duracionMs/restanteMs/finEn del mensaje `fase`. La ronda dura ahora 120 s y se configura en el servidor (RONDA_S), no en el visor.
4. Dibuja la arena en <canvas> a partir de `state` (20/s): suelo de arena, orbes, jugadores coloreados por su equipo, alias solo de jugadores reales (no bots).
5. Marcador, top 10 y "pregón" (ticker) se actualizan con `stats` (1/s) y `evento`.
6. Cola de propuestas moderada: pinta `propuestas`, con botones aprobar/rechazar que emiten `control` — ninguna propuesta pendiente se muestra en la arena ni se vota.
7. Control del presentador: botones e idénticos atajos de teclado a los del contrato (Espacio/P/R/F + saltar), rotulados como "Palco del César".
8. Todo en CSS/SVG/Canvas nativo: sin librerías nuevas, sin bundler, sin framework.

Restricciones:
- No toques server.js, game/, shared/contract.js, sim/, infra/, public/index.html ni public/player.js: tienen dueño.
- Si necesitas un campo o evento que el contrato no tiene, añádelo a la sección "Qué falta" de prompts/03-visor-retransmision.md y sigue con lo que hay — no cambies el contrato tú mismo.
- El código se proyectará en la charla: claro, en español, comentarios solo donde el porqué no sea obvio.

Cómo probarlo: `npm run sim:dev` (o `RONDA_S=120 npm run sim` para probar la duración real) y abre http://localhost:3000/visor?key=<la que imprima la terminal>. Repasa las 7 fases con los controles del palco (o `AUTO=1` para que avancen solas) y comprueba que se lee bien a tamaño de proyección (zoom del navegador al 50-60%).

Criterios de aceptación:
- Las 7 fases (LOBBY, COUNTDOWN, RONDA, RESULTADOS, PARCHE, FINAL, CEREMONIA) tienen su pantalla temática y se disparan solas al recibir `fase`.
- El marcador está arriba centrado y se actualiza con `stats` sin parpadeos ni saltos.
- Aprobar/rechazar un edicto desde el palco cambia su estado en el servidor (verificable con sim/check.js o viendo la cola moverse).
- Un `anuncio` de parche se ve como banner imperial a pantalla completa y desaparece solo.
- Se lee bien desde el fondo de una sala simulando el zoom del navegador al 50%.

Primer paso: si hay cambios grandes de diseño pendientes, propón un plan breve (qué pantallas tocas, qué no) y espera confirmación antes de escribir código; para arreglos puntuales o iteraciones menores, procede directo.
```
