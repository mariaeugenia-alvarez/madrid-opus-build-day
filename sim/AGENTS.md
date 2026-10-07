# AGENTS.md — sim/

Responsable: Pablo Albaladejo (P6). Lee antes `CLAUDE.md` en la raíz y `shared/AGENTS.md`.

## Para qué sirve

Es un **simulador del servidor del juego**. Cumple el contrato de `shared/contract.js` con bots y un juego base simplificado (orbes, embestidas, equipos, fases, propuestas, votos, parches falsos). Sirve para que P2 (móvil), P3 (visor) y P4 (estadísticas) trabajen sin esperar al servidor real. **No es el servidor de la demo** y no carga `game/rules/`.

## Qué hay

| Archivo | Para qué |
| --- | --- |
| `server.js` | El simulador. `npm run sim` (fases reales) o `npm run sim:dev` (fases cortas). |
| `pages/jugar.html` | Mando de depuración para el móvil, en `/sim/jugar`. También es la redirección de `/`. |
| `pages/visor.html` | Visor de depuración en `/sim/visor?key=…`, con controles Espacio, P, R y F. También es la redirección de `/visor`. |
| `check.js` | `VISOR_KEY=… npm run sim:check -- [url] [segundos]`: un visor y un jugador recorren un match completo. Comprueba que llegan todos los eventos del contrato y que funcionan proponer, aprobar y votar. |

Si existe `public/`, se sirve antes que estas páginas, así que `public/index.html` y `public/visor.html` sustituyen a las de depuración sin tocar nada.

## Variables

`PORT`=3000 · `BOTS`=40 · `RECONEXION_S`=60 (tiempo que se guarda a un jugador desconectado para que vuelva con su `token`) · `GRABAR`=ruta`.jsonl` (graba cada hecho en el formato de `stats.record` de `prompts/04-estadisticas.md`, para usar la partida como fixture de replay) · `VISOR_KEY` (si falta se genera una aleatoria y se muestra al arrancar; nunca en el código) · `AUTO`=1 (las fases avanzan solas y los bots proponen y votan; con `AUTO=0`, LOBBY y PARCHE esperan a `control: iniciar`) · `RONDAS`=3 · `LOBBY_S`, `RONDA_S`, `RESULTADOS_S`, `PARCHE_S`, `FINAL_S`, `CEREMONIA_S`.

## Normas

- Si cambia `shared/contract.js`, el simulador se actualiza en el mismo commit y `check.js` tiene que seguir dando `OK`.
- Las páginas de `pages/` son de depuración: el cliente y el visor de verdad van en `public/`, y sus dueños son P2 y P3.
- Ningún error en un tick puede tumbar el proceso: hay gente conectada. Si añades lógica, protégela.
