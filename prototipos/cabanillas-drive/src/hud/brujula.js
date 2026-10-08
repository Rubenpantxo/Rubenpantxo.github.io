// Brújula en franja: puntos cardinales que se desplazan con el rumbo y los grados debajo.
import { HUD } from '../config/hud.js';

const PUNTOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

export function creaBrujula(lienzo) {
  const ctx = lienzo.getContext('2d');
  let ancho = 0;
  let alto = 0;

  function ajusta() {
    const r = Math.min(window.devicePixelRatio, 2);
    const w = Math.round(lienzo.clientWidth * r);
    const h = Math.round(lienzo.clientHeight * r);
    if (w !== ancho || h !== alto) {
      ancho = lienzo.width = w;
      alto = lienzo.height = h;
    }
  }

  return {
    actualiza(rumboRad) {
      ajusta();
      const rumbo = ((rumboRad * 180) / Math.PI + 360) % 360;
      const pxGrado = ancho / HUD.brujula.anchoGrados;
      const h = alto;
      ctx.clearRect(0, 0, ancho, h);
      ctx.fillStyle = 'rgba(16, 22, 30, 0.72)';
      ctx.beginPath();
      ctx.roundRect(0, 0, ancho, h, h * 0.25);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, ancho, h);
      ctx.clip();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const desde = Math.floor((rumbo - HUD.brujula.anchoGrados / 2) / 5) * 5;
      for (let g = desde; g <= rumbo + HUD.brujula.anchoGrados / 2; g += 5) {
        const x = ancho / 2 + (g - rumbo) * pxGrado;
        const gn = ((g % 360) + 360) % 360;
        if (gn % 45 === 0) {
          const nombre = PUNTOS[gn / 45];
          ctx.fillStyle = nombre === 'N' ? '#ff5a4e' : '#ffffff';
          ctx.font = `700 ${Math.round(h * (nombre.length === 1 ? 0.42 : 0.32))}px system-ui, "Segoe UI", sans-serif`;
          ctx.fillText(nombre, x, h * 0.42);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = Math.max(1, h * 0.03);
          ctx.beginPath();
          const largo = gn % 15 === 0 ? 0.22 : 0.12;
          ctx.moveTo(x, h * (0.42 - largo / 2));
          ctx.lineTo(x, h * (0.42 + largo / 2));
          ctx.stroke();
        }
      }
      ctx.restore();
      // Marca central y grados
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath();
      ctx.moveTo(ancho / 2 - h * 0.09, 0);
      ctx.lineTo(ancho / 2 + h * 0.09, 0);
      ctx.lineTo(ancho / 2, h * 0.13);
      ctx.closePath();
      ctx.fill();
      ctx.font = `600 ${Math.round(h * 0.24)}px system-ui, "Segoe UI", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText(`${Math.round(rumbo) % 360}°`, ancho / 2, h * 0.82);
    },
  };
}
