# La sala es el código — Demo Claude Community

Oct 7, 2026 · @Juan Pablo

## Concepto

En 60 minutos, Claude construye en directo un juego multijugador al que toda la sala se conecta desde el móvil, y lo reescribe en tiempo real según lo que vota el público. El público no mira la demo: es la demo.

Todo se presenta como un evento de eSports: hay rondas, marcador, clasificación en vivo, estadísticas y una gran final. El portátil del presentador actúa como pantalla de retransmisión.

- **Sin instalación:** se entra escaneando un QR, desde el navegador del móvil. Sin app, sin registro.
- **Participativo:** cada asistente juega y vota los cambios del juego.
- **Imprevisible:** las reglas cambian en directo y nadie sabe qué pedirá la sala.
- **Qué demuestra:** generación de código, despliegue, interpretación de peticiones ambiguas e iteración rápida, todo a la vez.

## Roles: jugador y visor global

Hay dos entradas a la misma web: `/` para jugadores (móvil) y `/visor` para la pantalla grande (portátil del presentador, proyectado).

| Aspecto | Jugador (móvil) | Visor global (presentador) |
| --- | --- | --- |
| Cómo entra | Escanea el QR | Abre `/visor?key=CLAVE` en el portátil |
| Identidad | Elige alias y color; se le asigna equipo | Clave secreta en la URL; solo uno activo |
| Qué ve | Su avatar, controles táctiles, su puntuación y posición | Arena completa, marcador, clasificación, estadísticas, QR |
| Qué hace | Juega y envía o vota propuestas de reglas | Arranca y para rondas, aprueba propuestas, lanza la final |
| Controles | Joystick virtual + 1 botón de acción | Teclado: `Espacio` iniciar ronda, `P` pausa, `R` reiniciar, `F` final |

**Pantalla de entrada del jugador:** alias (máx. 12 caracteres), color y botón «Entrar al match». Si la ronda está en curso, entra como espectador hasta la siguiente.

**Moderación:** las propuestas del público llegan al visor como cola. Solo pasan al juego las que el presentador aprueba con un clic.

## Formato de match

El evento se estructura como un torneo de videojuego: lobby, rondas cortas con reglas cambiantes, pausas de «parche en directo» y gran final.

**Juego base:** arena 2D vista desde arriba. Cada jugador es un punto de color que recoge orbes (+1 punto) y puede embestir a otros con el botón de acción (roba 3 puntos, 2 s de recarga). Dos equipos: Azul y Naranja.

**Estados del match** (los gestiona el servidor y los ven todos):

1. `LOBBY`: los jugadores entran; el visor muestra el QR y el contador de conectados.
2. `COUNTDOWN`: cuenta atrás de 3 s a pantalla completa en el visor y en los móviles.
3. `RONDA`: 90 s de juego con temporizador visible.
4. `RESULTADOS`: MVP de la ronda, marcador de equipos y «momento destacado».
5. `PARCHE`: se vota la siguiente regla; Claude la programa en directo; el visor muestra «Instalando parche v0.X…».
6. `FINAL`: ronda especial con todas las reglas activas y nivel generado por Claude.
7. `CEREMONIA`: podio top 3, equipo ganador y estadísticas del evento.

**Elementos de retransmisión en el visor:**

- Marcador superior estilo eSports: Equipo Azul vs Equipo Naranja, ronda actual y tiempo.
- Ticker inferior con eventos: «Ana embiste a Luis (+3)», «Racha de 5 de Marta».
- Anuncios a pantalla completa: «FIRST BLOOD», «REMONTADA», «PARCHE INSTALADO».
- Notas del parche con versión (v0.1, v0.2…) y la regla añadida.

**Ideas de reglas para votar:** gravedad invertida, el líder se vuelve jefe final (más grande y lento), modo zombis, orbes dorados x5, mapa que se encoge, niebla de guerra.

## Estadísticas en directo

El servidor calcula todas las estadísticas y las envía al visor una vez por segundo; el móvil solo recibe las del propio jugador.

| Estadística | Dónde se ve | Cómo se calcula |
| --- | --- | --- |
| Jugadores conectados | Visor (lobby y esquina) | Número de sockets con rol jugador |
| Marcador por equipo | Visor (barra superior) | Suma de puntos de cada equipo |
| Clasificación top 10 | Visor (lateral) | Orden por puntos de la ronda |
| Posición propia | Móvil | Puesto en la clasificación global |
| MVP de la ronda | Visor (resultados) | Más puntos en la ronda |
| Racha más larga | Visor (resultados) | Orbes seguidos sin ser embestido |
| Embestidas totales | Visor | Contador de colisiones con acción |
| Mapa de calor | Visor (resultados) | Posiciones muestreadas cada 500 ms |
| Propuestas enviadas y votos | Visor (fase parche) | Contadores por propuesta |
| Líneas cambiadas por Claude | Visor (notas del parche) | `git diff --stat` tras cada parche |
| Tiempo de cada parche | Visor (notas del parche) | De la aprobación al despliegue |

