// Gestión de menús semanales
// Autor: RubénPantxo adaptado

// ----- Datos por defecto -----
const defaultFirstList = [
  { name: "Macarrones..", icon: "🍝" },
  { name: "Espaguetis", icon: "🍝" },
  { name: "Sopa", icon: "🍲" },
  { name: "Croquetas..", icon: "🍗" },
  { name: "Esprragos", icon: "🥬" },
  { name: "Calderete", icon: "🍲" },
  { name: "Arroz", icon: "🍚" },
  { name: "Borraja", icon: "🥬" },
  { name: "Alubia Verde", icon: "🫘" },
  { name: "Menestra", icon: "🥣" },
  { name: "Coliflor", icon: "🥦" },
  { name: "Brocoli", icon: "🥦" },
  { name: "Cardo..", icon: "🥬" },
  { name: "ENSALADAS Pasta", icon: "🥗" },
  { name: "ENSALADAS Garbanzos", icon: "🥗" },
  { name: "ENSALADAS Endivias", icon: "🥗" },
  { name: "ENSALADAS Nueces, manzana Queso", icon: "🥗" },
  { name: "ENSALADAS Rusa", icon: "🥗" },
  { name: "Gazpacho", icon: "🍅" },
  { name: "Pisto", icon: "🍆" },
  { name: "Pochas", icon: "🫘" },
  { name: "Garbanzos..", icon: "🫘" },
  { name: "Lentejas", icon: "🫘" },
  { name: "Arroz a la cubana", icon: "🍛" },
  { name: "Patatas a la Riojana", icon: "🥔" },
  { name: "Pure", icon: "🥣" }
];

const defaultSecondList = [
  { name: "CARNES🥩", icon: "" },
  { name: "lomo..", icon: "🥩" },
  { name: "Pechugas", icon: "🍗" },
  { name: "Muslitos de pollo", icon: "🍗" },
  { name: "Pavo", icon: "🍗" },
  { name: "Conejo", icon: "🥩" },
  { name: "Cordero..", icon: "🥩" },
  { name: "Pollo..", icon: "🍗" },
  { name: "Solomillo..", icon: "🥩" },
  { name: "Filetes", icon: "🥩" },
  { name: "Cachopo", icon: "🥩" },
  { name: "Ternera guisada", icon: "🥩" },
  { name: "Carrilleras", icon: "🥩" },
  { name: "Albondigas", icon: "🥩" },
  { name: "Caracoles", icon: "🍲" },
  { name: "PESCADOS🐟", icon: "" },
  { name: "Merluza", icon: "🐟" },
  { name: "Bonito", icon: "🐟" },
  { name: "Anchoas", icon: "🐟" },
  { name: "Bacalao", icon: "🐟" },
  { name: "Chicharro", icon: "🐟" },
  { name: "Salmonetes", icon: "🐟" },
  { name: "Calamares", icon: "🦑" }
];

// Cargar datos desde localStorage o usar por defecto
let firstList = JSON.parse(localStorage.getItem('firstList') || 'null') || defaultFirstList.slice();
let secondList = JSON.parse(localStorage.getItem('secondList') || 'null') || defaultSecondList.slice();
let menus = JSON.parse(localStorage.getItem('menus') || '{}');
let shopExtras = JSON.parse(localStorage.getItem('shopExtras') || '[]');

// Guardar datos en localStorage
function saveLists() {
  localStorage.setItem('firstList', JSON.stringify(firstList));
  localStorage.setItem('secondList', JSON.stringify(secondList));
}
function saveMenus() {
  localStorage.setItem('menus', JSON.stringify(menus));
}
function saveShopExtras() {
  localStorage.setItem('shopExtras', JSON.stringify(shopExtras));
}

// Utilidades de fechas
function getMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function formatDate(date) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
}

// Estado actual
let currentWeekStart = getMonday(new Date());
let selectedDate = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

// Elementos del DOM
const weekContainer = document.getElementById('weekContainer');
const shoppingListDiv = document.getElementById('shoppingList');
const newItemInput = document.getElementById('newShoppingItem');

