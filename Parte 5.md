# La sala es el código: fase 5, `PARCHE`

Desarrollo de la fase 5 del match. Ocupa las pausas entre rondas (min 11–18, 21–28 y 31–38) y es donde se ve la demo de verdad: la sala propone y vota, Claude programa y el juego cambia sin que nadie recargue.

## Objetivo y límites

- **Qué resuelve:** en unos 7 minutos se pasa de «la sala quiere X» a «la regla X funciona en el juego», con todo visible en el visor.
- **Qué no hace:** no programa la regla. De eso se encarga Claude Code en el portátil. Esta fase prepara la petición, espera el resultado, lo comprueba y lo instala.
- **Regla de oro:** si algo falla, la ronda siguiente arranca igualmente, con la regla nueva o con una del plan B.

## Subfases

`PARCHE` se divide en subfases. El servidor las gestiona y las envía en el evento `fase` como `{ fase: 'PARCHE', subfase, ... }`.

| # | Subfase | Duración objetivo | Qué pasa | Cómo avanza |
| --- | --- | --- | --- | --- |
| 5.1 | `BUZON` | 60–90 s | Los jugadores envían propuestas y el presentador las modera | Presentador (`V`) o fin del tiempo |
| 5.2 | `VOTACION` | 30–45 s | Se votan las propuestas aprobadas | Presentador (`V`) o fin del tiempo |
| 5.3 | `PROGRAMANDO` | ≤ 3:30 | Claude escribe la regla y el visor muestra el progreso | El servidor detecta la regla nueva |
| 5.4 | `VERIFICANDO` | 2–5 s | El servidor carga la regla y la prueba en seco | Automático |
| 5.5 | `INSTALADO` | 30–45 s | Notas del parche a pantalla completa | Presentador (`Espacio`) → `COUNTDOWN` |

**Dos modos de parche**, según el guion:

- **Curado** (parches 1 y 2): se salta `BUZON`. Se vota entre 3 o 4 reglas de la lista «de la casa» (gravedad invertida, jefe final, zombis, orbes dorados, mapa que se encoge, niebla de guerra).
- **Libre** (parche 3): `BUZON` abierto al público, con moderación obligatoria.

El modo de cada parche se configura en `game/patches/config.json`, sin tocar código.

## Reparto del tiempo (7 min)

| Tiempo | Curado | Libre |
| --- | --- | --- |
| 0:00–1:30 | Votación (45 s) y comentario del presentador | Buzón y moderación |
| 1:30–2:15 | Claude empieza a programar | Votación |
| 2:15–5:45 | Claude programa; el presentador lee en voz alta lo que decide | Claude programa |
| 5:45–6:30 | Verificación y notas del parche | Verificación y notas del parche |
| 6:30–7:00 | Colchón | Colchón |

**Corte de seguridad:** a los 4:00 de `PROGRAMANDO` el visor avisa al presentador (solo en el panel de control). A los 5:00 se activa el plan B (ver más abajo).

## Propuestas (subfase `BUZON`)

**Envío desde el móvil:**

- Campo de texto de 80 caracteres como máximo, con contador visible y botón «Proponer regla».
- Hasta 2 propuestas por jugador y parche. Los espectadores también pueden proponer.
- El servidor responde por callback (*ack*): `{ ok: true, id }` o `{ ok: false, motivo }`. Los motivos posibles son `largo`, `limite`, `duplicada`, `cerrado` y `filtro`.

**Filtro automático (antes de la moderación):**

- Recorta espacios, colapsa repeticiones («aaaaa») y rechaza los textos vacíos o de menos de 4 caracteres.
- Lista de palabras prohibidas en `game/patches/bloqueadas.txt`. Las que coinciden ni siquiera llegan a la cola.
- Detección de duplicados: se normaliza el texto (minúsculas, sin tildes ni signos) y, si coincide con otro, se suma como «+1» a la propuesta existente en lugar de crear una nueva.

**Moderación:**

- Cada propuesta entra como `pendiente`. **Nada pendiente se proyecta nunca**: en el visor solo aparece el contador («23 propuestas recibidas»).
- El presentador modera desde el panel de control con cuatro acciones:
  - **Aprobar**: la propuesta pasa a la votación.
  - **Rechazar**: se descarta y no se muestra.
  - **Fusionar**: se une a otra propuesta parecida y suma sus +1.
  - **Editar**: corrige erratas o acorta la propuesta antes de aprobarla.
