# SM64 Coop DX · versión web

Port a WebAssembly de [sm64coopdx](https://github.com/coop-deluxe/sm64coopdx) v1.5.1 (un jugador, sin online).

- El juego no incluye ningún recurso de la ROM: cada jugador carga su propia ROM de
  *Super Mario 64 (USA)*. La página la valida (SHA-1) y la guarda solo en su navegador (IndexedDB).
- La partida, la configuración y los datos de mods se guardan también en IndexedDB.
- Mods incluidos: Star Road, SM74, day-night-cycle, cheats, faster-swimming, personal-starcount-ex.

## Cómo se genera

Estos archivos salen de la rama `web-emscripten` del fork (`~/sm64coopdx-web` en WSL):

```bash
./build-web.sh
```

y se copian desde `build-web/dist/`. No se editan a mano: `index.html` lleva un sello de versión
que `build-web.sh` rellena en cada compilación para que el navegador no mezcle archivos de versiones distintas.