// ---------- Construcción de select de iconos ----------
// Lista de emojis agrupados según categorías proporcionadas
const emojiGroups = {
  Frutas: [
    '🍇', '🍈', '🍉', '🍊', '🍋', '🍋\u200d🟩', '🍌', '🍍', '🥭', '🍎',
    '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥'
  ],
  Verduras: [
    '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦',
    '🧄', '🧅', '🥜', '🫘', '🌰', '🫚', '🫛', '🍄\u200d🟫'
  ],
  'Comidas preparadas': [
    '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖',
    '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯',
    '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗',
    '🍿', '🧈', '🧂', '🥫', '🍝'
  ],
  'Comida asiática': [
    '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍠', '🍢', '🍣', '🍤',
    '🍥', '🥮', '🍡', '🥟', '🥠', '🥡'
  ],
  'Dulces y postres': [
    '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫',
    '🍬', '🍭', '🍮', '🍯'
  ],
  'Bebidas y vajilla': [
    '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹',
    '🍺', '🍻', '🥂', '🥃', '🫗', '🥤', '🧋', '🧃', '🧉', '🥢',
    '🍽️', '🍴', '🥄', '🔪', '🫙', '🏺'
  ]
};

// Genera select de emojis para los formularios de alta/edición de platos
function buildEmojiSelect(selectElem) {
  selectElem.innerHTML = '<option value="">– sin icono –</option>';
  Object.keys(emojiGroups).forEach(group => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = group;
    emojiGroups[group].forEach(emoji => {
      const opt = document.createElement('option');
      opt.value = emoji;
      opt.textContent = emoji;
      optGroup.appendChild(opt);
    });
    selectElem.appendChild(optGroup);
  });
}

// Generar opciones para los selects de primeros
function buildFirstOptionsHTML() {
  let html = '<option value="">— 1º plato —</option>';
  firstList.forEach(item => {
    html += `<option value="${item.name}">${item.icon ? item.icon + ' ' : ''}${item.name}</option>`;
  });
  return html;
}
// Generar opciones para los selects de segundos con subtítulos (sin subgrupos reales)
function buildSecondOptionsHTML() {
  const others = [];
  const carnes = [];
  const pescados = [];
  secondList.forEach(item => {
    if (item.name.startsWith('CARNES')) return; // salto, encabezado
    if (item.name.startsWith('PESCADOS')) return;
    if (secondList.some(i => i.name === 'CARNES🥩') && carnes.length === 0 && item === secondList[1]) {
      // not used; classification later
    }
  });
  secondList.forEach(item => {
    if (item.name.startsWith('CARNES')) return;
    if (item.name.startsWith('PESCADOS')) return;
    // determine if before/after categories
    const idx = secondList.findIndex(e => e.name.startsWith('CARNES'));
    const idxFish = secondList.findIndex(e => e.name.startsWith('PESCADOS'));
    const itemIdx = secondList.indexOf(item);
    if (itemIdx > idx && (idxFish < 0 || itemIdx < idxFish)) {
      carnes.push(item);
    } else if (idxFish >= 0 && itemIdx > idxFish) {
      pescados.push(item);
    } else {
      others.push(item);
    }
  });
  let html = '<option value="">— 2º plato —</option>';
  others.forEach(item => {
    html += `<option value="${item.name}">${item.icon ? item.icon + ' ' : ''}${item.name}</option>`;
  });
  if (carnes.length > 0) {
    html += '<option value="" disabled>────────  CARNES  ────────</option>';
    carnes.forEach(item => {
      html += `<option value="${item.name}">${item.icon ? item.icon + ' ' : ''}${item.name}</option>`;
    });
  }
  if (pescados.length > 0) {
    html += '<option value="" disabled>──────── PESCADOS ────────</option>';
    pescados.forEach(item => {
      html += `<option value="${item.name}">${item.icon ? item.icon + ' ' : ''}${item.name}</option>`;
    });
  }
  return html;
}

