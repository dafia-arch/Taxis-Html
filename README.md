# Taxis-Html

## Cotización de rutas con INEGI

El servidor expone `POST /api/viaje/cotizar` y `POST /api/viaje/distancia`, y conserva el token de INEGI fuera del navegador.
Configura ambos tokens como variables de entorno antes de iniciar la aplicación:

```bash
export INEGI_TOKEN="tu-token-de-INEGI"
export LOCATIONIQ_TOKEN="tu-token-de-LocationIQ"
node server.js
```

Ejemplo de petición:

```bash
curl -X POST http://localhost:4173/api/viaje/cotizar \
	-H 'Content-Type: application/json' \
	-d '{
		"origen": { "lat": 19.4326, "lon": -99.1332 },
		"destino": { "lat": 19.3910, "lon": -99.2837 },
		"tarifaConfig": { "banderazo": 15, "costoPorKm": 8, "costoPorMinuto": 1.5 }
	}'
```

La respuesta incluye distancia, tiempo, casetas, tarifa estimada y el GeoJSON de la ruta.
El endpoint `/api/viaje/distancia` recibe el mismo formato de coordenadas y devuelve la distancia y el tiempo calculados por INEGI. El endpoint `/api/geocode` usa LocationIQ para obtener latitud y longitud; la agrupación de pasajeros usa la distancia vial de INEGI.
No guardes el token en `app,js`, `index.html` ni en otro archivo servido al navegador. El token compartido en la conversación debe revocarse y sustituirse por uno nuevo.