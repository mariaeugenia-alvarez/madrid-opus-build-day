## Persona 1 — Motor y servidor

Eres la base del proyecto: el resto depende de que tu contrato de comunicación esté listo cuanto antes y de que el servidor no se caiga en directo.

**Qué debes decidir y rellenar:**

- [x] ¿Quién manda sobre el estado del juego y cómo se evitan las trampas?
  Un motor de juego con reglas duras gestionado por el servidor. El móvil solo envía lo que hace el jugador; las posiciones y los puntos los calcula siempre el servidor.
- [x] ¿A qué frecuencia se actualiza el juego y cuántos jugadores debe soportar?
  Hasta 60 jugadores. El móvil se actualiza entre 20 y 30 veces por segundo, y el visor más (unas 60) para que sea espectacular.
- [x] ¿Qué fases tiene el match, qué las hace avanzar y quién las controla?
  Ninguna, para simplificar, siempre que el resultado sea espectacular. El juego está siempre en marcha; el presentador puede pausar, abrir votaciones, reiniciar los puntos y mostrar el podio.
- [x] ¿Cómo se distingue un jugador del visor del presentador y cómo se protege el visor?
  El visor es la pantalla grande y se abre en local, en el portátil donde corre el servidor (el de la persona de infraestructura). Se protege con una clave secreta, para que funcione igual llegue el público por túnel, por un router propio o por la nube. El presentador ve el estado de todos los jugadores, el ranking general y el mapa con todos moviéndose en tiempo real, con zoom.
- [x] ¿Cómo funcionan las propuestas y los votos (límites, moderación, un voto por persona)?
  Lo resuelve la IA de la mejor manera. Orientación: las propuestas pasan por el presentador antes de votarse, y cada jugador tiene un voto.
- [x] ¿Cómo se cargan y aplican las reglas nuevas sin desconectar a nadie? (cerrarlo con la persona 5)
  Lo resuelve la IA con la mejor opción. Orientación: cada regla en su propio archivo, cargado en caliente.
- [x] ¿Qué pasa si una regla nueva falla?
  Lo resuelve la IA de la mejor manera. Orientación: la regla se desactiva sola y el juego sigue.
- [x] ¿Cómo recibe la persona 4 los datos que necesita para las estadísticas?
  Lo resuelve la IA de la forma más óptima y coherente. Orientación: el motor emite eventos y las estadísticas se suscriben a ellos.
- [x] ¿Qué puede enviar un móvil al servidor y qué pasa si llega algo inválido o en exceso? *(pregunta redefinida)*
  Solo la dirección, la acción, las propuestas y los votos. El servidor valida cada mensaje y descarta lo que no encaje o llegue en exceso.

**Qué debe cumplir:**

- Aguanta el número de jugadores acordado sin retrasos apreciables en un portátil normal.
- Un cambio de reglas llega a todos sin que nadie recargue ni se desconecte.
- Un error en una regla no tumba el juego.

**Qué entregas y cuándo:** el contrato de comunicación documentado el primer día (es lo que desbloquea al resto); después, el servidor funcional para la primera integración.

**Tu papel en la demo:** vigilar el servidor y los registros, y reiniciar si hace falta.

### Prompt

```text
Eres la persona 1 del proyecto «La sala es el código»: el motor y el servidor del juego. Lee CLAUDE.md, si existe, y «tarea 1 servidor.md». Para el juego base, lee «La sala es el código — Demo Claude Community.md». Las respuestas de ese archivo son nuestras decisiones; donde pone «orientación», tómalo como punto de partida, no como obligación.

Solo hay una vuelta: no pidas confirmación. Lo que no esté resuelto o choque con lo que hagan otras personas, decídelo tú con la opción más sencilla que encaje con el resto, y anótalo en DECISIONES.md con una línea por decisión.

Qué construir:
- Servidor en Node.js 20 con Express y Socket.IO. Puedes añadir alguna librería ligera si de verdad simplifica algo.
- El servidor manda: aplica las reglas y el móvil solo envía lo que hace el jugador.
- Hasta 60 jugadores. Envía el estado al móvil entre 20 y 30 veces por segundo y al visor unas 60. Mantén los mensajes a los móviles lo más pequeños posible: la red del local o la subida del portátil pueden ser el cuello de botella.
- Si un jugador pierde la conexión o bloquea el móvil, al volver recupera su avatar y sus puntos; no aparece como un jugador nuevo.
- Sin fases: el juego está siempre en marcha y se entra en cualquier momento. El presentador puede pausar, abrir y cerrar votaciones, reiniciar los puntos y mostrar el podio.
- El servidor corre en el portátil de la persona de infraestructura. Todavía no está decidido cómo llega el público (túnel, router propio o nube), así que el servidor debe funcionar con cualquiera de esas opciones. El visor se protege siempre con una clave secreta; no te fíes de la IP ni de que la conexión venga de localhost, porque un túnel conecta desde el propio portátil. El visor recibe el estado de todos los jugadores, el ranking general y las posiciones en tiempo real.
- Propuestas moderadas por el presentador y un voto por jugador. No limites por IP, porque muchos jugadores pueden compartirla.
- Reglas nuevas que se aplican en caliente sin desconectar a nadie. Si una regla falla o se cuelga, el juego sigue.
- Datos para las estadísticas de la forma más sencilla y eficiente.
- Validación de todo lo que envía el móvil.
- Si el servidor se cae y se reinicia, recupera el estado (jugadores, puntos y reglas activas) guardado unos segundos antes.
- Registros claros en la consola: jugadores conectados, reglas cargadas o desactivadas y errores, para vigilar el servidor de un vistazo durante la demo.

Cómo trabajar, en ciclos:
1. Escribe primero el contrato de mensajes en un archivo compartido y documentado, para que el resto del equipo se adapte a él.
2. Implementa lo mínimo que funcione de principio a fin, arráncalo y pruébalo con bots que simulen 60 jugadores.
3. Corrige lo que falle y repite hasta que:
   - Con 60 bots, el juego va fluido y sin errores en un portátil normal.
   - Una regla nueva se activa sin desconectar a nadie.
   - Una regla con error o con un bucle infinito no tumba el juego.
   - Sin la clave no se puede abrir el visor ni usar sus controles.
   - Un bot que se reconecta, o un servidor que se reinicia, conserva los puntos.
4. Al terminar, resume en pocas líneas cómo se arranca, qué puertos usa y dónde está el contrato.
```
