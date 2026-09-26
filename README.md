# Plataforma de taxis BIC

Aplicación web para capturar solicitudes individuales o masivas, programar entradas y salidas, agrupar domicilios en rutas, asignar choferes y exportar la programación. El frontend está construido con HTML y JavaScript; `server.js` sirve los archivos y expone la API que integra LocationIQ.

## Requisitos

- Node.js 18 o posterior (usa `fetch` integrado).
- Token de LocationIQ para geocodificar direcciones y calcular distancias.
- Conexión a internet para cargar Tailwind CSS y SheetJS desde sus CDN.

No hay dependencias de npm ni un `package.json` en este repositorio.

## Ejecución local

Configura el token solo en el entorno del servidor:

```bash
export LOCATIONIQ_TOKEN="tu-token-de-LocationIQ"
```

En `index.html`, cambia temporalmente la asignación de `window.TAXI_API_BASE_URL` a una cadena vacía para que el frontend use el mismo servidor local:

```html
<script>window.TAXI_API_BASE_URL = '';</script>
```

Inicia la aplicación:

```bash
node server.js
```

Abre <http://localhost:4173/>. El puerto se puede cambiar con la variable `PORT`:

```bash
PORT=8080 node server.js
```

Sin `LOCATIONIQ_TOKEN`, la interfaz puede abrirse, pero las operaciones de geocodificación y distancia que necesitan LocationIQ no estarán disponibles.

## Uso de la aplicación

### Captura de solicitudes

- **Individual:** captura empleado, localidad (planta 3A o 3B), tipo de viaje, fecha y horario, teléfono y domicilio.
- **Masivo:** agrega filas o pega una tabla desde el portapapeles. Permite descargar la captura masiva en CSV.
- El catálogo `cp_mexico.json` ayuda a completar ciudad y colonias a partir del código postal.
- No se aceptan fechas ni horarios pasados. Los viajes Redondos requieren entrada y salida en orden cronológico, con una duración máxima de 12 horas. Los mensajes de validación se muestran al enviar.

### Acceso administrativo

El botón **Administrador** abre el acceso al panel. Las credenciales incluidas son únicamente de demostración:

- Usuario: `admin`
- Contraseña: `admin123`

El panel incluye la vista de programación, altas de usuarios programadores, alta de choferes/vehículos y asignación de chofer por ruta. Cada asignación muestra el teléfono del chofer. La programación se descarga como `programacion-taxis.xlsx` mediante SheetJS.

La bandeja de programación muestra por defecto solo solicitudes vigentes y sin chofer asignado. Usa **Consultar fecha** para ver las solicitudes programadas para un día específico, incluidas las vencidas y las que ya tienen chofer. Las solicitudes vencidas se muestran como historial y no se geocodifican ni se recalculan con LocationIQ. **Pendientes vigentes** quita el filtro de fecha y regresa a la bandeja predeterminada.

El alta de chofer contempla teléfono, número y tipo de licencia, vencimiento de licencia, placas, marca, modelo, año, color, póliza, vencimiento del seguro y estado.

### Agrupación y rutas

- Entrada: el recorrido va desde los domicilios hasta la planta.
- Salida: el recorrido va desde la planta hasta los domicilios.
- Redondo: genera un tramo de entrada y otro de salida usando sus respectivas fechas y horas.
- Solicitudes Individuales, Masivas y Redondas pueden compartir grupo cuando coinciden en sentido, fecha, planta y están dentro de 30 minutos. No se mezclan sentidos opuestos.
- Cada ruta admite hasta 4 domicilios. Para agregar un domicilio se aplica el límite de 10 km respecto de las paradas existentes y la planta cuando hay coordenadas disponibles.
- A menos de 4 horas de la entrada programada, una solicitud deja de agregarse a un grupo existente y forma uno nuevo.
- Los reportes incluyen una liga de Google Maps con las paradas en el orden de la ruta. La vista administrativa permite recalcular rutas con LocationIQ.

## Almacenamiento y seguridad

Las solicitudes, usuarios, choferes y asignaciones se guardan en `localStorage` del navegador. Esto significa que los datos no se comparten entre navegadores o dispositivos y no existe una base de datos ni un servicio de autenticación.

Las credenciales de usuarios programadores también se guardan en el navegador y la contraseña de demostración del administrador está en el código cliente. Este mecanismo sirve solo para pruebas: no protege información personal ni debe usarse en producción con credenciales reales. Para un despliegue real se necesita autenticación en backend y almacenamiento persistente protegido.

El token de LocationIQ debe permanecer en `LOCATIONIQ_TOKEN` del servidor. No lo incluyas en `app,js`, `index.html` ni otros archivos públicos. Si un token ya fue expuesto, revócalo y crea uno nuevo.

## API HTTP

El servidor escucha en `PORT` o, si no se define, en `4173`. Los endpoints de API requieren el token de LocationIQ.

### Geocodificar una dirección

```http
GET /api/geocode?address=Ramos%20Arizpe%2C%20Coahuila
```

Devuelve las coordenadas y el nombre de ubicación de LocationIQ.

### Calcular distancia y tiempo

```http
POST /api/viaje/distancia
Content-Type: application/json
```

```json
{
  "origen": { "lat": 25.5234, "lon": -100.9376 },
  "destino": { "lat": 25.5896, "lon": -100.8970 }
}
```

La respuesta incluye `distanciaKm` y `tiempoMin`.

### Cotizar un viaje

```http
POST /api/viaje/cotizar
Content-Type: application/json
```

```json
{
  "origen": { "lat": 25.5234, "lon": -100.9376 },
  "destino": { "lat": 25.5896, "lon": -100.8970 },
  "tarifaConfig": {
    "banderazo": 15,
    "costoPorKm": 8,
    "costoPorMinuto": 1.5
  }
}
```

Las tarifas predeterminadas son 15 de banderazo, 8 por kilómetro y 1.5 por minuto. La respuesta incluye distancia, tiempo, tarifa estimada y geometría GeoJSON de la ruta; actualmente las casetas se reportan como cero.

## Publicación

El frontend puede servirse como contenido estático, pero la API necesita un servidor Node.js. En `index.html`, configura `window.TAXI_API_BASE_URL` con la URL pública del backend. Despliega `server.js` y `locationiq-ruteo-taxi.js` en ese backend y configura `LOCATIONIQ_TOKEN` como variable de entorno. GitHub Pages por sí solo no puede ejecutar la API.

## Comprobaciones

Este repositorio no incluye un runner de pruebas. Para verificar sintaxis:

```bash
node --check app,js
node --check server.js
```