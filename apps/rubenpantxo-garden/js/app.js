/* ===================================================
 * APP - Router, init y utilidades globales
 * =================================================== */

const Modal = (() => {
  const root = () => document.getElementById('modal-root');
  const content = () => document.getElementById('modal-content');

  function open(html, opts = {}) {
    content().innerHTML = `<button class="modal-close" onclick="Modal.close()">✕</button>${html}`;
    if (opts.wide) content().classList.add('wide');
    else content().classList.remove('wide');
    root().hidden = false;
  }
  function close() {
    root().hidden = true;
    content().innerHTML = '';
  }
  // Click backdrop
  document.addEventListener('click', e => {
    if (e.target.hasAttribute && e.target.hasAttribute('data-close-modal')) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !root().hidden) close();
  });
  return { open, close };
})();

const Toast = (() => {
  let timer = null;
  function show(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    t.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => { t.hidden = true; }, 320);
    }, 2400);
  }
  return { show };
})();

const Router = (() => {
  const routes = {
    'hub': () => showHub(),
    'plantas': () => { hideHub(); Plants.render('all'); },
    'plantas-invernadero': () => { hideHub(); Plants.render('invernadero'); },
    'plantas-exterior': () => { hideHub(); Plants.render('exterior'); },
    'semillas': () => { hideHub(); Plants.render('germinacion'); },
    'riego': () => { hideHub(); Watering.render(); },
    'stock': () => { hideHub(); Stock.render(); },
    'alertas': () => { hideHub(); Alerts.render(); },
    'calendarios': () => { hideHub(); CalendarView.render('general'); },
    'infografias': () => { hideHub(); Infographics.render('all'); }
  };

  function showHub() {
    document.getElementById('hub-view').classList.add('active');
    document.getElementById('section-container').innerHTML = '';
    document.getElementById('top-bar').hidden = false;
    updateNavActive('hub');
  }
  function hideHub() {
    document.getElementById('hub-view').classList.remove('active');
    document.getElementById('top-bar').hidden = true;
  }

  function go(route) {
    window.location.hash = '#' + route;
  }

  function handle() {
    const hash = (window.location.hash || '#hub').slice(1);
    const baseRoute = hash.split('?')[0];
    const fn = routes[baseRoute] || routes['hub'];
    fn();
    updateNavActive(baseRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateNavActive(route) {
    document.querySelectorAll('.mini-nav-btn').forEach(b => {
      const r = b.dataset.route;
      b.classList.toggle('active', r === route || (route.startsWith('plantas') && r === 'plantas'));
    });
  }

  window.addEventListener('hashchange', handle);
  return { go, handle };
})();

const App = (() => {

  async function init() {
    await Storage.init();
    bindUI();
    updateTopBar();
    Router.handle();
    console.log('🌱 Rubenpantxo Garden Manager initialized');
  }

  function bindUI() {
    // Hotspots de la parcela
    document.querySelectorAll('.hotspot, .mini-nav-btn').forEach(el => {
      el.addEventListener('click', e => {
        const route = el.dataset.route;
        if (route) Router.go(route);
      });
    });

    // Botón alertas
    document.getElementById('alert-bell').addEventListener('click', () => Router.go('alertas'));

    // Export/Import
    document.getElementById('btn-export').addEventListener('click', () => {
      Storage.exportJSON();
      Toast.show('💾 Backup descargado', 'success');
    });
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm('Importar este backup sobreescribirá los datos actuales. ¿Continuar?')) return;
      try {
        await Storage.importJSON(file);
        Toast.show('✓ Datos importados correctamente', 'success');
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        Toast.show('Error: archivo inválido', 'error');
      }
    });
  }

  function updateTopBar() {
    // Fecha actual
    const date = new Date();
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    document.getElementById('current-date').textContent =
      `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

    // Fase actual (la más común)
    const plantas = Storage.get('plantas') || [];
    const counts = {};
    plantas.forEach(p => { counts[p.fase] = (counts[p.fase] || 0) + 1; });
    const top = Object.entries(counts).sort((a,b) => b[1] - a[1])[0];
    const fase = top ? top[0] : 'sin plantas';
    document.getElementById('current-phase').textContent = Plants.PHASE_LABELS[fase] || fase;

    // Ubicación predominante
    const locCounts = {};
    plantas.forEach(p => { locCounts[p.ubicacion] = (locCounts[p.ubicacion] || 0) + 1; });
    const topLoc = Object.entries(locCounts).sort((a,b) => b[1] - a[1])[0];
    if (topLoc) {
      const locPill = document.getElementById('location-pill');
      locPill.querySelector('span').textContent = Plants.LOC_LABELS[topLoc[0]] || topLoc[0];
    }

    // Contador alertas
    const alerts = Alerts.compute();
    const counter = document.getElementById('alert-count');
    counter.textContent = alerts.length;
    counter.classList.toggle('zero', alerts.length === 0);
  }

  return { init, updateTopBar };
})();

// === Inicialización ===
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
