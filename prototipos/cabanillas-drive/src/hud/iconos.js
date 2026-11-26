// Iconos propios del modo agricultura (sustituyen a los emojis): SVG de 48×48 dibujados a mano, con
// volumen (degradados y sombras) y el detalle justo para reconocer cada apero, máquina o acción.
// iconoHtml('arado', 22) → texto SVG listo para innerHTML. Los colores van fijos para que se vean bien
// sobre el amarillo de los botones y sobre el fondo oscuro del panel.
const G = (id, a, b, v = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${v ? 0 : 1}" y2="${v ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const ROJO = ['#e2574c', '#9c241d'];
const ACERO = ['#c9d0d6', '#6d7882'];
const NEGRO = '#1d2228';
const GOMA = '#2b3036';
const LLANTA = '#c9a227';
const TRIGO = ['#f0cf6a', '#b98a18'];

// Rueda de perfil: neumático, llanta y buje
const rueda = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${GOMA}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="${LLANTA}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="#6b5410"/><path d="M${cx - r} ${cy}h${r * 0.18}M${cx + r * 0.82} ${cy}h${r * 0.18}" stroke="#454b52" stroke-width="1.2"/>`;

const SVG = {
  // Tractor de frente de tres cuartos (perfil): cabina, capó, ruedas grandes detrás
  tractor: `<defs>${G('gtr', ...ROJO)}</defs>
    <rect x="21" y="9" width="17" height="17" rx="2" fill="#2d3a45"/><rect x="23" y="11" width="13" height="10" rx="1" fill="#9fd0e6"/><rect x="20" y="7" width="20" height="3.5" rx="1.5" fill="url(#gtr)"/>
    <path d="M4 25h22v-6H12l-3 3H4z" fill="url(#gtr)"/><rect x="4" y="25" width="34" height="7" rx="1.5" fill="url(#gtr)"/><rect x="8" y="20" width="2.6" height="5" fill="${NEGRO}"/>
    <rect x="5" y="21" width="4" height="3" fill="#ffe08a"/>${rueda(14, 36, 5.2)}${rueda(33, 33, 9.2)}`,
  // Arado reversible: bastidor oblicuo con cuerpos de vertedera y rejas
  arado: `<defs>${G('gar', ...ACERO, false)}${G('gav', '#9aa5ae', '#46505a')}</defs>
    <path d="M5 11h30l7 5v3H34l-5-3H5z" fill="url(#gar)"/><rect x="5" y="9" width="6" height="4" rx="1" fill="#e2574c"/>
    ${[0, 1, 2, 3].map((i) => { const x = 10 + i * 7.5; return `<path d="M${x} 17c1 6 1 10 -1 14l-2 6 8-5c3-4 3-9 2-13z" fill="url(#gav)"/><path d="M${x - 3} 38l5-3 3 1-6 4z" fill="#d8dde1"/>`; }).join('')}
    <path d="M3 41h42" stroke="#6b4a2c" stroke-width="3" stroke-linecap="round"/>`,
  // Cultivador: bastidor, brazos curvos con rejas y rodillo de jaula detrás
  cultivador: `<defs>${G('gcu', ...ACERO, false)}</defs>
    <rect x="4" y="9" width="40" height="5" rx="1.5" fill="url(#gcu)"/><rect x="4" y="16" width="40" height="3.5" rx="1" fill="url(#gcu)"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${8 + i * 6.4} 19.5c0 7 3 9 3 14l-3 4" fill="none" stroke="#7d8892" stroke-width="2.2" stroke-linecap="round"/><path d="M${6 + i * 6.4} 38l4-2 2 2-5 2z" fill="#d8dde1"/>`).join('')}
    <rect x="6" y="39" width="36" height="6" rx="3" fill="#8a6a3a"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${9 + i * 4.2} 39v6" stroke="#4d3a1e" stroke-width="1"/>`).join('')}`,
  // Abonadora centrífuga: tolva cónica, dos discos y gránulos en abanico
  abonadora: `<defs>${G('gab', '#e8eef2', '#8d99a3')}${G('gbl', '#f2c14e', '#b07d12')}</defs>
    <path d="M10 6h28l-5 18H15z" fill="url(#gab)"/><path d="M10 6h28v4H10z" fill="#e2574c"/><path d="M16 24h16l-3 6H19z" fill="#6f7b85"/>
    <ellipse cx="17" cy="33" rx="8" ry="2.6" fill="url(#gbl)"/><ellipse cx="31" cy="33" rx="8" ry="2.6" fill="url(#gbl)"/><rect x="23" y="29" width="2" height="4" fill="${NEGRO}"/>
    ${[[6, 37], [10, 40], [14, 38], [34, 38], [38, 41], [42, 37], [24, 41], [20, 43], [28, 43]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#f5efe0"/>`).join('')}`,
  // Sembradora: tolva con tapa, tubos de caída, rejas y líneas con semillas
  sembradora: `<defs>${G('gse', '#f0cf6a', '#b98a18')}${G('gsb', ...ROJO)}</defs>
    <path d="M7 7h34l-4 14H11z" fill="url(#gsb)"/><rect x="7" y="5" width="34" height="3.5" rx="1.2" fill="#b83a30"/><path d="M12 12h24" stroke="#f0cf6a" stroke-width="2.4" stroke-linecap="round"/>
    ${[0, 1, 2, 3, 4].map((i) => `<path d="M${12 + i * 6} 21v10l-2 5" fill="none" stroke="#7d8892" stroke-width="1.8" stroke-linecap="round"/><circle cx="${12 + i * 6}" cy="${40 + (i % 2)}" r="1.5" fill="#d9b04a"/>`).join('')}
    <path d="M3 44h42" stroke="#6b4a2c" stroke-width="3" stroke-linecap="round"/>`,
  // Remolque de grano: caja con montón de grano, lanza y una rueda
  remolque: `<defs>${G('grm', '#6f8a52', '#3f5530')}${G('grg', ...TRIGO)}</defs>
    <path d="M6 12h34l-2 20H8z" fill="url(#grm)"/><path d="M7 14c6-8 12-9 17-8 6 1 10 4 15 8z" fill="url(#grg)"/><rect x="6" y="12" width="34" height="3" fill="#2f4222"/>
    <path d="M40 24h6l-2 4" fill="none" stroke="#7d8892" stroke-width="2.2" stroke-linecap="round"/><rect x="3" y="31" width="38" height="3" rx="1" fill="#454b52"/>${rueda(22, 38, 6)}`,
  // Cosechadora: cabezal con molinete delante, cabina, tolva y tubo de descarga
  cosechadora: `<defs>${G('gco', '#f1c232', '#a67c0a')}</defs>
    <rect x="2" y="26" width="13" height="10" rx="1.5" fill="#d9a521"/><path d="M2 36h13" stroke="#6d7882" stroke-width="2" stroke-dasharray="1.6 1.2"/><circle cx="8" cy="25" r="5" fill="none" stroke="#8a5a14" stroke-width="1.6"/><path d="M8 20v10M3 25h10M4.5 21.5l7 7M11.5 21.5l-7 7" stroke="#8a5a14" stroke-width="1.2"/>
    <path d="M15 26h6V16h5v-4h14l2 10v14H15z" fill="url(#gco)"/><rect x="17" y="17" width="8" height="8" rx="1" fill="#9fd0e6"/><rect x="26" y="9" width="14" height="6" rx="1" fill="#d9a521"/><path d="M42 12l5 6" stroke="#6d7882" stroke-width="3" stroke-linecap="round"/>
    ${rueda(24, 38, 6)}${rueda(40, 40, 4)}`,
  coche: `<defs>${G('gcc', '#6aa3d6', '#2c5f93')}</defs>
    <path d="M5 29l4-9a4 4 0 0 1 4-3h16a5 5 0 0 1 4 2l5 6c3 0 5 2 5 5v3H5z" fill="url(#gcc)"/><path d="M13 20h7v7h-12zM23 20h7l4 5v2H23z" fill="#b9dff0"/>
    ${rueda(14, 35, 5)}${rueda(37, 35, 5)}`,
  // Edificio de la cooperativa: nave con tejado a dos aguas y silo
  cope: `<defs>${G('gcp', '#e6dcc4', '#a89c78')}${G('gsi', '#dfe6ea', '#8c99a3', false)}</defs>
    <rect x="29" y="12" width="13" height="30" fill="url(#gsi)"/><path d="M29 12a6.5 5 0 0 1 13 0z" fill="#8c99a3"/><path d="M29 20h13M29 28h13M29 36h13" stroke="#6f7b85" stroke-width="1"/>
    <path d="M3 22l13-9 13 9v20H3z" fill="url(#gcp)"/><path d="M3 22l13-9 13 9" fill="none" stroke="#b83a30" stroke-width="3" stroke-linejoin="round"/><rect x="10" y="29" width="12" height="13" fill="#5a6a78"/><path d="M10 33h12M10 37h12" stroke="#43505b" stroke-width="1"/>`,
  // Billete con moneda de euro
  dinero: `<defs>${G('gdi', '#9ad08a', '#4f8a43')}${G('gmo', '#f7dc7a', '#b98a18')}</defs>
    <rect x="3" y="12" width="32" height="20" rx="2.5" fill="url(#gdi)"/><rect x="6" y="15" width="26" height="14" rx="1.5" fill="none" stroke="#2f5d27" stroke-width="1.2"/><circle cx="19" cy="22" r="4.4" fill="#2f5d27" opacity=".55"/>
    <circle cx="35" cy="31" r="10.5" fill="url(#gmo)" stroke="#8a6a10" stroke-width="1.5"/><path d="M39.6 27.2a5.6 5.6 0 1 0 0 7.6M29.4 30h8M29.4 33h7" fill="none" stroke="#6b4f08" stroke-width="2" stroke-linecap="round"/>`,
  trigo: `<defs>${G('gtg', ...TRIGO)}</defs>
    <path d="M24 44V20" stroke="#7a8f3a" stroke-width="2.4" stroke-linecap="round"/>
    ${[0, 1, 2, 3, 4].map((i) => { const y = 7 + i * 5; return `<ellipse cx="19.2" cy="${y + 3}" rx="3.1" ry="5" transform="rotate(-24 19.2 ${y + 3})" fill="url(#gtg)"/><ellipse cx="28.8" cy="${y + 3}" rx="3.1" ry="5" transform="rotate(24 28.8 ${y + 3})" fill="url(#gtg)"/>`; }).join('')}
    <ellipse cx="24" cy="6" rx="2.8" ry="5" fill="url(#gtg)"/><path d="M24 36c-4 0-8 3-9 8M24 38c4 0 8 2 10 7" fill="none" stroke="#7a8f3a" stroke-width="2" stroke-linecap="round"/>`,
  // Cebada: espiga con largas aristas
  cebada: `<defs>${G('gcb', '#e8d79a', '#b49a4a')}</defs>
    <path d="M24 46V24" stroke="#8a9a46" stroke-width="2.4" stroke-linecap="round"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => { const y = 5 + i * 3.6; return `<ellipse cx="21" cy="${y + 3}" rx="2.4" ry="3.2" fill="url(#gcb)"/><ellipse cx="27" cy="${y + 3}" rx="2.4" ry="3.2" fill="url(#gcb)"/><path d="M20 ${y + 1}l-7-5M28 ${y + 1}l7-5M22 ${y}l-3-6M26 ${y}l3-6" stroke="#b49a4a" stroke-width="1" stroke-linecap="round"/>`; }).join('')}`,
  // Saco de abono con etiqueta
  abono: `<defs>${G('gsa', '#f0ece0', '#b9b29a')}</defs>
    <path d="M12 8l4-3h16l4 3 3 8-2 28H11L9 16z" fill="url(#gsa)"/><path d="M12 8c4 3 20 3 24 0" fill="none" stroke="#8d8670" stroke-width="1.6"/><path d="M16 5l-1 4M32 5l1 4" stroke="#8d8670" stroke-width="1.2"/>
    <rect x="15" y="20" width="18" height="14" rx="1.5" fill="#4f8a43"/><circle cx="21" cy="27" r="2.2" fill="#f5efe0"/><circle cx="27" cy="25" r="1.6" fill="#f5efe0"/><circle cx="27.5" cy="30" r="1.8" fill="#f5efe0"/>`,
  // Tolva (llenar): embudo de chapa con grano cayendo
  tolva: `<defs>${G('gto', ...ACERO, false)}${G('gtg2', ...TRIGO)}</defs>
    <path d="M6 8h36l-9 18H15z" fill="url(#gto)"/><path d="M9 10c6-3 24-3 30 0l-2 4H11z" fill="url(#gtg2)"/><rect x="19" y="26" width="10" height="7" fill="#6f7b85"/>
    ${[[24, 37], [21, 41], [27, 40], [24, 45]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="2" fill="#d9b04a"/>`).join('')}`,
  // Descargar en la COPE: silo con flecha de entrada
  descargar: `<defs>${G('gde', '#dfe6ea', '#8c99a3', false)}${G('gtg3', ...TRIGO)}</defs>
    <rect x="22" y="10" width="20" height="34" fill="url(#gde)"/><path d="M22 10a10 6 0 0 1 20 0z" fill="#8c99a3"/><path d="M22 20h20M22 29h20M22 38h20" stroke="#6f7b85" stroke-width="1"/>
    <path d="M3 22h14v-5l9 8-9 8v-5H3z" fill="#4f8a43" stroke="#2f5d27" stroke-width="1.4" stroke-linejoin="round"/>`,
  // Vender: moneda con grano
  vender: `<defs>${G('gve', '#f7dc7a', '#b98a18')}</defs>
    <circle cx="30" cy="20" r="14" fill="url(#gve)" stroke="#8a6a10" stroke-width="1.6"/><path d="M34.8 15.4a7 7 0 1 0 0 9.2M24 18.5h10M24 22h9" fill="none" stroke="#6b4f08" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M6 44V30" stroke="#7a8f3a" stroke-width="2" stroke-linecap="round"/>${[0, 1, 2].map((i) => `<ellipse cx="3.6" cy="${33 + i * 4}" rx="2" ry="3.2" transform="rotate(-24 3.6 ${33 + i * 4})" fill="#d9b04a"/><ellipse cx="8.4" cy="${33 + i * 4}" rx="2" ry="3.2" transform="rotate(24 8.4 ${33 + i * 4})" fill="#d9b04a"/>`).join('')}`,
  // Calendario con hoja y fecha
  calendario: `<defs>${G('gca', '#ffffff', '#d5d9dd')}</defs>
    <rect x="5" y="9" width="38" height="34" rx="3.5" fill="url(#gca)"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9h31a3.5 3.5 0 0 1 3.5 3.5V19H5z" fill="#c8453b"/><rect x="13" y="5" width="3.6" height="9" rx="1.8" fill="#6d7882"/><rect x="31.4" y="5" width="3.6" height="9" rx="1.8" fill="#6d7882"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${10 + (i % 4) * 8.4}" y="${24 + Math.floor(i / 4) * 8}" width="5.6" height="5" rx="1" fill="${i === 5 ? '#4f8a43' : '#b0b8bf'}"/>`).join('')}`,
  sonido: `<path d="M5 18h8l10-8v28l-10-8H5z" fill="#c9d0d6" stroke="#6d7882" stroke-width="1.6" stroke-linejoin="round"/><path d="M29 17a9 9 0 0 1 0 14M34 12a16 16 0 0 1 0 24" fill="none" stroke="#6fbf5a" stroke-width="3" stroke-linecap="round"/>`,
  silencio: `<path d="M5 18h8l10-8v28l-10-8H5z" fill="#c9d0d6" stroke="#6d7882" stroke-width="1.6" stroke-linejoin="round"/><path d="M29 18l12 12M41 18L29 30" stroke="#d9574c" stroke-width="3.4" stroke-linecap="round"/>`,
  // Parcelas: tablero de campos con caminos
  parcelas: `<rect x="3" y="6" width="42" height="36" rx="3" fill="#a89c78"/><path d="M5 9l17-1 3 15-20 3z" fill="#6fbf5a"/><path d="M26 8l17 3-2 13-13-2z" fill="#e3b52f"/><path d="M5 27l20-4 4 14-23 3z" fill="#8a5d3a"/><path d="M30 25l12-1v14l-9 2z" fill="#5e3f27"/>`,
  gota: `<defs>${G('ggo', '#8fd3ff', '#2f86c9')}</defs><path d="M24 4c8 11 13 17 13 25a13 13 0 0 1-26 0c0-8 5-14 13-25z" fill="url(#ggo)"/><path d="M17 30c0 4 3 7 6 7" fill="none" stroke="#e6f6ff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`,
  // Tajadera: compuerta metálica en el canal con husillo y volante
  tajadera: `<rect x="3" y="32" width="42" height="12" fill="#9aa5ae"/><path d="M3 38h42" stroke="#2f86c9" stroke-width="5" opacity=".75"/><rect x="11" y="14" width="26" height="20" rx="1.5" fill="#7d8892"/><path d="M14 18h20M14 23h20M14 28h20" stroke="#4f5a63" stroke-width="1.2"/><rect x="22.6" y="6" width="2.8" height="10" fill="#454b52"/><circle cx="24" cy="6" r="5" fill="none" stroke="#e2574c" stroke-width="2.6"/><path d="M19 6h10M24 1v10" stroke="#e2574c" stroke-width="1.6"/>`,
  // Guardado: disquete de partida
  guardar: `<rect x="5" y="5" width="38" height="38" rx="4" fill="#3f6ea6"/><rect x="12" y="5" width="22" height="13" fill="#dfe6ea"/><rect x="27" y="7.5" width="4" height="8" fill="#3f6ea6"/><rect x="10" y="26" width="28" height="17" rx="2" fill="#eef1f3"/><path d="M14 31h20M14 36h14" stroke="#9aa5ae" stroke-width="1.8"/>`,
  papelera: `<path d="M9 13h30l-2.4 29a3 3 0 0 1-3 2.7H14.4a3 3 0 0 1-3-2.7z" fill="#9aa5ae"/><path d="M5 13h38" stroke="#6d7882" stroke-width="3.2" stroke-linecap="round"/><path d="M18 13V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" fill="none" stroke="#6d7882" stroke-width="2.6"/><path d="M18 20v16M24 20v16M30 20v16" stroke="#6d7882" stroke-width="2.2" stroke-linecap="round"/>`,
  // Cabezal de siega y tubo de descarga
  cabezal: `<rect x="3" y="26" width="42" height="12" rx="2" fill="#d9a521"/><path d="M3 38h42" stroke="#6d7882" stroke-width="3" stroke-dasharray="2.4 1.6"/><circle cx="24" cy="18" r="9" fill="none" stroke="#8a5a14" stroke-width="2"/><path d="M24 9v18M15 18h18M17.6 11.6l12.8 12.8M30.4 11.6L17.6 24.4" stroke="#8a5a14" stroke-width="1.6"/>`,
  tubo: `<defs>${G('gtu', '#f1c232', '#a67c0a')}</defs><rect x="4" y="30" width="20" height="14" rx="2" fill="url(#gtu)"/><path d="M20 32l22-18" stroke="#6d7882" stroke-width="6" stroke-linecap="round"/><path d="M20 32l22-18" stroke="#c9d0d6" stroke-width="2.6" stroke-linecap="round"/>${[[41, 22], [43, 28], [40, 33]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="2" fill="#d9b04a"/>`).join('')}`,
  // Bajar y subir el apero o el cabezal: flecha grande y barra con púas
  bajar: `<path d="M24 4v22M14 17l10 11 10-11" fill="none" stroke="#e8edf0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="6" y="31" width="36" height="6" rx="2" fill="#c9d0d6"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${9 + i * 6} 37l2.4 7 2.4-7z" fill="#9aa5ae"/>`).join('')}`,
  subir: `<path d="M24 28V6M14 15l10-11 10 11" fill="none" stroke="#e8edf0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="6" y="31" width="36" height="6" rx="2" fill="#c9d0d6"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${9 + i * 6} 37l2.4 4 2.4-4z" fill="#9aa5ae"/>`).join('')}`,
  alerta: `<path d="M24 5L45 41H3z" fill="#f2b632" stroke="#8a6a10" stroke-width="2" stroke-linejoin="round"/><rect x="22.4" y="17" width="3.2" height="13" rx="1.6" fill="#3a2d0a"/><circle cx="24" cy="35" r="2.1" fill="#3a2d0a"/>`,
};

// id de apero → icono
export const ICONO_APERO = { arado: 'arado', cultivador: 'cultivador', abonadora: 'abonadora', sembradora: 'sembradora', remolque: 'remolque' };

export function iconoHtml(nombre, px = 22) {
  const dibujo = SVG[nombre];
  if (!dibujo) return '';
  return `<svg class="ic" viewBox="0 0 48 48" width="${px}" height="${px}" aria-hidden="true" focusable="false">${dibujo}</svg>`;
}
export const hayIcono = (nombre) => nombre in SVG;
