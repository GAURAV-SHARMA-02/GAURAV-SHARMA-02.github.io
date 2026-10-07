/**
 * The live background scene.
 *
 * Owns the renderer, camera and particle systems, and exposes a tiny surface
 * to the page: `setScrollProgress`, `setPointer`, `setMotionEnabled`, `start`.
 * Nothing outside this module touches Three.js.
 *
 * Performance posture: one Points draw call for nodes, one for packets, one
 * LineSegments for the topology. All motion is computed in the vertex shader
 * from a single clock uniform, so frame cost is flat regardless of count.
 */

import * as THREE from 'three';

import {
  buildGraph,
  buildLineGeometry,
  buildLinks,
  buildPackets,
} from './network.js';
import {
  nodeFragment,
  nodeVertex,
  packetFragment,
  packetVertex,
} from './shaders.js';

/** Scene density per device class. Mobile GPUs get a materially lighter scene. */
const QUALITY = {
  high:   { clusters: 8, perCluster: 38, intra: 170, inter: 38, perLink: 3, pixelRatio: 2 },
  medium: { clusters: 7, perCluster: 28, intra: 120, inter: 26, perLink: 2, pixelRatio: 1.6 },
  low:    { clusters: 5, perCluster: 18, intra: 60,  inter: 14, perLink: 1, pixelRatio: 1.25 },
};

/** Camera waypoints the scroll position interpolates between. */
const WAYPOINTS = [
  { position: new THREE.Vector3(0, 0, 128),    look: new THREE.Vector3(0, 0, 0) },
  { position: new THREE.Vector3(38, -16, 92),  look: new THREE.Vector3(6, -4, 0) },
  { position: new THREE.Vector3(-30, 20, 70),  look: new THREE.Vector3(-8, 4, 0) },
  { position: new THREE.Vector3(14, 30, 52),   look: new THREE.Vector3(0, 8, 0) },
  { position: new THREE.Vector3(0, 6, 110),    look: new THREE.Vector3(0, 0, 0) },
];

/** Picks a quality tier from device signals, before anything is allocated. */
function detectQuality() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency || 4;
  if (narrow || (coarse && cores <= 4)) return QUALITY.low;
  if (coarse || cores <= 6) return QUALITY.medium;
  return QUALITY.high;
}

export class SystemScene {
  /**
   * @param {HTMLCanvasElement} canvas Target canvas.
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = detectQuality();

    this.scrollProgress = 0;
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerTarget = new THREE.Vector2(0, 0);
    this.pointerStrength = 0;
    this.motionEnabled = true;
    this.running = false;

    this.clock = new THREE.Clock();
    this.tmpPosition = new THREE.Vector3();
    this.tmpLook = new THREE.Vector3();

    this._initRenderer();
    this._initScene();
    this._bindResize();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // additive points do not alias; AA would cost for nothing
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.pixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.setClearColor(0x05070e, 0);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070e, 0.0062);

    this.camera = new THREE.PerspectiveCamera(
      52, window.innerWidth / window.innerHeight, 0.1, 600
    );
    this.camera.position.copy(WAYPOINTS[0].position);

    // The whole system sits on a group so pointer parallax can tilt it without
    // fighting the scroll-driven camera path.
    this.group = new THREE.Group();
    this.scene.add(this.group);

    const graph = buildGraph({
      clusters: this.quality.clusters,
      perCluster: this.quality.perCluster,
    });
    const links = buildLinks(graph, {
      intra: this.quality.intra,
      inter: this.quality.inter,
    });

    this._addLines(links);
    this._addNodes(graph);
    this._addPackets(links);
  }

  _addLines(links) {
    this.lines = new THREE.LineSegments(
      buildLineGeometry(links),
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.group.add(this.lines);
  }

  _addNodes(graph) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(graph.positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(graph.scales, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(graph.seeds, 1));
    geometry.setAttribute('aTint', new THREE.BufferAttribute(graph.tints, 3));

    this.nodeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 9.5 },
        uPointer: { value: new THREE.Vector3() },
        uPointerStrength: { value: 0 },
      },
      vertexShader: nodeVertex,
      fragmentShader: nodeFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.group.add(new THREE.Points(geometry, this.nodeMaterial));
  }

  _addPackets(links) {
    const packets = buildPackets(links, this.quality.perLink);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(packets.positions, 3));
    geometry.setAttribute('aStart', new THREE.BufferAttribute(packets.starts, 3));
    geometry.setAttribute('aEnd', new THREE.BufferAttribute(packets.ends, 3));
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(packets.offsets, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(packets.speeds, 1));
    geometry.setAttribute('aTint', new THREE.BufferAttribute(packets.tints, 3));

    // Positions are derived in the shader, so the default bounding sphere
    // (computed from the placeholder attribute) would frustum-cull everything.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 260);

    this.packetMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 7.0 },
        uSpeed: { value: 0.085 },
      },
      vertexShader: packetVertex,
      fragmentShader: packetFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.packets = new THREE.Points(geometry, this.packetMaterial);
    this.packets.frustumCulled = false;
    this.group.add(this.packets);
  }

  _bindResize() {
    let frame = 0;
    this.handleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      });
    };
    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  /** @param {number} progress Page scroll, 0 at the top and 1 at the bottom. */
  setScrollProgress(progress) {
    this.scrollProgress = THREE.MathUtils.clamp(progress, 0, 1);
  }

