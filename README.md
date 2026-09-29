# Plataforma de taxis BIC

Aplicación web para capturar solicitudes individuales o masivas, programar entradas y salidas, agrupar domicilios en rutas, asignar choferes, registrar evidencias de abordaje y exportar la programación. El frontend está construido con HTML y JavaScript; `server.js` sirve los archivos y expone la API que integra LocationIQ.

## Requisitos

- Node.js 18 o posterior.
- Token de LocationIQ para geocodificar direcciones y calcular distancias.
- Conexión a internet para cargar Tailwind CSS y librerías desde CDN (Firebase, SheetJS).
- El proyecto ya cuenta con `package.json` para facilitar la gestión de scripts.

## Ejecución local

Configura el token solo en el entorno del servidor:

```bash
export LOCATIONIQ_TOKEN="tu-token-de-LocationIQ"
```

El frontend está configurado de forma inteligente para detectar si corre en `localhost` y adaptar la URL de la API de forma automática.

Inicia la aplicación:

```bash
npm start
```

Abre <http://localhost:4173/>. El puerto se puede cambiar con la variable `PORT`:

```bash
PORT=8080 npm start
```

Sin `LOCATIONIQ_TOKEN`, la interfaz puede abrirse, pero las operaciones de geocodificación y distancia que necesitan LocationIQ no estarán disponibles.

## Uso de la aplicación

### Captura de solicitudes

- **Individual:** captura empleado, localidad (planta 3A o 3B), tipo de viaje, fecha y horario, teléfono y domicilio.
- **Masivo:** agrega filas o pega una tabla desde el portapapeles. Permite descargar la captura masiva en CSV.
- **Localidades:** el administrador puede agregar, activar o desactivar puntos de llegada/recolección. Las localidades se sincronizan en Firebase mediante `settings/localidades`.
- **Domicilio temporal:** selecciona este tipo para capturar un traslado punto a punto sin necesidad de datos de empleado.
- El catálogo `cp_mexico.json` ayuda a autocompletar ciudad y colonias.
- Validación de fecha/hora para prevenir registros en el pasado y límites de turno de 12 horas.

### Acceso administrativo

El botón **Administrador** abre el acceso al panel en una vista dedicada, ocultando el formulario público. Las credenciales de demostración son:
- Usuario: `admin@empresa.com` (o el configurado en Firebase)
- Contraseña: (Definida en Firebase)

El panel administrativo incluye múltiples pantallas:
- **Pantalla 3 · Programación:** Asignación de chofer por ruta, historial de viajes, cálculo de rutas con LocationIQ y exportación a Excel.
- **Pantalla 4 · Confirmación:** Selección de rutas asignadas para realizar un checklist de pasajeros. Permite marcar si el pasajero "Sí abordó" o "No salió", requiriendo notas y fotografía de evidencia en caso de ausencia. Las fotos se almacenan en Firebase Storage.
- **Pantalla 5 · Alta de usuarios:** Para dar de alta programadores (requiere permisos admin).
- **Pantalla 6 · Alta de choferes:** Registro detallado de choferes y sus vehículos.

### Agrupación y rutas

- Rutas de Entrada, Salida y Redondo se agrupan automáticamente cuando coinciden en sentido, fecha, planta y un margen de 30 minutos.
- Límite de 4 domicilios por ruta y 10 km de distancia máxima entre paradas.
- Los reportes incluyen enlaces a Google Maps optimizados.

## Firebase

La app usa Cloud Firestore para base de datos y Firebase Storage para archivos (evidencias).
El SDK web se carga desde CDN.

- **Authentication:** Deben habilitarse métodos Anónimo y Correo/Contraseña.
- **Firestore:** Administra solicitudes, choferes, programadores y configuraciones. (Requiere actualizar `firestore.rules`).
- **Storage:** Almacena fotos subidas desde la Pantalla 4 (debe ser habilitado con reglas de escritura).
- Migración automática local a la nube en el primer inicio de sesión admin.

## API HTTP
El servidor expone:
- `GET /api/geocode`: Geocodificar dirección con LocationIQ.
- `POST /api/viaje/distancia`: Calcula distancia/tiempo.
- `POST /api/viaje/cotizar`: Cotiza viaje en base a distancia y tiempo.

## Comprobaciones
El código fue verificado. El archivo principal es `app.js`.