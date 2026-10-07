# La sala es el código — Fichas de tarea por persona

Oct 7, 2026 · @Juan Pablo

## Cómo funciona

Este documento fija solo el objetivo de la demo y el reparto; la arquitectura, el protocolo y los prompts los diseña el equipo. Cada ficha explica qué debe decidir y entregar su responsable, no cómo hacerlo.

**Lo que ya está decidido:**

- Demo en directo de 60 minutos para Claude Community, con unas 100–150 personas.
- El público juega desde el navegador del móvil escaneando un QR, sin instalar nada.
- El portátil del presentador muestra un visor global estilo retransmisión de eSports, con marcador y estadísticas.
- El público vota cambios en el juego y Claude Code los programa en directo; los cambios llegan a todos sin recargar.

**Lo que rellena el equipo:** la plantilla de `CLAUDE.md` común (abajo), las fichas de cada persona y sus prompts.

**Reparto:**

| # | Tarea | Responsable de |
| --- | --- | --- |
| 1 | Motor y servidor | Reglas del juego en el servidor, estados del match y contrato de comunicación |
| 2 | Cliente jugador | Todo lo que se ve y se toca en el móvil |
| 3 | Visor de retransmisión | La pantalla grande y el panel de control del presentador |
| 4 | Estadísticas | Qué se mide, cómo se cuenta y cómo convertirlo en espectáculo |
| 5 | Reglas y nivel final | El sistema de cambios en directo y su operación durante la demo |
| 6 | Infraestructura y QA | Que funcione con 150 personas reales y el plan B |

**Orden de trabajo:**

1. Sesión conjunta inicial (1–2 h): rellenar entre todos la plantilla de `CLAUDE.md`, sobre todo la arquitectura y el contrato de comunicación.
2. Cada persona completa su ficha: responde a sus preguntas y las añade a su sección.
3. Cada persona escribe su prompt a partir de su ficha y lo comparte para que otro lo revise.
4. Desarrollo en paralelo, cada uno en su rama, con integración conjunta periódica.

## Plantilla de CLAUDE.md común

Se rellena entre todos en la sesión inicial y se sube a la raíz del repositorio; Claude Code la lee automáticamente, así los seis trabajan con el mismo contexto. Cada `[...]` es un hueco que hay que sustituir.

```markdown
# La sala es el código

## Objetivo
Demo en directo de 60 minutos para Claude Community. El público juega desde el
móvil escaneando un QR, sin instalar nada; el portátil del presentador muestra un
visor global con marcador y estadísticas; el público vota cambios y Claude Code
los programa en directo sin que nadie recargue.

## El juego
- Tipo de juego y objetivo: [...]
- Cómo se puntúa: [...]
- Controles del jugador: [...]
- Equipos (sí/no, cuántos, cómo se asignan): [...]
- Fases del match y duración de cada una: [...]

## Arquitectura
- Lenguaje, entorno y versiones: [...]
- Librerías permitidas: [...]
- Quién manda sobre el estado del juego (servidor, clientes, mixto) y por qué: [...]
- Cómo se comunican servidor, móviles y visor: [...]
- Cómo llegan los cambios de reglas a todos sin recargar: [...]
- Dónde se ejecuta el servidor el día de la demo: [...]

## Estructura del repositorio
[árbol de carpetas y archivos, con el responsable de cada uno]

## Contrato de comunicación
[lista de mensajes: nombre, quién lo envía, quién lo recibe, datos y frecuencia]
Archivo que lo define como fuente de verdad: [...]

## Normas del equipo
- Cada persona modifica solo sus archivos; las peticiones a otros van a: [...]
- Ramas y forma de integrar: [...]
- Estilo de código y comentarios (se proyectará en pantalla): [...]
- Antes de implementar algo grande, Claude propone un plan y espera confirmación.
```

**Decisiones que conviene cerrar en la sesión inicial, porque afectan a todos:** quién manda sobre el estado del juego, el contrato de comunicación y cómo se aplican los cambios en caliente. El resto puede afinarlo cada responsable después.

## Cómo escribir tu prompt

Un buen prompt para Claude Code convierte tu ficha en instrucciones concretas; si tu ficha está bien respondida, el prompt casi se escribe solo.

**Estructura recomendada:**

```text
Rol y contexto: [quién eres en el proyecto; pide que lea CLAUDE.md antes de empezar]
Tarea: [qué tiene que construir y qué archivos puede tocar]
Requisitos: [lista numerada, a partir de las respuestas de tu ficha]
Restricciones: [qué no debe hacer: tocar archivos ajenos, cambiar el contrato, añadir librerías...]
Cómo probarlo: [con qué puede validar su trabajo sin depender de los demás]
Criterios de aceptación: [cuándo se considera terminado]
Primer paso: [que proponga un plan y espere tu confirmación]
```