  /**
   * @param {number} x Normalised pointer X, -1 (left) to 1 (right).
   * @param {number} y Normalised pointer Y, -1 (bottom) to 1 (top).
   */
  setPointer(x, y) {
    this.pointerTarget.set(x, y);
    this.pointerStrength = 1;
  }

  /** Pause or resume animation without tearing the scene down. */
  setMotionEnabled(enabled) {
    this.motionEnabled = enabled;
    if (enabled && this.running) this.clock.start();
    // One last frame so the scene settles into a composed still rather than
    // freezing mid-transition.
    if (!enabled) this._render();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this._loop();
  }

  dispose() {
    this.running = false;
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }

  _loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this._loop);
    if (this.motionEnabled) this._render();
  };

  _render() {
    const elapsed = this.clock.getElapsedTime();

    this.nodeMaterial.uniforms.uTime.value = elapsed;
    this.packetMaterial.uniforms.uTime.value = elapsed;

    this._updatePointer();
    this._updateCamera(elapsed);

    // A slow constant yaw keeps the system alive even when nobody is scrolling.
    this.group.rotation.y = elapsed * 0.014 + this.pointer.x * 0.1;
    this.group.rotation.x = this.pointer.y * -0.07;

    this.renderer.render(this.scene, this.camera);
  }

  _updatePointer() {
    // Easing the pointer stops the field snapping when the cursor jumps.
    this.pointer.lerp(this.pointerTarget, 0.055);

    const reach = 56;
    this.nodeMaterial.uniforms.uPointer.value.set(
      this.pointer.x * reach,
      this.pointer.y * reach * 0.6,
      0
    );
    this.nodeMaterial.uniforms.uPointerStrength.value = THREE.MathUtils.lerp(
      this.nodeMaterial.uniforms.uPointerStrength.value,
      this.pointerStrength,
      0.05
    );
    // Decay so the glow fades out when the cursor leaves rather than sticking.
    this.pointerStrength *= 0.985;
  }

  _updateCamera(elapsed) {
    const span = WAYPOINTS.length - 1;
    const scaled = this.scrollProgress * span;
    const index = Math.min(Math.floor(scaled), span - 1);
    const t = smoothstep(scaled - index);

    this.tmpPosition
      .copy(WAYPOINTS[index].position)
      .lerp(WAYPOINTS[index + 1].position, t);
    this.tmpLook.copy(WAYPOINTS[index].look).lerp(WAYPOINTS[index + 1].look, t);

    // A gentle float keeps a static page from looking like a frozen render.
    this.tmpPosition.y += Math.sin(elapsed * 0.3) * 1.6;
    this.tmpPosition.x += Math.cos(elapsed * 0.22) * 1.2;

    this.camera.position.lerp(this.tmpPosition, 0.045);
    this.camera.lookAt(this.tmpLook);
  }
}

/** Smootherstep — eases waypoint transitions so camera moves have no corners. */
function smoothstep(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}
