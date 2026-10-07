/**
 * Entry point.
 *
 * Content first, scene second — and crucially the loader is dismissed as soon
 * as the content exists, *not* when the 3D finishes. Gating the page on a
 * ~600KB WebGL bundle means a slow device shows a blank screen for seconds;
 * the scene fades in over the content whenever it is ready instead.
 */

import { profile } from '../data/profile.js';
import { renderSkills, renderStatic, renderTimeline } from './ui/content.js';
import { initNavHighlight, initReveal } from './ui/reveal.js';
import { initSysmap } from './ui/sysmap.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Tracks whether motion is currently allowed, including the manual toggle. */
const motion = {
  enabled: !reducedMotion,
  scene: null,
};

function main() {
  renderStatic(profile, { animate: motion.enabled });
  renderTimeline(profile.timeline);
  renderSkills(profile.skills);

  initReveal();
  initNavHighlight();
  initSysmap({ animate: motion.enabled });
  initMotionToggle();

  // The page is now readable, so stop covering it. The scene, if any, fades
  // in on top of live content rather than behind a loading screen.
  dismissLoader();

  if (motion.enabled) initScene();
}

/**
 * Load and start the WebGL background.
 *
 * Imported dynamically so Three.js is never fetched for visitors who will not
 * see it — a reduced-motion visitor should not pay ~600KB for a scene that
 * will not run.
 */
async function initScene() {
  const canvas = document.getElementById('scene');
  if (!canvas || !hasWebGL()) return;

  try {
    const { SystemScene } = await import('./scene/system-scene.js');
    const scene = new SystemScene(canvas);
    motion.scene = scene;

    bindScroll(scene);
    bindPointer(scene);
    scene.start();

    canvas.classList.add('is-ready');
  } catch (error) {
    // A broken scene must never take the page with it.
    console.warn('Background scene unavailable:', error);
  }
}

/** Feature-detect WebGL before loading a renderer that would throw. */
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Feed scroll position to the scene, throttled to one update per frame.
 *
 * Also fades the scene down as the reader leaves the hero. The background is
 * the first impression, but from the first content section onward it is just
 * contrast the copy has to fight, so it steps back to a low ambience.
 */
function bindScroll(scene) {
  let queued = false;

  const update = () => {
    queued = false;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    scene.setScrollProgress(scrollable > 0 ? window.scrollY / scrollable : 0);

    // Full strength through the hero, easing to 30% over the next viewport.
    const past = Math.min(window.scrollY / (window.innerHeight * 0.9), 1);
    document.documentElement.style.setProperty(
      '--scene-dim',
      String(1 - past * 0.7)
    );
  };

  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );

  update();
}

/** Feed pointer position to the scene, in normalised device coordinates. */
function bindPointer(scene) {
  const onMove = (clientX, clientY) => {
    scene.setPointer(
      (clientX / window.innerWidth) * 2 - 1,
      -((clientY / window.innerHeight) * 2 - 1)
    );
  };

  window.addEventListener(
    'pointermove',
    (event) => onMove(event.clientX, event.clientY),
    { passive: true }
  );

  // On touch devices the scene still responds, but only while dragging —
  // there is no hover state to track.
  window.addEventListener(
    'touchmove',
    (event) => {
      const touch = event.touches[0];
      if (touch) onMove(touch.clientX, touch.clientY);
    },
    { passive: true }
  );
}

/**
 * Wire the motion toggle.
 *
 * Offered because an always-animating background is genuinely tiring for some
 * people and expensive on battery — and because a visitor who wants to read
 * should be able to make it stop without leaving.
 */
function initMotionToggle() {
  const button = document.getElementById('motion-toggle');
  const label = document.getElementById('motion-toggle-label');
  if (!button || !label) return;

  const sync = () => {
    button.setAttribute('aria-pressed', String(!motion.enabled));
    label.textContent = motion.enabled ? 'Motion on' : 'Motion off';
  };

  button.addEventListener('click', async () => {
    motion.enabled = !motion.enabled;
    sync();

    if (motion.enabled && !motion.scene) {
      await initScene();
      return;
    }
    motion.scene?.setMotionEnabled(motion.enabled);
  });

  sync();
}

function dismissLoader() {
  document.getElementById('loader')?.classList.add('is-done');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main, { once: true });
} else {
  main();
}