// ---------- Generar filas del menú semanal ----------
function loadWeek(startDate) {
  currentWeekStart = new Date(startDate);
  weekContainer.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const key = formatDate(date);
    const menu = menus[key] || {};
    // Crear contenedor de fila usando grid
    const row = document.createElement('div');
    row.className = 'week-grid bg-white rounded p-1';
    // Nombre del día (ej. Lunes 1/8)
    const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date);
    const label = document.createElement('div');
    label.className = 'font-medium cursor-pointer hover:underline';
    label.textContent =
      dayName.charAt(0).toUpperCase() + dayName.slice(1) + ' ' + date.getDate() + '/' + (date.getMonth() + 1);
    label.addEventListener('click', () => {
      openDayModal(date);
    });
    row.appendChild(label);
    // Select 1º plato
    const selectFirst = document.createElement('select');
    selectFirst.innerHTML = buildFirstOptionsHTML();
    selectFirst.value = menu.first || '';
    selectFirst.className = 'border px-1 py-0.5';
    selectFirst.addEventListener('change', () => {
      if (!menus[key]) menus[key] = {};
      menus[key].first = selectFirst.value;
      saveMenus();
      renderIcons(row, menu, key);
      updateShoppingList();
    });
    row.appendChild(selectFirst);
    // Select 2º plato
    const selectSecond = document.createElement('select');
    selectSecond.innerHTML = buildSecondOptionsHTML();
    selectSecond.value = menu.second || '';
    selectSecond.className = 'border px-1 py-0.5';
    selectSecond.addEventListener('change', () => {
      if (!menus[key]) menus[key] = {};
      menus[key].second = selectSecond.value;
      saveMenus();
      renderIcons(row, menu, key);
      updateShoppingList();
    });
    row.appendChild(selectSecond);
    // Input de postre/notas
    const dessertInput = document.createElement('input');
    dessertInput.type = 'text';
    dessertInput.className = 'border px-1 py-0.5';
    dessertInput.placeholder = 'Postre / notas';
    dessertInput.value = menu.dessert || '';
    dessertInput.addEventListener('change', () => {
      if (!menus[key]) menus[key] = {};
      menus[key].dessert = dessertInput.value;
      saveMenus();
    });
    row.appendChild(dessertInput);
    // Contenedor de iconos
    const iconDiv = document.createElement('div');
    iconDiv.className = 'text-lg';
    renderIcons(row, menu, key);
    row.appendChild(iconDiv);
    // Almacena contenedor de iconos en dataset para reutilizar
    row.dataset.iconDiv = '';
    row.lastChild = iconDiv;
    weekContainer.appendChild(row);
  }
}

// Rellenar los iconos en la fila
function renderIcons(row, menu, key) {
  // Basado en selects actualizados
  const iconDiv = row.lastChild; // icon container at last
  iconDiv.innerHTML = '';
  const first = menus[key] ? menus[key].first : null;
  const second = menus[key] ? menus[key].second : null;
  if (first) {
    const f = firstList.find(item => item.name === first);
    if (f && f.icon) {
      const span = document.createElement('span');
      span.textContent = f.icon;
      iconDiv.appendChild(span);
    }
  }
  if (second) {
    const s = secondList.find(item => item.name === second);
    if (s && s.icon) {
      const span = document.createElement('span');
      span.textContent = s.icon;
      iconDiv.appendChild(span);
    }
  }
}

// ---------- Lista de la compra ----------
function updateShoppingList() {
  shoppingListDiv.innerHTML = '';
  // Recoger platos de la semana
  const items = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    const key = formatDate(date);
    const menu = menus[key];
    if (menu) {
      if (menu.first) items.push(menu.first);
      if (menu.second) items.push(menu.second);
    }
  }
  // Incluir extras manuales
  shopExtras.forEach(x => items.push(x));
  // Eliminar duplicados
  const unique = [...new Set(items)];
  if (unique.length === 0) {
    shoppingListDiv.innerHTML = '<p class="text-gray-500">No hay ingredientes.</p>';
  } else {
    unique.forEach(item => {
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center border-b py-0.5 text-sm';
      div.innerHTML = `<span>${item}</span><button class="text-red-500 text-xs" data-item="${item}">Quitar</button>`;
      shoppingListDiv.appendChild(div);
    });
    // Listeners de quitar
    shoppingListDiv.querySelectorAll('button[data-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.item;
        // Eliminar de extras manuales si existe
        const idx = shopExtras.indexOf(value);
        if (idx >= 0) {
          shopExtras.splice(idx, 1);
          saveShopExtras();
        }
        // Eliminar de menús de la semana
        for (let i = 0; i < 7; i++) {
          const date = new Date(currentWeekStart);
          date.setDate(currentWeekStart.getDate() + i);
          const key = formatDate(date);
          const m = menus[key];
          if (m) {
            if (m.first === value) delete m.first;
            if (m.second === value) delete m.second;
          }
        }
        saveMenus();
        loadWeek(currentWeekStart);
        updateShoppingList();
      });
    });
  }
}

