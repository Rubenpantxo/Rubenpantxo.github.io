// =====================================================
// EcoGrow Cabanillas — Lógica de Aplicación
// =====================================================

(function () {
  'use strict';

  // --- Estado ---
  let currentTab = 'genetics';
  let currentStrainFilter = 'all';
  let currentGardenFilter = 'frutas';
  let searchQuery = '';

  // --- Refs DOM ---
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  const tabBtns = $$('[data-tab]');
  const sections = $$('.app-section');
  const modal = $('#modal');
  const modalBody = $('#modal-body');
  const searchInput = $('#search-input');
  const strainGrid = $('#strain-grid');
  const gardenGrid = $('#garden-grid');
  const strainFilterBtns = $$('[data-strain-filter]');
  const gardenFilterBtns = $$('[data-garden-filter]');

  // --- Tabs ---
  function switchTab(tab) {
    currentTab = tab;
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    sections.forEach(s => {
      s.hidden = s.id !== tab + '-section';
    });
    if (tab === 'genetics') renderStrains();
    if (tab === 'garden') renderGarden();
    window.location.hash = tab;
  }

  tabBtns.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // --- Search ---
  searchInput.addEventListener('input', function () {
    searchQuery = this.value.toLowerCase().trim();
    if (currentTab === 'genetics') renderStrains();
    if (currentTab === 'garden') renderGarden();
  });

  // --- Strain filters ---
  strainFilterBtns.forEach(b => b.addEventListener('click', function () {
    currentStrainFilter = this.dataset.strainFilter;
    strainFilterBtns.forEach(x => x.classList.toggle('active', x === this));
    renderStrains();
  }));

  // --- Garden filters ---
  gardenFilterBtns.forEach(b => b.addEventListener('click', function () {
    currentGardenFilter = this.dataset.gardenFilter;
    gardenFilterBtns.forEach(x => x.classList.toggle('active', x === this));
    renderGarden();
  }));

  // --- Render strains ---
  function renderStrains() {
    const filtered = strainDatabase.filter(s => {
      const matchFilter = currentStrainFilter === 'all' || s.subtype === currentStrainFilter;
      const matchSearch = !searchQuery ||
        s.name.toLowerCase().includes(searchQuery) ||
        s.summary.toLowerCase().includes(searchQuery) ||
        s.tags.some(t => t.toLowerCase().includes(searchQuery));
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      strainGrid.innerHTML = '<p class="empty-msg">No se encontraron genéticas con esos filtros.</p>';
      return;
    }

    strainGrid.innerHTML = filtered.map(s => `
      <article class="card card--${s.subtype}" data-id="${s.id}" data-type="strain">
        <div class="card__badge badge--${s.subtype}">${subtypeLabel(s.subtype)}</div>
        <h3 class="card__title">${s.name}</h3>
        <div class="card__tags">${s.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <p class="card__summary">${s.summary}</p>
        <div class="card__meta">
          <span>⏱ ${s.floracion}</span>
          <span>📊 ${s.dificultad}</span>
        </div>
        <span class="card__cta">Ver ficha completa →</span>
      </article>
    `).join('');
  }

  function subtypeLabel(st) {
    const m = { indica: 'Índica', sativa: 'Sativa', hibrido: 'Híbrido', auto: 'Auto', cbd: 'CBD' };
    return m[st] || st;
  }

  // --- Render garden ---
  function renderGarden() {
    const filtered = gardenDatabase.filter(p => {
      const matchCat = p.category === currentGardenFilter;
      const matchSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery) ||
        p.summary.toLowerCase().includes(searchQuery) ||
        p.tags.some(t => t.toLowerCase().includes(searchQuery));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      gardenGrid.innerHTML = '<p class="empty-msg">No se encontraron plantas con esos filtros.</p>';
      return;
    }

    gardenGrid.innerHTML = filtered.map(p => `
      <article class="card card--garden" data-id="${p.id}" data-type="garden">
        <div class="card__badge badge--${p.category}">${categoryLabel(p.category)}</div>
        <h3 class="card__title">${p.name}</h3>
        <div class="card__tags">${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <p class="card__summary">${p.summary}</p>
        <div class="card__meta">
          <span>🌱 ${p.siembra}</span>
        </div>
        <span class="card__cta">Ver ficha completa →</span>
      </article>
    `).join('');
  }

  function categoryLabel(c) {
    const m = { frutas: 'Frutal', verduras: 'Hortaliza', vistosas: 'Flor', raras: 'Exótica' };
    return m[c] || c;
  }

  // --- Modal ---
  function openStrainModal(strain) {
    modalBody.innerHTML = `
      <div class="modal-header modal-header--${strain.subtype}">
        <span class="modal-badge badge--${strain.subtype}">${subtypeLabel(strain.subtype)}</span>
        <h2>${strain.name}</h2>
        <p class="modal-ratio">${strain.ratio}</p>
      </div>
      <div class="modal-grid">
        <div class="modal-box">
          <h4>🧪 THC / CBD</h4>
          <p>THC: <strong>${strain.thc}</strong></p>
          <p>CBD: <strong>${strain.cbd}</strong></p>
        </div>
        <div class="modal-box">
          <h4>⏱ Floración</h4>
          <p>${strain.floracion}</p>
        </div>
        <div class="modal-box">
          <h4>📊 Dificultad</h4>
          <p>${strain.dificultad}</p>
        </div>
        <div class="modal-box">
          <h4>⚖️ Rendimiento</h4>
          <p>${strain.rendimiento}</p>
        </div>
        <div class="modal-box">
          <h4>📅 Siembra</h4>
          <p>${strain.siembra}</p>
        </div>
        <div class="modal-box">
          <h4>🧺 Cosecha</h4>
          <p>${strain.cosecha}</p>
        </div>
      </div>
      <div class="modal-detail">
        <h4>🌡️ Viabilidad en Cabanillas</h4>
        <p>${strain.viabilidad}</p>
      </div>
      <div class="modal-detail">
        <h4>🌱 Cultivo y Nutrición</h4>
        <p>${strain.cultivo}</p>
      </div>
      <div class="modal-detail">
        <h4>✂️ Técnicas de Entrenamiento</h4>
        <p>${strain.tecnicas}</p>
      </div>
      <div class="modal-detail">
        <h4>🐛 Plagas y Prevención</h4>
        <p>${strain.plagas}</p>
      </div>
      <div class="modal-detail modal-detail--tricomas">
        <h4>🔬 Tricomas — Momento de Cosecha</h4>
        <p>${strain.tricpiomas}</p>
      </div>
    `;
    showModal();
  }

  function openGardenModal(plant) {
    modalBody.innerHTML = `
      <div class="modal-header modal-header--garden">
        <span class="modal-badge badge--${plant.category}">${categoryLabel(plant.category)}</span>
        <h2>${plant.name}</h2>
      </div>
      <div class="modal-grid">
        <div class="modal-box">
          <h4>📅 Siembra</h4>
          <p>${plant.siembra}</p>
        </div>
        <div class="modal-box">
          <h4>🧺 Cosecha</h4>
          <p>${plant.cosecha}</p>
        </div>
      </div>
      <div class="modal-detail">
        <h4>🌡️ Viabilidad en Cabanillas</h4>
        <p>${plant.viabilidad}</p>
      </div>
      <div class="modal-detail">
        <h4>✂️ Cuidados Específicos</h4>
        <p>${plant.cuidados}</p>
      </div>
      <div class="modal-detail">
        <h4>🐛 Plagas y Control Ecológico</h4>
        <p>${plant.plagas}</p>
      </div>
    `;
    showModal();
  }

  function showModal() {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('is-visible'));
    modal.querySelector('.modal-close').focus();
  }

  function closeModal() {
    modal.classList.remove('is-visible');
    modal.addEventListener('transitionend', function handler() {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      modal.removeEventListener('transitionend', handler);
    }, { once: true });
  }

  // Close on overlay click
  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.classList.contains('modal-close')) closeModal();
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // --- Event delegation for cards ---
  document.addEventListener('click', function (e) {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    const type = card.dataset.type;
    if (type === 'strain') {
      const strain = strainDatabase.find(s => s.id === id);
      if (strain) openStrainModal(strain);
    } else if (type === 'garden') {
      const plant = gardenDatabase.find(p => p.id === id);
      if (plant) openGardenModal(plant);
    }
  });

  // --- Guide section: accordion ---
  $$('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', function () {
      const content = this.nextElementSibling;
      const isOpen = !content.hidden;
      content.hidden = isOpen;
      this.setAttribute('aria-expanded', !isOpen);
      this.classList.toggle('is-open', !isOpen);
    });
  });

  // --- Init from hash ---
  function initFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (['genetics', 'guide', 'garden'].includes(hash)) {
      switchTab(hash);
    } else {
      switchTab('genetics');
    }
  }

  window.addEventListener('hashchange', initFromHash);
  initFromHash();
})();
