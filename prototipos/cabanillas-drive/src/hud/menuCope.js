// Menú de la COPE (Sociedad Cooperativa del Campo San Isidro), modo agricultura (PLAN_AGRICULTURA.md,
// A3): coger el tractor (con su color) o dejarlo y volver al coche. La tienda (semilla, plantel,
// abono, aperos) y la venta de la cosecha llegan en A5 y A9.
const ESTILO = `
#menu-cope { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; background: rgba(0,0,0,.35); }
#menu-cope[hidden] { display: none; }
#menu-cope .caja { width: min(440px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; color: var(--tinta, #fff);
  background: var(--fondo-ui, rgba(16,22,30,.9)); border-radius: 14px; padding: 16px; font: 500 14px system-ui, sans-serif;
  backdrop-filter: blur(8px); box-shadow: 0 10px 30px rgba(0,0,0,.4); }
#menu-cope h2 { margin: 0 0 12px; font-size: 18px; }
#menu-cope h2 small { display: block; font-size: 12px; font-weight: 500; opacity: .8; margin-top: 2px; }
#menu-cope button { display: block; width: 100%; margin: 8px 0 0; padding: 12px; border-radius: 10px; cursor: pointer; text-align: left;
  font: 600 15px system-ui, sans-serif; color: #1a1a1a; background: var(--acento, #ffd54a); border: 0; }
#menu-cope button.plano { background: rgba(255,255,255,.1); color: inherit; border: 1px solid rgba(255,255,255,.22); text-align: center; }
#menu-cope .colores { display: flex; gap: 8px; margin-top: 10px; }
#menu-cope .colores label { flex: 1; text-align: center; font-size: 12px; cursor: pointer; }
#menu-cope .colores input { position: absolute; opacity: 0; pointer-events: none; }
#menu-cope .colores span { display: block; height: 30px; border-radius: 8px; margin-bottom: 4px; border: 3px solid transparent; }
#menu-cope .colores input:checked + span { border-color: #fff; box-shadow: 0 0 0 2px rgba(0,0,0,.5); }
#menu-cope .nota { margin-top: 12px; font-size: 12px; opacity: .8; }
#menu-cope ul { margin: 8px 0 0; padding-left: 18px; font-size: 13px; opacity: .9; }
`;

export function creaMenuCope() {
  const tactil = matchMedia('(pointer: coarse)').matches;
  const raiz = document.createElement('div');
  raiz.id = 'menu-cope';
  raiz.hidden = true;
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  const caja = document.createElement('div');
  caja.className = 'caja';
  raiz.append(estilo, caja);
  document.body.append(raiz);
  raiz.addEventListener('click', (e) => { if (e.target === raiz) raiz.hidden = true; });
  const crea = (etiqueta, clase, padre, texto = '') => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto) e.textContent = texto;
    padre.append(e);
    return e;
  };
  const boton = (texto, clase, alPulsar) => {
    const b = crea('button', clase, caja, texto);
    b.type = 'button';
    b.addEventListener('click', alPulsar);
    return b;
  };

  return {
    get visible() { return !raiz.hidden; },
    oculta() { raiz.hidden = true; },
    // en: 'coche' | 'tractor'. colores: [{ nombre, color }]. acciones: { tractor(indiceColor), coche() }
    abre({ en, colores, colorElegido, acciones }) {
      caja.replaceChildren();
      raiz.hidden = false;
      document.exitPointerLock?.();
      const h = crea('h2', '', caja, '🚜 COPE · San Isidro');
      crea('small', '', h, 'Sociedad Cooperativa del Campo San Isidro');
      let elegido = colorElegido;
      if (en === 'coche') {
        const fila = crea('div', 'colores', caja);
        colores.forEach((c, i) => {
          const l = crea('label', '', fila);
          const r = crea('input', '', l);
          r.type = 'radio';
          r.name = 'color-tractor';
          r.checked = i === elegido;
          r.addEventListener('change', () => { elegido = i; });
          const muestra = crea('span', '', l);
          muestra.style.background = `#${c.color.toString(16).padStart(6, '0')}`;
          l.append(c.nombre);
        });
        boton('🚜 Coger el tractor', '', () => { raiz.hidden = true; acciones.tractor(elegido); });
        const ayuda = crea('ul', '', caja);
        for (const l of tactil
          ? ['Se conduce como el coche (joystick); 👁 cambia a la cámara de la cabina', 'Para volver al coche, entra otra vez aquí con el tractor']
          : ['Se conduce como el coche (WASD o flechas); C: cámara de la cabina', 'Para volver al coche, entra otra vez aquí con el tractor (E)']) crea('li', '', ayuda, l);
      } else {
        boton('🚗 Dejar el tractor y coger el coche', '', () => { raiz.hidden = true; acciones.coche(); });
      }
      crea('div', 'nota', caja, 'Pronto: semilla, plantel, abono y aperos, y venta de la cosecha.');
      boton('Cerrar', 'plano', () => { raiz.hidden = true; });
    },
  };
}