// Añadir extra a lista
document.getElementById('addShoppingItem').addEventListener('click', () => {
  const val = newItemInput.value.trim();
  if (val) {
    shopExtras.push(val);
    saveShopExtras();
    newItemInput.value = '';
    updateShoppingList();
  }
});
// Copiar lista al portapapeles
document.getElementById('copyShopping').addEventListener('click', () => {
  const text = Array.from(shoppingListDiv.querySelectorAll('span'))
    .map(el => el.textContent)
    .join('\n');
  navigator.clipboard.writeText(text).then(() => {
    alert('Lista copiada al portapapeles');
  });
});
// Vaciar lista manual
document.getElementById('clearShopping').addEventListener('click', () => {
  if (confirm('¿Vaciar la lista de la compra?')) {
    shopExtras = [];
    saveShopExtras();
    updateShoppingList();
  }
});
// Reiniciar menú de la semana
document.getElementById('resetWeek').addEventListener('click', () => {
  if (confirm('¿Reiniciar el menú de esta semana?')) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      const key = formatDate(date);
      if (menus[key]) delete menus[key];
    }
    saveMenus();
    loadWeek(currentWeekStart);
    updateShoppingList();
  }
});

// ---------- Calendario ----------
const monthLabel = document.getElementById('monthLabel');
const calendarList = document.getElementById('calendar');
function generateCalendar(year, month) {
  calendarList.innerHTML = '';
  monthLabel.textContent = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric'
  })
    .format(new Date(year, month))
    .replace(/^./, m => m.toUpperCase());
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7; // lunes como 0
  const daysInMonth = lastDayOfMonth.getDate();
  // Días del mes anterior para completar
  const prevLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const li = document.createElement('li');
    li.textContent = prevLastDate - i;
    li.className = 'text-gray-400';
    calendarList.appendChild(li);
  }
  // Días del mes actual
  for (let d = 1; d <= daysInMonth; d++) {
    const li = document.createElement('li');
    li.textContent = d;
    li.className = 'cursor-pointer p-1';
    const thisDate = new Date(year, month, d);
    const today = new Date();
    if (
      thisDate.getDate() === today.getDate() &&
      thisDate.getMonth() === today.getMonth() &&
      thisDate.getFullYear() === today.getFullYear()
    ) {
      li.classList.add('bg-green-300', 'rounded-full');
    }
    const mkey = formatDate(thisDate);
    if (menus[mkey] && (menus[mkey].first || menus[mkey].second)) {
      li.classList.add('border-green-500', 'border', 'rounded-full');
    }
    // Resaltar fecha seleccionada
    if (
      selectedDate &&
      thisDate.getDate() === selectedDate.getDate() &&
      thisDate.getMonth() === selectedDate.getMonth() &&
      thisDate.getFullYear() === selectedDate.getFullYear()
    ) {
      li.classList.add('ring', 'ring-blue-500');
    }
    li.addEventListener('click', () => {
      selectedDate = thisDate;
      loadWeek(getMonday(thisDate));
      updateShoppingList();
      generateCalendar(year, month);
    });
    calendarList.appendChild(li);
  }
  // Días del mes siguiente para completar 6 filas
  const totalCells = calendarList.children.length;
  const cellsToAdd = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  for (let j = 1; j <= cellsToAdd; j++) {
    const li = document.createElement('li');
    li.textContent = j;
    li.className = 'text-gray-400';
    calendarList.appendChild(li);
  }
}

