// 1. Base de datos incrustada (Evita errores CORS al abrir el archivo localmente)
const cpData = [
  { cp: '25900', ciudad: 'Ramos Arizpe', colonias: ['Centro', 'San Jerónimo', 'Cumbres', 'Contry'] },
  { cp: '25903', ciudad: 'Ramos Arizpe', colonias: ['Manantiales', 'El Mirador', 'Paseo de la Sierra'] },
  { cp: '25280', ciudad: 'Saltillo', colonias: ['Del Valle', 'San Miguel', 'República'] },
  { cp: '25000', ciudad: 'Saltillo', colonias: ['Zona Centro', 'Las Fuentes'] }
];

// 2. Referencias al DOM
const cpInput = document.getElementById('cpInput');
const ciudadInput = document.getElementById('ciudadInput');
const coloniaSelect = document.getElementById('coloniaSelect');
const coloniaInput = document.getElementById('coloniaInput');
const calleInput = document.getElementById('calleInput');
const numeroInput = document.getElementById('numeroInput');
const mapaContainer = document.getElementById('mapaContainer');
const mapaIframe = document.getElementById('mapaIframe');
const linkGoogleMaps = document.getElementById('linkGoogleMaps');

// 3. Lógica del Código Postal (Búsqueda inmediata)
cpInput.addEventListener('input', (e) => {
  // Solo permitir números
  const cp = e.target.value.replace(/\D/g, '').slice(0, 5);
  e.target.value = cp;

  if (cp.length === 5) {
    const match = cpData.find(item => item.cp === cp);

    if (match) {
      // Se encontró el CP
      ciudadInput.value = match.ciudad;
      ciudadInput.readOnly = true;
      
      // Llenar select de colonias y ocultar input de texto
      coloniaSelect.innerHTML = '<option value="">Seleccione...</option>' + 
        match.colonias.map(c => `<option value="${c}">${c}</option>`).join('');
      coloniaSelect.classList.remove('hidden');
      coloniaInput.classList.add('hidden');
    } else {
      // CP no encontrado, habilitar inputs manuales
      ciudadInput.readOnly = false;
      coloniaSelect.classList.add('hidden');
      coloniaInput.classList.remove('hidden');
    }
    actualizarMapa();
  }
});

// 4. Lógica de Actualización del Mapa
function actualizarMapa() {
  const calle = calleInput.value.trim();
  const numero = numeroInput.value.trim();
  const colonia = coloniaSelect.classList.contains('hidden') ? coloniaInput.value.trim() : coloniaSelect.value.trim();
  const ciudad = ciudadInput.value.trim();
  const cp = cpInput.value.trim();

  // Si hay datos suficientes, mostrar el mapa
  if (calle && ciudad && colonia) {
    const direccion = `${calle} ${numero}, ${colonia}, ${ciudad}, ${cp}, Mexico`.trim();
    // Reemplazar espacios múltiples y codificar para la URL
    const query = encodeURIComponent(direccion.replace(/\s+/g, ' '));
    
    mapaIframe.src = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    linkGoogleMaps.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    mapaContainer.classList.remove('hidden');
    
    // Guardamos la liga en el botón para Power Automate
    document.getElementById('btnEnviar').dataset.urlMapa = linkGoogleMaps.href;
  }
}

// Escuchar cambios en los campos de dirección para actualizar el mapa en tiempo real
['input', 'change'].forEach(evt => {
  calleInput.addEventListener(evt, actualizarMapa);
  numeroInput.addEventListener(evt, actualizarMapa);
  coloniaSelect.addEventListener(evt, actualizarMapa);
  coloniaInput.addEventListener(evt, actualizarMapa);
});