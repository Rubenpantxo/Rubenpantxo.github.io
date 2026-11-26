// Guardado de la partida de agricultura en localStorage (PLAN_AGRICULTURA.md, A9).
// Una clave con lo general (día, dinero, grano entregado, parcelas trabajadas) y una por parcela con
// sus máscaras (laboreo, cultivo y agua) comprimidas: se separan los canales y se codifican por
// tramos iguales (RLE: pares [repeticiones 1…255, valor]) y se pasan a base64. Unos pocos KB por
// parcela. Si no hay almacenamiento (modo privado), el juego sigue sin guardar.
import { ECONOMIA } from '../config/economia.js';

const G = ECONOMIA.guardado;

function rle(datos, canales, canal) {
  const sal = [];
  const n = datos.length / canales;
  let i = 0;
  while (i < n) {
    const v = datos[i * canales + canal];
    let j = i + 1;
    while (j < n && j - i < 255 && datos[j * canales + canal] === v) j++;
    sal.push(j - i, v);
    i = j;
  }
  return sal;
}
function aBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return btoa(s);
}
export function codifica(datos, canales = 1) {
  const partes = [];
  for (let c = 0; c < canales; c++) {
    const r = rle(datos, canales, c);
    partes.push(r.length & 255, (r.length >> 8) & 255, (r.length >> 16) & 255, (r.length >> 24) & 255, ...r);
  }
  return aBase64(Uint8Array.from(partes));
}
// Devuelve false si los datos no cuadran con el tamaño esperado
export function decodifica(texto, destino, canales = 1) {
  const bytes = Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
  const n = destino.length / canales;
  let p = 0;
  for (let c = 0; c < canales; c++) {
    const largo = bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24);
    p += 4;
    let i = 0;
    for (let k = 0; k < largo; k += 2) {
      const rep = bytes[p + k];
      const v = bytes[p + k + 1];
      if (i + rep > n) return false;
      for (let q = 0; q < rep; q++) destino[(i + q) * canales + c] = v;
      i += rep;
    }
    if (i !== n) return false;
    p += largo;
  }
  return true;
}

const lee = (clave) => { try { const t = localStorage.getItem(clave); return t ? JSON.parse(t) : null; } catch { return null; } };
const escribe = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch { return false; } };

export function leePartida() {
  const g = lee(G.clave);
  return g && g.v === 1 ? g : null;
}
export function borraPartida() {
  try {
    const claves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === G.clave || k.startsWith(G.clavesParcela))) claves.push(k);
    }
    for (const k of claves) localStorage.removeItem(k);
  } catch { /* sin almacenamiento */ }
}

// Guarda una parcela activa (máscaras y lo sembrado)
export function guardaParcela(p) {
  return escribe(G.clavesParcela + p.ref, {
    v: 1, ref: p.ref, ancho: p.ancho, alto: p.alto, mpp: p.mpp, siembra: p.siembra ?? null,
    laboreo: codifica(p.laboreo, 4), cultivo: codifica(p.cultivo, 4), agua: codifica(p.agua, 1),
  });
}
// Restaura una parcela (recién creada) desde lo guardado; devuelve si se pudo
export function cargaParcela(p) {
  const d = lee(G.clavesParcela + p.ref);
  if (!d || d.v !== 1 || d.ancho !== p.ancho || d.alto !== p.alto) return false;
  try {
    if (!decodifica(d.laboreo, p.laboreo, 4) || !decodifica(d.cultivo, p.cultivo, 4) || !decodifica(d.agua, p.agua, 1)) return false;
  } catch { return false; }
  p.siembra = d.siembra ?? undefined;
  p.marcaCambio(0, 0, p.ancho - 1, p.alto - 1);
  p.sube(performance.now(), true);
  return true;
}

// Lo general: { dia, dinero, granero, parcelas: [refs], semilla }
export function guardaGeneral(estado) {
  return escribe(G.clave, { v: 1, ...estado });
}
