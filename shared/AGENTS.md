# AGENTS.md — shared/

Lee antes `CLAUDE.md` en la raíz.

## Qué hay

`contract.js`: el **contrato de comunicación provisional**, propuesto por P6 a partir del documento de la demo. Lo cierra y lo mantiene adevex-drone (P1, motor y servidor). Es la única fuente de verdad de:

- los nombres de evento (`EV`), las fases del match (`FASES`) y su flujo;
- la forma de cada mensaje (en comentarios junto a cada evento) y la de `stats` (`ejemploStats`);
- las frecuencias (`TICK_HZ` 20, `ME_HZ` 10, `STATS_HZ` 1), la arena, los límites (alias 12, propuesta 80) y las constantes del juego base.

Es un módulo ES que funciona igual en Node y en el navegador:

```js
import { EV, FASES } from '../shared/contract.js';            // Node
import * as CONTRATO from '/shared/contract.js';             // <script type="module"> en el navegador
```

## Normas

- **No escribas nombres de evento como cadenas sueltas**: impórtalos de aquí.
- **Un cambio aquí afecta a todo el equipo** (servidor, móvil, visor, estadísticas y el simulador de `sim/`). Pídeselo a P1, avisa a todos y actualiza `sim/server.js` en el mismo commit para que el simulador siga cumpliendo el contrato.
- Decisión de ancho de banda que no se toca sin medir con `infra/loadtest.js`: el `state` completo a 20 Hz va **solo al visor**; los móviles reciben `me`.
- Sin dependencias ni código de Node (`fs`, `process`…): este archivo también lo carga el navegador.
