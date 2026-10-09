// Fachadas procedurales: ventanas por planta, persianas, balcones, puertas y portones,
// ladrillo, zócalo, naves de chapa y porches. Todo sale de los atributos de cada muro
// (sin texturas), así cada casa es distinta y no pesa nada.
//
// Atributos por vértice de muro:
//   aUvMuro = (metros a lo largo del muro, metros sobre la base)
//   aMuro   = (altura del edificio, plantas, largo del muro, semilla del edificio)
//   aMuro2  = (da a la calle, medianera, estilo, índice del lado)
// Estilos: 0 enfoscado · 1 ladrillo · 2 piedra · 3 nave · 4 hormigón · 5 porche/tejavana
//
// De noche (cicloDia.js) una parte de las ventanas se enciende: cada ventana tiene su número
// al azar y luce si está por debajo de «encendidas»; al bajar esa fracción de madrugada se
// van apagando una a una. Son decorativas: no hay datos reales de qué casas tienen luz.
export const LUCES_FACHADA = {
  encendidas: { value: 0 },   // fracción de ventanas con luz
  intensidad: { value: 0 },   // 0 de día
};


export const GLSL_FACHADA = /* glsl */ `
varying vec2 vUvMuro;
varying vec4 vMuro;
varying vec4 vMuro2;
varying vec4 vReal;                   // fachada real (datos/fachadasReales.js): zócalo y marcas
uniform float uVentanasEncendidas;
float luzFachada = 0.0;               // cuánto luce este píxel (ventana encendida)
vec3 colorLuzFachada = vec3(0.0);

float azar1(float n) { return fract(sin(n) * 43758.5453123); }
float azar2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123); }

// Rectángulo [a, b] con bordes suavizados según el tamaño del píxel (evita parpadeos)
float caja(vec2 p, vec2 a, vec2 b, vec2 aa) {
  vec2 s = smoothstep(a - aa, a + aa, p) - smoothstep(b - aa, b + aa, p);
  return clamp(s.x, 0.0, 1.0) * clamp(s.y, 0.0, 1.0);
}

// Ruido de valor (0–1), suma de octavas y Voronoi (distancia al borde de la celda, id)
float ruidoF(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(azar2(i), azar2(i + vec2(1.0, 0.0)), f.x), mix(azar2(i + vec2(0.0, 1.0)), azar2(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbmF(vec2 p) { return 0.5 * ruidoF(p) + 0.3 * ruidoF(p * 2.03 + 7.1) + 0.2 * ruidoF(p * 4.01 + 3.7); }
vec2 voronoiF(vec2 q, float semilla) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  float d1 = 9.0;
  float d2 = 9.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(azar2(i + g + semilla), azar2(i + g + semilla + 5.3)) * 0.75 + 0.125;
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; id = azar2(i + g + semilla * 0.37); } else if (d < d2) { d2 = d; }
  }
  return vec2(d2 - d1, id);
}

// Ladrillo visto: medidas, aparejo (soga, tizón, inglés), ladrillo de máquina o manual (bordes
// irregulares, mucha variación y piezas requemadas) y color del mortero, todo según la casa
vec3 ladrillos(vec2 p, vec3 base, float semilla, vec2 aa, float lejos) {
  float hilada = mix(0.058, 0.082, azar1(semilla * 1.37));
  float soga = mix(0.245, 0.30, azar1(semilla * 2.71));
  float aparejo = floor(azar1(semilla * 5.13) * 3.0);
  float fila = floor(p.y / hilada);
  float tizon = aparejo == 1.0 ? 1.0 : (aparejo == 2.0 ? mod(fila, 2.0) : 0.0);
  float largo = mix(soga, soga * 0.5, tizon);
  float u = p.x / largo + (aparejo == 2.0 ? 0.25 * tizon : 0.5 * mod(fila, 2.0));
  vec2 id = vec2(floor(u), fila);
  vec2 f = vec2(fract(u), fract(p.y / hilada));
  lejos = max(lejos, smoothstep(0.15, 0.45, max(aa.x, aa.y) / hilada));
  float manual = step(0.62, azar1(semilla * 8.9));
  float junta = mix(0.008, 0.015, azar1(semilla * 4.3)) + manual * 0.005;
  vec2 jf = vec2(junta / largo, junta / hilada);
  vec2 fm = f + manual * (vec2(ruidoF(p * 40.0 + semilla), ruidoF(p * 37.0 - semilla)) - 0.5) * jf * 1.4;
  float llaga = max(1.0 - smoothstep(0.0, jf.x + aa.x / largo, fm.x), 1.0 - smoothstep(0.0, jf.y + aa.y / hilada, fm.y));
  llaga *= 1.0 - lejos;
  float t = azar2(id + semilla);
  float amp = mix(0.08, 0.34, max(manual, azar1(semilla * 6.1) * 0.55));
  vec3 col = base * (1.0 + (t - 0.5) * amp * (1.0 - lejos));
  float requemado = step(1.0 - mix(0.02, 0.16, manual), azar2(id * 1.7 + semilla));
  col = mix(col, base * vec3(0.55, 0.46, 0.43), requemado * 0.75 * (1.0 - lejos));
  col *= 0.95 + 0.1 * ruidoF(p * vec2(55.0, 85.0) + id) * (1.0 - lejos);
  float m = azar1(semilla * 9.1);
  vec3 mortero = m < 0.4 ? vec3(0.6, 0.58, 0.54) : (m < 0.7 ? vec3(0.76, 0.7, 0.6) : (m < 0.88 ? vec3(0.84, 0.83, 0.79) : vec3(0.32, 0.3, 0.28)));
  col = mix(col, mortero * 0.85, llaga);
  return mix(col, mix(base, mortero, 0.15), lejos * 0.5);
}

// Piedra: sillería, mampostería, canto rodado o mampostería con verdugadas de ladrillo; en las
// de mampostería, esquinas de sillares alternos
vec3 piedras(vec2 p, vec3 base, float semilla, vec2 aa, float lejos, float largoMuro) {
  float tipo = azar1(semilla * 3.9);
  vec3 col = base;
  if (tipo < 0.35) {
    float altoS = mix(0.28, 0.45, azar1(semilla * 2.2));
    float fila = floor(p.y / altoS);
    float largoS = mix(0.45, 0.9, azar1(semilla * 5.2)) * (0.8 + 0.4 * azar2(vec2(fila, semilla)));
    float u = p.x / largoS + azar2(vec2(fila * 1.3, semilla));
    vec2 id = vec2(floor(u), fila);
    vec2 f = vec2(fract(u), fract(p.y / altoS));
    float junta = max(1.0 - smoothstep(0.0, 0.03 + aa.x * 3.0, f.x), 1.0 - smoothstep(0.0, 0.05 + aa.y * 3.0, f.y)) * (1.0 - lejos);
    col = base * (0.88 + 0.24 * azar2(id + semilla)) * (0.95 + 0.1 * ruidoF(p * 12.0 + id));
    return mix(col, col * 0.7, junta);
  }
  bool canto = tipo > 0.62 && tipo < 0.78;
  float celda = canto ? 0.14 : 0.38;
  float lc = max(lejos, smoothstep(0.1, 0.3, max(aa.x, aa.y) / celda));
#ifdef FACHADA_SIMPLE
  vec2 v = vec2(1.0, azar2(floor(p / vec2(0.45, 0.3)) + semilla));   // móvil: sin Voronoi
  lc = 1.0;
#else
  vec2 v = voronoiF(p / (canto ? vec2(0.16, 0.12) : vec2(0.45, 0.3)), semilla);
#endif
  float mortero = (1.0 - smoothstep(canto ? 0.12 : 0.05, canto ? 0.26 : 0.14, v.x)) * (1.0 - lc);
  vec3 tono = canto ? mix(vec3(0.6, 0.56, 0.5), vec3(0.82, 0.75, 0.64), azar1(v.y * 7.0)) : base;
  vec3 medio = canto ? vec3(0.7, 0.65, 0.57) : base * 0.97;
  col = mix(tono * (0.8 + 0.35 * azar1(v.y * 13.0 + semilla)), medio, lc);
  if (canto) col *= mix(0.85 + 0.25 * smoothstep(0.0, 0.3, v.x), 0.97, lc);
  col = mix(col, mix(vec3(0.72, 0.68, 0.6), base * 1.05, 0.4), mortero);
  if (tipo >= 0.78) {
    float periodo = mix(0.9, 1.3, azar1(semilla * 8.8));
    float banda = step(fract(p.y / periodo), 0.21 / periodo);
    col = mix(col, ladrillos(p, vec3(0.56, 0.31, 0.2), semilla + 3.0, aa, lejos), banda);
  }
  float filaE = floor(p.y / 0.3);
  float anchoE = mix(0.35, 0.55, azar1(semilla * 1.9)) * (mod(filaE, 2.0) > 0.5 ? 1.0 : 0.62);
  float esquina = 1.0 - step(anchoE, min(p.x, largoMuro - p.x));
  vec3 sillar = mix(base, vec3(0.78, 0.74, 0.66), 0.5) * (0.92 + 0.12 * azar2(vec2(filaE, semilla)));
  float jy = (1.0 - smoothstep(0.0, 0.05 + aa.y * 3.0, fract(p.y / 0.3))) * (1.0 - lejos);
  return mix(col, mix(sillar, sillar * 0.75, jy), esquina);
}

// Enfoscado o pintura: grano (liso, fratasado, rugoso), manchas de pintura desigual, churretes,
// humedad al pie según la edad de la casa y, en las viejas, desconchones con el ladrillo debajo
vec3 enfoscado(vec2 p, vec3 base, float semilla, vec2 aa, float lejos, float alto) {
  vec3 c = base * (0.95 + 0.1 * fbmF(p * 0.35 + semilla));
  float textura = azar1(semilla * 4.4);
  float grano = textura < 0.33 ? 0.02 : (textura < 0.7 ? 0.05 : 0.09);
  c *= 1.0 + (ruidoF(p * 35.0 + semilla) - 0.5) * grano * (1.0 - lejos);
  float viejo = azar1(semilla * 12.7);
  float churrete = smoothstep(0.55, 0.85, ruidoF(vec2(p.x * 3.5 + semilla, p.y * 0.25))) * smoothstep(alto * 0.3, alto, p.y);
  c *= 1.0 - 0.12 * churrete * viejo;
  float hHum = mix(0.25, 0.9, viejo) + (ruidoF(vec2(p.x * 1.2, semilla)) - 0.5) * 0.35;
  c *= 1.0 - 0.16 * (1.0 - smoothstep(hHum - 0.12, hHum + 0.12, p.y)) * viejo;
#ifdef FACHADA_SIMPLE
  if (false) {
#else
  if (viejo > 0.82) {
#endif
    float mancha = fbmF(p * vec2(0.45, 0.7) + semilla * 3.1) + (1.0 - smoothstep(0.0, 2.2, p.y)) * 0.1;
    float hueco = smoothstep(0.71, 0.73, mancha) * (1.0 - lejos * 0.7);
    float borde = smoothstep(0.68, 0.71, mancha) - hueco;
    c = mix(c, c * 0.82, borde);
    c = mix(c, ladrillos(p, vec3(0.6, 0.38, 0.26), semilla, aa, lejos) * 0.9, hueco);
  }
  return c;
}

vec3 colorPersiana(float s) {
  if (s < 0.35) return vec3(0.33, 0.21, 0.12);   // marrón
  if (s < 0.60) return vec3(0.86, 0.85, 0.80);   // blanca
  if (s < 0.80) return vec3(0.16, 0.30, 0.20);   // verde
  return vec3(0.66, 0.58, 0.44);                 // beige
}

vec3 fachada(vec3 base, out float vidrio) {
  vidrio = 0.0;
  luzFachada = 0.0;
  vec2 p = vUvMuro;
  float alto = vMuro.x;
  float plantas = max(vMuro.y, 1.0);
  float largo = vMuro.z;
  float semilla = vMuro.w;
  float aCalle = vMuro2.x;
  float medianera = vMuro2.y;
  float estilo = vMuro2.z;
  float semillaMuro = semilla + vMuro2.w * 7.31;
  float marcasReal = floor(vReal.w / 10.0 + 0.001);
  bool real = marcasReal > 0.5;
  bool balconesReal = real && mod(floor(marcasReal / 2.0), 2.0) > 0.5;
  bool rejasReal = real && mod(floor(marcasReal / 4.0), 2.0) > 0.5;
  float altoZocaloReal = vReal.w - marcasReal * 10.0;
  vec2 aa = max(fwidth(p) * 0.8, vec2(0.002));
  float lejos = smoothstep(0.02, 0.08, max(aa.x, aa.y)); // 1 = detalle fino invisible

  vec3 c = base * (0.97 + 0.06 * azar2(floor(p * vec2(0.5, 0.9)) + semilla));
  float pie = mix(0.80, 1.0, smoothstep(0.0, 0.7, p.y));       // suciedad y sombra al pie
  float cornisa = 1.0 - 0.18 * caja(p, vec2(-1.0, alto - 0.28), vec2(largo + 1.0, alto - 0.12), aa);

  // --- Porche / tejavana: estructura abierta con pilares y viga
  if (estilo > 4.5) {
    float paso = largo / max(1.0, floor(largo / 3.5));
    float xm = mod(p.x, paso);
    float pilar = 1.0 - smoothstep(0.32 - aa.x, 0.32 + aa.x, min(xm, paso - xm) * 2.0);
    float viga = smoothstep(alto - 0.5 - aa.y, alto - 0.5 + aa.y, p.y);
    float macizo = max(max(pilar, viga), medianera);
    return mix(vec3(0.045, 0.04, 0.035), c * pie, macizo);
  }

  // --- Hormigón (frontón, depósitos, silos): paños con juntas
  if (estilo > 3.5) {
    float junta = 1.0 - smoothstep(0.0, 0.03 + aa.x, abs(fract(p.x / 3.0) - 0.5) * 3.0 - 1.47);
    return c * pie * (1.0 - 0.12 * junta * (1.0 - lejos)) * cornisa;
  }

  // --- Nave: chapa nervada, portón grande a la calle y banda de ventanas alta
  if (estilo > 2.5) {
    float nervio = 0.5 + 0.5 * cos(p.x * 6.2831 / 0.3);
    c *= 1.0 - 0.10 * nervio * (1.0 - lejos);
    float banda = caja(p, vec2(0.6, alto - 1.6), vec2(largo - 0.6, alto - 0.9), aa) * step(0.5, azar1(semilla * 3.3));
    c = mix(c, vec3(0.12, 0.15, 0.17), banda * 0.9);
    vidrio = banda;
    luzFachada = banda * step(azar1(semilla * 5.9), uVentanasEncendidas * 0.5);   // fluorescentes
    colorLuzFachada = vec3(0.8, 0.9, 1.0);
    if (aCalle > 0.5 && medianera < 0.5 && largo > 6.0) {
      float x = p.x - largo * 0.5;
      float porton = caja(vec2(x, p.y), vec2(-2.2, 0.0), vec2(2.2, min(4.5, alto - 1.0)), aa);
      vec3 colPorton = vec3(0.42, 0.44, 0.46) * (0.92 + 0.08 * cos(p.y * 6.2831 / 0.2));
      c = mix(c, colPorton, porton);
    }
    return c * pie;
  }

  // --- Enfoscado, ladrillo y piedra (cada casa con sus medidas, aparejo, textura y edad)
  float altoPlantaF = clamp((alto - 0.5) / plantas, 2.5, 4.5);
  if (estilo > 0.5 && estilo < 1.5) c = ladrillos(p, base, semilla, aa, lejos);
  else if (estilo > 1.5) c = piedras(p, base, semilla, aa, lejos, largo);
  else {
    c = enfoscado(p, c, semilla, aa, lejos, alto);
    // Planta baja de otro material en algunas casas (ladrillo o aplacado de piedra)
    float bajaDistinta = azar1(semilla * 15.3);
    if (bajaDistinta < 0.18 && p.y < altoPlantaF && !real) {
      c = bajaDistinta < 0.09 ? ladrillos(p, vec3(0.58, 0.33, 0.22), semilla + 1.0, aa, lejos)
                              : piedras(p, vec3(0.66, 0.6, 0.5), semilla + 2.0, aa, lejos, largo);
    }
  }
  // Zócalo: gris de piedra con placas, el color de la fachada más oscuro, aplacado de piedra
  // irregular o ninguno (en ladrillo y piedra, solo a veces)
  float tipoZocalo = azar1(semilla * 4.7);
  float hayZocalo = estilo < 0.5 ? step(tipoZocalo, 0.85) : step(tipoZocalo, 0.3);
  float altoZocalo = mix(0.45, 1.1, azar1(semilla * 2.1));
  float zona = (1.0 - smoothstep(altoZocalo - aa.y, altoZocalo + aa.y, p.y)) * hayZocalo;
  vec3 colZocalo;
  if (tipoZocalo < 0.3) {
    vec2 placa = vec2(p.x / 0.6, p.y / 0.4);
    float j = max(1.0 - smoothstep(0.0, 0.02 + aa.x * 2.0, fract(placa.x)), 1.0 - smoothstep(0.0, 0.03 + aa.y * 3.0, fract(placa.y)));
    colZocalo = vec3(0.42, 0.40, 0.37) * (0.92 + 0.12 * azar2(floor(placa) + semilla));
    colZocalo = mix(colZocalo, colZocalo * 0.7, j * (1.0 - lejos));
  } else if (tipoZocalo < 0.6) {
    colZocalo = base * 0.62;
  } else {
    colZocalo = piedras(p, vec3(0.6, 0.55, 0.47), semilla + 5.0, aa, lejos, largo);
  }
  if (real && altoZocaloReal > 0.05) {
    // Zócalo pintado del color de la foto, con algo de desgaste
    zona = 1.0 - smoothstep(altoZocaloReal - aa.y, altoZocaloReal + aa.y, p.y);
    colZocalo = vReal.rgb * (0.94 + 0.12 * fbmF(p * 3.0 + semilla));
  }
  c = mix(c, colZocalo, zona);
  c *= pie * cornisa;

  if (medianera > 0.5) return c * 0.94;   // muro ciego pegado al vecino

  // --- Huecos: rejilla de vanos por planta
  float altoPlanta = clamp((alto - 0.5) / plantas, 2.5, 4.5);
  float planta = floor(p.y / altoPlanta);
  if (planta >= plantas || p.y < 0.0) return c;
  float y = p.y - planta * altoPlanta;
  float anchoVano = mix(2.6, 3.8, azar1(semilla * 13.1));
  float nVanos = max(1.0, floor(largo / anchoVano));
  float anchoReal = largo / nVanos;
  float vano = clamp(floor(p.x / anchoReal), 0.0, nVanos - 1.0);
  float x = p.x - (vano + 0.5) * anchoReal;
  float suerte = azar2(vec2(vano * 1.7 + semillaMuro, planta * 3.1 + semillaMuro * 0.37));
  bool baja = planta < 0.5;

  // Planta baja a la calle: puerta o portón de garaje
  if (baja && aCalle > 0.5 && suerte < 0.45) {
    bool garaje = suerte < 0.17 && anchoReal >= 3.0;
    float w = garaje ? 2.5 : 1.0;
    float h = garaje ? min(2.4, altoPlanta - 0.3) : min(2.2, altoPlanta - 0.3);
    float hueco = caja(vec2(x, y), vec2(-w * 0.5, 0.0), vec2(w * 0.5, h), aa);
    float marco = caja(vec2(x, y), vec2(-w * 0.5 - 0.09, 0.0), vec2(w * 0.5 + 0.09, h + 0.09), aa) - hueco;
    vec3 colHueco = garaje
      ? vec3(0.52, 0.53, 0.55) * (0.9 + 0.1 * cos(y * 6.2831 / 0.12) * (1.0 - lejos))
      : (azar1(semilla * 2.9) < 0.6 ? vec3(0.30, 0.18, 0.09) : vec3(0.15, 0.24, 0.17));
    c = mix(c, c * 0.72, marco);
    return mix(c, colHueco, hueco);
  }
  if (suerte > 0.88 && !(real && aCalle > 0.5)) return c;  // vano ciego

  float anchoV = min(mix(0.9, 1.4, azar1(semilla * 7.3)), anchoReal - 0.6);
  float altoV = min(mix(1.1, 1.45, azar1(semilla * 3.7)), altoPlanta - 1.1);
  if (anchoV < 0.5 || altoV < 0.6) return c;
  float alfeizar = min(0.95, altoPlanta - altoV - 0.25);
  bool balcon = !baja && (balconesReal && aCalle > 0.5 ? true : azar1(semilla * 5.5) > 0.45 && suerte < 0.55);
  float y0 = balcon ? 0.08 : alfeizar;
  float y1 = alfeizar + altoV;
  float w = balcon ? max(anchoV, 0.9) : anchoV;

  float hueco = caja(vec2(x, y), vec2(-w * 0.5, y0), vec2(w * 0.5, y1), aa);
  float marco = caja(vec2(x, y), vec2(-w * 0.5 - 0.07, y0 - 0.07), vec2(w * 0.5 + 0.07, y1 + 0.07), aa) - hueco;
  float bajada = azar2(vec2(suerte, semilla)) * 0.8;
  float persiana = hueco * step(y1 - (y1 - y0) * bajada, y);
  vec3 colPersiana = colorPersiana(azar1(semilla * 11.0))
    * (0.9 + 0.1 * cos(y * 6.2831 / 0.05) * (1.0 - lejos));
  vec3 colVidrio = vec3(0.05, 0.07, 0.09) + 0.07 * clamp((y - y0) / max(y1 - y0, 0.1), 0.0, 1.0);

  float tm = azar1(semilla * 17.9);
  vec3 colMarco = tm < 0.4 ? vec3(0.93, 0.92, 0.88) : (tm < 0.55 ? vec3(0.82, 0.7, 0.5)
    : (tm < 0.7 ? vec3(0.62, 0.6, 0.56) : (tm < 0.8 ? vec3(0.6, 0.34, 0.22) : c * 0.85)));
  c = mix(c, mix(c, colMarco, 0.75), marco);
  c = mix(c, colVidrio, hueco);
  c = mix(c, colPersiana, persiana);
  vidrio = clamp(hueco - persiana, 0.0, 1.0);

  if (balcon) {
    float losa = caja(vec2(x, y), vec2(-w * 0.5 - 0.3, y0 - 0.14), vec2(w * 0.5 + 0.3, y0), aa);
    float zona = caja(vec2(x, y), vec2(-w * 0.5 - 0.25, y0), vec2(w * 0.5 + 0.25, y0 + 0.95), aa);
    float barrote = 1.0 - smoothstep(0.12, 0.3, abs(fract(x / 0.12) - 0.5) * 2.0);
    float pasamanos = caja(vec2(x, y), vec2(-w * 0.5 - 0.25, y0 + 0.88), vec2(w * 0.5 + 0.25, y0 + 0.95), aa);
    float hierro = zona * max(mix(barrote, 0.35, lejos), pasamanos);
    c = mix(c, vec3(0.38, 0.37, 0.35), losa);
    c = mix(c, vec3(0.05, 0.05, 0.05), hierro);
    vidrio *= 1.0 - hierro;
  }
  if (baja && rejasReal && aCalle > 0.5) {
    // Reja de forja sobre la ventana de la planta baja
    float zonaR = caja(vec2(x, y), vec2(-w * 0.5 - 0.06, y0 - 0.06), vec2(w * 0.5 + 0.06, y1 + 0.06), aa);
    float barra = 1.0 - smoothstep(0.1, 0.28, abs(fract(x / 0.13) - 0.5) * 2.0);
    float travesano = 1.0 - smoothstep(0.0, 0.03 + aa.y, abs(fract((y - y0) / ((y1 - y0) / 3.0) + 0.5) - 0.5) * (y1 - y0) / 3.0);
    float hierroR = zonaR * max(mix(barra, 0.3, lejos), travesano);
    c = mix(c, vec3(0.06, 0.06, 0.06), hierroR);
    vidrio *= 1.0 - hierroR;
  }
  // Luz de dentro: por el vidrio y, poca, entre las lamas de la persiana
  float suerteLuz = azar2(vec2(vano * 3.7 + semillaMuro * 0.11, planta * 5.3 + semilla));
  luzFachada = step(suerteLuz, uVentanasEncendidas) * (vidrio + 0.12 * persiana);
  float tono = azar1(suerteLuz * 91.7);
  colorLuzFachada = tono < 0.75 ? vec3(1.0, 0.66, 0.34) : (tono < 0.92 ? vec3(1.0, 0.84, 0.6) : vec3(0.55, 0.7, 1.0));
  return c;
}
`;
