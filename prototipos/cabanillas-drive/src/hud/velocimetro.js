// Velocímetro de aguja en canvas: escala en arco, zona roja, cifra grande y «R» marcha atrás.
import { HUD } from '../config/hud.js';

export function creaVelocimetro(lienzo) {
  const cfg = HUD.velocimetro;
  const ctx = lienzo.getContext('2d');
  let mostrado = 0;
  let tamano = 0;

  function ajusta() {
    const css = lienzo.clientWidth;
    const px = Math.round(css * Math.min(window.devicePixelRatio, 2));
    if (px !== tamano) {
      tamano = px;
      lienzo.width = lienzo.height = px;
    }
  }

  // Ángulo (radianes, canvas) de una velocidad: el arco abierto por abajo
  const inicio = Math.PI / 2 + ((360 - cfg.barrido) / 2) * (Math.PI / 180);
  const angulo = (v) => inicio + (Math.min(v, cfg.maxKmh) / cfg.maxKmh) * cfg.barrido * (Math.PI / 180);

  function dibuja(kmh, marchaAtras) {
    ajusta();
    const s = tamano / 200;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, 200, 200);
    const c = 100;

    // Esfera
    ctx.beginPath();
    ctx.arc(c, c, 96, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 22, 30, 0.78)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.stroke();

    // Arco de progreso
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(c, c, 82, inicio, angulo(cfg.maxKmh));
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, 82, inicio, angulo(kmh));
    ctx.strokeStyle = kmh >= cfg.zonaRoja ? '#ff5a4e' : '#ffd54a';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, 82, angulo(cfg.zonaRoja), angulo(cfg.maxKmh));
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff5a4e';
    ctx.stroke();

    // Marcas y números
    ctx.lineCap = 'butt';
    ctx.font = '600 13px system-ui, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= cfg.maxKmh; v += cfg.marcaCada) {
      const a = angulo(v);
      const larga = v % cfg.numeroCada === 0;
      const r0 = larga ? 64 : 69;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      ctx.lineTo(c + Math.cos(a) * 74, c + Math.sin(a) * 74);
      ctx.lineWidth = larga ? 2.2 : 1.2;
      ctx.strokeStyle = v >= cfg.zonaRoja ? '#ff7a70' : 'rgba(255, 255, 255, 0.75)';
      ctx.stroke();
      if (larga) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(String(v), c + Math.cos(a) * 52, c + Math.sin(a) * 52);
      }
    }

    // Aguja
    const a = angulo(kmh);
    ctx.beginPath();
    ctx.moveTo(c - Math.cos(a) * 10, c - Math.sin(a) * 10);
    ctx.lineTo(c + Math.cos(a) * 76, c + Math.sin(a) * 76);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ff5a4e';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5a4e';
    ctx.fill();

    // Cifra
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px system-ui, "Segoe UI", sans-serif';
    ctx.fillText(String(Math.round(kmh)), c, c + 42);
    ctx.font = '500 11px system-ui, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(marchaAtras ? 'km/h · R' : 'km/h', c, c + 66);
  }

  return {
    // Suaviza la aguja (la velocidad física vibra un poco)
    actualiza(kmh, dt) {
      const objetivo = Math.abs(kmh);
      mostrado += (objetivo - mostrado) * Math.min(1, dt * 10);
      dibuja(mostrado, kmh < -1);
    },
  };
}
