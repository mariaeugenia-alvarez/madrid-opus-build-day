# AGENTS.md — raíz

Las normas del proyecto están en `CLAUDE.md`: equipo, stack, invariantes, interfaz de reglas y cómo hacer un parche en directo. Léelo antes de tocar nada. Este archivo solo es el mapa de carpetas; cada carpeta tiene su propio `AGENTS.md`.

| Carpeta | Qué hay | Responsable |
| --- | --- | --- |
| `infra/` | Servidor de humo, túnel de Cloudflare, prueba de carga, URL pública actual | Pablo Albaladejo (P6) |
| `shared/` | Contrato de comunicación (eventos, fases, límites) | Provisional de P6; lo cierra adevex-drone (P1) |
| `sim/` | Simulador del servidor con bots, para trabajar sin el servidor real | Pablo Albaladejo (P6) |
| `game/`, `server.js` | Servidor real y reglas | Ver `CLAUDE.md` |
| `public/` | Cliente móvil y visor | Ver `CLAUDE.md` |

Arranque rápido sin servidor real: `npm install && npm run sim:dev`, y en otra terminal `npm run tunnel`.
