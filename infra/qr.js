// Genera el QR de la URL pública: lo pinta en la terminal y escribe infra/qr.png
// (1024 px, para proyectar o imprimir) e infra/qr.svg.
// Uso: node infra/qr.js [url]   (sin URL usa infra/.tunnel-url)
import fs from 'node:fs';
import QRCode from 'qrcode';

const url = process.argv[2] || fs.readFileSync(new URL('./.tunnel-url', import.meta.url), 'utf8').trim();
const opciones = { margin: 2, errorCorrectionLevel: 'M' };

await QRCode.toFile(new URL('./qr.png', import.meta.url).pathname, url, { ...opciones, width: 1024 });
await QRCode.toFile(new URL('./qr.svg', import.meta.url).pathname, url, { ...opciones, type: 'svg' });
console.log(await QRCode.toString(url, { type: 'terminal', small: true }));
console.log(`  QR de ${url} → infra/qr.png, infra/qr.svg`);
