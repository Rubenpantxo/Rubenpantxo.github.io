/* ===================================================
 * ALERTS - Sistema de alertas (meteo, plagas, riego)
 * =================================================== */
const Alerts = (() => {

  function compute() {
    const alerts = [];
    const plantas = Storage.get('plantas') || [];
    const bidones = Storage.get('bidones') || [];
    const calendario = Storage.get('calendario_riego') || [];
    const descartadas = Storage.get('alertas_descartadas') || [];
    const today = new Date();

    // Alertas: riego olvidado (>2 días)
    plantas.forEach(p => {
      if (p.fase === 'cosecha') return;
      const lastRiego = calendario.filter(c => c.planta_id === p.id).sort((a,b) => b.fecha.localeCompare(a.fecha))[0];
      const lastDate = lastRiego ? new Date(lastRiego.fecha) : new Date(p.fecha_inicio || today);
      const diasSinRegar = Math.floor((today - lastDate) / 86400000);
      if (diasSinRegar > 2) {
        alerts.push({
          id: 'riego_' + p.id,
          tipo: 'riego',
          icono: 'icono-riego.png',
          titulo: `${p.nombre} sin regar`,
          descripcion: `Hace ${diasSinRegar} días desde el último riego registrado`,
          nivel: diasSinRegar > 4 ? 'danger' : 'warn',
          tiempo: `Hace ${diasSinRegar}d`
        });
      }
    });

    // Alertas: nivel bidón bajo
    bidones.forEach(b => {
      if (b.nivel_porcentaje < 25) {
        alerts.push({
          id: 'bidon_' + b.id,
          tipo: 'bidon',
          icono: 'bidon.png',
          titulo: `${b.nombre} casi vacío`,
          descripcion: `Solo queda un ${b.nivel_porcentaje}% de agua. Rellenar pronto.`,
          nivel: b.nivel_porcentaje < 10 ? 'danger' : 'warn',
          tiempo: 'Ahora'
        });
      }
    });

    // Alertas: cambio de fase próximo
    plantas.forEach(p => {
      if (p.fase === 'crecimiento' && p.semana >= 3) {
        alerts.push({
          id: 'fase_' + p.id,
          tipo: 'fase',
          icono: 'fase-crecimiento.png',
          titulo: `${p.nombre}: próxima floración`,
          descripcion: `Considera cambiar a fotoperiodo 12/12 para iniciar floración`,
          nivel: 'warn',
          tiempo: `Semana ${p.semana}`
        });
      }
      if (p.fase === 'enraizamiento' && p.semana >= 2) {
        alerts.push({
          id: 'tras_' + p.id,
          tipo: 'transplante',
          icono: 'transplantar.png',
          titulo: `${p.nombre}: lista para trasplante`,
          descripcion: `Pasar del semillero al invernadero / tierra definitiva`,
          nivel: 'warn',
          tiempo: `Semana ${p.semana}`
        });
      }
      if (p.fase === 'floracion' && p.semana >= 10) {
        alerts.push({
          id: 'cosecha_' + p.id,
          tipo: 'cosecha',
          icono: 'cosecha.png',
          titulo: `${p.nombre}: cosecha próxima`,
          descripcion: `Considera el lavado de raíces y revisar tricomas`,
          nivel: 'warn',
          tiempo: `Semana ${p.semana}`
        });
      }
    });

    // Alertas manuales
    const manuales = (Storage.get('alertas_activas') || []).map(a => ({ ...a, _manual: true }));

    return [...alerts, ...manuales].filter(a => !descartadas.includes(a.id));
  }

  function render() {
    const container = document.getElementById('section-container');
    const alerts = compute();
    const descartadas = Storage.get('alertas_descartadas') || [];

    container.innerHTML = `
      <section class="section theme-alertas">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-icon"><img src="assets/icons/alertas.png" alt=""></div>
            <div>
              <h1 class="section-title">Alertas</h1>
              <p class="section-subtitle">${alerts.length} alertas activas en tu huerto</p>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-ghost" onclick="Router.go('hub')">← Volver</button>
            ${descartadas.length > 0 ? `<button class="btn btn-ghost" onclick="Alerts.clearDismissed()">↺ Restablecer (${descartadas.length})</button>` : ''}
            <button class="btn" onclick="Alerts.openManualForm()">＋ Nueva alerta</button>
          </div>
        </div>

        ${alerts.length === 0 ? `
          <div class="empty-state">
            <img src="assets/icons/alertas.png" alt="">
            <h3>Todo en orden 🌿</h3>
            <p>No hay alertas activas. Tu huerto está bajo control.</p>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${alerts.map(renderAlert).join('')}
          </div>
        `}

        <h3 style="margin-top:32px;font-family:'Vito';color:var(--section-primary);">Tipos de alertas monitorizadas</h3>
        <div class="card-grid" style="margin-top:12px;">
          <div class="card" style="text-align:center;">
            <img src="assets/icons/alerta-meteorologia.png" style="width:60px;margin:0 auto 8px;">
            <strong>Meteorología</strong>
            <p style="font-size:12px;color:var(--text-soft);margin-top:4px;">Lluvia, granizo, viento fuerte</p>
          </div>
          <div class="card" style="text-align:center;">
            <img src="assets/icons/plagas.png" style="width:60px;margin:0 auto 8px;">
            <strong>Plagas</strong>
            <p style="font-size:12px;color:var(--text-soft);margin-top:4px;">Pulgón, araña roja, caracoles</p>
          </div>
          <div class="card" style="text-align:center;">
            <img src="assets/icons/icono-riego.png" style="width:60px;margin:0 auto 8px;">
            <strong>Riego olvidado</strong>
            <p style="font-size:12px;color:var(--text-soft);margin-top:4px;">Detección automática &gt;2 días</p>
          </div>
          <div class="card" style="text-align:center;">
            <img src="assets/icons/fase-crecimiento.png" style="width:60px;margin:0 auto 8px;">
            <strong>Cambio de fase</strong>
            <p style="font-size:12px;color:var(--text-soft);margin-top:4px;">Avisos de transplante, floración, cosecha</p>
          </div>
        </div>
      </section>
    `;

    // Bind dismiss buttons via delegation to avoid inline onclick with data
    container.querySelectorAll('.alert-dismiss').forEach(btn => {
      btn.addEventListener('click', () => dismiss(btn.dataset.id, btn.dataset.manual === '1'));
    });
  }

  function renderAlert(a) {
    return `
      <div class="alert-row ${a.nivel === 'danger' ? 'danger' : ''}">
        <img src="assets/icons/${escapeHtml(a.icono)}" alt="">
        <div class="alert-content">
          <h4>${escapeHtml(a.titulo)}</h4>
          <p>${escapeHtml(a.descripcion)}</p>
        </div>
        <span class="alert-time">${escapeHtml(a.tiempo)}</span>
        <button class="alert-dismiss" data-id="${escapeHtml(a.id)}" data-manual="${a._manual ? '1' : '0'}" title="Descartar alerta">✕</button>
      </div>
    `;
  }

  function dismiss(id, isManual) {
    if (isManual) {
      Storage.listRemove('alertas_activas', id);
    } else {
      const descartadas = Storage.get('alertas_descartadas') || [];
      if (!descartadas.includes(id)) {
        descartadas.push(id);
        Storage.set('alertas_descartadas', descartadas);
      }
    }
    render();
    App.updateTopBar();
  }

  function clearDismissed() {
    Storage.set('alertas_descartadas', []);
    render();
    App.updateTopBar();
  }

  function openManualForm() {
    Modal.open(`
      <h2 class="modal-title">＋ Nueva alerta manual</h2>
      <form id="alert-form">
        <div class="form-row">
          <label>Tipo</label>
          <select name="tipo">
            <option value="meteo">Meteorología</option>
            <option value="plaga">Plaga</option>
            <option value="manual">Otra</option>
          </select>
        </div>
        <div class="form-row">
          <label>Título</label>
          <input name="titulo" required>
        </div>
        <div class="form-row">
          <label>Descripción</label>
          <textarea name="descripcion" rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
          <button type="submit" class="btn">Crear alerta</button>
        </div>
      </form>
    `);
    document.getElementById('alert-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const iconMap = { meteo: 'alerta-meteorologia.png', plaga: 'plagas.png', manual: 'alertas.png' };
      Storage.listAdd('alertas_activas', {
        ...data,
        _manual: true,
        icono: iconMap[data.tipo] || 'alertas.png',
        nivel: 'warn',
        tiempo: 'Ahora'
      });
      Toast.show('Alerta creada', 'success');
      Modal.close();
      render();
      App.updateTopBar();
    });
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { render, compute, openManualForm, dismiss, clearDismissed };
})();
