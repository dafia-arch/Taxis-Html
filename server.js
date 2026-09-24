const http = require('http');
const fs = require('fs');
const path = require('path');
const { geocodeDireccion, cotizarViaje, calcularDistanciaRuta } = require('./locationiq-ruteo-taxi');

const PORT = process.env.PORT || 4173;
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

function leerJson(request) {
  return new Promise((resolve, reject) => {
    let contenido = '';
    request.on('data', fragmento => {
      contenido += fragmento;
      if (contenido.length > 100000) {
        reject(new Error('El cuerpo de la solicitud es demasiado grande.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(contenido || '{}'));
      } catch {
        reject(new Error('El cuerpo debe ser JSON válido.'));
      }
    });
    request.on('error', reject);
  });
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
    geocodeDireccion(address)
      .then(resultado => sendJson(response, 200, resultado))
      .catch(error => {
        const faltaToken = error.message.includes('LOCATIONIQ_TOKEN');
        const esSolicitudInvalida = error.message.includes('La dirección es obligatoria');
        const statusCode = faltaToken ? 503 : esSolicitudInvalida ? 400 : 502;
        sendJson(response, statusCode, { error: error.message });
      });
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/viaje/cotizar') {
    leerJson(request)
      .then(async body => {
        if (!body.origen || !body.destino) {
          sendJson(response, 400, { error: 'Debes enviar origen y destino.' });
          return;
        }

        const cotizacion = await cotizarViaje(body.origen, body.destino, body.tarifaConfig);
        sendJson(response, 200, cotizacion);
      })
      .catch(error => {
        const faltaToken = error.message.includes('LOCATIONIQ_TOKEN');
        const esSolicitudInvalida = error.message.includes('debe incluir')
          || error.message.includes('Tipo de ruta no válido')
          || error.message.includes('JSON válido')
          || error.message.includes('demasiado grande');
        const statusCode = faltaToken ? 503 : esSolicitudInvalida ? 400 : 502;
        sendJson(response, statusCode, { error: error.message });
      });
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/viaje/distancia') {
    leerJson(request)
      .then(async body => {
        if (!body.origen || !body.destino) {
          sendJson(response, 400, { error: 'Debes enviar origen y destino.' });
          return;
        }

        const distancia = await calcularDistanciaRuta(body.origen, body.destino);
        sendJson(response, 200, distancia);
      })
      .catch(error => {
        const faltaToken = error.message.includes('LOCATIONIQ_TOKEN');
        const esSolicitudInvalida = error.message.includes('debe incluir')
          || error.message.includes('JSON válido')
          || error.message.includes('demasiado grande');
        const statusCode = faltaToken ? 503 : esSolicitudInvalida ? 400 : 502;
        sendJson(response, statusCode, { error: error.message });
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