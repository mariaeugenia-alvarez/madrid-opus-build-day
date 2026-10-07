# Persona 2 — Cliente jugador

Responsable: mariaeugenia-alvarez

## Punto de partida

- **El móvil es un mando.** El jugador mira la pantalla grande para ver la arena. El móvil no recibe `state` (va solo al visor, por ancho de banda; ver `infra/AGENTS.md`), sino `me` a 10/s con sus propios datos.
- **Contrato:** `shared/contract.js` (provisional, lo cierra adevex-drone). El cliente importa `EV`, `FASES`, `LIMITES`, `ARENA` y `REGLAS_BASE` de `/shared/contract.js`.
- **Sin servidor real todavía:** se desarrolla contra el simulador de Pablo (`npm run sim:dev`), que sirve `public/` antes que sus páginas de depuración.

## Ficha

**¿Qué pide la pantalla de entrada y cuánto se tarda en estar jugando?**
Alias (máx. `LIMITES.alias`, con uno aleatorio ya escrito) y 6 colores en botones grandes, más el botón «Entrar al match». El equipo lo asigna el servidor y llega en el ack de `join`. Objetivo: menos de 10 s desde que se escanea el QR hasta estar dentro.

**¿Cómo se controla el juego con el dedo?**
Joystick virtual flotante en la mitad izquierda: aparece donde se apoya el dedo. Botón de embestida grande abajo a la derecha, con un anillo de recarga que se pinta con `me.recargaMs`. Sin inclinación: en iOS exige pedir permiso y añade un paso. Se envía `input` como `[dx, dy, accion]`, solo cuando cambia y como mucho a 20/s.

**¿Qué ve el jugador en cada fase del match?**
El fondo del móvil es siempre el color de su equipo, para orientarse en la pantalla grande.

| Fase | Pantalla del móvil |
| --- | --- |
| `LOBBY` | «Mira la pantalla grande», su alias con su color, su equipo |
| `COUNTDOWN` | 3-2-1 a pantalla completa |
| `RONDA` / `FINAL` | Controles; arriba, puntos, puesto (`posicion` de `de`) y tiempo restante; minimapa de la arena con solo su punto (`me.x`, `me.y`) para encontrarse en la pantalla grande. En `FINAL`, distintivo «GRAN FINAL» |
| `RESULTADOS` | Su puesto y sus puntos, el MVP y el equipo ganador de la ronda |
| `PARCHE` | Proponer una regla y votar las candidatas |
| `CEREMONIA` | Su puesto final, el podio y el equipo ganador |
| Espectador (`me.espectador`) | «Entras en la siguiente ronda», sin controles |

**¿Cómo propone y vota cambios desde el móvil?**
En `PARCHE`: campo de texto de `LIMITES.propuesta` caracteres con contador y botón «Proponer» (la propuesta pasa por la moderación del visor). Debajo, las candidatas de `fase.datos.candidatas`, actualizadas con `votacion`, cada una con su botón de voto y su número de votos. **Un voto por persona y no se puede cambiar** (así lo hace el simulador); la candidata votada queda marcada usando `me.voto`.

**¿Cómo se mantiene fluido aunque la red vaya irregular?**
El móvil no pinta la arena, así que no hay nada que interpolar. Los controles responden en local al instante, sin esperar al servidor. El tiempo restante se cuenta en local a partir de `fase.restanteMs`. Indicador de conexión discreto.

**¿Qué pasa si alguien entra con el match empezado o pierde la conexión?**
Si entra con una ronda en curso, el ack de `join` trae `espectador: true` y ve la pantalla de espectador hasta la siguiente. El alias y el color se guardan en `localStorage`; al reconectar, el cliente vuelve a hacer `join` solo, sin pasar por la pantalla de entrada. Con el contrato actual, el servidor lo trata como un jugador nuevo y pierde sus puntos (ver peticiones a la persona 1). Mientras no hay conexión se muestra «Reconectando…».

**¿Cómo se notan los cambios de reglas en el móvil?**
Con `parche`, aviso a pantalla completa «PARCHE v0.X INSTALADO» y el nombre de la regla durante 3 s, más una vibración en Android (iOS Safari no la permite). Los `anuncio` (FIRST BLOOD, REMONTADA, GRAN FINAL) se muestran igual. En `RONDA`, la lista `fase.datos.reglas` se ve como etiquetas de reglas activas.

**¿En qué móviles y navegadores se va a probar?**
Safari en iOS 16+ y Chrome en Android 12+. Como mínimo, un iPhone y un Android de gama media reales a través del túnel, además del modo responsive de Chrome.

