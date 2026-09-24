const LOCATIONIQ_URL = 'https://us1.locationiq.com/v1/search';
const LOCATIONIQ_DIRECTIONS_URL = 'https://us1.locationiq.com/v1/directions/driving';
const LOCATIONIQ_TOKEN = process.env.LOCATIONIQ_TOKEN || '';

function validarToken() {
  if (!LOCATIONIQ_TOKEN) {
    throw new Error('Falta configurar LOCATIONIQ_TOKEN en el servidor.');
  }
}

function validarCoordenadas(punto, nombre) {
  if (!punto || !Number.isFinite(Number(punto.lat)) || !Number.isFinite(Number(punto.lon))) {
    throw new Error(`${nombre} debe incluir lat y lon numéricos.`);
  }
}

async function geocodeDireccion(direccion) {
  if (typeof direccion !== 'string' || !direccion.trim() || direccion.length > 300) {
    throw new Error('La dirección es obligatoria y debe tener menos de 300 caracteres.');
  }
  validarToken();

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

async function calcularRuta(origen, destino) {
  validarCoordenadas(origen, 'El origen');
  validarCoordenadas(destino, 'El destino');
  validarToken();

  const puntos = `${Number(origen.lon)},${Number(origen.lat)};${Number(destino.lon)},${Number(destino.lat)}`;
  const parametros = new URLSearchParams({
    key: LOCATIONIQ_TOKEN,
    overview: 'full',
    geometries: 'geojson'
  });
  const respuesta = await fetch(`${LOCATIONIQ_DIRECTIONS_URL}/${puntos}?${parametros.toString()}`);
  if (!respuesta.ok) {
    throw new Error(`Error HTTP en rutas de LocationIQ: ${respuesta.status}`);
  }

  const json = await respuesta.json();
  const ruta = json.routes?.[0];
  if (!ruta) {
    throw new Error('LocationIQ no encontró una ruta entre los puntos indicados.');
  }

  return {
    distanciaKm: Number(ruta.distance) / 1000,
    tiempoMin: Number(ruta.duration) / 60,
    costoCaseta: 0,
    pasaPorCaseta: false,
    geojsonRuta: ruta.geometry,
    advertencia: null
  };
}

async function cotizarViaje(origen, destino, tarifaConfig = {}) {
  const {
    banderazo = 15,
    costoPorKm = 8,
    costoPorMinuto = 1.5
  } = tarifaConfig;
  const ruta = await calcularRuta(origen, destino);
  const tarifaEstimada = Number(banderazo)
    + ruta.distanciaKm * Number(costoPorKm)
    + ruta.tiempoMin * Number(costoPorMinuto);

  return {
    ...ruta,
    tarifaEstimada: Math.round(tarifaEstimada * 100) / 100
  };
}

async function calcularDistanciaRuta(origen, destino) {
  const ruta = await calcularRuta(origen, destino);
  return {
    distanciaKm: ruta.distanciaKm,
    tiempoMin: ruta.tiempoMin
  };
}

module.exports = {
  geocodeDireccion,
  calcularRuta,
  cotizarViaje,
  calcularDistanciaRuta
};