// Navegar por meses
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

// ---------- Modales de edición de listas ----------
const modalFirst = document.getElementById('modalFirst');
const modalSecond = document.getElementById('modalSecond');
const firstListUI = document.getElementById('firstListUI');
const secondListUI = document.getElementById('secondListUI');
const newFirstIcon = document.getElementById('newFirstIcon');
const newSecondIcon = document.getElementById('newSecondIcon');

// abrir modales desde imágenes
document.getElementById('editFirstImg').addEventListener('click', () => {
  refreshFirstListUI();
  buildEmojiSelect(newFirstIcon);
  modalFirst.classList.remove('hidden');
});
document.getElementById('editSecondImg').addEventListener('click', () => {
  refreshSecondListUI();
  buildEmojiSelect(newSecondIcon);
  modalSecond.classList.remove('hidden');
});

// cerrar modales
document.getElementById('closeFirstModal').addEventListener('click', () => {
  modalFirst.classList.add('hidden');
});
document.getElementById('closeSecondModal').addEventListener('click', () => {
  modalSecond.classList.add('hidden');
});

// añadir nuevo plato en listas
document.getElementById('addFirstBtn').addEventListener('click', () => {
  const name = document.getElementById('newFirstName').value.trim();
  const icon = newFirstIcon.value;
  if (name) {
    firstList.push({ name, icon });
    saveLists();
    document.getElementById('newFirstName').value = '';
    newFirstIcon.value = '';
    refreshFirstListUI();
    loadWeek(currentWeekStart);
  }
});
document.getElementById('addSecondBtn').addEventListener('click', () => {
  const name = document.getElementById('newSecondName').value.trim();
  const icon = newSecondIcon.value;
  if (name) {
    secondList.push({ name, icon });
    saveLists();
    document.getElementById('newSecondName').value = '';
    newSecondIcon.value = '';
    refreshSecondListUI();
    loadWeek(currentWeekStart);
  }
});

// Generar UI para listas de primeros
function refreshFirstListUI() {
  firstListUI.innerHTML = '';
  firstList.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'flex items-center space-x-2';
    // Icono
    const iconSpan = document.createElement('span');
    iconSpan.textContent = item.icon || '';
    row.appendChild(iconSpan);
    // Nombre editable
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = item.name;
    nameInput.className = 'border p-1 flex-grow';
    nameInput.addEventListener('change', () => {
      // Actualiza nombre en lista y en menús
      const oldName = item.name;
      item.name = nameInput.value.trim();
      // Actualizar menús que usen el antiguo
      Object.keys(menus).forEach(key => {
        const m = menus[key];
        if (m && m.first === oldName) {
          m.first = item.name;
        }
      });
      saveMenus();
      saveLists();
      loadWeek(currentWeekStart);
      updateShoppingList();
    });
    row.appendChild(nameInput);
    // Selector de icono
    const selectIcon = document.createElement('select');
    buildEmojiSelect(selectIcon);
    selectIcon.value = item.icon || '';
    selectIcon.className = 'border p-1';
    selectIcon.addEventListener('change', () => {
      item.icon = selectIcon.value;
      saveLists();
      loadWeek(currentWeekStart);
    });
    row.appendChild(selectIcon);
    // Botón eliminar
    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.className = 'text-red-500 px-2';
    delBtn.addEventListener('click', () => {
      const removed = firstList.splice(idx, 1)[0];
      // Eliminar en menús
      Object.keys(menus).forEach(key => {
        const m = menus[key];
        if (m && m.first === removed.name) {
          delete m.first;
        }
      });
      saveMenus();
      saveLists();
      refreshFirstListUI();
      loadWeek(currentWeekStart);
      updateShoppingList();
    });
    row.appendChild(delBtn);
    firstListUI.appendChild(row);
  });
}
// Generar UI para listas de segundos
function refreshSecondListUI() {
  secondListUI.innerHTML = '';
  secondList.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'flex items-center space-x-2';
    // Determinar si es cabecera
    const isHeader = item.name.startsWith('CARNES') || item.name.startsWith('PESCADOS');
    if (isHeader) {
      row.innerHTML = `<span class="font-bold">${item.name}</span>`;
      secondListUI.appendChild(row);
      return;
    }
    // Icono
    const iconSpan = document.createElement('span');
    iconSpan.textContent = item.icon || '';
    row.appendChild(iconSpan);
    // Nombre editable
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = item.name;
    nameInput.className = 'border p-1 flex-grow';
    nameInput.addEventListener('change', () => {
      const oldName = item.name;
      item.name = nameInput.value.trim();
      // Actualizar menús
      Object.keys(menus).forEach(key => {
        const m = menus[key];
        if (m && m.second === oldName) {
          m.second = item.name;
        }
      });
      saveMenus();
      saveLists();
      loadWeek(currentWeekStart);
      updateShoppingList();
    });
    row.appendChild(nameInput);
    // Selector de icono
    const selectIcon = document.createElement('select');
    buildEmojiSelect(selectIcon);
    selectIcon.value = item.icon || '';
    selectIcon.className = 'border p-1';
    selectIcon.addEventListener('change', () => {
      item.icon = selectIcon.value;
      saveLists();
      loadWeek(currentWeekStart);
    });
    row.appendChild(selectIcon);
    // Botón eliminar
    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.className = 'text-red-500 px-2';
    delBtn.addEventListener('click', () => {
      const removed = secondList.splice(idx, 1)[0];
      Object.keys(menus).forEach(key => {
        const m = menus[key];
        if (m && m.second === removed.name) {
          delete m.second;
        }
      });
      saveMenus();
      saveLists();
      refreshSecondListUI();
      loadWeek(currentWeekStart);
      updateShoppingList();
    });
    row.appendChild(delBtn);
    secondListUI.appendChild(row);
  });
}