**Comprobaciones antes de usarlo:**

- [ ] Pide leer `CLAUDE.md` y no repite lo que ya está ahí.
- [ ] Dice claramente qué archivos puede modificar y cuáles no.
- [ ] Los requisitos son concretos (números, límites, ejemplos), no adjetivos.
- [ ] Incluye criterios de aceptación comprobables.
- [ ] Pide un plan antes de escribir código.
- [ ] Otra persona del equipo lo ha leído y lo ha entendido sin explicación.

**Consejo:** guardad los prompts en una carpeta `prompts/` del repositorio. Sirven para repetir el trabajo si algo se rompe y como material de la propia charla.

## Persona 1 — Motor y servidor

Eres la base del proyecto: el resto depende de que tu contrato de comunicación esté listo cuanto antes y de que el servidor no se caiga en directo.

**Qué debes decidir y rellenar:**

- [ ] ¿Quién manda sobre el estado del juego y cómo se evitan las trampas?
- [ ] ¿A qué frecuencia se actualiza el juego y cuántos jugadores debe soportar?
- [ ] ¿Qué fases tiene el match, qué las hace avanzar y quién las controla?
- [ ] ¿Cómo se distingue un jugador del visor del presentador y cómo se protege el visor?
- [ ] ¿Cómo funcionan las propuestas y los votos (límites, moderación, un voto por persona)?
- [ ] ¿Cómo se cargan y aplican las reglas nuevas sin desconectar a nadie? (cerrarlo con la persona 5)
- [ ] ¿Qué pasa si una regla nueva falla?
- [ ] ¿Cómo recibe la persona 4 los datos que necesita para las estadísticas?
- [ ] ¿Qué entradas hay que validar y con qué límites?

**Qué debe cumplir:**

- Aguanta el número de jugadores acordado sin retrasos apreciables en un portátil normal.
- Un cambio de reglas llega a todos sin que nadie recargue ni se desconecte.
- Un error en una regla no tumba el juego.

**Qué entregas y cuándo:** el contrato de comunicación documentado el primer día (es lo que desbloquea al resto); después, el servidor funcional para la primera integración.

**Tu papel en la demo:** vigilar el servidor y los registros, y reiniciar si hace falta.

## Persona 2 — Cliente jugador

Diseñas lo que cada asistente tiene en la mano: tiene que funcionar en cualquier móvil y entenderse sin explicación.

**Qué debes decidir y rellenar:**

- [ ] ¿Qué pide la pantalla de entrada y cuánto se tarda en estar jugando?
- [ ] ¿Cómo se controla el juego con el dedo (joystick, toques, inclinación...)?
- [ ] ¿Qué ve el jugador en cada fase del match?
- [ ] ¿Cómo propone y vota cambios desde el móvil?
- [ ] ¿Cómo se mantiene fluido aunque la red vaya irregular?
- [ ] ¿Qué pasa si alguien entra con el match empezado o pierde la conexión?
- [ ] ¿Cómo se notan los cambios de reglas en el móvil (avisos, notas de parche)?
- [ ] ¿En qué móviles y navegadores se va a probar?

**Qué debe cumplir:**

- Funciona en iOS y Android recientes, solo con el navegador.
- Alguien que no sabe nada del proyecto entiende qué hacer en menos de 10 segundos.
- Se puede desarrollar y probar sin el servidor real, con el simulador de la persona 6.

**Qué entregas y cuándo:** un boceto de pantallas para revisar en equipo; después, el cliente funcional para la primera integración.

**Tu papel en la demo:** ayudar a la sala a conectarse y resolver problemas de móviles.

## Persona 3 — Visor de retransmisión

Diseñas lo que ve toda la sala en la pantalla grande: es el principal factor «wow» y el mando del presentador.

**Qué debes decidir y rellenar:**

- [ ] ¿Qué se ve en la pantalla grande en cada fase del match?
- [ ] ¿Qué elementos de retransmisión de eSports se incluyen (marcador, clasificación, avisos, repeticiones...)?
- [ ] ¿Cómo se presenta un «parche» nuevo para que la sala lo viva como un momento?
- [ ] ¿Cómo es la ceremonia final?
- [ ] ¿Qué controla el presentador (iniciar, pausar, aprobar propuestas, final...) y cómo, sin perder el ritmo?
- [ ] ¿Cómo se moderan las propuestas del público antes de mostrarlas?
- [ ] ¿Cómo se reparte la pantalla con Claude Code mientras programa?
- [ ] ¿Qué resolución y proyector hay en el local, y es legible desde el fondo?

**Qué debe cumplir:**