**Ceremonia final:** podio top 3, equipo ganador, número de parches instalados, total de líneas escritas por Claude y la regla más votada de la noche.

## Arquitectura y librerías

Un único servidor Node.js mantiene el estado del juego y lo envía a todos por WebSockets. Los móviles solo mandan entradas y pintan lo que reciben, así Claude solo modifica el servidor y los cambios llegan a todos sin recargar.

**Flujo:** móviles → entradas (joystick, acción, votos) → servidor (bucle a 20 ticks/s) → estado y estadísticas → móviles y visor. Claude Code edita `game/` en el portátil; el servidor recarga las reglas en caliente.

**Librerías (Node.js 20 o superior):**

| Librería | Uso | Obligatoria |
| --- | --- | --- |
| express | Sirve `/` (jugador) y `/visor` | Sí |
| socket.io | Tiempo real; sirve también el cliente al navegador | Sí |
| qrcode | Genera el QR que muestra el visor | Sí |
| nanoid | IDs cortos de jugador | No |
| nodemon | Reinicio automático en modo túnel | No |

```bash
npm init -y
npm install express socket.io qrcode nanoid
npm install -D nodemon
```

**Frontend:** Canvas y JavaScript nativo, sin instalar nada. Phaser por CDN solo si se quieren efectos más vistosos.

**Recarga en caliente de reglas:** cada regla es un módulo en `game/rules/`. Al detectar cambios (`fs.watch`), el servidor reimporta el módulo con un parámetro de versión (`import('./rules/x.js?v=' + Date.now())`) sin cortar las conexiones.

**Despliegue, dos opciones:**

- **Túnel desde el portátil (recomendado):** servidor local + `cloudflared tunnel --url http://localhost:3000`. Cambios instantáneos; depende del wifi del local.
- **Nube:** Fly.io, Railway o Render, que admiten WebSockets persistentes. Más robusto, pero cada parche tarda en desplegar. Vercel no sirve para WebSockets persistentes.

## Estructura del proyecto y eventos

La base (servidor, visor, cliente y estados del match) se lleva hecha; en directo Claude solo toca `game/rules/` y, en la final, `game/levels/`.

```text
la-sala-es-el-codigo/
├─ server.js            # Express + Socket.IO, bucle de juego, máquina de estados
├─ game/
│  ├─ state.js          # jugadores, equipos, orbes, puntuaciones
│  ├─ stats.js          # cálculo de estadísticas
│  ├─ rules/            # una regla por archivo (lo que Claude crea en directo)
│  │  └─ base.js
│  └─ levels/           # nivel final generado por Claude
├─ public/
│  ├─ index.html        # cliente jugador (móvil)
│  ├─ player.js
│  ├─ visor.html        # pantalla de retransmisión
│  ├─ visor.js
│  └─ styles.css
├─ CLAUDE.md            # contexto y normas para Claude Code
└─ package.json
```

**Interfaz de una regla** (así Claude sabe qué escribir):

```js
export default {
  id: 'gravedad-invertida',
  nombre: 'Gravedad invertida',
  version: '0.2',
  onTick(state, dt) {},          // cada tick del servidor
  onCollision(a, b, state) {},   // choque entre jugadores
  onOrb(player, orb, state) {},  // recogida de orbe
  render: { fondo: '#120024' }   // pistas visuales para clientes
};
```

**Eventos de Socket.IO:**

| Evento | Dirección | Contenido |
| --- | --- | --- |
| `join` | jugador → servidor | alias, color |
| `visor:join` | visor → servidor | clave secreta |
| `input` | jugador → servidor | vector del joystick, acción |
| `propuesta` | jugador → servidor | texto de la regla (máx. 80 caracteres) |
| `voto` | jugador → servidor | id de propuesta |
| `state` | servidor → todos | posiciones, orbes, tiempo (20/s) |
| `stats` | servidor → visor | estadísticas completas (1/s) |
| `me` | servidor → jugador | puntos y posición propios |
| `fase` | servidor → todos | estado del match y datos de la fase |
| `anuncio` | servidor → todos | texto a pantalla completa |
| `parche` | servidor → todos | versión, regla, líneas cambiadas |
| `control` | visor → servidor | iniciar, pausar, aprobar propuesta, final |

## Guion de la hora

Cuatro rondas con parche entre ellas, final y ceremonia; quedan unos 5 minutos de colchón para imprevistos.

