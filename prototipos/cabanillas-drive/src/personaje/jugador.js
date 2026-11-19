// El personaje creado en el editor, preparado como una «variante» de persona del pueblo
// ({ escena, andar, quieto }, como las de juego/peatones.js): así lo usan tal cual el jugador de
// las fiestas (fiestas/personaje.js) y el del salto (salto/persona.js).
import { creaFabricaPersonajes } from './modelo.js';
import { normaliza } from './estado.js';

export async function creaVarianteJugador(apariencia, { renderer, sombras = true, texturaMax = 2048 } = {}) {
  const fabrica = await creaFabricaPersonajes();
  const msaa = Boolean(renderer?.getContext().getContextAttributes()?.antialias);
  const personaje = fabrica.crea({ sombras, texturaMax, msaa });
  await personaje.aplica(normaliza(apariencia));
  personaje.raiz.name = 'jugador_personaje';
  return {
    id: 'jugador', escena: personaje.raiz, personaje,
    andar: personaje.animacion('andar'), quieto: personaje.animacion('quieto'),
    nombre: apariencia?.nombre ?? '',
  };
}
