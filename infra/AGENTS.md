# AGENTS.md — infra/

Responsable: Pablo Albaladejo (Persona 6, Infraestructura y QA). Lee antes `CLAUDE.md` en la raíz.

## Qué hay

| Archivo | Para qué |
| --- | --- |
| `smoke-server.js` | Servidor de humo (`npm run smoke`): Socket.IO solo WebSocket con un estado falso de `STATE_BYTES` a `TICK_HZ`, y `GET /health`. No es el juego; sirve para medir el túnel y la red. |
| `tunnel.sh` | `npm run tunnel` (`PORT=3000` por defecto): abre un Cloudflare Quick Tunnel contra `localhost`, escribe la URL en `.tunnel-url` y pinta el QR en la terminal. Necesita `cloudflared` (`brew install cloudflared`). |
| `loadtest.js` | `npm run loadtest -- [url] [clientes] [segundos]`: N clientes Socket.IO solo WebSocket. Mide conexiones, rechazos (429), latencia p50/p95/p99 y ticks recibidos. Sin URL usa `.tunnel-url`. |
| `qr.js` | `npm run qr -- [url]`: escribe `qr.png` (1024 px, para proyectar o imprimir) y `qr.svg`, y pinta el QR en la terminal. `tunnel.sh` lo llama solo. |
| `qr.png`, `qr.svg` | QR de la URL pública actual: se versionan junto con `.tunnel-url`. |
| `.tunnel-url` | URL pública actual. Está versionado para que el equipo la vea: haz commit cada vez que cambie. |

## Datos medidos (no los olvides al diseñar)

- **El Quick Tunnel admite como máximo 200 peticiones en vuelo**; a partir de ahí responde `429`. Con 250 clientes entraron 200 y se rechazaron 50.
- **El límite real es el ancho de banda de subida.** Un estado de 1 KB a 20 Hz para 150 clientes (unos 24 Mbit/s) da una latencia de 1,4 s en p50. Con 200 B por tick baja a unos 26 ms. Por eso el estado completo va solo al visor y el móvil recibe `me`.
- **Solo WebSocket** (`transports: ['websocket']`) en servidor y clientes. El long-polling multiplica las peticiones y agota el límite del túnel.
- La URL `trycloudflare.com` cambia cada vez que se reinicia el túnel. Hay que reimprimir el QR y actualizar `.tunnel-url`.

## Normas

- No toques `server.js`, `game/` ni `public/`: tienen dueño (ver `CLAUDE.md`).
- Los scripts de esta carpeta no deben exigir dependencias nuevas sin acordarlo con el equipo.
- Cualquier cambio de infraestructura se valida con `loadtest.js` contra el túnel, no solo en local.
