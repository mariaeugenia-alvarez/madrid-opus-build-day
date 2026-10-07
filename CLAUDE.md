# La sala es el código

Juego multijugador web en el que juega toda la sala desde el móvil. Lo usamos en una demo en directo: el público vota reglas nuevas y Claude Code las programa durante el evento. El diseño completo está en `La sala es el código — Demo Claude Community.md`.

**Este proyecto se usa en directo, delante de 100–150 personas conectadas.** Un servidor caído es peor que una regla mal hecha. Ante la duda, prioriza la estabilidad.

## Stack

- Node.js 20 o superior, ES modules (`"type": "module"`).
- `express`: sirve `/` (jugador) y `/visor` (retransmisión).
- `socket.io`: tiempo real. El cliente se sirve desde `/socket.io/socket.io.js`.
- `qrcode`: genera el QR del visor.
- `nanoid`: IDs cortos de jugador.
- `nodemon` (solo en dev). Debe ignorar `game/rules/` y `game/levels/`, que se recargan en caliente.
- Frontend: Canvas 2D y JavaScript nativo. Sin bundler, sin framework, sin dependencias que haya que compilar.

No añadas dependencias nuevas sin pedir permiso.

## Comandos

```bash
npm install
npm run dev                                    # servidor en http://localhost:3000
VISOR_KEY=secreto npm start                    # producción; la clave del visor sale de la variable de entorno
cloudflared tunnel --url http://localhost:3000 # URL pública para el QR
```

## Estructura

```text
server.js          # Express + Socket.IO, bucle a 20 ticks/s, máquina de estados, carga de reglas
game/state.js      # jugadores, equipos, orbes, puntuaciones
game/stats.js      # cálculo de estadísticas
game/rules/        # una regla por archivo; base.js es el juego base
game/levels/       # nivel final (final.js)
public/            # index.html + player.js (móvil), visor.html + visor.js (pantalla), styles.css
```

## Invariantes de la arquitectura

1. **El servidor es autoritativo.** Los clientes solo envían entradas (`input`, `propuesta`, `voto`, `control`) y pintan lo que reciben. Toda la lógica de juego vive en el servidor.
2. **Nunca cortar las conexiones activas.** Las reglas se recargan con `fs.watch` + `import('./rules/x.js?v=' + Date.now())`. Ningún cambio en `game/rules/` o `game/levels/` puede exigir reiniciar el proceso ni recargar los móviles.
3. **Una regla rota no tumba el juego.** El servidor envuelve cada hook de regla en `try/catch`. Si una regla lanza un error, se desactiva, se registra en el log y se avisa en el visor. El bucle sigue.
4. **El estado viaja ya calculado.** `state` (20/s) y `stats` (1/s, solo al visor) se envían ya listos. El móvil recibe solo sus propios datos en `me`.
5. **Moderación obligatoria.** Ninguna propuesta del público se muestra en pantalla ni se vota hasta que el visor la aprueba.
6. **La clave del visor** viene de `VISOR_KEY`. Nunca debe estar en el código ni en el repositorio.

## Interfaz de una regla

Cada archivo de `game/rules/` exporta por defecto un objeto con esta forma:

```js
export default {
  id: 'gravedad-invertida',      // kebab-case, igual que el nombre del archivo
  nombre: 'Gravedad invertida',  // se muestra en el visor y en las notas del parche
  version: '0.2',                // versión del parche que la introdujo
  onTick(state, dt) {},          // cada tick; dt en segundos
  onCollision(a, b, state) {},   // embestida de a sobre b
  onOrb(player, orb, state) {},  // player recoge orb
  render: { fondo: '#120024' }   // pistas visuales para los clientes (opcional)
};
```

Todos los hooks son opcionales. Las reglas activas se aplican en orden de versión. `base.js` va siempre primera y define el juego base: orbes +1, embestida roba 3, 2 s de recarga.

Para anunciar algo, una regla usa `state.anunciar(texto)` (pantalla completa) y `state.ticker(texto)` (ticker del visor). No emite por Socket.IO directamente.

## Cómo hacer un parche en directo

Cuando el público vote una regla:

1. **Crea un archivo nuevo** en `game/rules/<id>.js`. No modifiques `server.js`, `state.js`, `public/` ni otras reglas salvo que sea imprescindible. Si lo es, explica por qué antes de hacerlo.
2. **Máximo 80 líneas.** Si la idea no cabe, implementa la versión más divertida que sí quepa.
3. **Jugable en 90 s y visible en el visor.** El efecto tiene que notarse en la ronda siguiente. Si no se ve, anúncialo con `state.anunciar`.
4. **Versión:** la mayor versión que haya en `game/rules/`, más 0.1.
5. **Comprueba** que el módulo se importa sin errores: `node -e "import('./game/rules/<id>.js')"`.
6. **Commit** con el mensaje `parche v0.X: <nombre de la regla>`.
7. **Resume en dos frases** qué has hecho. Lo va a leer en voz alta el presentador.

Interpreta las peticiones ambiguas del público con generosidad. Elige la versión más espectacular y segura, y no preguntes: la sala está esperando.

## Si algo se rompe

Revierte al último commit estable (`git revert` o `git checkout <commit> -- game/rules/`), confirma que el servidor sigue vivo y que los jugadores siguen conectados. Nunca uses `git reset --hard` ni `push --force` durante el evento.

## Convenciones

- Código, comentarios y textos de interfaz en español.
- Un commit por cambio, con un mensaje descriptivo.
- Nada de `console.log` dentro de `onTick`, que se ejecuta 20 veces por segundo.
