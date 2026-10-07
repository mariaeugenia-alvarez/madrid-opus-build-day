# Persona 6 — Infraestructura y QA

**Responsable:** Pablo Albaladejo

**Estado:** borrador (revisado por coordinación)

## Punto de partida

- **Simulador existente:** `sim/` contiene un simulador del servidor que permite que las personas 2, 3 y 4 trabajen sin el servidor real. Se ejecuta con `npm run sim:dev` (fases cortas) o `npm run sim` (duración real).
- **Prueba de carga:** `npm run loadtest -- [url] [clientes] [segundos]` simula jugadores reales contra una URL.
- **Sin servidor real todavía:** durante la hackathon trabajaremos todos contra el simulador hasta que exista `server.js`.
- **Stack:** Node.js 20 ES modules, Socket.IO con WebSocket, sin bundler.

## Ficha

**¿Dónde se ejecuta el servidor el día de la demo?**
Pendiente de decidir con el coordinador. El servidor debe soportar 150–200 jugadores, recuperar estado si se reinicia, servir `/qr.svg` y `/url`, y pasar `VISOR_KEY=x npm run sim:check -- <url>`.

**¿Cómo pueden trabajar las personas 2, 3 y 4 antes del servidor real?**
Con el simulador de `sim/`, que reproduce `shared/contract.js` al 100 %.

**¿Cómo se simula la carga?**
`npm run loadtest`, que crea bots que mandan `input`, `propuesta` y `voto`. Mide latencias, CPU y memoria sin falsa sobrecarga.

**¿Qué plan B hay si falla la red del local?**
Cloudflare Quick Tunnel (`npm run tunnel`) como respaldo público.

**¿Cómo se organiza Git durante la demo?**
Todos en `main`, solo `game/rules/` cambia. `git pull --rebase` antes de push, nunca `push --force`. Parches con `parche v0.X: <nombre>`.

**¿Qué puede fallar y cuál es el plan B?**

| Riesgo | Plan B |
| --- | --- |
| Servidor caído | Reinicio con recuperación de estado |
| Fallo de red | Cloudflare Quick Tunnel |
| Regla rota | Revert o activación de plan B |
| Visor sin conectar | Verificar `VISOR_KEY` e intentar sin visor |

**¿Cuándo se hacen los ensayos?**
Tres: tras integrar rondas básicas, tras parches, y dress rehearsal 48 h antes.

## Peticiones a otras personas

1. **Persona 1:** verificar que el simulador reproduce el contrato correctamente; si falta algo, coordinar cambios.
2. **Persona 4:** ruta de `data/stats.json` y si se guarda/restaura automáticamente.
3. **Persona 5:** nombres y artefactos de 3 reglas de plan B en `game/rules-reserva/`.

## Prompt

```text
Rol y contexto: soy la persona 6 del equipo, responsable de infraestructura y QA. Antes de empezar, lee CLAUDE.md, shared/AGENTS.md, shared/contract.js e infra/AGENTS.md.

Tarea:
A. Amplía el simulador (`sim/`) para reproducir el contrato al 100 % si aún le falta algo.
B. Implementa la prueba de carga (`npm run loadtest`) que simule 150 jugadores reales contra cualquier URL.
C. Documenta la infraestructura del día: cómo se arranca el servidor real, cómo se configura VISOR_KEY, plan B si falla.
D. Coordina los tres ensayos: checklist, timing y resolución de problemas.

Archivos que puedes crear/modificar:
- sim/: ampliar el simulador.
- infra/loadtest.js: prueba de carga.
- infra/server.md: guía de arranque del servidor real.
- infra/checklist.md: qué revisar durante la demo.
- game/rules-reserva/: 3 reglas de plan B (puedes pedir que otra persona las escriba).
- sim/AGENTS.md, infra/AGENTS.md: documentación.

Archivos que NO puedes tocar: CLAUDE.md, shared/contract.js, package.json, server.js.

Requisitos:
1. El simulador reproduce el contrato al 100 % (formas de eventos, fases, límites, duraciones).
2. `npm run sim:dev` arranca en < 2 s; http://localhost:3000 (móvil) y /visor (visor).
3. `npm run loadtest -- http://localhost:3000 150 300` simula 150 bots durante 300 s, mide latencias, p99 < 100 ms.
4. El simulador guarda y restaura estado si se reinicia.
5. Validación del contrato en cada mensaje; funciona contra cualquier URL (local, túnel, servidor real).
6. Documentación: red el día D, plan B, quién hace qué en cada ensayo.

Restricciones:
- Sin dependencias nuevas (consulta primero).
- Socket.IO solo WebSocket.
- No cambies el código de otros; si falta algo del contrato, coordina con P1.

Cómo probarlo:
- `npm run sim:dev` → http://localhost:3000 y /visor.
- `npm run loadtest -- http://localhost:3000 10 60` → 10 bots, 1 min.
- `VISOR_KEY=test npm run sim:check -- http://localhost:3000` → validar contrato.

Criterios de aceptación:
- Simulador funciona con parámetros de duración de fases (RONDA_S, PARCHE_S, etc.).
- Prueba de carga mide latencias sin falsa sobrecarga (10 msg/s/bot, no 1000).
- 150 bots en simulador: latencias p99 < 100 ms.
- Servidor se recupera sin perder datos tras reinicio con bots conectados.
- Documentación suficiente para que alguien ajeno al equipo pueda operar durante el evento.

Primer paso: propón un plan de estructura y qué ampliar; espera confirmación.
```
