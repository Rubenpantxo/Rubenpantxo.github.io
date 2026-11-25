// Menú de la COPE (Sociedad Cooperativa del Campo San Isidro), modo agricultura (PLAN_AGRICULTURA.md,
// A3–A5): coger el tractor (con su color y su apero) o dejarlo y volver al coche; con el tractor,
// enganchar o dejar los aperos que esperan en el patio y llenar la tolva de abono o de semilla (trigo
// o cebada); (A6) ver el día de cultivo y pasar días; (A8) coger o dejar la cosechadora y descargar
// en la COPE el grano de su tolva o del remolque (de momento se apunta lo entregado). Pagar lo que se
// carga, el plantel y la venta de la cosecha llegan en A9.
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
#menu-cope h3 { margin: 14px 0 0; font-size: 14px; opacity: .9; }
#menu-cope button small { display: block; font-weight: 500; font-size: 12px; opacity: .8; }
#menu-cope button.enganchado { background: #4caf50; }
#menu-cope .colores.aperos { flex-wrap: wrap; }
#menu-cope .colores.aperos label { flex: 1 0 18%; }
#menu-cope .tolva { margin-top: 10px; font-size: 13px; }
#menu-cope .fila-dias { display: flex; gap: 6px; }
#menu-cope .fila-dias button { flex: 1; margin-top: 6px; }
#menu-cope .tolva .barra { height: 8px; border-radius: 4px; background: rgba(255,255,255,.18); overflow: hidden; margin-top: 4px; }
#menu-cope .tolva .barra i { display: block; height: 100%; background: var(--acento, #ffd54a); }
#menu-cope .aperos span.icono { height: auto; padding: 6px 0; font-size: 20px; background: rgba(255,255,255,.08); }
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

  // Trigo o cebada para la sembradora
  function eligeSemilla(semillas, semilla, alCambiar) {
    crea('h3', '', caja, 'Semilla para la sembradora');
    const fila = crea('div', 'colores aperos', caja);
    for (const g of semillas) {
      const l = crea('label', '', fila);
      const r = crea('input', '', l);
      r.type = 'radio';
      r.name = 'semilla';
      r.checked = g.id === semilla;
      r.addEventListener('change', () => alCambiar(g.id));
      crea('span', 'icono', l, g.icono);
      l.append(g.nombre);
    }
  }

  return {
    get visible() { return !raiz.hidden; },
    oculta() { raiz.hidden = true; },
    // en: 'coche' | 'tractor'. colores: [{ nombre, color }]. aperos: [{ id, nombre, detalle, icono, enganchado }].
    // semillas: [{ id, nombre, icono }], semilla: la elegida. tolva: null o { nombre, llenado, kg, capacidad, esSemilla }.
    // acciones: { tractor(indiceColor, idApero), coche(), engancha(id), desengancha(), sonido() → activo,
    //   semilla(id), llena() }
    // reloj: { dia, minutosParaManana, pasar: [1, 7, 30] } (acciones.pasaDias(n))
    // A8: en: 'cosechadora'. cosecha: { kg, capacidad, nombre } (tolva de la cosechadora); remolque: { kg,
    // capacidad, nombre } (el enganchado al tractor); granero: { kg, texto } (lo entregado en la COPE).
    // acciones: cosechadora(), vaciaTolva(), vaciaRemolque()
    abre({ en, colores, colorElegido, aperos = [], semillas = [], semilla = null, tolva = null, sonido = null, reloj = null,
      cosecha = null, remolque = null, granero = null, acciones }) {
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
        // Con qué apero sale (los que esperan en el patio)
        let aperoElegido = aperos.find((a) => a.enganchado)?.id ?? null;
        if (aperos.length) {
          crea('h3', '', caja, 'Apero');
          const filaA = crea('div', 'colores aperos', caja);
          for (const a of [{ id: null, nombre: 'Sin apero', icono: '🚜' }, ...aperos]) {
            const l = crea('label', '', filaA);
            const r = crea('input', '', l);
            r.type = 'radio';
            r.name = 'apero-tractor';
            r.value = a.id ?? '';
            r.checked = a.id === aperoElegido;
            r.addEventListener('change', () => { aperoElegido = a.id; });
            crea('span', 'icono', l, a.icono);
            l.append(a.nombre);
          }
        }
        if (semillas.length) eligeSemilla(semillas, semilla, (id) => acciones.semilla(id));
        boton('🚜 Coger el tractor', '', () => { raiz.hidden = true; acciones.tractor(elegido, aperoElegido); });
        if (acciones.cosechadora) {
          const b = boton('🌾 Coger la cosechadora', '', () => { raiz.hidden = true; acciones.cosechadora(); });
          crea('small', '', b, 'cabezal de 5,4 m · para el trigo y la cebada maduros');
        }
        const ayuda = crea('ul', '', caja);
        for (const l of tactil
          ? ['Se conduce como el coche (joystick); 👁 cambia a la cámara de la cabina', '⬇ (arriba a la derecha) baja y sube el apero', 'Para cambiar de apero o volver al coche, entra otra vez aquí con el tractor']
          : ['Se conduce como el coche (WASD o flechas); C: cámara de la cabina', 'Q: bajar y subir el apero', 'Para cambiar de apero o volver al coche, entra otra vez aquí con el tractor (E)']) crea('li', '', ayuda, l);
      } else if (en === 'cosechadora') {
        if (cosecha) {
          crea('h3', '', caja, 'Tolva de grano');
          const pct = Math.round((cosecha.kg / cosecha.capacidad) * 100);
          const t = crea('div', 'tolva', caja, `${pct} % · ${Math.round(cosecha.kg)} de ${Math.round(cosecha.capacidad)} kg${cosecha.kg > 0 ? ` de ${cosecha.nombre}` : ''}`);
          crea('i', '', crea('div', 'barra', t)).style.width = `${pct}%`;
          if (cosecha.kg > 0) boton('🏭 Descargar la tolva en la COPE', '', () => { raiz.hidden = true; acciones.vaciaTolva(); });
        }
        const ayuda = crea('ul', '', caja);
        for (const l of [tactil ? '⬇ (arriba a la derecha): bajar y subir el cabezal' : 'Q: bajar y subir el cabezal',
          'Con el cabezal bajado, avanza por el cereal maduro: siega por donde pasa y el grano va a la tolva',
          tactil ? '🌾: sacar y recoger el tubo de descarga' : 'X: sacar y recoger el tubo de descarga (a la izquierda)',
          'Para vaciarla en el campo: arrima el remolque del tractor a la izquierda, bajo el tubo',
          'Bájate (🚶 o E) para subir al tractor o a otro vehículo que esté cerca'])
          crea('li', '', ayuda, l);
        boton('🚗 Dejar la cosechadora y coger el coche', 'plano', () => { raiz.hidden = true; acciones.coche(); });
      } else {
        // Remolque de grano enganchado: lo que lleva, y descargarlo aquí
        if (remolque) {
          crea('h3', '', caja, 'Remolque');
          const pct = Math.round((remolque.kg / remolque.capacidad) * 100);
          const t = crea('div', 'tolva', caja, `${pct} % · ${Math.round(remolque.kg)} de ${remolque.capacidad} kg${remolque.kg > 0 ? ` de ${remolque.nombre}` : ''}`);
          crea('i', '', crea('div', 'barra', t)).style.width = `${pct}%`;
          if (remolque.kg > 0) boton('🏭 Descargar el remolque en la COPE', '', () => { raiz.hidden = true; acciones.vaciaRemolque(); });
        }
        // Tolva del apero enganchado: cuánto queda y llenarla aquí
        if (tolva) {
          crea('h3', '', caja, 'Tolva');
          const t = crea('div', 'tolva', caja, `${Math.round(tolva.llenado * 100)} % · ${Math.round(tolva.kg)} de ${tolva.capacidad} kg de ${tolva.nombre}`);
          crea('i', '', crea('div', 'barra', t)).style.width = `${Math.round(tolva.llenado * 100)}%`;
          if (tolva.esSemilla && semillas.length) eligeSemilla(semillas, semilla, (id) => acciones.semilla(id));
          boton(tolva.esSemilla ? '🌾 Llenar la tolva de semilla' : '🌨️ Llenar la tolva de abono', '', () => { raiz.hidden = true; acciones.llena(); });
        }
        if (aperos.length) {
          crea('h3', '', caja, 'Aperos del patio');
          for (const a of aperos) {
            const b = boton(`${a.icono} ${a.enganchado ? 'Enganchado: ' : 'Enganchar '}${a.nombre}`, a.enganchado ? 'enganchado' : '', () => {
              raiz.hidden = true;
              if (a.enganchado) acciones.desengancha(); else acciones.engancha(a.id);
            });
            crea('small', '', b, a.enganchado ? `${a.detalle} · tócalo para dejarlo en el patio` : a.detalle);
          }
          const ayuda = crea('ul', '', caja);
          for (const l of [tactil ? '⬇ (arriba a la derecha): bajar y subir el apero' : 'Q: bajar y subir el apero',
            'Bájalo dentro de la parcela y avanza: trabaja por donde pasa', 'El arado da la vuelta cada vez que lo levantas, para la pasada de vuelta',
            'La abonadora reparte 12 m; la sembradora (arrastrada) siembra 3 m sobre la tierra preparada', 'Al enganchar la abonadora o la sembradora se llena su tolva',
            'El remolque de grano lo llena la cosechadora con su tubo'])
            crea('li', '', ayuda, l);
        }
        boton('🚗 Dejar el tractor y coger el coche', 'plano', () => { raiz.hidden = true; acciones.coche(); });
      }
      if (granero?.kg > 0) crea('div', 'tolva', caja, `🏭 ${granero.texto}`);
      // Calendario: el día de cultivo y pasar días (lo sembrado crece)
      if (reloj) {
        crea('h3', '', caja, 'Calendario');
        const texto = () => `📅 Día ${reloj.dia} de cultivo · el siguiente, dentro de ${reloj.minutosParaManana} min de juego`;
        const linea = crea('div', 'tolva', caja, texto());
        const fila = crea('div', 'fila-dias', caja);
        for (const n of reloj.pasar) {
          const b = crea('button', 'plano', fila, `⏩ +${n} ${n === 1 ? 'día' : 'días'}`);
          b.type = 'button';
          b.addEventListener('click', () => {
            acciones.pasaDias(n);
            reloj.dia += n;
            linea.textContent = texto();
          });
        }
      }
      if (sonido !== null) {
        const b = boton(sonido ? '🔊 Sonido del motor: sí' : '🔇 Sonido del motor: no', 'plano', () => {
          const activo = acciones.sonido();
          b.textContent = activo ? '🔊 Sonido del motor: sí' : '🔇 Sonido del motor: no';
        });
      }
      crea('div', 'nota', caja, 'Pronto: pagar el abono y la semilla, el plantel y la venta de la cosecha.');
      boton('Cerrar', 'plano', () => { raiz.hidden = true; });
    },
  };
}
