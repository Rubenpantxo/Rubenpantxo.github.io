// Economía del modo agricultura (PLAN_AGRICULTURA.md, A9). Precios en euros por kilo.
// Venta: orientados a la Lonja del Ebro de noviembre de 2026 (trigo 252–255 €/t, cebada de más de
// 64 de peso específico 238 €/t). Compra de semilla y abono: ORIENTATIVOS, sin fuente (a confirmar
// con Rubén). Todo se afina aquí.
export const ECONOMIA = {
  dineroInicial: 3000,
  venta: { trigo: 0.25, cebada: 0.238 },
  compra: { trigo: 0.45, cebada: 0.42, abono: 0.45 },
  // Guardado en localStorage
  guardado: {
    clave: 'cabdrive.agricultura.partida.v1',
    clavesParcela: 'cabdrive.agricultura.parcela.v1.',
    cadaSegundos: 10,        // como mucho, cada cuánto se guarda lo que haya cambiado
  },
};

export const euros = (n) => `${Math.round(n).toLocaleString('es-ES')} €`;
