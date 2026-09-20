let cpDatabase = [];

// 1. Cargar Base de Datos JSON
fetch('cp_mexico.json')
  .then(res => res.json())
  .then(data => { cpDatabase = data; })
  .catch(err => console.error("Error cargando CPs:", err));

// 2. Lógica de Navegación (Individual vs Masivo)
const tipoServicio = document.getElementById('tipoServicio');
const seccionIndividual = document.getElementById('seccionIndividual');
const seccionMasivo = document.getElementById('seccionMasivo');

tipoServicio.addEventListener('change', (e) => {
  if (e.target.value === 'Individual') {
    seccionIndividual.classList.replace('hidden', 'block');
    seccionMasivo.classList.replace('block', 'hidden');
  } else {
    seccionIndividual.classList.replace('block', 'hidden');
    seccionMasivo.classList.replace('hidden', 'block');
  }
});

// 3. Lógica Individual: Búsqueda de CP y Mapa
const ind_cp = document.getElementById('ind_cp');
const ind_ciudad = document.getElementById('ind_ciudad');
const ind_colonia = document.getElementById('ind_colonia');
const ind_calle = document.getElementById('ind_calle');
const ind_numero = document.getElementById('ind_numero');

ind_cp.addEventListener('input', (e) => {
  const cpVal = e.target.value;
  if (cpVal.length === 5) {
    const match = cpDatabase.find(item => item.cp === cpVal);
    if (match) {
      ind_ciudad.value = match.ciudad;
      ind_colonia.innerHTML = match.colonias.map(c => `<option value="${c}">${c}</option>`).join('');
      actualizarMapaIndividual();
    }
  }
});

function construirLigaMapa(direccion) {
  const query = encodeURIComponent(direccion.trim());
  return {
    iframe: `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`,
    link: `https://www.google.com/maps/search/?api=1&query=${query}`
  };
}

function actualizarMapaIndividual() {
  const calle = ind_calle.value;
  const num = ind_numero.value;
  const col = ind_colonia.value;
  const cd = ind_ciudad.value;
  const cp = ind_cp.value;

  if (calle && cd && col) {
    const dir = `${calle} ${num}, ${col}, ${cd}, ${cp}, México`;
    const urls = construirLigaMapa(dir);
    
    document.getElementById('iframeIndividual').src = urls.iframe;
    document.getElementById('linkMapaIndividual').href = urls.link;
    document.getElementById('mapaIndividualContainer').classList.remove('hidden');
    
    // Guardamos la URL para enviarla a Power Automate
    document.getElementById('btnEnviar').dataset.urlMapa = urls.link;
  }
}

[ind_colonia, ind_calle, ind_numero].forEach(el => el.addEventListener('input', actualizarMapaIndividual));

// 4. Lógica Masivo: Tabla Excel-like y Mapa
const tbodyMasivo = document.getElementById('tbodyMasivo');
let filaSeleccionadaActual = null;

// Crear 5 filas iniciales vacías
for (let i = 0; i < 5; i++) {
  const tr = document.createElement('tr');
  for (let j = 0; j < 7; j++) {
    const td = document.createElement('td');
    td.contentEditable = "true";
    td.className = "border p-2 focus:bg-white";
    tr.appendChild(td);
  }
  tbodyMasivo.appendChild(tr);
}

// Manejar Pegado desde Excel
tbodyMasivo.addEventListener('paste', (e) => {
  e.preventDefault();
  const pasteData = (e.clipboardData || window.clipboardData).getData('text');
  const rows = pasteData.split('\n');
  const tdInicial = e.target.closest('td');
  if (!tdInicial) return;
  
  const trInicial = tdInicial.parentElement;
  const startRowIdx = Array.from(tbodyMasivo.children).indexOf(trInicial);
  const startColIdx = Array.from(trInicial.children).indexOf(tdInicial);

  rows.forEach((rowData, rowIndex) => {
    if (!rowData.trim()) return;
    const cols = rowData.split('\t'); // Excel usa tabulaciones al copiar
    
    let targetRow = tbodyMasivo.children[startRowIdx + rowIndex];
    if (!targetRow) { // Si faltan filas, las creamos
      targetRow = trInicial.cloneNode(true);
      tbodyMasivo.appendChild(targetRow);
    }

    cols.forEach((cellData, colIndex) => {
      const targetCell = targetRow.children[startColIdx + colIndex];
      if (targetCell) targetCell.textContent = cellData.trim();
    });
  });
});

// Seleccionar fila y mostrar mapa abajo
tbodyMasivo.addEventListener('click', (e) => {
  const td = e.target.closest('td');
  if (!td) return;
  const tr = td.parentElement;

  if (filaSeleccionadaActual) filaSeleccionadaActual.classList.remove('fila-seleccionada');
  tr.classList.add('fila-seleccionada');
  filaSeleccionadaActual = tr;

  // Asumiendo el orden: Emp[0], Nombre[1], CP[2], Ciudad[3], Col[4], Calle[5], Num[6]
  const celdas = tr.children;
  const cp = celdas[2].textContent;
  const cd = celdas[3].textContent;
  const col = celdas[4].textContent;
  const calle = celdas[5].textContent;
  const num = celdas[6].textContent;

  if (calle && cd) {
    const dir = `${calle} ${num}, ${col}, ${cd}, ${cp}, México`;
    const urls = construirLigaMapa(dir);
    
    document.getElementById('iframeMasivo').src = urls.iframe;
    document.getElementById('linkMapaMasivo').href = urls.link;
    document.getElementById('mapaMasivoContainer').classList.remove('hidden');
  }
});

// 5. Enviar a Power Automate
document.getElementById('btnEnviar').addEventListener('click', async () => {
  const esIndividual = tipoServicio.value === 'Individual';
  const urlPowerAutomate = "TU_URL_DE_POWER_AUTOMATE_AQUI"; // Reemplazar con el Webhook HTTP

  let payload = {};

  if (esIndividual) {
    payload = {
      tipo: "Individual",
      empleado: document.getElementById('ind_emp').value,
      direccion: `${ind_calle.value} ${ind_numero.value}, ${ind_colonia.value}, ${ind_ciudad.value}, ${ind_cp.value}`,
      urlGoogleMaps: document.getElementById('btnEnviar').dataset.urlMapa || ""
    };
  } else {
    // Recopilar datos de la tabla masiva
    const filas = Array.from(tbodyMasivo.querySelectorAll('tr')).filter(tr => tr.children[0].textContent.trim() !== "");
    const datosMasivos = filas.map(tr => {
      const c = tr.children;
      const dir = `${c[5].textContent} ${c[6].textContent}, ${c[4].textContent}, ${c[3].textContent}, ${c[2].textContent}`;
      return {
        empleado: c[0].textContent,
        nombre: c[1].textContent,
        direccion: dir,
        urlGoogleMaps: construirLigaMapa(dir).link
      };
    });
    
    payload = { tipo: "Masivo", solicitudes: datosMasivos };
  }

  // Ejemplo de petición fetch
  console.log("Enviando a Automate:", payload);
  alert("Revisa la consola para ver el JSON estructurado con las ligas del mapa.");
  
  /* Descomentar en producción:
  try {
    const response = await fetch(urlPowerAutomate, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if(response.ok) alert("Solicitud enviada exitosamente.");
  } catch(err) {
    console.error("Error enviando:", err);
  }
  */
});