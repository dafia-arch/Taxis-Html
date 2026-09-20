// Base de datos de códigos postales
const cpData = [
  { cp: '25900', ciudad: 'Saltillo', colonias: ['Centro', 'San Jerónimo', 'Cumbres', 'Contry', 'La Rosita', 'Del Valle', 'Paseo de la Sierra', 'San Miguel', 'Colonia del Valle', 'Las Fuentes', 'Villa Verde', 'El Mirador'] },
  { cp: '25903', ciudad: 'Saltillo', colonias: ['Centro', 'Contry', 'La Rosita', 'San Miguel', 'Cumbres', 'Villa Verde', 'Las Fuentes', 'El Mirador', 'Paseo de la Sierra'] },
  { cp: '25280', ciudad: 'Saltillo', colonias: ['Del Valle', 'Paseo de la Sierra', 'Contry', 'Centro', 'San Miguel', 'Colonia del Valle'] },
  { cp: '64100', ciudad: 'Monterrey', colonias: ['Centro', 'Contry', 'San Jerónimo', 'Cumbres', 'Colonia del Valle'] }
]; //[cite: 1]

// Referencias al DOM
const servicioSelect = document.getElementById('servicioSelect');
const seccionIndividual = document.getElementById('seccionIndividual');
const seccionMasivo = document.getElementById('seccionMasivo');
const cpInput = document.getElementById('cpInput');
const ciudadInput = document.getElementById('ciudadInput');
const coloniaSelect = document.getElementById('coloniaSelect');
const coloniaInput = document.getElementById('coloniaInput');
const calleInput = document.getElementById('calleInput');
const numeroInput = document.getElementById('numeroInput');
const mapaContainer = document.getElementById('mapaContainer');
const mapaIframe = document.getElementById('mapaIframe');
const excelUpload = document.getElementById('excelUpload');

// Lógica de visualización por servicio
servicioSelect.addEventListener('change', (e) => {
  const v = e.target.value;
  seccionIndividual.className = v === 'Individual' ? 'block rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6' : 'hidden';
  seccionMasivo.className = v === 'Masivo' ? 'block rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6' : 'hidden';
});

// Lógica de llenado de Código Postal[cite: 1]
cpInput.addEventListener('input', (e) => {
  const cp = e.target.value.replace(/\D/g, '').slice(0, 5);
  e.target.value = cp;
  const match = cpData.find(item => item.cp === cp);

  if (match) {
    ciudadInput.value = match.ciudad;
    ciudadInput.readOnly = true;
    
    coloniaSelect.innerHTML = '<option value="">Seleccione...</option>' + 
      match.colonias.map(c => `<option value="${c}">${c}</option>`).join('');
    coloniaSelect.classList.remove('hidden');
    coloniaInput.classList.add('hidden');
    coloniaInput.removeAttribute('required');
  } else {
    ciudadInput.value = '';
    ciudadInput.readOnly = false;
    coloniaSelect.classList.add('hidden');
    coloniaInput.classList.remove('hidden');
    coloniaInput.setAttribute('required', 'true');
  }
  actualizarMapa();
});

// Actualizar URL de Google Maps[cite: 1]
function actualizarMapa() {
  const calle = calleInput.value;
  const numero = numeroInput.value;
  const colonia = coloniaSelect.classList.contains('hidden') ? coloniaInput.value : coloniaSelect.value;
  const ciudad = ciudadInput.value;
  const cp = cpInput.value;

  if (calle && ciudad && colonia) {
    const direccion = `${calle} ${numero}, ${colonia}, ${ciudad}, ${cp}, Mexico`.trim();
    const query = encodeURIComponent(direccion);
    mapaIframe.src = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    mapaContainer.classList.remove('hidden');
  }
}

['input', 'change'].forEach(evt => {
  calleInput.addEventListener(evt, actualizarMapa);
  numeroInput.addEventListener(evt, actualizarMapa);
  coloniaSelect.addEventListener(evt, actualizarMapa);
  coloniaInput.addEventListener(evt, actualizarMapa);
});

// Lógica para leer el Excel Masivo usando SheetJS[cite: 1]
excelUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    
    if (rows.length > 0) {
      document.getElementById('tablaMasivaContainer').classList.remove('hidden');
      const keys = Object.keys(rows[0]);
      document.getElementById('tablaMasivaHead').innerHTML = keys.map(k => `<th class="px-2 py-2">${k}</th>`).join('');
      document.getElementById('tablaMasivaBody').innerHTML = rows.map(row => 
        `<tr>${keys.map(k => `<td class="border px-2 py-1">${row[k]}</td>`).join('')}</tr>`
      ).join('');
    }
  };
  reader.readAsArrayBuffer(file);
});