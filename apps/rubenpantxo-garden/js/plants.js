/* ===================================================
 * PLANTS - Gestión de plantas
 * =================================================== */
const Plants = (() => {
  const PHASES = ['germinacion', 'enraizamiento', 'crecimiento', 'floracion', 'cosecha'];
  const PHASE_LABELS = {
    germinacion: 'Germinación',
    enraizamiento: 'Enraizamiento',
    crecimiento: 'Crecimiento',
    floracion: 'Floración',
    cosecha: 'Cosecha'
  };
  const LOCATIONS = ['germinacion', 'semillero', 'invernadero', 'exterior'];
  const LOC_LABELS = {
    germinacion: 'Germinación',
    semillero: 'Semillero',
    invernadero: 'Invernadero',
    exterior: 'Exterior'
  };
  const LOC_ICONS = {
    germinacion: 'semillas-germinando.png',
    semillero: 'cultivador-semillero.png',
    invernadero: 'invernadero.png',
    exterior: 'exterior.png'
  };

  let activeFilter = 'all';

  function render(filter = 'all') {
    activeFilter = filter;
    const container = document.getElementById('section-container');
    const plantas = Storage.get('plantas') || [];
    const filtered = filter === 'all' ? plantas : plantas.filter(p => p.ubicacion === filter);

    container.innerHTML = `
      <section class="section theme-plantas">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-icon"><img src="assets/icons/planta-x.png" alt=""></div>
            <div>
              <h1 class="section-title">Mis Plantas</h1>
              <p class="section-subtitle">${plantas.length} plantas activas en el huerto</p>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-ghost" onclick="Router.go('hub')">← Volver</button>
            <button class="btn" onclick="Plants.openForm()">＋ Nueva planta</button>
          </div>
        </div>

        <div class="plants-toolbar">
          ${renderFilter('all', 'Todas', plantas.length)}
          ${LOCATIONS.map(l => renderFilter(l, LOC_LABELS[l], plantas.filter(p => p.ubicacion === l).length)).join('')}
        </div>

        ${filtered.length === 0 ? renderEmpty() : `
          <div class="card-grid">
            ${filtered.map(renderCard).join('')}
          </div>
        `}
      </section>
    `;
  }

  function renderFilter(key, label, count) {
    return `<button class="filter-pill ${activeFilter === key ? 'active' : ''}" onclick="Plants.render('${key}')">${label} <strong>(${count})</strong></button>`;
  }

  function renderEmpty() {
    return `
      <div class="empty-state">
        <img src="assets/icons/no-planta-x.png" alt="" />
        <h3>No hay plantas en esta categoría</h3>
        <p>Añade tu primera planta para empezar a gestionar tu huerto</p>
      </div>
    `;
  }

  function renderCard(p) {
    const icon = LOC_ICONS[p.ubicacion] || 'planta-x.png';
    return `
      <div class="card plant-card">
        <div class="plant-card-header">
          <div class="plant-icon"><img src="assets/icons/${icon}" alt=""/></div>
          <div>
            <div class="plant-name">${escapeHtml(p.nombre)}</div>
            <div class="plant-strain">${escapeHtml(p.raza)} · ${escapeHtml(p.banco || '')}</div>
          </div>
        </div>
        <span class="plant-phase">${PHASE_LABELS[p.fase] || p.fase}</span>
        <div class="plant-meta">
          <div class="plant-meta-item">
            <span class="plant-meta-label">Ubicación</span>
            <span class="plant-meta-value">${LOC_LABELS[p.ubicacion] || p.ubicacion}</span>
          </div>
          <div class="plant-meta-item">
            <span class="plant-meta-label">Semana</span>
            <span class="plant-meta-value">${p.semana || 0}</span>
          </div>
          <div class="plant-meta-item">
            <span class="plant-meta-label">Inicio</span>
            <span class="plant-meta-value">${p.fecha_inicio || '—'}</span>
          </div>
          <div class="plant-meta-item">
            <span class="plant-meta-label">Días</span>
            <span class="plant-meta-value">${daysSince(p.fecha_inicio)}</span>
          </div>
        </div>
        ${p.notas ? `<p style="font-size:12px;color:var(--text-soft);font-style:italic;margin-top:4px;">${escapeHtml(p.notas)}</p>` : ''}
        <div class="plant-card-actions">
          <button class="btn btn-sm btn-ghost" onclick="Plants.openForm('${p.id}')">✎ Editar</button>
          <button class="btn btn-sm btn-ghost" onclick="Plants.advance('${p.id}')">→ Avanzar</button>
          <button class="btn btn-sm btn-danger" onclick="Plants.remove('${p.id}')">🗑</button>
        </div>
      </div>
    `;
  }

  function daysSince(dateStr) {
    if (!dateStr) return '—';
    const d1 = new Date(dateStr);
    const diff = Math.floor((Date.now() - d1.getTime()) / 86400000);
    return diff + 'd';
  }

  function openForm(id = null) {
    const plant = id ? Storage.listFind('plantas', id) : {
      nombre: '', raza: '', banco: '', ubicacion: 'germinacion',
      fase: 'germinacion', semana: 0, fecha_inicio: new Date().toISOString().slice(0,10), notas: ''
    };
    const bancos = Storage.get('bancos_semillas') || [];

    Modal.open(`
      <h2 class="modal-title">${id ? '✎ Editar planta' : '＋ Nueva planta'}</h2>
      <p class="modal-subtitle">${id ? 'Modifica los datos de la planta' : 'Añade una nueva planta a tu huerto'}</p>
      <form id="plant-form">
        <div class="form-row">
          <label>Nombre</label>
          <input name="nombre" value="${escapeHtml(plant.nombre)}" required>
        </div>
        <div class="form-row-inline">
          <div class="form-row">
            <label>Raza / Variedad</label>
            <input name="raza" value="${escapeHtml(plant.raza)}" required>
          </div>
          <div class="form-row">
            <label>Banco de semillas</label>
            <input list="bancos-list" name="banco" value="${escapeHtml(plant.banco || '')}">
            <datalist id="bancos-list">
              ${bancos.map(b => `<option value="${escapeHtml(b.nombre)}">`).join('')}
            </datalist>
          </div>
        </div>
        <div class="form-row-inline">
          <div class="form-row">
            <label>Ubicación</label>
            <select name="ubicacion">
              ${LOCATIONS.map(l => `<option value="${l}" ${plant.ubicacion === l ? 'selected' : ''}>${LOC_LABELS[l]}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Fase</label>
            <select name="fase">
              ${PHASES.map(f => `<option value="${f}" ${plant.fase === f ? 'selected' : ''}>${PHASE_LABELS[f]}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-inline">
          <div class="form-row">
            <label>Semana actual</label>
            <input type="number" name="semana" min="0" max="20" value="${plant.semana || 0}">
          </div>
          <div class="form-row">
            <label>Fecha de inicio</label>
            <input type="date" name="fecha_inicio" value="${plant.fecha_inicio || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Notas</label>
          <textarea name="notas" rows="3">${escapeHtml(plant.notas || '')}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
          <button type="submit" class="btn">${id ? 'Guardar cambios' : 'Crear planta'}</button>
        </div>
      </form>
    `);

    document.getElementById('plant-form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      data.semana = parseInt(data.semana) || 0;
      if (id) {
        Storage.listUpdate('plantas', id, data);
        Toast.show('🌱 Planta actualizada', 'success');
      } else {
        Storage.listAdd('plantas', data);
        Toast.show('🌱 Nueva planta añadida', 'success');
      }
      Modal.close();
      render(activeFilter);
      App.updateTopBar();
    });
  }

  function advance(id) {
    const p = Storage.listFind('plantas', id);
    if (!p) return;
    const idx = PHASES.indexOf(p.fase);
    if (idx < PHASES.length - 1) {
      const newPhase = PHASES[idx + 1];
      // Lógica: si pasa de enraizamiento a crecimiento, sube ubicación
      const updates = { fase: newPhase, semana: 1 };
      if (newPhase === 'crecimiento' && p.ubicacion === 'semillero') updates.ubicacion = 'invernadero';
      if (newPhase === 'crecimiento' && p.ubicacion === 'germinacion') updates.ubicacion = 'semillero';
      Storage.listUpdate('plantas', id, updates);
      Toast.show(`→ ${p.nombre} avanzó a ${PHASE_LABELS[newPhase]}`, 'success');
    } else {
      // Si está en cosecha, podemos incrementar semana
      Storage.listUpdate('plantas', id, { semana: (p.semana || 0) + 1 });
      Toast.show(`📅 ${p.nombre}: semana ${(p.semana || 0) + 1}`, 'success');
    }
    render(activeFilter);
    App.updateTopBar();
  }

  function remove(id) {
    const p = Storage.listFind('plantas', id);
    if (!p) return;
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    Storage.listRemove('plantas', id);
    Toast.show('🗑 Planta eliminada', 'success');
    render(activeFilter);
    App.updateTopBar();
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { render, openForm, advance, remove, PHASES, PHASE_LABELS, LOC_LABELS, LOCATIONS };
})();
