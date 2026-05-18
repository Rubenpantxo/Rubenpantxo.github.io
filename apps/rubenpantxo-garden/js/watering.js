/* ===================================================
 * WATERING - Riego y dosis automáticas Top Crop
 * =================================================== */
const Watering = (() => {

  function render() {
    const container = document.getElementById('section-container');
    const bidones = Storage.get('bidones') || [];
    const plantas = Storage.get('plantas') || [];
    const tabla = Storage.get('tabla_topcrop_soil') || { fases: [] };

    const activas = plantas.filter(p => p.fase !== 'cosecha' && p.fase !== 'germinacion');
    const semanaPromedio = activas.length > 0
      ? Math.round(activas.reduce((s, p) => s + (p.semana || 0), 0) / activas.length) : 1;
    const dosisActuales = (tabla.fases || []).find(f => f.semana === semanaPromedio) || { productos: [] };

    container.innerHTML = `
      <section class="section theme-riego">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-icon"><img src="assets/icons/icono-riego.png" alt=""></div>
            <div>
              <h1 class="section-title">Riego</h1>
              <p class="section-subtitle">Gestión de bidones, dosis y calendario de riego</p>
            </div>
          </div>
          <button class="btn btn-ghost" onclick="Router.go('hub')">← Volver</button>
        </div>

        <div class="bidones-row">
          ${bidones.map(renderBidon).join('')}
        </div>

        <div class="watering-recommendation">
          <h3>💧 Dosis recomendadas · Semana ${semanaPromedio} (${dosisActuales.fase || 'sin fase'})</h3>
          ${dosisActuales.productos.length === 0
            ? `<p style="color:var(--text-soft);">No hay productos para esta semana. Lavado de raíces o solo agua.</p>`
            : dosisActuales.productos.map(renderDose).join('')
          }
          <p style="margin-top:14px;font-size:12px;color:var(--text-soft);">
            Cálculo automático basado en la <strong>tabla Top Crop SOIL</strong> según la semana promedio de tus ${activas.length} plantas activas.
          </p>
        </div>

        <div class="watering-actions">
          <button class="btn" id="btn-water-all">💧 Regar TODAS hoy</button>
          <button class="btn btn-ghost" onclick="Watering.showTable()">📊 Ver tabla completa Top Crop</button>
          <button class="btn btn-ghost" onclick="Watering.history()">📅 Histórico de riegos</button>
        </div>

        <div class="watering-recommendation" style="margin-top:24px;">
          <h3>📊 Estado de riego por planta</h3>
          <table class="topcrop-table">
            <thead><tr><th>Planta</th><th>Fase</th><th>Sem.</th><th>Último riego</th><th>Regar</th></tr></thead>
            <tbody>
              ${plantas.map(p => `
                <tr>
                  <td><strong>${escapeHtml(p.nombre)}</strong> <small style="color:var(--text-soft);">${escapeHtml(p.raza)}</small></td>
                  <td><span class="topcrop-phase-tag ${p.fase}">${Plants.PHASE_LABELS[p.fase]}</span></td>
                  <td>${p.semana}</td>
                  <td>${nextWatering(p)}</td>
                  <td><button class="btn-water-plant" data-id="${escapeHtml(p.id)}" title="Registrar riego">💧</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;

    // Listeners de sliders de bidones
    document.querySelectorAll('.bidon-slider').forEach(s => {
      s.addEventListener('input', e => {
        const id = e.target.dataset.id;
        const val = parseInt(e.target.value);
        Storage.listUpdate('bidones', id, { nivel_porcentaje: val });
        const card = e.target.closest('.bidon-card');
        card.querySelector('.bidon-fill').style.height = val + '%';
        card.querySelector('.bidon-level-value').textContent = val;
      });
    });

    // Botón regar todas
    document.getElementById('btn-water-all').addEventListener('click', markWatered);

    // Botones regar planta individual
    document.querySelectorAll('.btn-water-plant').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = (Storage.get('plantas') || []).find(x => x.id === btn.dataset.id);
        if (p) waterPlant(p.id, p.nombre);
      });
    });
  }

  function renderBidon(b) {
    return `
      <div class="bidon-card" data-id="${b.id}">
        <div class="bidon-visual">
          <div class="bidon-fill" style="height:${b.nivel_porcentaje}%;"></div>
          <img src="assets/icons/bidon.png" alt="">
        </div>
        <div class="bidon-info">
          <div class="bidon-name">${escapeHtml(b.nombre)}</div>
          <div class="bidon-level"><span class="bidon-level-value">${b.nivel_porcentaje}</span><small>% · ${b.capacidad_litros}L</small></div>
          <input type="range" class="bidon-slider" min="0" max="100" value="${b.nivel_porcentaje}" data-id="${b.id}">
        </div>
      </div>
    `;
  }

  function renderDose(prod) {
    const dose = prod.dosis_min === prod.dosis_max
      ? `${prod.dosis_min}` : `${prod.dosis_min}-${prod.dosis_max}`;
    return `
      <div class="dose-row">
        <img src="assets/icons/aditivos-riego.png" alt="">
        <div>
          <div class="dose-product">${escapeHtml(prod.nombre)}</div>
        </div>
        <div class="dose-amount">${dose} ${escapeHtml(prod.unidad)}</div>
        <div style="font-size:11px;color:var(--text-soft);">Top Crop</div>
      </div>
    `;
  }

  function nextWatering(p) {
    const calendario = Storage.get('calendario_riego') || [];
    const last = calendario.filter(e => e.planta_id === p.id).sort((a,b) => b.fecha.localeCompare(a.fecha))[0];
    if (!last) return '<span style="color:var(--accent-warn);">Pendiente</span>';
    const lastDate = new Date(last.fecha);
    const days = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
    if (days >= 2) return `<span style="color:var(--accent-warn);">Hace ${days}d ⚠</span>`;
    return `<span style="color:var(--verde-2);">Hace ${days}d ✓</span>`;
  }

  function markWatered() {
    markWateredDate(new Date().toISOString().slice(0,10));
    Toast.show('💧 Riego registrado para todas las plantas', 'success');
    render();
  }

  function markWateredDate(fecha) {
    const plantas = Storage.get('plantas') || [];
    const calendario = Storage.get('calendario_riego') || [];
    plantas.forEach(p => {
      calendario.push({
        id: Storage.generateId(),
        planta_id: p.id,
        planta_nombre: p.nombre,
        fecha,
        producto_aplicado: 'Según tabla'
      });
    });
    Storage.set('calendario_riego', calendario);
  }

  function waterPlant(id, nombre) {
    waterPlantDate(id, nombre, new Date().toISOString().slice(0,10));
    Toast.show(`💧 ${nombre} regada`, 'success');
    render();
  }

  function waterPlantDate(id, nombre, fecha) {
    Storage.listAdd('calendario_riego', {
      planta_id: id,
      planta_nombre: nombre,
      fecha,
      producto_aplicado: 'Según tabla'
    });
  }

  function showTable() {
    const tabla = Storage.get('tabla_topcrop_soil') || { fases: [] };
    Modal.open(`
      <h2 class="modal-title">📊 Tabla de cultivo Top Crop · SOIL</h2>
      <p class="modal-subtitle">Dosis recomendadas por semana y fase del ciclo</p>
      <div style="overflow-x:auto;">
        <table class="topcrop-table">
          <thead><tr><th>Semana</th><th>Fase</th><th>Horas luz</th><th>Productos y dosis</th></tr></thead>
          <tbody>
            ${tabla.fases.map(f => `
              <tr>
                <td><strong>${f.semana}</strong></td>
                <td><span class="topcrop-phase-tag ${f.fase}">${Plants.PHASE_LABELS[f.fase] || f.fase}</span></td>
                <td>${f.horas_luz}h</td>
                <td>
                  ${f.productos.map(p => `
                    <div style="margin-bottom:4px;">
                      <strong>${escapeHtml(p.nombre)}</strong> · ${p.dosis_min === p.dosis_max ? p.dosis_min : `${p.dosis_min}-${p.dosis_max}`} ${escapeHtml(p.unidad)}
                    </div>
                  `).join('')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="Modal.close()">Cerrar</button>
      </div>
    `, { wide: true });
  }

  function history() {
    const cal = (Storage.get('calendario_riego') || []).slice().sort((a,b) => b.fecha.localeCompare(a.fecha));
    Modal.open(`
      <h2 class="modal-title">📅 Histórico de riegos</h2>
      <p class="modal-subtitle">Últimos riegos registrados</p>
      ${cal.length === 0 ? '<p style="color:var(--text-soft);">Aún no hay riegos registrados.</p>' : `
        <ul style="list-style:none;max-height:400px;overflow-y:auto;">
          ${cal.slice(0, 50).map(e => `
            <li style="padding:10px;background:var(--past-3);border-radius:8px;margin-bottom:6px;display:flex;justify-content:space-between;">
              <span><strong>${escapeHtml(e.planta_nombre || '?')}</strong></span>
              <span style="color:var(--text-soft);font-family:'Coolvetica';">${e.fecha}</span>
            </li>
          `).join('')}
        </ul>
      `}
      <div class="modal-actions"><button class="btn" onclick="Modal.close()">Cerrar</button></div>
    `);
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { render, markWatered, markWateredDate, waterPlant, waterPlantDate, showTable, history };
})();
