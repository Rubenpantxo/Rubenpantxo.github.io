/* ===================================================
 * CALENDAR - General / Riego / Lunar
 * =================================================== */
const CalendarView = (() => {
  let currentTab = 'general';
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  // Lunar phase algorithm — reference new moon: 2026-01-18
  const KNOWN_NEW_MOON = new Date('2026-01-18T00:00:00Z').getTime();
  const SYNODIC_MS = 29.53059 * 24 * 60 * 60 * 1000;

  function getMoonPhase(date) {
    const elapsed = date.getTime() - KNOWN_NEW_MOON;
    const raw = ((elapsed % SYNODIC_MS) + SYNODIC_MS) % SYNODIC_MS;
    const phase = raw / SYNODIC_MS; // 0 = new moon, 0.5 = full moon

    if (phase < 0.0625 || phase >= 0.9375) return { emoji: '🌑', name: 'Luna nueva', consejo: 'Savia baja · ideal para podar y enraizar' };
    if (phase < 0.1875) return { emoji: '🌒', name: 'Creciente', consejo: 'Energía en ascenso · bueno para abonado foliar' };
    if (phase < 0.3125) return { emoji: '🌓', name: 'Cuarto creciente', consejo: 'Savia en subida · buen momento para transplante' };
    if (phase < 0.4375) return { emoji: '🌔', name: 'Gibosa creciente', consejo: 'Alta actividad · nutrición y riego recomendados' };
    if (phase < 0.5625) return { emoji: '🌕', name: 'Luna llena', consejo: 'Savia al máximo · ideal para riego con nutrientes' };
    if (phase < 0.6875) return { emoji: '🌖', name: 'Gibosa menguante', consejo: 'Energía bajando · limitar nutrientes' };
    if (phase < 0.8125) return { emoji: '🌗', name: 'Cuarto menguante', consejo: 'Savia baja · bueno para limpiar y germinar' };
    return { emoji: '🌘', name: 'Menguante', consejo: 'Reposo lunar · dejar descansar el sustrato' };
  }

  function render(tab = currentTab) {
    currentTab = tab;
    const container = document.getElementById('section-container');
    container.innerHTML = `
      <section class="section theme-calendarios">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-icon"><img src="assets/icons/calendario-general.png" alt=""></div>
            <div>
              <h1 class="section-title">Calendarios</h1>
              <p class="section-subtitle">Consulta general, riegos y fases lunares</p>
            </div>
          </div>
          <button class="btn btn-ghost" onclick="Router.go('hub')">← Volver</button>
        </div>

        <div class="calendar-tabs">
          <button class="cal-tab ${tab === 'general' ? 'active' : ''}" onclick="CalendarView.render('general')">📅 General</button>
          <button class="cal-tab ${tab === 'riego' ? 'active' : ''}" onclick="CalendarView.render('riego')">💧 Riego</button>
          <button class="cal-tab ${tab === 'lunar' ? 'active' : ''}" onclick="CalendarView.render('lunar')">🌙 Lunar</button>
        </div>

        <div id="cal-body">
          ${tab === 'lunar' ? renderLunar() : renderGrid(tab)}
        </div>
      </section>
    `;

    // Bind watering add buttons in riego tab
    bindCalDays();
  }

  function renderGrid(tab) {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, otherMonth: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, otherMonth: false, date: `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
    }
    while (cells.length % 7 !== 0) {
      const dn = cells.length - startWeekday - daysInMonth + 1;
      cells.push({ day: dn, otherMonth: true });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0,10);
    const calendario = Storage.get('calendario_riego') || [];

    return `
      <div class="calendar-grid">
        <div class="cal-header">
          <button class="cal-nav-btn" onclick="CalendarView.prevMonth()">‹</button>
          <h3 class="cal-month-title">${MONTHS[currentMonth]} ${currentYear}</h3>
          <button class="cal-nav-btn" onclick="CalendarView.nextMonth()">›</button>
        </div>
        <div class="cal-days-header">${DAYS.map(d => `<div>${d}</div>`).join('')}</div>
        <div class="cal-grid">
          ${cells.map(c => {
            if (c.otherMonth) return `<div class="cal-day other-month">${c.day}</div>`;
            const isToday = c.date === todayStr;
            const watered = calendario.some(e => e.fecha === c.date);
            const moon = getMoonPhase(new Date(c.date + 'T12:00:00Z'));
            if (tab === 'riego') {
              return `<div class="cal-day ${isToday ? 'today' : ''} ${watered ? 'watered' : ''}"
                           data-date="${c.date}"
                           title="${watered ? 'Regado' : 'Sin riego'}">
                <span class="cal-day-num">${c.day}</span>
                ${watered ? `<span class="cal-moon">💧</span>` : ''}
              </div>`;
            }
            return `<div class="cal-day ${isToday ? 'today' : ''}"
                         data-date="${c.date}"
                         title="${moon.name} · ${moon.consejo}">
              <span class="cal-day-num">${c.day}</span>
              <span class="cal-moon">${moon.emoji}</span>
            </div>`;
          }).join('')}
        </div>
        ${tab === 'general' ? `<p class="cal-legend">💧 = Riego · Luna = fase lunar del día · Toca un día para detalles</p>` : ''}
        ${tab === 'riego' ? `
          <div class="cal-riego-actions">
            <button class="btn btn-sm" id="btn-add-riego-today">💧 Registrar riego hoy</button>
            <button class="btn btn-sm btn-ghost" onclick="Watering.history()">📋 Histórico</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderLunar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, otherMonth: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, otherMonth: false, date: `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
    }
    while (cells.length % 7 !== 0) {
      const dn = cells.length - startWeekday - daysInMonth + 1;
      cells.push({ day: dn, otherMonth: true });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0,10);

    // Major phase events this month from storage
    const allEventos = (Storage.get('calendario_lunar_2026') || {}).eventos || [];
    const monthStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}`;
    const eventosDelMes = allEventos.filter(e => e.fecha.startsWith(monthStr));

    return `
      <div class="calendar-grid">
        <div class="cal-header">
          <button class="cal-nav-btn" onclick="CalendarView.prevMonth()">‹</button>
          <h3 class="cal-month-title">🌙 ${MONTHS[currentMonth]} ${currentYear}</h3>
          <button class="cal-nav-btn" onclick="CalendarView.nextMonth()">›</button>
        </div>
        <div class="cal-days-header">${DAYS.map(d => `<div>${d}</div>`).join('')}</div>
        <div class="cal-grid cal-grid-lunar">
          ${cells.map(c => {
            if (c.otherMonth) return `<div class="cal-day other-month"><span class="cal-day-num">${c.day}</span></div>`;
            const isToday = c.date === todayStr;
            const moon = getMoonPhase(new Date(c.date + 'T12:00:00Z'));
            return `<div class="cal-day cal-day-lunar ${isToday ? 'today' : ''}"
                         onclick="CalendarView.showLunarDay('${c.date}')"
                         title="${moon.name}">
              <span class="cal-moon-big">${moon.emoji}</span>
              <span class="cal-day-num">${c.day}</span>
            </div>`;
          }).join('')}
        </div>

        ${eventosDelMes.length > 0 ? `
          <div class="lunar-month-events">
            <h4>Fases principales este mes</h4>
            ${eventosDelMes.map(e => `
              <div class="lunar-event-compact">
                <span class="lunar-date-compact">${formatDate(e.fecha)}</span>
                <span class="lunar-phase-compact">${escapeHtml(e.fase)}</span>
                <span class="lunar-tip-compact">${escapeHtml(e.consejo)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="margin-top:16px;padding:14px;background:var(--past-3);border-radius:14px;">
          <p style="font-size:12px;color:var(--planta-1);">
            <strong>💡 ¿Por qué seguir el calendario lunar?</strong><br>
            En cuarto creciente y luna llena la savia sube (ideal para riego con nutrientes). En cuarto menguante y luna nueva la savia baja (ideal para podar y enraizar).
          </p>
        </div>
      </div>
    `;
  }

  function bindCalDays() {
    const btn = document.getElementById('btn-add-riego-today');
    if (btn) btn.addEventListener('click', () => showAddWateringModal(new Date().toISOString().slice(0,10)));

    document.querySelectorAll('#cal-body .cal-day[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        if (currentTab === 'riego') showAddWateringModal(cell.dataset.date);
        else if (currentTab === 'general') showDay(cell.dataset.date);
      });
    });

    document.querySelectorAll('#cal-body .cal-day-lunar[data-date]') .forEach(cell => {
      // lunar tab clicks handled via inline onclick on the element
    });
  }

  function showAddWateringModal(date) {
    const plantas = Storage.get('plantas') || [];
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin:16px 0;max-height:280px;overflow-y:auto;';
    Modal.open(`
      <h2 class="modal-title">💧 Registrar riego</h2>
      <p class="modal-subtitle">Fecha: ${formatDate(date)}</p>
      <div id="water-plant-modal-list" style="display:flex;flex-direction:column;gap:8px;margin:16px 0;max-height:280px;overflow-y:auto;">
        <button class="btn" data-all="1">Todas las plantas</button>
        ${plantas.map(p => `<button class="btn btn-ghost" data-pid="${escapeHtml(p.id)}">${escapeHtml(p.nombre)}</button>`).join('')}
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button></div>
    `);
    document.getElementById('water-plant-modal-list').querySelectorAll('button[data-pid], button[data-all]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.all) {
          Watering.markWateredDate(date);
        } else {
          const p = (Storage.get('plantas') || []).find(x => x.id === btn.dataset.pid);
          if (p) Watering.waterPlantDate(p.id, p.nombre, date);
        }
        Modal.close();
        render(currentTab);
      });
    });
  }

  function formatDate(d) {
    const dt = new Date(d + 'T12:00:00Z');
    return dt.getUTCDate() + ' ' + MONTHS[dt.getUTCMonth()].slice(0,3);
  }

  function showDay(date) {
    const calendario = Storage.get('calendario_riego') || [];
    const riegos = calendario.filter(e => e.fecha === date);
    const moon = getMoonPhase(new Date(date + 'T12:00:00Z'));

    Modal.open(`
      <h2 class="modal-title">${formatDate(date)} ${currentYear}</h2>
      <p class="modal-subtitle">Eventos del día</p>
      <div style="padding:14px;background:var(--past-3);border-radius:12px;margin-bottom:16px;">
        <strong>${moon.emoji} ${moon.name}</strong>
        <p style="font-size:13px;color:var(--text-soft);font-style:italic;margin-top:4px;">${moon.consejo}</p>
      </div>
      ${riegos.length > 0 ? `
        <h3 style="font-family:'Vito';color:var(--planta-1);margin-bottom:8px;">💧 Riegos registrados</h3>
        <ul style="list-style:none;margin-bottom:16px;">
          ${riegos.map(r => `<li style="padding:8px 12px;background:var(--past-3);border-radius:8px;margin-bottom:4px;">${escapeHtml(r.planta_nombre || 'Planta')}</li>`).join('')}
        </ul>
      ` : ''}
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="CalendarView._addWaterFromDay('${escapeHtml(date)}')">💧 Añadir riego</button>
        <button class="btn" onclick="Modal.close()">Cerrar</button>
      </div>
    `);
  }

  function showLunarDay(date) {
    const moon = getMoonPhase(new Date(date + 'T12:00:00Z'));
    Modal.open(`
      <h2 class="modal-title">${moon.emoji} ${formatDate(date)}</h2>
      <p class="modal-subtitle">${escapeHtml(moon.name)}</p>
      <div style="padding:20px;background:var(--past-2);border-radius:12px;text-align:center;margin:16px 0;">
        <div style="font-size:64px;">${moon.emoji}</div>
        <h3 style="font-family:'Vito';color:var(--planta-1);margin-top:8px;">${escapeHtml(moon.name)}</h3>
        <p style="font-size:14px;color:var(--text-soft);font-style:italic;margin-top:8px;">${escapeHtml(moon.consejo)}</p>
      </div>
      <div class="modal-actions"><button class="btn" onclick="Modal.close()">Cerrar</button></div>
    `);
  }

  // Called from showDay modal button
  function _addWaterFromDay(date) {
    Modal.close();
    setTimeout(() => showAddWateringModal(date), 150);
  }

  function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    document.getElementById('cal-body').innerHTML = currentTab === 'lunar' ? renderLunar() : renderGrid(currentTab);
    bindCalDays();
  }
  function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    document.getElementById('cal-body').innerHTML = currentTab === 'lunar' ? renderLunar() : renderGrid(currentTab);
    bindCalDays();
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { render, prevMonth, nextMonth, showDay, showLunarDay, _addWaterFromDay };
})();
