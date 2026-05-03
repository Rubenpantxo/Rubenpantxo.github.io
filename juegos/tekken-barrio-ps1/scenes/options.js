/* ============================================
   OPCIONES: volumen, dificultad, partículas
   ============================================ */

const OptionsScene = (() => {
  let activeIndex = 0;

  const items = [
    { key: 'musicVolume', label: 'VOLUMEN MÚSICA', type: 'slider', step: 0.1, min: 0, max: 1 },
    { key: 'sfxVolume',   label: 'VOLUMEN SFX',     type: 'slider', step: 0.1, min: 0, max: 1 },
    { key: 'difficulty',  label: 'DIFICULTAD CPU',   type: 'choice', choices: ['easy', 'normal', 'hard'] },
    { key: 'particles',   label: 'PARTÍCULAS',       type: 'toggle' },
    { key: '__reset',     label: 'RESETEAR DATOS',   type: 'action' },
    { key: '__back',      label: 'VOLVER AL MENÚ',   type: 'back' }
  ];

  function getValue(key) { return Storage.get('options.' + key); }
  function setValue(key, value) {
    Storage.set('options.' + key, value);
    AudioMgr.refreshVolumes();
    if (key === 'particles') Particles.setEnabled(value);
  }

  function render() {
    const root = SceneManager.getRoot();
    root.innerHTML = `
      <div class="options-scene">
        <div class="app-header">
          <div class="title">OPCIONES</div>
          <div class="vs">⚙</div>
          <div class="title">SETTINGS</div>
        </div>
        <div class="options-body">
          <div class="options-title">OPCIONES</div>
          <div class="options-list" id="options-list"></div>
          <div class="options-controls-info">
            ↑↓ NAVEGAR  •  ←→ CAMBIAR VALOR<br/>
            ESPACIO/ENTER ACTIVAR  •  ESC VOLVER
          </div>
        </div>
      </div>
    `;
    refreshList();
  }

  function refreshList() {
    const list = document.getElementById('options-list');
    if (!list) return;

    list.innerHTML = items.map((it, i) => {
      const active = i === activeIndex ? 'active' : '';
      let valueHtml = '';

      if (it.type === 'slider') {
        const v = getValue(it.key);
        const pct = Math.round(((v - it.min) / (it.max - it.min)) * 100);
        valueHtml = `
          <div class="value">
            <span class="arrow">◀</span>
            <span class="slider"><span class="slider-fill" style="width:${pct}%"></span></span>
            <span class="arrow">▶</span>
            <span>${Math.round(v * 100)}%</span>
          </div>
        `;
      } else if (it.type === 'choice') {
        const v = getValue(it.key);
        valueHtml = `<div class="value"><span class="arrow">◀</span> <span>${v.toUpperCase()}</span> <span class="arrow">▶</span></div>`;
      } else if (it.type === 'toggle') {
        const v = !!getValue(it.key);
        valueHtml = `<div class="value">${v ? '✔ ON' : '✗ OFF'}</div>`;
      } else if (it.type === 'action') {
        valueHtml = `<div class="value" style="color:#ff3030">PRESIONA ENTER</div>`;
      } else if (it.type === 'back') {
        valueHtml = `<div class="value" style="color:#ff3030">←</div>`;
      }

      return `
        <div class="option-row ${active}" data-idx="${i}">
          <div class="label">${it.label}</div>
          ${valueHtml}
        </div>
      `;
    }).join('');

    document.querySelectorAll('.option-row').forEach(el => {
      el.addEventListener('click', () => {
        activeIndex = parseInt(el.dataset.idx, 10);
        const it = items[activeIndex];
        if (it.type === 'toggle') changeValue(1);
        else if (it.type === 'action' || it.type === 'back') confirmAction();
        refreshList();
      });
    });
  }

  function changeValue(dir) {
    const it = items[activeIndex];
    if (it.type === 'slider') {
      let v = getValue(it.key);
      v = Math.max(it.min, Math.min(it.max, +(v + dir * it.step).toFixed(2)));
      setValue(it.key, v);
      AudioMgr.play('sfxMove');
    } else if (it.type === 'choice') {
      const v = getValue(it.key);
      const idx = it.choices.indexOf(v);
      const next = (idx + dir + it.choices.length) % it.choices.length;
      setValue(it.key, it.choices[next]);
      AudioMgr.play('sfxMove');
    } else if (it.type === 'toggle') {
      setValue(it.key, !getValue(it.key));
      AudioMgr.play('sfxConfirm');
    }
    refreshList();
  }

  function confirmAction() {
    const it = items[activeIndex];
    if (it.type === 'back') {
      SceneManager.go('menu');
    } else if (it.type === 'action' && it.key === '__reset') {
      if (confirm('¿Borrar todas las estadísticas y opciones?')) {
        Storage.reset();
        AudioMgr.refreshVolumes();
        Particles.setEnabled(Storage.get('options.particles'));
        AudioMgr.play('sfxConfirm');
        refreshList();
      }
    } else if (it.type === 'toggle') {
      changeValue(1);
    }
  }

  function move(dir) {
    activeIndex = (activeIndex + dir + items.length) % items.length;
    AudioMgr.play('sfxMove');
    refreshList();
  }

  function onInput(evt) {
    if (evt.type !== 'press') return;
    if (evt.action === 'up') move(-1);
    else if (evt.action === 'down') move(1);
    else if (evt.action === 'left') changeValue(-1);
    else if (evt.action === 'right') changeValue(1);
    else if (evt.action === 'confirm') confirmAction();
    else if (evt.action === 'back') SceneManager.go('menu');
  }

  function enter() {
    activeIndex = 0;
    render();
    Input.on(onInput);
    AudioMgr.playMusic('menuMusic');
  }

  function exit() { Input.off(onInput); }

  return { enter, exit };
})();

window.OptionsScene = OptionsScene;
