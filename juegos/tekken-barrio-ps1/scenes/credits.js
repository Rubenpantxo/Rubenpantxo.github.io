/* ============================================
   CREDITS
   ============================================ */

const CreditsScene = (() => {
  function render() {
    const root = SceneManager.getRoot();
    root.innerHTML = `
      <div class="credits-scene">
        <div class="credits-scroll">
          <div class="credits-block">
            <h2>TEKKEN BARRIO PS1</h2>
            <p>UNA EXPERIENCIA ARCADE 1996</p>
          </div>

          <div class="credits-block">
            <h3>DIRECCIÓN GENERAL</h3>
            <div class="role">DIRECTOR DE JUEGO</div>
            <p>EL JEFE DEL BARRIO</p>
          </div>

          <div class="credits-block">
            <h3>DISEÑO DE PERSONAJES</h3>
            <p>BRAWLER AMARILLO</p>
            <p>MATRIARCA AZUL</p>
            <p>SULIMA-X FIGHTER</p>
            <p>DUO RAYAS &amp; CADENA</p>
            <p>LA PATAI &amp; HIJA</p>
            <p>CABALLERO NEGRO</p>
            <p>EL CHACAL</p>
            <p>DOÑA MERCADO</p>
            <p>PANAS DEL BARRIO</p>
            <p>LA GRAFFITERA</p>
            <p>EL MECÁNICO</p>
            <p>LOS PRIMOS</p>
            <p>EL VIEJO DEL BARRIO</p>
            <p>LA REINA DEL RING</p>
            <p>EL RAPERO</p>
          </div>

          <div class="credits-block">
            <h3>PROGRAMACIÓN</h3>
            <div class="role">MOTOR DE COMBATE</div>
            <p>HTML / CSS / JAVASCRIPT</p>
            <div class="role">IA DEL CPU</div>
            <p>BARRIO AI v1.0</p>
            <div class="role">PWA</div>
            <p>SERVICE WORKER + MANIFEST</p>
          </div>

          <div class="credits-block">
            <h3>MODOS DE JUEGO</h3>
            <p>ARCADE</p>
            <p>VERSUS 2 JUGADORES</p>
            <p>TORNEO 8 LUCHADORES</p>
          </div>

          <div class="credits-block">
            <h3>AGRADECIMIENTOS</h3>
            <p>A TODO EL BARRIO</p>
            <p>A LA PLAZA</p>
            <p>A LOS LUCHADORES DE VERDAD</p>
          </div>

          <div class="credits-block">
            <h2>¡HASTA LA PRÓXIMA!</h2>
            <p>© 1996 BARRIO ARCADE INC.</p>
          </div>
        </div>

        <div class="credits-back">PULSA ESPACIO O ESC PARA VOLVER</div>
      </div>
    `;
  }

  function onInput(evt) {
    if (evt.type !== "press") return;
    if (evt.action === "back" || evt.action === "confirm") SceneManager.go("menu");
  }

  function enter() {
    render();
    Input.on(onInput);
    AudioMgr.playMusic("menuMusic");
  }

  function exit() { Input.off(onInput); }

  return { enter, exit };
})();

window.CreditsScene = CreditsScene;
