/* ============================================
   STORAGE: localStorage para guardado persistente
   ============================================ */

const Storage = (() => {
  const KEY = 'tekken-barrio-save-v1';

  const defaults = {
    options: {
      musicVolume: 0.5,
      sfxVolume: 0.7,
      difficulty: 'normal',
      particles: true
    },
    stats: {
      totalWins: 0,
      totalLosses: 0,
      tournamentsWon: 0,
      charactersUsed: {},
      lastWinner: null
    },
    history: []
  };

  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        cache = JSON.parse(JSON.stringify(defaults));
        return cache;
      }
      const parsed = JSON.parse(raw);
      cache = mergeDefaults(parsed, defaults);
      return cache;
    } catch (e) {
      console.warn('Storage load failed', e);
      cache = JSON.parse(JSON.stringify(defaults));
      return cache;
    }
  }

  function mergeDefaults(target, def) {
    const result = JSON.parse(JSON.stringify(def));
    for (const k in target) {
      if (typeof target[k] === 'object' && target[k] !== null && !Array.isArray(target[k])) {
        result[k] = mergeDefaults(target[k], def[k] || {});
      } else {
        result[k] = target[k];
      }
    }
    return result;
  }

  function save() {
    if (!cache) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }

  function get(path) {
    const data = load();
    const keys = path.split('.');
    let v = data;
    for (const k of keys) {
      if (v == null) return undefined;
      v = v[k];
    }
    return v;
  }

  function set(path, value) {
    const data = load();
    const keys = path.split('.');
    let obj = data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof obj[keys[i]] !== 'object' || obj[keys[i]] === null) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    save();
  }

  function recordMatch(winnerCharId, loserCharId, isPlayerWin) {
    const data = load();
    if (isPlayerWin) data.stats.totalWins++;
    else data.stats.totalLosses++;

    if (winnerCharId != null) {
      data.stats.charactersUsed[winnerCharId] = (data.stats.charactersUsed[winnerCharId] || 0) + 1;
      data.stats.lastWinner = winnerCharId;
    }

    data.history.unshift({
      ts: Date.now(),
      winner: winnerCharId,
      loser: loserCharId,
      playerWin: isPlayerWin
    });

    if (data.history.length > 30) data.history.length = 30;

    save();
  }

  function recordTournamentWin(charId) {
    const data = load();
    data.stats.tournamentsWon++;
    if (charId != null) {
      data.stats.charactersUsed[charId] = (data.stats.charactersUsed[charId] || 0) + 1;
    }
    save();
  }

  function reset() {
    cache = JSON.parse(JSON.stringify(defaults));
    save();
  }

  return {
    load, save, get, set,
    recordMatch, recordTournamentWin, reset
  };
})();

window.Storage = Storage;