- Para la votación se aprueban como máximo 4 propuestas. Si se aprueban menos de 2, el servidor completa la papeleta con reglas de la casa.

> ⚠️ **Decisión a acordar con el equipo:** el plan general pone la cola de moderación en el visor, pero el visor se proyecta, así que la sala vería las propuestas antes de moderarlas. Propongo una tercera entrada, **`/control?key=CLAVE`**, que el presentador abre en su móvil o en una segunda ventana que no se proyecte. Ahí van la cola y los botones; el visor proyectado solo muestra contadores y la papeleta final.

## Votación (subfase `VOTACION`)

- Cada jugador tiene 1 voto y puede cambiarlo mientras la votación esté abierta.
- **En el móvil:** de 2 a 4 tarjetas grandes con el texto y el alias de quien lo propuso. La elegida se resalta y aparece la marca «Tu voto».
- **En el visor:** barras horizontales que se animan en directo, con el porcentaje y el número de votos; además, un contador de participación («87 de 112 han votado») y una cuenta atrás.
- El servidor envía los recuentos 2 veces por segundo como máximo (evento `votos`), nunca en cada clic.
- **Empate:** el visor muestra «¡EMPATE!» y el presentador elige con un clic. Si no elige en 10 s, se sortea con una animación de ruleta.
- **Resultado:** anuncio a pantalla completa «LA SALA HA DECIDIDO: …» durante 3 s y paso a `PROGRAMANDO`.

## Relevo a Claude (subfase `PROGRAMANDO`)

Al cerrarse la votación, el servidor:

1. Asigna la versión siguiente (`v0.2`, `v0.3`…). **El servidor es el dueño del número de versión**, así no hay conflictos si Claude se equivoca de número.
2. Escribe `game/patches/pendiente.json`:

   ```json
   {
     "version": "0.3",
     "texto": "los orbes huyen de los jugadores",
     "autor": "Marta",
     "votos": 41,
     "reglaId": "orbes-huyen",
     "inicio": "2026-10-07T19:24:13.000Z"
   }
   ```

3. Genera el prompt completo listo para pegar y lo muestra en el panel de control con un botón «Copiar prompt»:

   ```text
   El público ha votado esta regla: "los orbes huyen de los jugadores" (propuesta de Marta, 41 votos).
   Impleméntala como game/rules/orbes-huyen.js siguiendo la interfaz existente y CLAUDE.md.
   Usa version: '0.3'. Incluye un campo descripcion de una frase para las notas del parche.
   No modifiques otros archivos salvo que sea imprescindible. Debe ser jugable en 90 s y visible en el visor.
   Haz commit con el mensaje "parche v0.3: orbes huyen" y dime en dos frases qué has hecho.
   ```

4. Pone en marcha el cronómetro del parche, que mide desde el cierre de la votación hasta la instalación.

**Lo que ve la sala mientras Claude programa:**

- **Visor (la mitad de la pantalla junto a Claude Code):** «Instalando parche v0.3…» con la regla votada en grande, el cronómetro y una línea de pasos que se van marcando con eventos reales del servidor:

  `Votación cerrada` ✓ → `Claude programando` ⏳ → `Archivo detectado` → `Pruebas` → `Commit` → `Instalado`

- **Móvil:** pantalla «Claude está programando vuestra regla» con el texto votado. Opcional (ver *Extras*): una predicción para entretener la espera.

## Detección, prueba e instalación (subfases `VERIFICANDO` e `INSTALADO`)

**Cargar una regla no es activarla.** El servidor vigila `game/rules/` (`fs.watch`), pero una regla solo se activa después de pasar estas comprobaciones:

1. **Espera de estabilidad:** el archivo tiene que llevar 1,5 s sin cambiar. Así no se carga un archivo a medio escribir.
2. **Importación:** `import('./rules/x.js?v=' + Date.now())` dentro de `try/catch`. Si falla, el visor muestra «Error de compilación» y se sigue esperando, porque Claude puede corregirlo.
3. **Validación de la interfaz:**
   - Debe tener `id` y `nombre` de tipo texto.
   - `onTick`, `onCollision` y `onOrb`, si existen, deben ser funciones.
   - El `id` no puede estar ya activo.
