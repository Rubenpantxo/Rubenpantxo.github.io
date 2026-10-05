// Fachadas procedurales: ventanas por planta, persianas, balcones, puertas y portones,
// ladrillo, zócalo, naves de chapa y porches. Todo sale de los atributos de cada muro
// (sin texturas), así cada casa es distinta y no pesa nada.
//
// Atributos por vértice de muro:
//   aUvMuro = (metros a lo largo del muro, metros sobre la base)
//   aMuro   = (altura del edificio, plantas, largo del muro, semilla del edificio)
//   aMuro2  = (da a la calle, medianera, estilo, índice del lado)
// Estilos: 0 enfoscado · 1 ladrillo · 2 piedra · 3 nave · 4 hormigón · 5 porche/tejavana

export const GLSL_FACHADA = /* glsl */ `
varying vec2 vUvMuro;
varying vec4 vMuro;
varying vec4 vMuro2;

float azar1(float n) { return fract(sin(n) * 43758.5453123); }
float azar2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123); }

// Rectángulo [a, b] con bordes suavizados según el tamaño del píxel (evita parpadeos)
float caja(vec2 p, vec2 a, vec2 b, vec2 aa) {
  vec2 s = smoothstep(a - aa, a + aa, p) - smoothstep(b - aa, b + aa, p);
  return clamp(s.x, 0.0, 1.0) * clamp(s.y, 0.0, 1.0);
}

vec3 colorPersiana(float s) {
  if (s < 0.35) return vec3(0.33, 0.21, 0.12);   // marrón
  if (s < 0.60) return vec3(0.86, 0.85, 0.80);   // blanca
  if (s < 0.80) return vec3(0.16, 0.30, 0.20);   // verde
  return vec3(0.66, 0.58, 0.44);                 // beige
}

vec3 fachada(vec3 base, out float vidrio) {
  vidrio = 0.0;
  vec2 p = vUvMuro;
  float alto = vMuro.x;
  float plantas = max(vMuro.y, 1.0);
  float largo = vMuro.z;
  float semilla = vMuro.w;
  float aCalle = vMuro2.x;
  float medianera = vMuro2.y;
  float estilo = vMuro2.z;
  float semillaMuro = semilla + vMuro2.w * 7.31;
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
    if (aCalle > 0.5 && medianera < 0.5 && largo > 6.0) {
      float x = p.x - largo * 0.5;
      float porton = caja(vec2(x, p.y), vec2(-2.2, 0.0), vec2(2.2, min(4.5, alto - 1.0)), aa);
      vec3 colPorton = vec3(0.42, 0.44, 0.46) * (0.92 + 0.08 * cos(p.y * 6.2831 / 0.2));
      c = mix(c, colPorton, porton);
    }
    return c * pie;
  }

  // --- Enfoscado, ladrillo y piedra
  if (estilo > 0.5 && estilo < 1.5) {
    float fila = floor(p.y / 0.075);
    float bx = p.x / 0.25 + 0.5 * mod(fila, 2.0);
    vec2 pb = vec2(fract(bx), fract(p.y / 0.075));
    float llaga = max(1.0 - smoothstep(0.0, 0.05, pb.x), 1.0 - smoothstep(0.0, 0.14, pb.y)) * (1.0 - lejos);
    c *= 1.0 + (azar2(vec2(floor(bx), fila) + semilla) - 0.5) * 0.16 * (1.0 - lejos);
    c = mix(c, vec3(0.62, 0.58, 0.52), llaga * 0.55);
  } else if (estilo > 1.5) {
    vec2 sillar = vec2(p.x / 0.6 + 0.5 * mod(floor(p.y / 0.35), 2.0), p.y / 0.35);
    float junta = max(1.0 - smoothstep(0.0, 0.04, fract(sillar.x)), 1.0 - smoothstep(0.0, 0.07, fract(sillar.y)));
    c *= 1.0 + (azar2(floor(sillar) + semilla) - 0.5) * 0.14 * (1.0 - lejos);
    c = mix(c, c * 0.72, junta * (1.0 - lejos));
  }
  // Zócalo
  float altoZocalo = mix(0.5, 1.0, azar1(semilla * 2.1));
  vec3 colZocalo = azar1(semilla * 4.7) < 0.5 ? vec3(0.42, 0.40, 0.37) : base * 0.62;
  c = mix(c, colZocalo, (1.0 - smoothstep(altoZocalo - aa.y, altoZocalo + aa.y, p.y)) * step(estilo, 0.5));
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
  if (suerte > 0.88) return c;  // vano ciego

  float anchoV = min(mix(0.9, 1.4, azar1(semilla * 7.3)), anchoReal - 0.6);
  float altoV = min(mix(1.1, 1.45, azar1(semilla * 3.7)), altoPlanta - 1.1);
  if (anchoV < 0.5 || altoV < 0.6) return c;
  float alfeizar = min(0.95, altoPlanta - altoV - 0.25);
  bool balcon = !baja && azar1(semilla * 5.5) > 0.45 && suerte < 0.55;
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

  c = mix(c, mix(c, vec3(0.93, 0.92, 0.88), 0.5), marco);
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
  return c;
}
`;
