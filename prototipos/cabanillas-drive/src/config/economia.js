// Economía del modo agricultura (PLAN_AGRICULTURA.md, A9). Precios en euros por kilo.
// Venta: orientados a la Lonja del Ebro de noviembre de 2026 (trigo 252–255 €/t, cebada de más de
// 64 de peso específico 238 €/t). Compra de semilla y abono: ORIENTATIVOS, sin fuente (a confirmar
// con Rubén). A10: cebolla, brócoli y alcachofa a precio MAPA (origen, €/100 kg); espárrago, el de
// primera de la IGP. Plantel, zuecas y garras: € por planta, ORIENTATIVOS. Todo se afina aquí.
export const ECONOMIA = {
  dineroInicial: 3000,
  venta: { trigo: 0.25, cebada: 0.238, cebolla: 0.3355, brocoli: 0.8618, alcachofa: 1.8538, esparrago: 2.85 },     // cebolla: 33,55 €/100 kg, MAPA, semana 45 de 2026 (2–8 nov)
  compra: { trigo: 0.45, cebada: 0.42, cebolla: 250, abono: 0.45, brocoli: 0.04, alcachofa: 0.45, esparrago: 0.2 },     // cebolla: semilla (ORIENTATIVO, sin fuente)
  // De dónde sale cada precio de venta (se enseña en el menú de la COPE)
  fuente: {
    trigo: 'Lonja del Ebro, noviembre de 2026', cebada: 'Lonja del Ebro, noviembre de 2026',
    cebolla: 'MAPA, semana 45 de 2026', brocoli: 'MAPA, semana 45 de 2026', alcachofa: 'MAPA, semana 43 de 2026',
    esparrago: 'IGP Espárrago de Navarra, primera, 2,80–2,90 €/kg (2024)',
  },
  // Guardado en localStorage
  guardado: {
    clave: 'cabdrive.agricultura.partida.v1',
    clavesParcela: 'cabdrive.agricultura.parcela.v1.',
    cadaSegundos: 10,        // como mucho, cada cuánto se guarda lo que haya cambiado
  },
};

export const euros = (n) => `${Math.round(n).toLocaleString('es-ES')} €`;
