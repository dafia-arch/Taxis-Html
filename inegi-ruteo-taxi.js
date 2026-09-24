const INEGI_TOKEN = process.env.INEGI_TOKEN || '';
const BASE_URL = 'https://gaia.inegi.org.mx/sakbe_v3.1';
const LOCATIONIQ_URL = 'https://us1.locationiq.com/v1/search';
const LOCATIONIQ_TOKEN = process.env.LOCATIONIQ_TOKEN || '';

const TIPO_VEHICULO = {
  MOTOCICLETA: 0,
  AUTOMOVIL: 1
};

const TIPO_RUTA = {
  LIBRE: 'libre',
  CUOTA: 'cuota',
  OPTIMA: 'optima'
};

function validarConfiguracion() {
  if (!INEGI_TOKEN) {
    throw new Error('Falta configurar INEGI_TOKEN en el servidor.');
  }
}

async function geocodeDireccion(direccion) {
  if (typeof direccion !== 'string' || !direccion.trim() || direccion.length > 300) {
    throw new Error('La dirección es obligatoria y debe tener menos de 300 caracteres.');
  }
  if (!LOCATIONIQ_TOKEN) {
    throw new Error('Falta configurar LOCATIONIQ_TOKEN en el servidor.');
  }

  const parametros = new URLSearchParams({
    key: LOCATIONIQ_TOKEN,
    q: direccion.trim(),
    format: 'json',
    limit: '1',
    countrycodes: 'mx'
  });
  const respuesta = await fetch(`${LOCATIONIQ_URL}?${parametros.toString()}`);
  if (!respuesta.ok) {
    if (respuesta.status === 404) {
      throw new Error(`No se encontraron coordenadas para: "${direccion}"`);
    }
    throw new Error(`Error HTTP en LocationIQ: ${respuesta.status}`);
  }

  const resultados = await respuesta.json();
  if (!Array.isArray(resultados) || !resultados.length) {
    throw new Error(`No se encontraron coordenadas para: "${direccion}"`);
  }

  return {
    lat: Number(resultados[0].lat),
    lon: Number(resultados[0].lon),
    displayName: resultados[0].display_name
  };
}

function validarCoordenadas(punto, nombre) {
  if (!punto || !Number.isFinite(Number(punto.lat)) || !Number.isFinite(Number(punto.lon))) {
    throw new Error(`${nombre} debe incluir lat y lon numéricos.`);
  }
}

async function respuestaInegi(url, opciones, operacion) {
  validarConfiguracion();
  const respuesta = await fetch(url, opciones);
  if (!respuesta.ok) {
    throw new Error(`Error HTTP en ${operacion}: ${respuesta.status}`);
  }

  const json = await respuesta.json();
  const respuestaApi = json.response;
  if (!respuestaApi || (respuestaApi.succes !== true && respuestaApi.success !== true)) {
    throw new Error(`INEGI ${operacion} falló: ${respuestaApi?.message || 'respuesta sin datos'}`);
  }
  return json.data;
}

async function buscaLinea(lat, lon, escala = 5000) {
  const parametros = new URLSearchParams({
    type: 'json',
    escala: String(escala),
    x: String(lon),
    y: String(lat),
    key: INEGI_TOKEN
  });

  return respuestaInegi(`${BASE_URL}/buscalinea`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: parametros
  }, 'buscalinea');
}

async function calculaRuta(origen, destino, opciones = {}) {
  const tipoRuta = opciones.tipoRuta || TIPO_RUTA.OPTIMA;
  const vehiculo = opciones.vehiculo ?? TIPO_VEHICULO.AUTOMOVIL;
  if (!Object.values(TIPO_RUTA).includes(tipoRuta)) {
    throw new Error(`Tipo de ruta no válido: ${tipoRuta}`);
  }

  const parametros = new URLSearchParams({
    id_i: String(origen.id_routing_net),
    source_i: String(origen.source),
    target_i: String(origen.target),
    id_f: String(destino.id_routing_net),
    source_f: String(destino.source),
    target_f: String(destino.target),
    v: String(vehiculo),
    type: 'json',
    key: INEGI_TOKEN
  });

  return respuestaInegi(`${BASE_URL}/${tipoRuta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: parametros
  }, tipoRuta);
}

async function cotizarViaje(origen, destino, tarifaConfig = {}) {
  validarCoordenadas(origen, 'El origen');
  validarCoordenadas(destino, 'El destino');

  const {
    banderazo = 15,
    costoPorKm = 8,
    costoPorMinuto = 1.5
  } = tarifaConfig;

  const [lineaOrigen, lineaDestino] = await Promise.all([
    buscaLinea(Number(origen.lat), Number(origen.lon)),
    buscaLinea(Number(destino.lat), Number(destino.lon))
  ]);
  const ruta = await calculaRuta(lineaOrigen, lineaDestino);
  const distanciaKm = Number(ruta.long_km) || 0;
  const tiempoMin = Number(ruta.tiempo_min) || 0;
  const costoCaseta = Number(ruta.costo_caseta) || 0;
  const tarifaEstimada = Number(banderazo) + distanciaKm * Number(costoPorKm)
    + tiempoMin * Number(costoPorMinuto) + costoCaseta;

  return {
    distanciaKm,
    tiempoMin,
    pasaPorCaseta: ruta.peaje === 't',
    costoCaseta,
    tarifaEstimada: Math.round(tarifaEstimada * 100) / 100,
    geojsonRuta: ruta.geojson,
    advertencia: ruta.advertencia || null
  };
}

async function calcularDistanciaRuta(origen, destino) {
  validarCoordenadas(origen, 'El origen');
  validarCoordenadas(destino, 'El destino');

  const [lineaOrigen, lineaDestino] = await Promise.all([
    buscaLinea(Number(origen.lat), Number(origen.lon)),
    buscaLinea(Number(destino.lat), Number(destino.lon))
  ]);
  const ruta = await calculaRuta(lineaOrigen, lineaDestino);

  return {
    distanciaKm: Number(ruta.long_km) || 0,
    tiempoMin: Number(ruta.tiempo_min) || 0
  };
}

module.exports = {
  geocodeDireccion,
  buscaLinea,
  calculaRuta,
  cotizarViaje,
  calcularDistanciaRuta,
  TIPO_VEHICULO,
  TIPO_RUTA
};
