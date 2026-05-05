/* ============================================
   SCENE MANAGER
   ============================================ */

const SceneManager = (() => {
  const scenes = {};
  let current = null;
  let currentName = null;
  const root = () => document.getElementById("scene-root");

  function register(name, sceneObj) { scenes[name] = sceneObj; }

  function go(name, payload = {}) {
    if (current && current.exit) {
      try { current.exit(); } catch (e) { console.error(e); }
    }
    Input.clear();

    const next = scenes[name];
    if (!next) { console.error("Scene not found:", name); return; }

    current = next;
    currentName = name;

    root().classList.remove("scene-fade-in");
    void root().offsetWidth;
    root().classList.add("scene-fade-in");

    try { next.enter(payload); }
    catch (e) { console.error("Scene enter error:", e); }
  }

  function getRoot() { return root(); }
  function getCurrentName() { return currentName; }

  return { register, go, getRoot, getCurrentName };
})();

window.SceneManager = SceneManager;