| Minuto | Fase | Qué pasa |
| --- | --- | --- |
| 0–5 | Presentación | Explicas la idea: «esta noche el código lo escribís vosotros a través de Claude». Se muestra el repositorio base. |
| 5–8 | Lobby | QR en pantalla; la sala entra. Contador de conectados subiendo. |
| 8–11 | Ronda 1 | Juego base, 90 s. Resultados y primer MVP. |
| 11–18 | Parche 1 | Votación; Claude programa la regla ganadora mientras narras el código. «Parche v0.2 instalado». |
| 18–21 | Ronda 2 | Se juega con la nueva regla. |
| 21–28 | Parche 2 | Segunda regla, idealmente una que cambie mucho (jefe final o zombis). |
| 28–31 | Ronda 3 | Juego con dos reglas activas. |
| 31–38 | Parche 3 | Propuesta libre del público, la más votada. Momento de máxima imprevisibilidad. |
| 38–41 | Ronda 4 | Tres reglas activas. |
| 41–48 | Preparación de la final | Claude analiza estadísticas y propuestas y genera un nivel final con los nombres de los mejores jugadores. |
| 48–51 | Final | Ronda especial con todas las reglas. |
| 51–55 | Ceremonia | Podio, equipo ganador, estadísticas del evento, líneas escritas por Claude. |
| 55–60 | Cierre | Historial de commits como «acta» de la sesión y preguntas. |

**Mientras Claude programa:** proyecta Claude Code en un lado de la pantalla y el visor en pausa en el otro. Lee en voz alta lo que Claude va decidiendo; ese es el contenido de la demo.

## Prompts para Claude Code

Prompts preparados para no improvisar con la sala mirando. Guárdalos en un archivo y cópialos.

**Antes del evento — construir la base:**

```text
Crea un juego web multijugador en Node.js con Express y Socket.IO para hasta 150 jugadores móviles. Arena 2D con Canvas, jugadores como círculos de color, orbes que dan 1 punto y una acción de embestida que roba 3 puntos con 2 s de recarga. Dos equipos. Servidor autoritativo a 20 ticks/s. Dos rutas: / para jugadores con joystick táctil y /visor con clave secreta para la pantalla de retransmisión estilo eSports (marcador, top 10, ticker de eventos, anuncios a pantalla completa, QR). Máquina de estados LOBBY, COUNTDOWN, RONDA, RESULTADOS, PARCHE, FINAL, CEREMONIA. Las reglas viven en game/rules/ con la interfaz onTick, onCollision, onOrb y se recargan en caliente sin cortar conexiones. Sigue CLAUDE.md.
```

**En directo — cada parche:**

```text
El público ha votado esta regla: "<TEXTO DE LA PROPUESTA>". Impleméntala como un nuevo archivo en game/rules/ siguiendo la interfaz existente. No modifiques otros archivos salvo que sea imprescindible. Debe ser jugable en 90 s y visible en el visor. Sube la versión del parche, haz commit con un mensaje descriptivo y dime en dos frases qué has hecho.
```

**En directo — la final:**

```text
Lee las estadísticas del evento en stats.json y las propuestas recibidas. Crea un nivel final en game/levels/final.js que combine todas las reglas activas, incluya los alias de los 3 mejores jugadores en el mapa y tenga un giro sorpresa inspirado en la propuesta más votada que no se programó. Haz commit.
```

**Si algo se rompe:**

```text
El juego ha dejado de funcionar tras el último cambio. Revierte al último commit estable, reinicia el servidor y confírmame que los jugadores siguen conectados.
```

**Contenido mínimo de `CLAUDE.md`:** stack y versiones; interfaz de reglas; «nunca cortar conexiones activas»; «cada parche en un archivo nuevo»; «commit tras cada cambio»; límite de 80 líneas por regla para que los parches tarden poco.

## Riesgos y checklist

El mayor riesgo es la red del local, no el código; el segundo, un parche que rompa el juego en directo.

| Riesgo | Plan B |
| --- | --- |
| El wifi no aguanta 100 conexiones | Router 4G/5G propio o desplegar en la nube y pedir datos móviles |
| Un parche rompe el juego | Revertir con git al último commit estable; convertirlo en parte del espectáculo |
| Un parche tarda demasiado | Tener 3 reglas ya programadas en una rama, listas para activar |
| Propuestas inapropiadas | Moderación obligatoria en el visor antes de mostrar nada |
| Límite de uso de Claude Code | Cuenta con margen suficiente y una segunda sesión abierta |
| El portátil se cuelga | Segundo equipo con el repositorio clonado y el túnel configurado |

**Checklist previa:**

- [ ] Base del juego funcionando y probada con 10–20 personas reales
- [ ] Ensayo completo cronometrado al menos dos veces
- [ ] Prueba de carga con bots (100–150 conexiones simultáneas)
- [ ] Túnel o despliegue configurado y URL corta para el QR
- [ ] Rama `plan-b` con reglas ya programadas
- [ ] `CLAUDE.md` y prompts preparados en un archivo
- [ ] Clave del visor configurada y probada
- [ ] Visita al local: wifi, proyector, resolución y sonido
- [ ] Pantalla dividida: Claude Code + visor legibles desde el fondo de la sala
