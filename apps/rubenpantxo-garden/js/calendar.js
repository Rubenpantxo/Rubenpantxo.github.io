/* ===================================================
 * CALENDAR - General / Riego / Lunar
 * =================================================== */
const CalendarView = (() => {
  let currentTab = 'general';
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

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
          <button class="cal-tab ${tab === 'riego' ? 'active' : ''}" onclick="CalendarView.render('riego')">💧 Calendario de riego</button>
          <button class="cal-tab ${tab === 'lunar' ? 'active' : ''}" onclick="CalendarView.render('lunar')">🌙 Calendario lunar</button>
        </div>

        <div id="cal-body">
          ${tab === 'lunar' ? renderLunar() : renderGrid(tab)}
        </div>
      </section>
    `;
  }

  function renderGrid(tab) {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Lunes = 0
    const daysInMonth = lastDay.getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];
    // Días del mes anterior (rellenar)
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, otherMonth: true });
    }
    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, otherMonth: false, date: `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
    }
    // Días del mes siguiente
    while (cells.length % 7 !== 0) {
      const dn = cells.length - startWeekday - daysInMonth + 1;
      cells.push({ day: dn, otherMonth: true });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0,10);
    const calendario = Storage.get('calendario_riego') || [];
    const eventosLunares = (Storage.get('calendario_lunar_2026') || {}).eventos || [];

    const html = `
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
            const watered = tab === 'riego' && calendario.some(e => e.fecha === c.date);
            const hasLunarEvent = eventosLunares.some(e => e.fecha === c.date);
            const hasEvent = tab === 'general' && (watered || hasLunarEvent);
            return `<div class="cal-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''} ${watered ? 'watered' : ''}" 
                         onclick="CalendarView.showDay('${c.date}')">${c.day}</div>`;
          }).join('')}
        </div>
        ${tab === 'general' ? `<p style="margin-top:14px;font-size:12px;color:var(--text-soft);text-align:center;">
          💧 = Riego registrado · 🟠 = Evento lunar · Click en un día para detalles
        </p>` : tab === 'riego' ? `
          <div style="display:flex;justify-content:center;gap:12px;margin-top:16px;">
            <button class="btn btn-sm" onclick="Watering.markWatered()">💧 Registrar riego hoy</button>
          </div>` : ''}
      </div>
    `;
    return html;
  }

  function renderLunar() {
    const eventos = (Storage.get('calendario_lunar_2026') || {}).eventos || [];
    return `
      <div class="calendar-grid">
        <div class="cal-header">
          <h3 class="cal-month-title">🌙 Fases lunares 2026</h3>
          <img src="assets/icons/lunas-2026.png" alt="" style="width:48px;">
        </div>
        <ul class="lunar-list">
          ${eventos.map(e => `
            <li class="lunar-event">
              <div class="lunar-date">${formatDate(e.fecha)}</div>
              <div style="flex:1;">
                <div class="lunar-phase">${escapeHtml(e.fase)}</div>
                <div class="lunar-tip">${escapeHtml(e.consejo)}</div>
              </div>
            </li>
          `).join('')}
        </ul>
        <div style="margin-top:20px;padding:16px;background:var(--past-3);border-radius:14px;">
          <p style="font-size:13px;color:var(--planta-1);">
            <strong>💡 ¿Por qué seguir el calendario lunar?</strong><br>
            La fase lunar influye en el flujo de savia: en cuarto creciente y luna llena la savia sube (ideal para riego con nutrientes y crecimiento foliar); en cuarto menguante y luna nueva la savia baja (ideal para podar y enraizar).
          </p>
        </div>
      </div>
    `;
  }

  function formatDate(d) {
    const dt = new Date(d);
    return dt.getDate() + ' ' + MONTHS[dt.getMonth()].slice(0,3);
  }

  function showDay(date) {
    const calendario = Storage.get('calendario_riego') || [];
    const eventosLunares = (Storage.get('calendario_lunar_2026') || {}).eventos || [];
    const riegos = calendario.filter(e => e.fecha === date);
    const lunar = eventosLunares.find(e => e.fecha === date);

    Modal.open(`
      <h2 class="modal-title">${formatDate(date)} de ${currentYear}</h2>
      <p class="modal-subtitle">Eventos del día</p>
      ${riegos.length > 0 ? `
        <h3 style="font-family:'Vito';color:var(--planta-1);margin-bottom:8px;">💧 Riegos registrados</h3>
        <ul style="list-style:none;margin-bottom:16px;">
          ${riegos.map(r => `<li style="padding:8px 12px;background:var(--past-3);border-radius:8px;margin-bottom:4px;">${escapeHtml(r.planta_nombre || 'Planta')}</li>`).join('')}
        </ul>
      ` : ''}
      ${lunar ? `
        <h3 style="font-family:'Vito';color:var(--planta-1);margin-bottom:8px;">🌙 Fase lunar</h3>
        <div style="padding:14px;background:var(--past-2);border-radius:12px;">
          <strong>${escapeHtml(lunar.fase)}</strong>
          <p style="font-size:13px;color:var(--text-soft);font-style:italic;margin-top:4px;">${escapeHtml(lunar.consejo)}</p>
        </div>
      ` : ''}
      ${riegos.length === 0 && !lunar ? '<p style="color:var(--text-soft);">No hay eventos registrados para este día.</p>' : ''}
      <div class="modal-actions"><button class="btn" onclick="Modal.close()">Cerrar</button></div>
    `);
  }

  function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    document.getElementById('cal-body').innerHTML = renderGrid(currentTab);
  }
  function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    document.getElementById('cal-body').innerHTML = renderGrid(currentTab);
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { render, prevMonth, nextMonth, showDay };
})();