// ---------- Modal diario ----------
const modalDay = document.getElementById('modalDay');
const dayTitle = document.getElementById('dayTitle');
const dayFirstSelect = document.getElementById('dayFirstSelect');
const daySecondSelect = document.getElementById('daySecondSelect');
const dayDessertInput = document.getElementById('dayDessertInput');
let editingDate = null;

function openDayModal(date) {
  editingDate = new Date(date);
  const key = formatDate(editingDate);
  const menu = menus[key] || {};
  dayTitle.textContent =
    new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
      .format(editingDate)
      .replace(/^./, c => c.toUpperCase());
  // Generar selects
  dayFirstSelect.innerHTML = buildFirstOptionsHTML();
  dayFirstSelect.value = menu.first || '';
  daySecondSelect.innerHTML = buildSecondOptionsHTML();
  daySecondSelect.value = menu.second || '';
  dayDessertInput.value = menu.dessert || '';
  modalDay.classList.remove('hidden');
}

// Guardar día
document.getElementById('saveDayBtn').addEventListener('click', () => {
  const key = formatDate(editingDate);
  if (!menus[key]) menus[key] = {};
  menus[key].first = dayFirstSelect.value;
  menus[key].second = daySecondSelect.value;
  menus[key].dessert = dayDessertInput.value.trim();
  saveMenus();
  loadWeek(currentWeekStart);
  updateShoppingList();
  modalDay.classList.add('hidden');
});
// Cerrar modal día
document.getElementById('closeDayModal').addEventListener('click', () => {
  modalDay.classList.add('hidden');
});

// ---------- Navegación de semana ----------
document.getElementById('prevWeek').addEventListener('click', () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  selectedDate = null;
  loadWeek(currentWeekStart);
  updateShoppingList();
});
document.getElementById('nextWeek').addEventListener('click', () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  selectedDate = null;
  loadWeek(currentWeekStart);
  updateShoppingList();
});

// ---------- Inicialización ----------
window.addEventListener('DOMContentLoaded', () => {
  generateCalendar(calendarYear, calendarMonth);
  loadWeek(currentWeekStart);
  updateShoppingList();
});