- Se lee bien desde la última fila.
- El presentador puede manejar todo el evento sin salir del visor.
- Ninguna propuesta llega a la pantalla sin aprobación.

**Qué entregas y cuándo:** un boceto del visor y la lista de datos que necesitas de las personas 1 y 4; después, el visor funcional para la primera integración.

**Tu papel en la demo:** presentador principal, maneja el visor y narra.

## Persona 4 — Estadísticas

Conviertes el juego en un evento con historia: decides qué se mide y cómo se cuenta para que la sala lo viva como un match.

**Qué debes decidir y rellenar:**

- [ ] ¿Qué estadísticas se muestran en directo y cuáles solo al final de cada ronda?
- [ ] ¿Qué cuenta como «momento destacado» y cómo se detecta (rachas, remontadas, primer punto...)?
- [ ] ¿Qué datos del motor necesitas y con qué frecuencia? (cerrarlo con la persona 1)
- [ ] ¿Qué datos necesita el visor y en qué formato? (cerrarlo con la persona 3)
- [ ] ¿Cómo se mide el trabajo de Claude en directo (número de parches, líneas, tiempo de cada uno)?
- [ ] ¿Qué se guarda del evento para que Claude genere el nivel final? (cerrarlo con la persona 5)
- [ ] ¿Qué se enseña en la ceremonia final?

**Qué debe cumplir:**

- Calcular estadísticas no ralentiza el juego.
- Los datos son correctos: se pueden comprobar en una partida de prueba.
- Al acabar, queda un resumen completo del evento disponible para la final y la ceremonia.

**Qué entregas y cuándo:** la lista de estadísticas y momentos destacados para revisar en equipo; después, el módulo funcional para la primera integración.

**Tu papel en la demo:** «comentarista», narra estadísticas y momentos destacados.

## Persona 5 — Reglas y nivel final

Eres quien opera Claude Code en directo: diseñas cómo se añaden reglas nuevas y te aseguras de que cada parche salga rápido y sin romper nada.

**Qué debes decidir y rellenar:**

- [ ] ¿Qué puede cambiar una regla del juego y qué no? (cerrarlo con la persona 1)
- [ ] ¿Cómo es una regla por dentro para que Claude la escriba siempre igual y rápido?
- [ ] ¿Qué normas añades a `CLAUDE.md` para que los parches sean seguros (tamaño máximo, archivos permitidos, commits...)?
- [ ] ¿Qué propuestas típicas esperas del público y cuáles son irrealizables en pocos minutos?
- [ ] ¿Qué reglas de reserva tienes preparadas por si un parche falla o tarda?
- [ ] ¿Cómo se genera el nivel final a partir de lo ocurrido en el evento?
- [ ] ¿Qué dices en voz alta mientras Claude programa para que la sala lo siga?

**Qué debe cumplir:**

- Cada parche está en marcha en menos del tiempo acordado (objetivo orientativo: 4 minutos).
- Hay una forma probada de volver al último estado estable en segundos.
- Se ha ensayado con propuestas reales de compañeros, no solo con las propias.

**Qué entregas y cuándo:** la sección de normas para reglas de `CLAUDE.md` y varias reglas de ejemplo; después, las reglas de reserva y los prompts de directo cronometrados.

**Tu papel en la demo:** operar Claude Code y explicar cada parche.

## Persona 6 — Infraestructura y QA

Garantizas que el día de la demo todo funcione con 150 personas reales, y que haya un plan B para cada fallo.

**Qué debes decidir y rellenar:**

- [ ] ¿Dónde se ejecuta el servidor el día de la demo (portátil, nube...) y cómo llega el público a él?
- [ ] ¿Cómo pueden trabajar las personas 2, 3 y 4 antes de que el servidor real exista (simulador, datos falsos)?
- [ ] ¿Cómo se simula la carga de 150 jugadores y qué se mide?
- [ ] ¿Qué red hay en el local y qué alternativa hay si falla?
- [ ] ¿Cómo se organiza Git: ramas, revisiones e integración?
- [ ] ¿Qué puede fallar el día de la demo y cuál es el plan B de cada cosa?
- [ ] ¿Cuándo se hacen los ensayos y con cuánta gente real?

**Qué debe cumplir:**

- El simulador está disponible el primer día para desbloquear a los demás.
- Se ha probado con carga simulada superior al público esperado.
- Hay al menos dos ensayos completos cronometrados antes del evento.
- Cada riesgo identificado tiene un plan B probado, no solo escrito.

**Qué entregas y cuándo:** el simulador y la organización de Git el primer día; después, la prueba de carga, la checklist del día y el plan B.

**Tu papel en la demo:** moderar propuestas y activar el plan B si hace falta.