4. **Prueba en seco:** se ejecutan 200 ticks simulados sobre una **copia** del estado con 20 bots, llamando a todos los ganchos. La prueba falla si algo lanza una excepción, si aparece `NaN` en posiciones o puntos, si algún jugador sale de la arena o si un tick tarda más de 5 ms de media.
5. **Commit:** se espera a que el último commit de git toque ese archivo (consultando `git log -1` cada segundo durante un máximo de 20 s). Si no llega, se instala igualmente y en las notas se indica «sin commit».
6. **Activación:** la regla se añade a `state.reglasActivas` al empezar la siguiente ronda, nunca a mitad de ronda.

Con la regla activada, el servidor calcula `git diff --stat HEAD~1` (líneas añadidas y quitadas), detiene el cronómetro, añade el parche al historial y emite el evento `parche`.

**Notas del parche (pantalla completa en el visor):**

```text
PARCHE v0.3 INSTALADO
Orbes huyen
Los orbes se alejan del jugador más cercano a media velocidad.
Propuesta de Marta · 41 votos (37 %)
+46 −0 líneas · 3:12 de programación · commit a1b2c3d
Reglas activas: Gravedad invertida · Jefe final · Orbes huyen
```

En el móvil se ve una versión corta: «Parche v0.3: Orbes huyen». Además, el jugador que hizo la propuesta recibe un anuncio personal: «¡Tu regla está en el juego!».

## Protección durante las rondas

Esto toca el bucle de juego de otro compañero, pero nace de esta fase, así que lo propongo aquí:

- Cada gancho de cada regla se ejecuta dentro de `try/catch`.
- Si una regla lanza 5 errores en una ronda, se desactiva sola, el ticker muestra «⚠️ Regla X desactivada» y la ronda sigue.
- Nunca se reinicia el proceso por culpa de una regla, porque eso cortaría las conexiones.

## Plan B

- Las reglas de reserva viven en **`game/rules-reserva/`**, en `main` y cargadas pero inactivas. Recomiendo esto en lugar de una rama `plan-b`: cambiar de rama en directo con el servidor encendido es un riesgo innecesario.
- Se activa a los 5:00 de `PROGRAMANDO`, o antes si el presentador pulsa `B`. El presentador elige una reserva y se instala con las mismas notas del parche, marcada «parche de emergencia».
- Si Claude termina después, su regla queda en `listo` y puede activarse en el parche siguiente. Así lo que ha votado la sala no se pierde.
- Si la regla falla en la prueba en seco 3 veces, el panel de control ofrece directamente el plan B.

## Eventos de Socket.IO

Amplía la tabla general. Los eventos marcados con 🆕 no estaban en el plan.

| Evento | Dirección | Contenido |
| --- | --- | --- |
| `propuesta` | jugador → servidor | `{ texto }`; responde por ack `{ ok, id \| motivo }` |
| `voto` | jugador → servidor | `{ propuestaId }`; se puede reenviar para cambiar el voto |
| `fase` | servidor → todos | `{ fase: 'PARCHE', subfase, modo, version, fin }`, donde `fin` es la marca de tiempo en la que termina la subfase |
| 🆕 `papeleta` | servidor → todos | `[{ id, texto, autor, origen }]` al abrir la votación |
| 🆕 `votos` | servidor → todos | `{ recuento: { id: n }, participacion, total }`, como máximo 2/s |
| 🆕 `progreso` | servidor → visor y control | `{ paso, ok, detalle, crono }` para la línea de pasos |
| `parche` | servidor → todos | `{ version, nombre, descripcion, autor, votos, lineas: { mas, menos }, segundos, commit, emergencia }` |
| 🆕 `mod:cola` | servidor → control | lista completa de propuestas con estado (solo para `/control`) |
| `control` | visor o control → servidor | `{ accion, ... }`, con las acciones de abajo |

**Acciones de `control` de esta fase:** `abrir_buzon`, `cerrar_buzon`, `aprobar`, `rechazar`, `fusionar`, `editar`, `abrir_votacion`, `cerrar_votacion`, `desempatar`, `instalar_ya` (se salta la espera del commit), `plan_b`, `continuar`.

**Teclas nuevas en el visor** (se suman a `Espacio`, `P`, `R` y `F`):

| Tecla | Acción |
| --- | --- |
| `V` | Avanzar subfase: buzón → votación → cerrar votación |
| `B` | Plan B |
| `N` | Repetir las notas del parche |

## Datos y estadísticas

**Modelo de datos:**

