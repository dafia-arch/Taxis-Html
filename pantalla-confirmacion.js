document.addEventListener('DOMContentLoaded', () => {
  const selectRutaConfirmacion = document.getElementById('selectRutaConfirmacion');
  const contenedorPasajerosConfirmacion = document.getElementById('contenedorPasajerosConfirmacion');

  // Función para poblar el select de rutas
  function actualizarSelectRutasConfirmacion() {
    if (!window.obtenerAsignacionesRutas || !window.obtenerSolicitudesGuardadas) return;

    const asignaciones = window.obtenerAsignacionesRutas();
    const solicitudes = window.obtenerSolicitudesGuardadas();
    
    // Guardar el valor actual para mantener la selección si existe
    const seleccionActual = selectRutaConfirmacion.value;
    
    selectRutaConfirmacion.innerHTML = '<option value="">Seleccione una ruta asignada...</option>';

    if (Object.keys(asignaciones).length === 0) {
      return;
    }

    Object.entries(asignaciones).forEach(([claveRuta, choferId]) => {
      if (!choferId) return;

      const idsSolicitudes = claveRuta.split('|');
      // Buscar las solicitudes para mostrar info de la ruta
      const solicitudesRuta = idsSolicitudes.map(id => solicitudes.find(s => String(s.id) === id)).filter(Boolean);
      
      if (solicitudesRuta.length > 0) {
        const textoRuta = `Ruta a ${solicitudesRuta[0].localidad || 'Destino'} - ${solicitudesRuta.length} pasajero(s) - Chofer: ${choferId}`;
        const option = document.createElement('option');
        option.value = claveRuta;
        option.textContent = textoRuta;
        selectRutaConfirmacion.appendChild(option);
      }
    });

    if (seleccionActual && [...selectRutaConfirmacion.options].some(o => o.value === seleccionActual)) {
      selectRutaConfirmacion.value = seleccionActual;
    }
  }

  // Renderizar pasajeros de la ruta
  async function renderizarPasajerosConfirmacion() {
    const claveRuta = selectRutaConfirmacion.value;
    if (!claveRuta) {
      contenedorPasajerosConfirmacion.innerHTML = '<p class="text-sm text-slate-500">Por favor selecciona una ruta para ver los pasajeros.</p>';
      return;
    }

    const solicitudes = window.obtenerSolicitudesGuardadas();
    const idsSolicitudes = claveRuta.split('|');
    const pasajeros = idsSolicitudes.map(id => solicitudes.find(s => String(s.id) === id)).filter(Boolean);

    if (pasajeros.length === 0) {
      contenedorPasajerosConfirmacion.innerHTML = '<p class="text-sm text-slate-500">No se encontraron los pasajeros de esta ruta.</p>';
      return;
    }

    contenedorPasajerosConfirmacion.innerHTML = pasajeros.map(pasajero => {
      const estado = pasajero.confirmacion?.estado || 'Pendiente';
      const evidenciaHtml = pasajero.confirmacion?.evidenciaUrl 
        ? `<div class="mt-2"><a href="${pasajero.confirmacion.evidenciaUrl}" target="_blank" class="text-sm text-blue-600 underline">Ver evidencia cargada</a></div>`
        : '';
        
      const notasHtml = pasajero.confirmacion?.notas
        ? `<p class="mt-1 text-sm text-slate-600"><strong>Notas:</strong> ${window.escaparHtml ? window.escaparHtml(pasajero.confirmacion.notas) : pasajero.confirmacion.notas}</p>`
        : '';

      return `
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-pasajero-id="${pasajero.id}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 class="font-bold text-slate-800">${pasajero.nombre}</h4>
              <p class="text-sm text-slate-600">${pasajero.direccion}</p>
              <p class="mt-1 text-xs font-semibold text-slate-500">Estado actual: <span class="text-slate-800">${estado}</span></p>
              ${evidenciaHtml}
              ${notasHtml}
            </div>
            
            <div class="flex gap-2">
              <button type="button" class="btn-confirmo rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-200" onclick="marcarConfirmacion('${pasajero.id}', 'Abordó')">Sí abordó</button>
              <button type="button" class="btn-no-salio rounded-xl bg-rose-100 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-200" onclick="mostrarFormularioEvidencia('${pasajero.id}')">No salió</button>
            </div>
          </div>
          
          <!-- Formulario de evidencia (oculto por defecto) -->
          <div id="evidencia-form-${pasajero.id}" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 p-4">
            <h5 class="mb-3 text-sm font-bold text-rose-900">Registrar ausencia y subir evidencia</h5>
            <label class="block text-sm font-semibold text-slate-700">Comentarios / Notas
              <input type="text" id="nota-${pasajero.id}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Ej. Esperamos 10 minutos y no salió">
            </label>
            <label class="mt-3 block text-sm font-semibold text-slate-700">Foto de evidencia
              <input type="file" id="foto-${pasajero.id}" accept="image/*" class="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-rose-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-rose-700 hover:file:bg-rose-200">
            </label>
            <div class="mt-4 flex items-center gap-3">
              <button type="button" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700" onclick="guardarEvidencia('${pasajero.id}')">Guardar ausencia</button>
              <button type="button" class="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 border border-slate-300" onclick="ocultarFormularioEvidencia('${pasajero.id}')">Cancelar</button>
              <span id="evidencia-status-${pasajero.id}" class="text-sm font-medium text-rose-700"></span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Funciones globales para que los botones onclick las encuentren
  window.mostrarFormularioEvidencia = (id) => {
    document.getElementById(`evidencia-form-${id}`).classList.remove('hidden');
  };

  window.ocultarFormularioEvidencia = (id) => {
    document.getElementById(`evidencia-form-${id}`).classList.add('hidden');
  };

  window.marcarConfirmacion = async (id, estado) => {
    try {
      const solicitudes = window.obtenerSolicitudesGuardadas();
      const indice = solicitudes.findIndex(s => String(s.id) === id);
      if (indice === -1) return;

      solicitudes[indice].confirmacion = {
        estado: estado,
        fechaActualizacion: new Date().toISOString()
      };

      // Guardar en local
      localStorage.setItem('taxiRequestsLocalTest', JSON.stringify(solicitudes));

      // Guardar en Firebase
      if (window.taxiFirebase && window.taxiFirebase.db) {
        await window.taxiFirebase.db.collection('requests').doc(String(id)).set({
          confirmacion: solicitudes[indice].confirmacion
        }, { merge: true });
      }

      alert('Estado actualizado correctamente.');
      renderizarPasajerosConfirmacion();
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Hubo un error al actualizar el estado.');
    }
  };

  window.guardarEvidencia = async (id) => {
    const btn = document.querySelector(`#evidencia-form-${id} button`);
    const status = document.getElementById(`evidencia-status-${id}`);
    const archivoInput = document.getElementById(`foto-${id}`);
    const nota = document.getElementById(`nota-${id}`).value;
    const archivo = archivoInput.files[0];

    if (!archivo) {
      alert('Por favor selecciona una foto de evidencia.');
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Subiendo...';
      status.textContent = 'Subiendo foto...';

      // 1. Subir archivo a Firebase Storage
      let urlArchivo = '';
      if (window.taxiFirebase && window.taxiFirebase.storage) {
        const nombreArchivo = `evidencias/${id}_${Date.now()}_${archivo.name}`;
        const ref = window.taxiFirebase.storage.ref().child(nombreArchivo);
        await ref.put(archivo);
        urlArchivo = await ref.getDownloadURL();
      } else {
        throw new Error('Firebase Storage no está configurado correctamente.');
      }

      // 2. Actualizar documento en Firestore
      const solicitudes = window.obtenerSolicitudesGuardadas();
      const indice = solicitudes.findIndex(s => String(s.id) === id);
      if (indice > -1) {
        solicitudes[indice].confirmacion = {
          estado: 'No Salió',
          notas: nota,
          evidenciaUrl: urlArchivo,
          fechaActualizacion: new Date().toISOString()
        };
        
        localStorage.setItem('taxiRequestsLocalTest', JSON.stringify(solicitudes));
        
        if (window.taxiFirebase && window.taxiFirebase.db) {
          await window.taxiFirebase.db.collection('requests').doc(String(id)).set({
            confirmacion: solicitudes[indice].confirmacion
          }, { merge: true });
        }
      }

      status.textContent = '¡Guardado exitosamente!';
      setTimeout(() => {
        renderizarPasajerosConfirmacion();
      }, 1000);

    } catch (error) {
      console.error('Error guardando evidencia:', error);
      alert('Error guardando evidencia: ' + error.message);
      btn.disabled = false;
      btn.textContent = 'Guardar ausencia';
      status.textContent = '';
    }
  };

  // Event Listeners
  selectRutaConfirmacion.addEventListener('change', renderizarPasajerosConfirmacion);

  // Escuchar cuando el usuario abre la pestaña de confirmación para refrescar el select
  document.querySelectorAll('[data-ir-vista="confirmacion"]').forEach(boton => {
    boton.addEventListener('click', () => {
      actualizarSelectRutasConfirmacion();
    });
  });

  // Inicializar al cargar (por si la vista por defecto fuera esa, aunque no lo es)
  setTimeout(actualizarSelectRutasConfirmacion, 1000); // Dar tiempo a que firebase lea datos
});
