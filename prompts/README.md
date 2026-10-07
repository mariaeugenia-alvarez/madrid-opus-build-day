# Prompts de «La sala es el código»

Este directorio contiene los prompts de cada persona del equipo. **El README es la fuente única de verdad** que override los prompts individuales cuando hay contradictions.

## Índice de personas

| # | Persona | Responsable | Archivo | Estado |
| --- | --- | --- | --- | --- |
| 0 | Reparto y plantilla | Coordinación | [00-reparto-y-plantilla.md](00-reparto-y-plantilla.md) | cerrado |
| 1 | Motor y servidor | adevex-drone | [persona-1-motor-y-servidor.md](persona-1-motor-y-servidor.md) | borrador → revisado |
| 2 | Cliente jugador | mariaeugenia-alvarez | [persona-2-cliente-jugador.md](persona-2-cliente-jugador.md) | borrador → revisado |
| 3 | Visor de retransmisión | andrsbayona | [persona-3-visor.md](persona-3-visor.md) | borrador → revisado |
| 4 | Estadísticas | Yerai | [persona-4-estadisticas.md](persona-4-estadisticas.md) | borrador → revisado |
| 5 | Reglas y parche | dsprofesionalia | [persona-5-reglas-y-parche.md](persona-5-reglas-y-parche.md) | borrador → revisado |
| 6 | Infraestructura y QA | Pablo Albaladejo | [persona-6-infraestructura-y-qa.md](persona-6-infraestructura-y-qa.md) | borrador (revisa coordinación) |

## Decisiones de coordinación (override en todos los prompts)

Estas decisiones se han tomado en coordinación con el equipo y override cualquier contradicción en los prompts individuales. Si tu prompt dice algo distinto, aplica lo de aquí y marca el cambio inline con «(ajustado por coordinación, ver prompts/README.md)».

### 1. Contrato de comunicación y fases

- **Contrato único:** `shared/contract.js` es la única fuente. Persona 1 (adevex-drone) lo adopta y puede extenderlo; cambios van por coordinación.
- **7 fases invariantes:** LOBBY, COUNTDOWN, RONDA, RESULTADOS, PARCHE, FINAL, CEREMONIA (P1's «sin fases» está override).
- **PARCHE con subfases:** llevan `datos.subfase` (BUZON, VOTACION, PROGRAMANDO, VERIFICANDO, INSTALADO) según persona 5.
- **Capacidad:** 150 jugadores mínimo, diseñar con margen a 200.

### 2. Comunicación y ancho de banda

- **Móvil recibe `me` a 10/s** (x, y, recargaMs del motor) con stats fields de persona 4 fusionados. Stats.drainMe() ≤ 2/s.
- **Estado completo (`state`) va solo al visor a 20/s**; el visor interpola a 60 fps. Motivo: ancho de banda medido en infra/AGENTS.md.
- **Votación:** un voto por persona, puede cambiar mientras esté abierta. Payload: `{ id }`.
- **Acks de error:** `{ ok: false, error, motivo? }` — `error` es texto humano, `motivo` opcional es código (largo, limite, duplicada, cerrado, filtro).
- **Fin de fase:** `finEn` (server ms) + `restanteMs`, no `fin`.

### 3. Eventos y nombres

- Eventos siguen el contrato: persona 5's `papeleta`/`votos` mapean onto `votacion` (candidatas + recuento, participación); `mod:cola` mapea onto `propuestas` (solo control panel); `progreso` es nuevo evento de P5.
- **`parche` unificado:** version, nombre, descripcion, autor, reglaId, propuestaId, votos, lineas {mas, menos}, commit, aprobadoEn, desplegadoEn, ms, emergencia. `regla` es alias deprecado de `nombre`.
- **Moderación nunca en pantalla proyectada** (invariante CLAUDE.md 5): panel `/control` separado (persona 3), acciones definidas por persona 5.

### 4. Versiones y reglas

- **Versión asignada por servidor** (P5), no por Claude. Quita el campo de `pendiente.json` si lo calculaba Claude.
- **Reglas con `descripcion` opcional:** una frase para las notas del parche.
- **Activación en ronda start** (no a mitad de ronda).
- **Backup rules en `game/rules-reserva/`** (plan B, no cambios de rama en directo).

### 5. Audio y visor

- **Sonido requerido** (design doc pide audio effects): owner persona 3 para visor/room speakers. Web Audio synthesis, sin archivos. Referencia: `sim/pages/visor.html`, sección `Sonido`.
- **Persona 2 solo vibración** y minimal optional sounds.

### 6. Git y desarrollo

- **Todos en `main`**, `git pull --rebase` antes de push, commits pequeños, solo tus archivos. Durante evento: solo `game/rules/`.
- **Simulador valida `/qr.svg` y `/url`** como servidor real; también pasa `VISOR_KEY=x npm run sim:check -- <url>`.
- **Guardaré yo el contrato:** no lo toques; si necesitas cambios, píde por coordinación.

### 7. Estadísticas (persona 4)

- **Payload `stats` (v: 1)** definido por P4, publica ejemplo en `shared/ejemplos/stats.json` para que visor y simulador se adapten.
- **Visor monta componentes de P4**.
- **`me` fusiona stats fields** con x, y, recargaMs del motor a 10/s.

## Orden de integración e hitos

1. **Contrato → servidor pasa `sim:check`**
   - P1 cierra `shared/contract.js`.
   - P6 valida `VISOR_KEY=test npm run sim:check -- http://localhost:3000`.

2. **Móvil + visor contra servidor simulado**
   - P2 (cliente) + P3 (visor) + P6 (simulador) iteran.
   - `npm run sim:dev` funciona sin P1's servidor real.

3. **Estadísticas en el simulador**
   - P4 integra stats.js en sim/server.js o P6 lo hace.
   - Demo.html muestra todas las fases con datos-falsos.js.

4. **Primer parche en directo**
   - P5's infraestructura de parches (subfases, propuestas, votación).
   - P1's carga en caliente sin desconectar.
   - Plan B en `game/rules-reserva/`.

5. **Ensayos (P6)**
   - Ensemble 1: rondas básicas (P1+P2+P3+P4).
   - Ensemble 2: con parches (P5).
   - Dress rehearsal: 48 h antes, gente real.

## Cómo pedir un cambio al contrato

1. Abre un issue o comenta en `prompts/README.md`.
2. Describe qué campo/evento necesitas, dónde y por qué.
3. Espera a que coordinación + P1 (adevex-drone) lo aprueben.
4. P1 actualiza `shared/contract.js` con comentario de la decisión.
5. Todos importan de ahí.

## Estructura de cada ficha

Cada archivo persona-N-*.md tiene:
- **Encabezado:** responsable y estado (borrador/revisado).
- **Punto de partida:** contexto y dependencias.
- **Ficha:** respuestas a las preguntas clave.
- **Peticiones a otras personas:** qué necesitas que cierren otros.
- **Prompt:** el que pega en Claude Code, con rol, tarea, requisitos, restricciones, cómo probarlo y criterios de aceptación.

Cambios coordinados se marcan inline: «(ajustado por coordinación, ver prompts/README.md)».
