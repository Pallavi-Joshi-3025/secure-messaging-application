// Tiny local static server for classroom browser verification; NOT production hosting.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.map':'application/json' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const filepath = resolve(root, '.' + pathname);
    if (!(filepath === root || filepath.startsWith(root + sep))) throw new Error('Invalid path');
    const type = types[extname(filepath)];
    if (!type) throw new Error('Unsupported extension');
    const file = await readFile(filepath);
    response.writeHead(200, { 'Content-Type':type, 'Cache-Control':'no-store' }); response.end(file);
  } catch {
    response.writeHead(404, { 'Content-Type':'text/plain' }); response.end('Not found');
  }
}).listen(4173, '127.0.0.1', () => console.log('Browser demo: http://localhost:4173/demo/browser.html'));
