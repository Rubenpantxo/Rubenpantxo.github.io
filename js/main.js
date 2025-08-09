// Cargar listas de platos desde localStorage o usar valores por defecto iniciales
let firstCourses = JSON.parse(localStorage.getItem('firstCourses') || 'null') || ["Ensalada mixta", "Sopa de verduras", "Macarrones con tomate"];
let secondCourses = JSON.parse(localStorage.getItem('secondCourses') || 'null') || ["Pollo asado", "Pescado al horno", "Tortilla de patatas"];
let menus = JSON.parse(localStorage.getItem('menus') || '{}');
// Guardar en localStorage las listas iniciales si no existían
localStorage.setItem('firstCourses', JSON.stringify(firstCourses));
localStorage.setItem('secondCourses', JSON.stringify(secondCourses));

// Funciones utilitarias para fechas
function formatDate(date) {
  // Formato YYYY-MM-DD para usar como clave en localStorage
  let y = date.getFullYear();
  let m = String(date.getMonth() + 1).padStart(2, '0');
  let d = String(date.getDate()).padStart(2, '0');
  return \`${y}-${m}-${d}\`;
}
function getMonday(date) {
  // Obtener el lunes de la semana de la fecha dada
  let d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let day = d.getDay();
  let diff = (day === 0 ? -6 : 1 - day);  // Si es domingo (0), retroceder 6 días; si no, retroceder day-1 días
  d.setDate(d.getDate() + diff);
  return d;
}

// Variables globales de estado
let currentWeekStart;         // Fecha (Date) del lunes de la semana actual mostrada
let currentWeekDates = [];    // Array de Date de los 7 días de la semana mostrada
let selectedDate = null;      // Fecha seleccionada en el calendario (para resaltar)

// Generar la vista del menú semanal para una semana dada
function loadWeek(weekStart) {
  currentWeekStart = new Date(weekStart.getTime());
  currentWeekDates = [];
  const fieldsContainer = document.getElementById('weekFields');
  fieldsContainer.innerHTML = '';  // limpiar contenido previo
  const dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  // Crear fila para cada día (0=Lunes, ..., 6=Domingo)
  for (let i = 0; i < 7; i++) {
    let dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    currentWeekDates.push(dayDate);
    // Etiqueta del día en español con número de fecha
    let dayName = dias[i];
    dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    let label = \`\${dayName} \${dayDate.getDate()}/\${dayDate.getMonth() + 1}\`;
    // Construir elemento de fila con campos
    const row = document.createElement('div');
    row.className = "flex items-center gap-2";
    row.innerHTML = `
      <div class="w-28 font-medium">\${label}</div>
      <select data-day-index="\${i}" class="firstSelect border px-1 py-0.5 flex-1">
        <option value="">- 1º plato -</option>
      </select>
      <select data-day-index="\${i}" class="secondSelect border px-1 py-0.5 flex-1">
        <option value="">- 2º plato -</option>
      </select>
      <input type="text" data-day-index="\${i}" class="dessertInput border px-1 py-0.5 flex-1" placeholder="Postre / Notas" />
    `;
    fieldsContainer.appendChild(row);
  }
  // Rellenar opciones de selects con las listas de platos actuales
  document.querySelectorAll('select.firstSelect').forEach(select => {
    firstCourses.forEach(dish => {
      const opt = document.createElement('option');
      opt.value = dish;
      opt.textContent = dish;
      select.appendChild(opt);
    });
  });
  document.querySelectorAll('select.secondSelect').forEach(select => {
    secondCourses.forEach(dish => {
      const opt = document.createElement('option');
      opt.value = dish;
      opt.textContent = dish;
      select.appendChild(opt);
    });
  });
  // Establecer valores seleccionados según lo guardado en menus (si existe)
  for (let i = 0; i < 7; i++) {
    const key = formatDate(currentWeekDates[i]);
    const menu = menus[key];
    if (menu) {
      if (menu.first) {
        document.querySelector(\`select.firstSelect[data-day-index="\${i}"]\`).value = menu.first;
      }
      if (menu.second) {
        document.querySelector(\`select.secondSelect[data-day-index="\${i}"]\`).value = menu.second;
      }
      if (menu.dessert) {
        document.querySelector(\`input.dessertInput[data-day-index="\${i}"]\`).value = menu.dessert;
      }
    }
  }
  // Añadir manejadores de evento para guardar cambios en cada campo
  document.querySelectorAll('select.firstSelect').forEach(select => {
    select.addEventListener('change', () => {
      const idx = select.dataset.dayIndex;
      const key = formatDate(currentWeekDates[idx]);
      if (!menus[key]) menus[key] = {};
      menus[key].first = select.value;
      localStorage.setItem('menus', JSON.stringify(menus));
      updateShoppingList();
    });
  });
  document.querySelectorAll('select.secondSelect').forEach(select => {
    select.addEventListener('change', () => {
      const idx = select.dataset.dayIndex;
      const key = formatDate(currentWeekDates[idx]);
      if (!menus[key]) menus[key] = {};
      menus[key].second = select.value;
      localStorage.setItem('menus', JSON.stringify(menus));
      updateShoppingList();
    });
  });
  document.querySelectorAll('input.dessertInput').forEach(input => {
    input.addEventListener('change', () => {
      const idx = input.dataset.dayIndex;
      const key = formatDate(currentWeekDates[idx]);
      if (!menus[key]) menus[key] = {};
      menus[key].dessert = input.value;
      localStorage.setItem('menus', JSON.stringify(menus));
    });
  });
  // Actualizar la lista de la compra una vez cargada la semana
  updateShoppingList();
}

function updateShoppingList() {
  const listDiv = document.getElementById('shoppingList');
  listDiv.innerHTML = '';
  let items = [];
  // Reunir todos los 1º y 2º platos seleccionados en la semana actual
  currentWeekDates.forEach(date => {
    const key = formatDate(date);
    const menu = menus[key];
    if (menu) {
      if (menu.first) items.push(menu.first);
      if (menu.second) items.push(menu.second);
    }
  });
  // Eliminar duplicados en la lista
  items = [...new Set(items)];
  if (items.length === 0) {
    listDiv.innerHTML = '<p class="text-gray-500">No hay platos seleccionados.</p>';
  } else {
    items.forEach(item => {
      const p = document.createElement('p');
      p.textContent = item;
      listDiv.appendChild(p);
    });
  }
}

// Funciones para refrescar la UI de los modales de edición de platos
function refreshFirstListUI() {
  const container = document.getElementById('firstListContainer');
  container.innerHTML = '';
  firstCourses.forEach((dish, index) => {
    const div = document.createElement('div');
    div.className = 'flex justify-between mb-1';
    div.innerHTML = \`<span>\${dish}</span>
                     <button data-index="\${index}" class="removeFirstBtn text-red-500 hover:underline">Eliminar</button>\`;
    container.appendChild(div);
  });
  // Añadir eventos de eliminar a cada botón de la lista
  document.querySelectorAll('.removeFirstBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.index;
      const removed = firstCourses[idx];
      // Eliminar plato de la lista de primeros
      firstCourses.splice(idx, 1);
      localStorage.setItem('firstCourses', JSON.stringify(firstCourses));
      // Si este plato estaba seleccionado en la semana actual, quitarlo
      currentWeekDates.forEach(date => {
        const key = formatDate(date);
        if (menus[key] && menus[key].first === removed) {
          delete menus[key].first;
        }
      });
      localStorage.setItem('menus', JSON.stringify(menus));
      // Refrescar UI del modal y del menú semanal
      refreshFirstListUI();
      loadWeek(currentWeekStart);
    });
  });
}

function refreshSecondListUI() {
  const container = document.getElementById('secondListContainer');
  container.innerHTML = '';
  secondCourses.forEach((dish, index) => {
    const div = document.createElement('div');
    div.className = 'flex justify-between mb-1';
    div.innerHTML = \`<span>\${dish}</span>
                     <button data-index="\${index}" class="removeSecondBtn text-red-500 hover:underline">Eliminar</button>\`;
    container.appendChild(div);
  });
  document.querySelectorAll('.removeSecondBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.index;
      const removed = secondCourses[idx];
      // Eliminar plato de la lista de segundos
      secondCourses.splice(idx, 1);
      localStorage.setItem('secondCourses', JSON.stringify(secondCourses));
      // Quitar de la semana actual si estaba seleccionado
      currentWeekDates.forEach(date => {
        const key = formatDate(date);
        if (menus[key] && menus[key].second === removed) {
          delete menus[key].second;
        }
      });
      localStorage.setItem('menus', JSON.stringify(menus));
      // Refrescar UI del modal y del menú semanal
      refreshSecondListUI();
      loadWeek(currentWeekStart);
    });
  });
}

// Manejadores de botones para abrir/cerrar modales y añadir platos nuevos
document.getElementById('editFirstBtn').addEventListener('click', () => {
  refreshFirstListUI();
  document.getElementById('modalFirst').classList.remove('hidden');
});
document.getElementById('editSecondBtn').addEventListener('click', () => {
  refreshSecondListUI();
  document.getElementById('modalSecond').classList.remove('hidden');
});
document.getElementById('addFirstBtn').addEventListener('click', () => {
  const input = document.getElementById('newFirstInput');
  const newDish = input.value.trim();
  if (newDish) {
    firstCourses.push(newDish);
    localStorage.setItem('firstCourses', JSON.stringify(firstCourses));
    input.value = '';
    refreshFirstListUI();
    loadWeek(currentWeekStart);
  }
});
document.getElementById('addSecondBtn').addEventListener('click', () => {
  const input = document.getElementById('newSecondInput');
  const newDish = input.value.trim();
  if (newDish) {
    secondCourses.push(newDish);
    localStorage.setItem('secondCourses', JSON.stringify(secondCourses));
    input.value = '';
    refreshSecondListUI();
    loadWeek(currentWeekStart);
  }
});
document.getElementById('closeFirstModal').addEventListener('click', () => {
  document.getElementById('modalFirst').classList.add('hidden');
});
document.getElementById('closeSecondModal').addEventListener('click', () => {
  document.getElementById('modalSecond').classList.add('hidden');
});
// Cerrar modal al hacer click fuera del cuadro de contenido
document.getElementById('modalFirst').addEventListener('click', (e) => {
  if (e.target.id === 'modalFirst') {
    e.target.classList.add('hidden');
  }
});
document.getElementById('modalSecond').addEventListener('click', (e) => {
  if (e.target.id === 'modalSecond') {
    e.target.classList.add('hidden');
  }
});

// Botones de copiar lista y reiniciar semana
document.getElementById('copyListBtn').addEventListener('click', () => {
  const text = document.getElementById('shoppingList').innerText;
  navigator.clipboard.writeText(text || '').then(() => {
    alert('Lista copiada al portapapeles');
  });
});
document.getElementById('resetWeekBtn').addEventListener('click', () => {
  if (confirm('¿Reiniciar el menú de esta semana?')) {
    currentWeekDates.forEach(date => {
      const key = formatDate(date);
      if (menus[key]) {
        delete menus[key];
      }
    });
    localStorage.setItem('menus', JSON.stringify(menus));
    loadWeek(currentWeekStart);
  }
});

// Configuración del calendario mensual
const monthsNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
                     "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
let today = new Date();
let calendarYear = today.getFullYear();
let calendarMonth = today.getMonth();

function generateCalendar(year, month) {
  const firstDayIndex = new Date(year, month, 1).getDay();                // día de la semana del 1° del mes
  const prevMonthLastDay = new Date(year, month, 0).getDate();            // último día del mes anterior
  const currMonthLastDay = new Date(year, month + 1, 0).getDate();        // último día del mes actual
  const lastDayIndex = new Date(year, month, currMonthLastDay).getDay();  // día de la semana del último día del mes actual
  // Cálculo de días de relleno para que la semana comience en lunes
  const startIndex = (firstDayIndex === 0 ? 6 : firstDayIndex - 1);  // días de mes anterior a mostrar antes del día 1
  const endIndex = (lastDayIndex === 0 ? 6 : lastDayIndex - 1);      // días de mes siguiente a mostrar después del último día
  let daysHtml = '';
  // Días del mes anterior (en gris, inactivos)
  for (let x = startIndex; x > 0; x--) {
    daysHtml += \`<li class="text-gray-400">\${prevMonthLastDay - x + 1}</li>\`;
  }
  // Días del mes actual
  for (let d = 1; d <= currMonthLastDay; d++) {
    let classes = "cursor-pointer";
    // Resaltar hoy con fondo azul
    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      classes += " bg-blue-500 text-white rounded-full";
    }
    // Resaltar día seleccionado con borde punteado
    if (selectedDate && d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) {
      classes += " border-2 border-blue-500 border-dashed rounded-full";
    }
    daysHtml += \`<li class="\${classes}" data-day="\${d}">\${d}</li>\`;
  }
  // Días del mes siguiente (en gris)
  for (let y = endIndex; y < 6; y++) {
    daysHtml += \`<li class="text-gray-400">\${y - endIndex + 1}</li>\`;
  }
  // Insertar el HTML de los días y poner el encabezado con mes y año
  document.getElementById('calendarDates').innerHTML = daysHtml;
  document.getElementById('currentMonth').textContent =
    monthsNames[month].charAt(0).toUpperCase() + monthsNames[month].slice(1) + " " + year;
  // Asociar evento de clic a cada día del mes actual
  document.querySelectorAll('#calendarDates li[data-day]').forEach(dayElem => {
    dayElem.addEventListener('click', () => {
      const day = parseInt(dayElem.getAttribute('data-day'));
      selectedDate = new Date(year, month, day);
      // Cargar el menú de la semana correspondiente a la fecha seleccionada
      loadWeek(getMonday(selectedDate));
      // Regenerar calendario para actualizar el resaltado de la fecha seleccionada
      generateCalendar(year, month);
    });
  });
}

// Navegación del calendario (mes anterior/siguiente)
document.getElementById('prevMonth').addEventListener('click', () => {
  calendarMonth--;
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }
  selectedDate = null;
  generateCalendar(calendarYear, calendarMonth);
});
document.getElementById('nextMonth').addEventListener('click', () => {
  calendarMonth++;
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  selectedDate = null;
  generateCalendar(calendarYear, calendarMonth);
});

// Inicializar la vista con la semana actual y el mes actual
loadWeek(getMonday(today));
generateCalendar(calendarYear, calendarMonth);
