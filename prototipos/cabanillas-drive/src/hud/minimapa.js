// Minimapa circular: el mapa de la zona se dibuja una vez (calles, caminos, agua, parques y
// edificios de los GeoJSON) y en cada fotograma se recorta alrededor del jugador, girado
// con el rumbo o con el norte arriba. La «N» del borde marca siempre el norte.
import { HUD } from '../config/hud.js';

const ANCHO_CALLE = { primary: 9, primary_link: 7, secondary: 8, tertiary: 7, residential: 6, unclassified: 6,
  living_street: 5, service: 4, pedestrian: 4 };
const USOS_VERDES = new Set(['park', 'grass', 'forest', 'orchard', 'allotments', 'greenfield', 'cemetery']);

function recorre(geometria, fn) {
  const { type, coordinates } = geometria;
  if (type === 'LineString') fn(coordinates, false);
  else if (type === 'MultiLineString') coordinates.forEach((c) => fn(c, false));
  else if (type === 'Polygon') fn(coordinates, true);
  else if (type === 'MultiPolygon') coordinates.forEach((c) => fn(c, true));
}

function creaMapa({ calles, caminos, agua, usos, edificios }, zona) {
  const cfg = HUD.minimapa;
  const col = cfg.colores;
  const s = cfg.pixelesPorMetro;
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(zona.ancho * s);
  lienzo.height = Math.round(zona.alto * s);
  const ctx = lienzo.getContext('2d');
  const px = ([x, z]) => [(x - zona.x0) * s, (z - zona.z0) * s];

  const traza = (coords, cerrado) => {
    ctx.beginPath();
    const anillos = cerrado ? coords : [coords];
    for (const anillo of anillos) {
      anillo.forEach((p, i) => {
        const [x, y] = px(p);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      if (cerrado) ctx.closePath();
    }
  };

  ctx.fillStyle = col.fondo;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  for (const f of usos?.features ?? []) {
    const verde = USOS_VERDES.has(f.properties.tipo);
    const campo = f.properties.tipo === 'farmland';
    if (!verde && !campo) continue;
    recorre(f.geometry, (c, cerrado) => {
      if (!cerrado) return;
      traza(c, true);
      ctx.fillStyle = verde ? col.parque : col.campo;
      ctx.fill('evenodd');
    });
  }
  for (const f of agua?.features ?? []) {
    recorre(f.geometry, (c, cerrado) => {
      traza(c, cerrado);
      if (cerrado) {
        ctx.fillStyle = col.agua;
        ctx.fill('evenodd');
      } else {
        ctx.lineWidth = 5 * s;
        ctx.strokeStyle = col.agua;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    });
  }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const f of caminos?.features ?? []) {
    recorre(f.geometry, (c) => {
      traza(c, false);
      ctx.lineWidth = (f.properties.tipo === 'track' ? 3 : 1.6) * s;
      ctx.strokeStyle = col.camino;
      ctx.stroke();
    });
  }
  for (const f of edificios?.features ?? []) {
    recorre(f.geometry, (c, cerrado) => {
      traza(c, cerrado);
      ctx.fillStyle = col.edificio;
      ctx.fill('evenodd');
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = col.edificioBorde;
      ctx.stroke();
    });
  }
  // Calles: borde y relleno en dos pasadas para que los cruces queden limpios
  for (const pasada of [0, 1]) {
    for (const f of calles?.features ?? []) {
      const ancho = ANCHO_CALLE[f.properties.tipo] ?? 5;
      const principal = f.properties.tipo?.startsWith('primary') || f.properties.tipo === 'secondary';
      recorre(f.geometry, (c) => {
        traza(c, false);
        ctx.lineWidth = (ancho + (pasada === 0 ? 2.2 : 0)) * s;
        ctx.strokeStyle = pasada === 0 ? col.calleBorde : (principal ? col.principal : col.calle);
        ctx.stroke();
      });
    }
  }
  return lienzo;
}

export function creaMinimapa(lienzo, datos, zona, lugares = []) {
  const cfg = HUD.minimapa;
  const mapa = creaMapa(datos, zona);
  const ctx = lienzo.getContext('2d');
  let giraConRumbo = cfg.giraConRumbo;
  let radioActual = cfg.radioVisibleM;
  let tamano = 0;

  function ajusta() {
    const px = Math.round(lienzo.clientWidth * Math.min(window.devicePixelRatio, 2));
    if (px !== tamano) {
      tamano = px;
      lienzo.width = lienzo.height = px;
    }
  }

  function actualiza({ x, z, rumbo, kmh, otros = [] }, dt) {
    ajusta();
    const objetivo = cfg.radioVisibleM + (cfg.radioVisibleRapidoM - cfg.radioVisibleM) * Math.min(1, Math.abs(kmh) / 90);
    radioActual += (objetivo - radioActual) * Math.min(1, dt * 1.5);
    const t = tamano;
    const c = t / 2;
    const r = c - 3;
    const escala = r / radioActual;                         // px de pantalla por metro
    const giro = giraConRumbo ? -rumbo : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, t, t);
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fillStyle = cfg.colores.fondo;
    ctx.fill();
    ctx.clip();
    ctx.translate(c, c);
    ctx.rotate(giro);
    ctx.scale(escala / cfg.pixelesPorMetro, escala / cfg.pixelesPorMetro);
    ctx.drawImage(mapa, -(x - zona.x0) * cfg.pixelesPorMetro, -(z - zona.z0) * cfg.pixelesPorMetro);
    // Otros coches: puntos de tamaño fijo en pantalla
    const radioPunto = (3.2 * (t / 200)) / (escala / cfg.pixelesPorMetro);
    for (const o of otros) {
      ctx.beginPath();
      ctx.arc((o.x - x) * cfg.pixelesPorMetro, (o.z - z) * cfg.pixelesPorMetro, radioPunto, 0, Math.PI * 2);
      ctx.fillStyle = cfg.colores.trafico;
      ctx.fill();
      ctx.lineWidth = radioPunto * 0.45;
      ctx.strokeStyle = '#1b2430';
      ctx.stroke();
    }
    ctx.restore();

    // Lugares: icono derecho aunque el mapa gire
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, r - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.font = `${Math.round(15 * (t / 200))}px system-ui, "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cosG = Math.cos(giro);
    const senG = Math.sin(giro);
    for (const l of lugares) {
      const dx = (l.x - x) * escala;
      const dz = (l.z - z) * escala;
      if (Math.hypot(dx, dz) > r) continue;
      ctx.fillText(l.icono, c + dx * cosG - dz * senG, c + dx * senG + dz * cosG);
    }
    ctx.restore();

    // Jugador: flecha en el centro (arriba si el mapa gira; si no, según el rumbo)
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(giraConRumbo ? 0 : rumbo);
    const f = t / 200;
    ctx.beginPath();
    ctx.moveTo(0, -11 * f);
    ctx.lineTo(7.5 * f, 8 * f);
    ctx.lineTo(0, 4 * f);
    ctx.lineTo(-7.5 * f, 8 * f);
    ctx.closePath();
    ctx.fillStyle = cfg.colores.jugador;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * f;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Aro y norte
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.lineWidth = 3 * (t / 200);
    ctx.strokeStyle = 'rgba(16, 22, 30, 0.85)';
    ctx.stroke();
    const aNorte = giro - Math.PI / 2;                       // norte del mapa = arriba (−z)
    const nx = c + Math.cos(aNorte) * (r - 12 * (t / 200));
    const ny = c + Math.sin(aNorte) * (r - 12 * (t / 200));
    ctx.beginPath();
    ctx.arc(nx, ny, 10 * (t / 200), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 22, 30, 0.9)';
    ctx.fill();
    ctx.fillStyle = '#ff5a4e';
    ctx.font = `700 ${Math.round(13 * (t / 200))}px system-ui, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny + 0.5);
  }

  // Mapa ampliado: todo el pueblo con el norte arriba; vista = { zoom, cx, cz } (centro en metros).
  // Con zoom 1 cabe la zona entera en el lienzo.
  function dibujaGrande(destino, { x, z, rumbo, otros = [] }, vista) {
    const r = Math.min(window.devicePixelRatio, 2);
    const w = Math.round(destino.clientWidth * r);
    const h = Math.round(destino.clientHeight * r);
    if (destino.width !== w || destino.height !== h) { destino.width = w; destino.height = h; }
    const g = destino.getContext('2d');
    const base = Math.min(w / zona.ancho, h / zona.alto);
    const escala = base * vista.zoom;                      // px por metro
    const aPx = (mx, mz) => [w / 2 + (mx - vista.cx) * escala, h / 2 + (mz - vista.cz) * escala];
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#10161e';
    g.fillRect(0, 0, w, h);
    const [x0, y0] = aPx(zona.x0, zona.z0);
    g.imageSmoothingEnabled = true;
    g.drawImage(mapa, x0, y0, zona.ancho * escala, zona.alto * escala);
    const f = r * Math.min(1.6, Math.max(1, Math.sqrt(vista.zoom)));
    for (const o of otros) {
      const [ox, oy] = aPx(o.x, o.z);
      g.beginPath();
      g.arc(ox, oy, 4 * f, 0, Math.PI * 2);
      g.fillStyle = cfg.colores.trafico;
      g.fill();
      g.lineWidth = 1.5 * f;
      g.strokeStyle = '#1b2430';
      g.stroke();
    }
    g.font = `${Math.round(18 * f)}px system-ui, "Segoe UI Emoji", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const l of lugares) g.fillText(l.icono, ...aPx(l.x, l.z));
    if (vista.zoom >= 2.5) {
      g.font = `600 ${Math.round(12 * r)}px system-ui, sans-serif`;
      g.fillStyle = '#1b2430';
      for (const l of lugares) {
        const [lx, ly] = aPx(l.x, l.z);
        g.fillText(l.nombre, lx, ly + 18 * f);
      }
    }
    const [jx, jy] = aPx(x, z);
    g.save();
    g.translate(jx, jy);
    g.rotate(rumbo);
    g.beginPath();
    g.moveTo(0, -13 * f);
    g.lineTo(9 * f, 9.5 * f);
    g.lineTo(0, 5 * f);
    g.lineTo(-9 * f, 9.5 * f);
    g.closePath();
    g.fillStyle = cfg.colores.jugador;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2.5 * f;
    g.fill();
    g.stroke();
    g.restore();
    return { escala };
  }

  return {
    actualiza,
    dibujaGrande,
    alternaGiro() { giraConRumbo = !giraConRumbo; return giraConRumbo; },
    ponGiro(valor) { giraConRumbo = valor; },
  };
}