## Peticiones a la persona 1 (adevex-drone)

1. **Reconexión sin perder puntos.** Que `join` acepte un `token` opcional (o que su ack devuelva uno) y que el servidor conserve al jugador desconectado unos 60 s. Sin esto, un móvil que se bloquea a media ronda pierde todos sus puntos.
2. **Hora de fin de la fase.** Que `fase` incluya una marca de tiempo de fin, o que confirme que `restanteMs` es suficiente para contar en local.
3. **Confirmar el voto único.** El simulador no deja cambiar el voto. Si el equipo prefiere permitirlo, hay que cambiarlo en el contrato.

## Prompt

```text
Rol y contexto: soy la persona 2 del equipo, responsable del cliente jugador (lo que se ve y se toca en el móvil). Antes de empezar, lee CLAUDE.md, shared/AGENTS.md, shared/contract.js, sim/AGENTS.md y prompts/persona-2-cliente-jugador.md.

Tarea: construye el cliente jugador en public/index.html y public/player.js (y la parte de jugador de public/styles.css). Solo puedes crear o modificar esos archivos.

Requisitos:
1. El móvil es un mando: no recibe `state` y no pinta la arena. Trabaja solo con `fase`, `me`, `votacion`, `anuncio`, `parche` y los acks de `join`, `propuesta` y `voto`.
2. Importa EV, FASES, LIMITES, ARENA y REGLAS_BASE de /shared/contract.js con <script type="module">. Ningún nombre de evento como cadena suelta.
3. Socket.IO solo por WebSocket: `io({ transports: ['websocket'] })`.
4. Pantalla de entrada: alias (máx. LIMITES.alias, uno aleatorio por defecto), 6 colores y botón «Entrar al match». Del QR a estar dentro en menos de 10 s. Alias y color se guardan en localStorage.
5. Controles: joystick flotante en la mitad izquierda (vector de -1 a 1) y botón de embestida abajo a la derecha con anillo de recarga a partir de me.recargaMs. Zonas táctiles de al menos 64 px. `input` como [dx, dy, accion], solo cuando cambia y como mucho a 20/s.
6. Una pantalla por fase y otra de espectador, como describe la tabla de la ficha. El fondo es siempre el color del equipo. En RONDA y FINAL: puntos, puesto, tiempo restante contado en local y minimapa con solo su punto.
7. Fase PARCHE: proponer (con contador de caracteres) y votar las candidatas de fase.datos.candidatas, actualizadas con `votacion`. Un voto, no se puede cambiar; la votada se marca con me.voto. Muestra los errores de los acks de forma amable.
8. Avisos a pantalla completa para `anuncio` y `parche` (3 s), con vibración donde se pueda.
9. Reconexión: indicador «Reconectando…» y, al volver, `join` automático con el alias y el color guardados.
10. Toda la comunicación con el servidor pasa por un único objeto `net` en player.js, para adaptarse en un solo sitio cuando el contrato se cierre.

Restricciones:
- No toques server.js, game/, shared/, sim/, infra/, public/visor.* ni package.json.
- No cambies el contrato. Si te falta algo, añádelo a «Peticiones a la persona 1» en prompts/persona-2-cliente-jugador.md y sigue con lo que hay.
- Sin dependencias nuevas, sin bundler y sin framework: HTML, CSS y JavaScript nativo.
- Nada de zoom, scroll, selección de texto ni menú contextual accidentales durante el juego (viewport, touch-action, overscroll-behavior, user-select).
- El código se proyectará en la charla: claro, en español y con comentarios breves.

Cómo probarlo: `npm run sim:dev` y abre http://localhost:3000/ en el modo responsive de Chrome (iPhone SE e iPhone 14 Pro, en vertical y horizontal), junto a /visor para ver tu jugador moverse. Después, en un móvil real con `npm run tunnel`. Con `AUTO=0` controlas las fases desde el visor.

Criterios de aceptación:
- Del QR a estar jugando en menos de 10 s, sin explicación.
- Las 7 fases y la pantalla de espectador se ven y se usan correctamente con el simulador.
- Mover el joystick mueve al jugador en /visor y la embestida respeta la recarga de 2 s.
- Proponer y votar funcionan contra el simulador, y el voto queda marcado.
- Al cortar la red 5 s y volver, el móvil vuelve a entrar solo, sin pasar por la pantalla de entrada.
- No se hace zoom ni scroll al jugar en Safari de iOS.

Primer paso: propón un plan con la estructura de player.js y un boceto en texto de cada pantalla, y espera mi confirmación antes de escribir código.
```