```js
// Propuesta
{ id, texto, textoNorm, autorId, autor, equipo, ts,
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'fusionada',
  fusionadaEn, apoyos, votos, origen: 'publico' | 'casa', parche: '0.3' }

// Parche
{ version, propuestaId, reglaId, nombre, descripcion, inicio, fin, segundos,
  lineas: { mas, menos }, commit, intentos,
  resultado: 'instalado' | 'emergencia' | 'fallido' }
```

**Persistencia:** después de cada parche se guarda en `stats.json`, con los bloques `propuestas` y `parches`. La final lo necesita para encontrar «la propuesta más votada que no se programó».

**Estadísticas que alimenta esta fase:**

| Estadística | Cálculo |
| --- | --- |
| Propuestas enviadas, aprobadas y rechazadas | Contadores por parche y totales |
| Participación en la votación | Votos ÷ jugadores conectados |
| Regla más votada de la noche | Máximo de votos entre todos los parches |
| Más votada sin programar | Máximo entre las aprobadas que no ganaron (para la final) |
| Tiempo de cada parche | `fin − inicio` |
| Líneas escritas por Claude | Suma de `lineas.mas` (para la ceremonia) |
| Proponente más votado | Autor con más votos sumados (premio extra en la ceremonia) |

## Casos límite

| Situación | Comportamiento |
| --- | --- |
| Nadie propone nada | La papeleta se completa con reglas de la casa |
| Solo hay 1 propuesta aprobada | Se completa con 2 reglas de la casa |
| Un jugador se reconecta | Recupera su voto y sus propuestas gracias a su id guardado en `localStorage` |
| Un jugador se desconecta después de votar | Su voto cuenta igual |
| La regla ganadora ya está activa o es imposible | El presentador puede pasar a la segunda más votada con `desempatar` |
| Claude modifica otros archivos | Si cambia `server.js` o `state.js`, se avisa en el panel de control y no se recarga nada automáticamente; decide el presentador |
| Un mismo parche guarda dos archivos de regla | Se trata solo el último, que reemplaza al anterior |

## Extras opcionales

Solo si sobra tiempo de desarrollo:

- **Predicción mientras Claude programa:** el móvil pregunta «¿Cuánto tardará Claude?» con las opciones `<2 min`, `2–3`, `3–4` y `>4`. Quien acierta gana +2 puntos para la ronda siguiente.
- **Sala de calentamiento:** durante `PROGRAMANDO`, los jugadores pueden moverse por la arena sin puntuar. Mantiene la sala activa, pero hace más complicada la pantalla dividida.
- **Sonido:** un efecto corto al cerrar la votación y otro al instalarse el parche.

## Archivos de esta fase

```text
game/
├─ patches/
│  ├─ index.js          # subfases, propuestas, votación, relevo, instalación
│  ├─ verificar.js      # validación de la interfaz y prueba en seco con bots
│  ├─ config.json       # modo de cada parche y reglas de la casa
│  ├─ bloqueadas.txt    # palabras filtradas
│  └─ pendiente.json    # lo genera el servidor; Claude lo lee
├─ rules-reserva/       # plan B: 3 reglas probadas
public/
├─ control.html         # panel privado del presentador
└─ control.js
```

## Puntos a cerrar al juntar las partes

1. **Panel `/control`:** confirmar con quien hace el visor que la moderación sale del visor proyectado.
2. **Campo `descripcion` en la interfaz de reglas:** añadirlo a `CLAUDE.md` y a la interfaz común.
3. **Versión:** la asigna el servidor, no Claude. Hay que actualizar el prompt de parche del plan.
4. **Activación de reglas:** solo al empezar la ronda, lo que afecta a la máquina de estados.
5. **`try/catch` por gancho y autodesactivación:** se implementa en el bucle de juego.
6. **Plan B en carpeta en lugar de rama:** actualizar la checklist.

## Checklist de pruebas de esta fase

- [ ] 100 bots proponen y votan a la vez sin que se pierdan votos y el visor se mantiene fluido.
- [ ] Una regla con un error de sintaxis no tumba el servidor y se puede corregir sin reiniciar.
- [ ] Una regla que lanza excepciones en `onTick` se desactiva sola durante la ronda.
- [ ] Una regla que deja `NaN` en las posiciones no supera la prueba en seco.
- [ ] El plan B se instala en menos de 10 s desde que se pulsa `B`.
- [ ] Ninguna propuesta pendiente aparece en el visor proyectado.
- [ ] `stats.json` incluye la «más votada sin programar» después de 3 parches.
- [ ] El tiempo y las líneas que muestran las notas del parche coinciden con lo que dice git.
