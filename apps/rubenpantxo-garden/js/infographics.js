/* ===================================================
 * INFOGRAPHICS - Galería de infografías con lightbox
 * =================================================== */
const Infographics = (() => {
  let activeCategory = 'all';

  function render(cat = activeCategory) {
    activeCategory = cat;
    const container = document.getElementById('section-container');
    const infos = Storage.get('infografias_disponibles') || [];
    const categorias = [...new Set(infos.map(i => i.categoria))];
    const filtered = cat === 'all' ? infos : infos.filter(i => i.categoria === cat);

    container.innerHTML = `
      <section class="section theme-infografias">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-icon"><img src="assets/icons/info-plus.png" alt=""></div>
            <div>
              <h1 class="section-title">Infografías</h1>
              <p class="section-subtitle">${infos.length} recursos visuales · tips, técnicas y referencias</p>
            </div>
          </div>
          <button class="btn btn-ghost" onclick="Router.go('hub')">← Volver</button>
        </div>

        <div class="info-toolbar">
          <button class="filter-pill ${cat === 'all' ? 'active' : ''}" onclick="Infographics.render('all')">Todas <strong>(${infos.length})</strong></button>
          ${categorias.map(c => `
            <button class="filter-pill ${cat === c ? 'active' : ''}" onclick="Infographics.render('${c}')">
              ${categoryLabel(c)} <strong>(${infos.filter(i => i.categoria === c).length})</strong>
            </button>
          `).join('')}
        </div>

        ${filtered.length === 0 ? `
          <div class="empty-state">
            <img src="assets/icons/no-calendar.png" alt="">
            <h3>Sin infografías</h3>
            <p>Esta categoría no tiene infografías disponibles</p>
          </div>
        ` : `
          <div class="info-grid">
            ${filtered.map(renderCard).join('')}
          </div>
        `}
      </section>
    `;
  }

  function categoryLabel(c) {
    const labels = {
      diagnostico: '🔍 Diagnóstico',
      tecnicas: '✂️ Técnicas',
      material: '🪴 Material',
      ciclo: '🔄 Ciclo',
      calendario: '📅 Calendario',
      'tabla-cultivo': '📊 Tabla cultivo'
    };
    return labels[c] || c;
  }

  function renderCard(info) {
    return `
      <div class="info-card" onclick="Infographics.openLightbox('${info.id}')">
        <img src="${info.imagen}" alt="${escapeHtml(info.titulo)}" class="info-card-img" loading="lazy">
        <div class="info-card-body">
          <div class="info-card-title">${escapeHtml(info.titulo)}</div>
          <div class="info-card-cat">${categoryLabel(info.categoria)}</div>
        </div>
      </div>
    `;
  }

  function openLightbox(id) {
    const infos = Storage.get('infografias_disponibles') || [];
    const info = infos.find(i => i.id === id);
    if (!info) return;
    Modal.open(`
      <h2 class="modal-title">${escapeHtml(info.titulo)}</h2>
      <p class="modal-subtitle">${categoryLabel(info.categoria)}</p>
      <img src="${info.imagen}" alt="" class="lightbox-img">
      <div class="modal-actions">
        <button class="btn" onclick="Modal.close()">Cerrar</button>
      </div>
    `, { wide: true });
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { render, openLightbox };
})();
