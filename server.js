const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
// URL real protegida en el servidor para evitar exposición en el navegador del empleado
const POWER_AUTOMATE_URL = process.env.POWER_AUTOMATE_URL || 'https://defaultc7901014556049efa6893c215c6092.ee.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/31/workflows/f2d4f180c12c4b2486349a51d7d4788d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=0P9T29VKyN3-neFRYyBpxZHl9d2U82n_ImX38AwAfTM';
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

    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=mx&q=${encodeURIComponent(address)}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Taxis-Html/1.0 (prueba de agrupacion de rutas)'
      }
    }).then(async geocodeResponse => {
      if (!geocodeResponse.ok) throw new Error(`Nominatim respondió ${geocodeResponse.status}`);
      const resultados = await geocodeResponse.json();
      const resultado = resultados[0];
      sendJson(response, 200, resultado ? { lat: Number(resultado.lat), lon: Number(resultado.lon), displayName: resultado.display_name } : { lat: null, lon: null });
    }).catch(error => {
      sendJson(response, 502, { error: 'No se pudo geocodificar la dirección.', detail: error.message });
    });
    return;
  }

  // Endpoint unificado para procesar la solicitud de taxi
  if (request.method === 'POST' && requestPath === '/api/taxi') {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) request.destroy(); // Límite de seguridad
    });
    request.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        
        // El servidor Node.js hace la petición a Power Automate de forma invisible
        const powerAutomateResponse = await fetch(POWER_AUTOMATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const responseText = await powerAutomateResponse.text();
        response.writeHead(powerAutomateResponse.status, {
          'Content-Type': powerAutomateResponse.headers.get('content-type') || 'application/json; charset=utf-8'
        });
        response.end(responseText);
      } catch (error) {
        sendJson(response, 502, { error: 'Error de red hacia Power Automate.', detail: error.message });
      }
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