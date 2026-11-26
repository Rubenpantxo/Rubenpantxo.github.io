// Cultivos (PLAN_AGRICULTURA.md §5.4, fase A6): cómo crecen el trigo y la cebada.
//
// Calendario orientativo de cereal de invierno en el regadío de Navarra, contado en días desde la
// siembra: se siembra en noviembre y se cosecha a finales de junio o en julio (la cebada, unas dos
// semanas antes); el trigo espiga hacia primeros de mayo. Las alturas son de variedades modernas
// (0,8–0,9 m). Se afinarán con Rubén.
//
// Cada punto de la curva: [edad en días, altura (m), cobertura del suelo (0…1), espiga visible (0…1),
// color de la hoja (sRGB), color de la espiga (sRGB), cabeceo de la espiga (0…1)]. Entre dos puntos
// se interpola; la etapa es la del último punto con nombre. Como mucho 10 puntos por cultivo.
export const CULTIVOS = {
  trigo: {
    nombre: 'Trigo',
    curva: [
      [0, 0, 0, 0, [120, 104, 80], [120, 150, 70], 0, 'Sembrado'],
      [14, 0.03, 0.12, 0, [118, 150, 72], [120, 150, 70], 0, 'Nascencia'],
      [35, 0.09, 0.34, 0, [88, 122, 56], [120, 150, 70], 0, 'Ahijado'],
      [105, 0.2, 0.75, 0, [70, 102, 48], [104, 132, 66], 0, null],
      [125, 0.38, 0.9, 0, [66, 100, 50], [104, 132, 66], 0, 'Encañado'],
      [165, 0.82, 0.97, 0.6, [72, 106, 60], [138, 158, 98], 0, 'Espigado'],
      [182, 0.88, 0.97, 1, [88, 116, 64], [162, 170, 112], 0.05, 'Floración'],
      [200, 0.88, 0.96, 1, [150, 156, 78], [184, 178, 106], 0.1, 'Llenado del grano'],
      [222, 0.86, 0.93, 1, [196, 166, 96], [214, 176, 104], 0.18, 'Madura'],
      [240, 0.84, 0.92, 1, [182, 152, 92], [204, 166, 100], 0.22, null],
    ],
    madura: 222,                // a partir de aquí se puede cosechar (A8)
    // Rendimiento con vigor 1 (tierra preparada y abonada, solo con la lluvia: kg/ha de grano). El
    // vigor lo sube o lo baja (×0,5…×1,3): bien regado sale hacia 8 000, como lo que INTIA da por
    // alcanzable en el regadío navarro bien llevado (8 000–9 000 kg/ha); sobre rastrojo sin abono,
    // hacia 4 000, cerca de la media de toda Navarra con el secano (4 500 de trigo blando, 2025).
    rendimientoKgHa: 6500,
    pesoLitroKg: 0.78,          // kg por litro de grano (para la tolva, en litros)
  },
  cebada: {
    nombre: 'Cebada',
    curva: [
      [0, 0, 0, 0, [120, 104, 80], [120, 150, 70], 0, 'Sembrado'],
      [12, 0.03, 0.12, 0, [122, 154, 76], [120, 150, 70], 0, 'Nascencia'],
      [32, 0.09, 0.32, 0, [92, 126, 58], [120, 150, 70], 0, 'Ahijado'],
      [95, 0.2, 0.75, 0, [76, 108, 52], [108, 136, 68], 0, null],
      [115, 0.36, 0.9, 0, [72, 106, 54], [108, 136, 68], 0, 'Encañado'],
      [150, 0.76, 0.96, 0.6, [80, 112, 64], [146, 162, 104], 0, 'Espigado'],
      [165, 0.8, 0.96, 1, [100, 122, 68], [168, 172, 116], 0.15, 'Floración'],
      [182, 0.8, 0.95, 1, [168, 166, 92], [186, 178, 108], 0.45, 'Llenado del grano'],
      [205, 0.76, 0.92, 1, [214, 196, 136], [224, 204, 146], 0.85, 'Madura'],
      [225, 0.74, 0.9, 1, [200, 182, 128], [212, 192, 138], 0.9, null],
    ],
    madura: 205,
    rendimientoKgHa: 5800,      // la cebada da algo menos (media de Navarra 3 900 frente a 4 500 del trigo, 2025)
    pesoLitroKg: 0.66,
  },
  // A10. Cebolla de siembra directa en el regadío de la Ribera: se siembra a finales de invierno y
  // se arranca a finales de verano, hacia los 165 días, cuando las hojas se han tumbado y secado.
  // El cabeceo (último número de la hoja) es lo tumbada que está la mata. Calendario y rendimiento
  // ORIENTATIVOS (a afinar con Rubén). Aquí «espiga» no se usa.
  cebolla: {
    nombre: 'Cebolla',
    curva: [
      [0, 0, 0, 0, [120, 104, 80], [120, 150, 70], 0, 'Sembrada'],
      [18, 0.04, 0.06, 0, [124, 162, 76], [120, 150, 70], 0, 'Nascencia'],
      [45, 0.14, 0.2, 0, [96, 146, 64], [120, 150, 70], 0, 'Hojas'],
      [90, 0.42, 0.5, 0, [78, 132, 58], [120, 150, 70], 0, 'Bulbificación'],
      [125, 0.55, 0.62, 0, [84, 134, 58], [120, 150, 70], 0.05, 'Engrosado del bulbo'],
      [148, 0.5, 0.58, 0, [128, 148, 66], [120, 150, 70], 0.55, 'Tumbado'],
      [165, 0.26, 0.4, 0, [176, 150, 84], [120, 150, 70], 1, 'Madura'],
      [185, 0.2, 0.34, 0, [168, 138, 80], [120, 150, 70], 1, null],
    ],
    madura: 165,
    rendimientoKgHa: 55000,     // 55 t/ha con vigor 1 (orientativo; la cebolla de Navarra anda en 50–70 t/ha)
    pesoLitroKg: 0.62,
    arrancable: true,           // se arranca con la arrancadora, no con la cosechadora
  },
};

// Matas de cerca (tarjetas cruzadas instanciadas alrededor de la cámara), por calidad:
// radio en metros y separación de la rejilla. Más allá, el dosel (la parcela levantada a la altura
// del cultivo) y, de lejos, solo el color en el suelo.
export const MATAS = {
  alto: { radio: 32, separacion: 0.3 },
  medio: { radio: 24, separacion: 0.34 },
  bajo: { radio: 14, separacion: 0.42 },
  ancho: 0.42,                 // m de cada tarjeta
  alturaMinimaDosel: 0.12,     // por debajo, sin dosel: el cultivo es solo color en el suelo y matas
  pasoDoselFinoM: 0.5,         // rejilla del dosel en parcelas pequeñas (en las grandes, la del suelo)
  doselFinoHastaHa: 3,
};
