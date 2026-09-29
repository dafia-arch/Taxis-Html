document.addEventListener('DOMContentLoaded', () => {
  // === LÓGICA PANTALLA 7: ROLES ===
  const listaRolesAdmin = document.getElementById('listaRolesAdmin');

  async function renderizarRoles() {
    if (!window.taxiFirebase || !window.taxiFirebase.db) return;
    try {
      const db = window.taxiFirebase.db;
      const snapshot = await db.collection('operators').get();
      
      if (snapshot.empty) {
        listaRolesAdmin.innerHTML = '<p class="text-sm text-slate-500">No hay usuarios registrados.</p>';
        return;
      }

      const html = snapshot.docs.map(doc => {
        const data = doc.data();
        const isAdmin = data.rol === 'admin';
        return `
          <div class="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div>
              <p class="font-bold text-slate-800">${window.escaparHtml ? window.escaparHtml(data.nombre) : data.nombre}</p>
              <p class="text-sm text-slate-500">${window.escaparHtml ? window.escaparHtml(data.login) : data.login}</p>
              <span class="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}">
                ${isAdmin ? 'Administrador' : 'Operador / Programador'}
              </span>
            </div>
            <button type="button" 
              onclick="cambiarRol('${doc.id}', '${isAdmin ? 'operador' : 'admin'}')"
              class="rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors ${isAdmin ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}">
              ${isAdmin ? 'Revocar Admin' : 'Hacer Admin'}
            </button>
          </div>
        `;
      }).join('');
      
      listaRolesAdmin.innerHTML = html;
    } catch (e) {
      console.error(e);
      listaRolesAdmin.innerHTML = '<p class="text-sm text-rose-500">Error cargando roles. ¿Tienes permisos?</p>';
    }
  }

  window.cambiarRol = async (id, nuevoRol) => {
    if (!confirm(`¿Estás seguro de cambiar el rol a ${nuevoRol}?`)) return;
    try {
      await window.taxiFirebase.db.collection('operators').doc(id).update({ rol: nuevoRol });
      alert('Rol actualizado');
      renderizarRoles();
    } catch (e) {
      console.error(e);
      alert('Error actualizando rol. Verifica tus permisos.');
    }
  };


  // === LÓGICA PANTALLA 8: ANALYTICS ===
  let chartInstancia = null;

  function actualizarAnalytics() {
    if (!window.obtenerSolicitudesGuardadas) return;
    const solicitudes = window.obtenerSolicitudesGuardadas();

    let noSalio = 0;
    let confirmados = 0;
    let costoTotal = 0;
    const viajesPorDia = {};

    solicitudes.forEach(s => {
      // Conteos de ausencias
      if (s.confirmacion?.estado === 'No Salió') noSalio++;
      if (s.confirmacion?.estado === 'Abordó') confirmados++;

      // Sumar costos (si el sistema tiene tarifa configurada, usualmente lo guardaría la app al confirmar la ruta)
      // Como no se está guardando la cotización en la solicitud en la base, estimaremos:
      // banderazo 15 + (10km * 8) = ~95 pesos por persona (estimado estático para demo, ya que cotizarViaje es asíncrono y usa API externa)
      costoTotal += 95.50; 

      // Gráfica por fecha
      const fecha = s.fecha || 'Sin fecha';
      viajesPorDia[fecha] = (viajesPorDia[fecha] || 0) + 1;
    });

    document.getElementById('statNoSalio').textContent = noSalio;
    document.getElementById('statConfirmados').textContent = confirmados;
    document.getElementById('statCosto').textContent = `$${costoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

    // Renderizar Gráfica
    const ctx = document.getElementById('graficoViajes');
    if (!ctx) return;
    
    if (chartInstancia) chartInstancia.destroy();

    const fechas = Object.keys(viajesPorDia).sort();
    const datos = fechas.map(f => viajesPorDia[f]);

    chartInstancia = new Chart(ctx, {
      type: 'line',
      data: {
        labels: fechas,
        datasets: [{
          label: 'Viajes Programados',
          data: datos,
          borderColor: '#0ea5e9',
          backgroundColor: '#e0f2fe',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  // Refrescar al abrir pestañas
  document.querySelectorAll('[data-ir-vista="roles"]').forEach(b => {
    b.addEventListener('click', renderizarRoles);
  });
  document.querySelectorAll('[data-ir-vista="analytics"]').forEach(b => {
    b.addEventListener('click', actualizarAnalytics);
  });
});
