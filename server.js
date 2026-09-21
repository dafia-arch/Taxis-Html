const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const root = __dirname;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png'
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function serveStatic(request, response) {
  const requestedPath = decodeURIComponent(request.url.split('?')[0]);
  const relativePath = requestedPath === '/' ? '/index.html' : requestedPath;
  const filePath = path.resolve(root, `.${relativePath}`);

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end('Archivo no encontrado');
    return;
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const requestPath = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;

  if (request.method === 'GET' && requestPath === '/api/geocode') {
    const address = new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('address');
    if (!address || address.length > 300) {
      sendJson(response, 400, { error: 'La dirección es obligatoria y debe tener menos de 300 caracteres.' });
      return;
    }
    if (!GOOGLE_MAPS_API_KEY) {
      sendJson(response, 503, { error: 'Falta configurar GOOGLE_MAPS_API_KEY en el servidor.' });
      return;
    }

    fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:MX&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`)
      .then(async geocodeResponse => {
        if (!geocodeResponse.ok) throw new Error(`Google Maps respondió ${geocodeResponse.status}`);
        const resultado = await geocodeResponse.json();
        if (resultado.status !== 'OK') {
          sendJson(response, 200, { lat: null, lon: null, status: resultado.status });
          return;
        }
        const ubicacion = resultado.results[0]?.geometry?.location;
        sendJson(response, 200, ubicacion
          ? { lat: Number(ubicacion.lat), lon: Number(ubicacion.lng), displayName: resultado.results[0].formatted_address }
          : { lat: null, lon: null });
    }).catch(error => {
      sendJson(response, 502, { error: 'No se pudo geocodificar la dirección con Google Maps.', detail: error.message });
    });
    return;
  }

  if (request.method === 'GET') {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end('Método no permitido');
});

server.listen(PORT, () => {
  console.log(`Plataforma operativa activa en http://localhost:${PORT}`);
});