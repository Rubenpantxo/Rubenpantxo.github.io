/* ============================================
   AUDIO MANAGER
   Lee volúmenes desde Storage
   ============================================ */

const AudioMgr = (() => {
  const tracks = {};
  let currentMusic = null;

  const audioMap = {
    menuMusic: "audio/menu-music.mp3",
    battleMusic: "audio/battle-music.mp3",
    victoryMusic: "audio/victory-music.mp3",
    sfxMove: "audio/sfx-move.mp3",
    sfxConfirm: "audio/sfx-confirm.mp3",
    sfxPunch: "audio/sfx-punch.mp3",
    sfxKick: "audio/sfx-kick.mp3",
    sfxHit: "audio/sfx-hit.mp3",
    sfxKo: "audio/sfx-ko.mp3",
    sfxFight: "audio/sfx-fight.mp3"
  };

  const isMusic = (k) => k.endsWith('Music');

  function getVolume(key) {
    if (!window.Storage) return 0.5;
    return isMusic(key) ? Storage.get('options.musicVolume') : Storage.get('options.sfxVolume');
  }

  function loadAll() {
    Object.entries(audioMap).forEach(([key, path]) => {
      try {
        const a = new Audio();
        a.src = path;
        a.volume = getVolume(key);
        a.preload = "auto";
        a.addEventListener("error", () => {});
        tracks[key] = a;
      } catch (e) {}
    });
  }

  function play(key, opts = {}) {
    const a = tracks[key];
    if (!a || !a.src) return;
    try {
      a.currentTime = 0;
      const vol = (opts.volume ?? 1) * getVolume(key);
      a.volume = Math.max(0, Math.min(1, vol));
      a.loop = !!opts.loop;
      const promise = a.play();
      if (promise && promise.catch) promise.catch(() => {});
    } catch (e) {}
  }

  function stop(key) {
    const a = tracks[key];
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch (e) {}
  }

  function playMusic(key) {
    if (currentMusic === key) return;
    if (currentMusic) stop(currentMusic);
    currentMusic = key;
    play(key, { loop: true, volume: 1 });
  }

  function stopMusic() {
    if (currentMusic) stop(currentMusic);
    currentMusic = null;
  }

  function refreshVolumes() {
    for (const key in tracks) {
      try { tracks[key].volume = getVolume(key); } catch (e) {}
    }
  }

  loadAll();
  return { play, stop, playMusic, stopMusic, refreshVolumes };
})();

window.AudioMgr = AudioMgr;
