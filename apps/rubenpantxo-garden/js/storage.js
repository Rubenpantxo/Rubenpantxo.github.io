/* ===================================================
 * STORAGE - Gestión de LocalStorage + Seed Data
 * =================================================== */
const Storage = (() => {
  const STORAGE_KEY = 'rubenpantxo_garden_data_v1';
  const STORAGE_META = 'rubenpantxo_garden_meta_v1';
  let cache = null;

  async function loadSeedData() {
    try {
      const res = await fetch('data/seed-data.json');
      if (!res.ok) throw new Error('Seed data not found');
      return await res.json();
    } catch (err) {
      console.warn('No se pudo cargar seed-data.json:', err);
      return getMinimalSeed();
    }
  }

  function getMinimalSeed() {
    return {
      plantas: [], stock: [], lista_compra: [], tiendas: [], bancos_semillas: [],
      tabla_topcrop_soil: { fases: [] }, bidones: [
        { id: 'b1', nombre: 'Bidón 1', capacidad_litros: 200, nivel_porcentaje: 100 },
        { id: 'b2', nombre: 'Bidón 2', capacidad_litros: 200, nivel_porcentaje: 100 }
      ],
      alertas_activas: [], calendario_riego: [], calendario_lunar_2026: { eventos: [] },
      infografias_disponibles: []
    };
  }

  async function init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        cache = JSON.parse(stored);
        return cache;
      } catch (e) {
        console.warn('Datos corruptos en localStorage, recargando seed.');
      }
    }
    // Primera vez: cargar seed
    cache = await loadSeedData();
    save();
    localStorage.setItem(STORAGE_META, JSON.stringify({ initialized: new Date().toISOString(), version: 1 }));
    return cache;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  }

  function get(key) { return cache ? cache[key] : null; }
  function set(key, value) { cache[key] = value; save(); }
  function getAll() { return cache; }

  // CRUD genérico sobre listas
  function listAdd(key, item) {
    if (!Array.isArray(cache[key])) cache[key] = [];
    if (!item.id) item.id = generateId();
    cache[key].push(item);
    save();
    return item;
  }
  function listUpdate(key, id, patch) {
    const list = cache[key] || [];
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    save();
    return list[idx];
  }
  function listRemove(key, id) {
    const list = cache[key] || [];
    const before = list.length;
    cache[key] = list.filter(i => i.id !== id);
    save();
    return cache[key].length < before;
  }
  function listFind(key, id) {
    const list = cache[key] || [];
    return list.find(i => i.id === id) || null;
  }

  function generateId() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(cache, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubenpantxo-garden-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    cache = data;
    save();
    return data;
  }

  function reset() {
    if (!confirm('¿Restablecer todos los datos? Esta acción no se puede deshacer.')) return false;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_META);
    return true;
  }

  return {
    init, save, get, set, getAll,
    listAdd, listUpdate, listRemove, listFind,
    generateId, exportJSON, importJSON, reset
  };
})();
