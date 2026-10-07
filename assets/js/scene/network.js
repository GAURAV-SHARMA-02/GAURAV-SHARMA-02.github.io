/**
 * Builds the geometry for the background system: clustered service nodes,
 * the links between them, and the packets that travel those links.
 *
 * The structure is intentionally not random noise — it is clusters joined by a
 * sparse set of long-haul links, which is what a real service topology looks
 * like, and reads as "architecture" rather than "screensaver".
 */

import * as THREE from 'three';

const PALETTE = [
  new THREE.Color('#5EE7C6'), // mint   — primary
  new THREE.Color('#8AB4F8'), // sky    — secondary
  new THREE.Color('#F0A868'), // sand   — accent, used sparingly
];

/** Weighted pick so the warm accent stays rare enough to feel deliberate. */
function pickTint(random) {
  const roll = random();
  if (roll < 0.62) return PALETTE[0];
  if (roll < 0.9) return PALETTE[1];
  return PALETTE[2];
}

/**
 * Deterministic PRNG (mulberry32).
 *
 * A fixed seed means the composition is identical on every load and on every
 * machine, so the layout can be art-directed instead of re-rolled per visitor.
 */
function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate the node/link graph.
 *
 * @param {object} options
 * @param {number} options.clusters      How many service clusters.
 * @param {number} options.perCluster    Nodes in each cluster.
 * @param {number} options.radius        Spread of cluster centres.
 * @returns {{positions: Float32Array, scales: Float32Array, seeds: Float32Array,
 *            tints: Float32Array, links: Array, count: number}}
 */
export function buildGraph({ clusters = 7, perCluster = 34, radius = 76 } = {}) {
  const random = createRandom(20260107);
  const count = clusters * perCluster;

  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const seeds = new Float32Array(count);
  const tints = new Float32Array(count * 3);
  const points = [];
  const centres = [];

  for (let c = 0; c < clusters; c += 1) {
    // Distribute cluster centres on a flattened sphere: wide and shallow reads
    // better behind text than a deep ball, which would occlude the hero copy.
    const angle = (c / clusters) * Math.PI * 2 + random() * 0.4;
    const tilt = (random() - 0.5) * 0.9;
    const centre = new THREE.Vector3(
      Math.cos(angle) * radius * (0.55 + random() * 0.6),
      Math.sin(angle) * radius * 0.42 + tilt * 14,
      (random() - 0.5) * radius * 0.85
    );
    centres.push(centre);

    for (let i = 0; i < perCluster; i += 1) {
      const index = c * perCluster + i;
      // Cube-root keeps density even rather than crowding the cluster centre.
      const spread = 7 + Math.cbrt(random()) * 15;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);

      const position = new THREE.Vector3(
        centre.x + spread * Math.sin(phi) * Math.cos(theta),
        centre.y + spread * Math.sin(phi) * Math.sin(theta),
        centre.z + spread * Math.cos(phi) * 0.7
      );

      positions.set([position.x, position.y, position.z], index * 3);
      scales[index] = 0.45 + random() * random() * 2.3; // few large, many small
      seeds[index] = random();

      const tint = pickTint(random);
      tints.set([tint.r, tint.g, tint.b], index * 3);

      points.push({ position, cluster: c, tint });
    }
  }

  return { positions, scales, seeds, tints, count, points, centres };
}

/**
 * Pick the links packets will travel along.
 *
 * Mostly short intra-cluster hops with a handful of long-haul links between
 * clusters — the same shape as service-to-service traffic, and visually it
 * gives the eye both local texture and long sweeping motion.
 */
export function buildLinks(graph, { intra = 150, inter = 34 } = {}) {
  const random = createRandom(777);
  const links = [];
  const { points, centres } = graph;

  for (let i = 0; i < intra; i += 1) {
    const a = points[Math.floor(random() * points.length)];
    const candidates = points.filter((p) => p.cluster === a.cluster && p !== a);
    if (!candidates.length) continue;
    const b = candidates[Math.floor(random() * candidates.length)];
    links.push({ start: a.position, end: b.position, tint: a.tint, long: false });
  }

  for (let i = 0; i < inter; i += 1) {
    const a = points[Math.floor(random() * points.length)];
    const otherCluster = Math.floor(random() * centres.length);
    if (otherCluster === a.cluster) continue;
    const candidates = points.filter((p) => p.cluster === otherCluster);
    if (!candidates.length) continue;
    const b = candidates[Math.floor(random() * candidates.length)];
    links.push({ start: a.position, end: b.position, tint: PALETTE[0], long: true });
  }

  return links;
}

/**
 * Build the attribute buffers for the packet particle system.
 *
 * @param {Array} links Output of {@link buildLinks}.
 * @param {number} perLink How many packets ride each link at once.
 */
export function buildPackets(links, perLink = 3) {
  const random = createRandom(31337);
  const total = links.length * perLink;

  const positions = new Float32Array(total * 3); // placeholder; shader derives real position
  const starts = new Float32Array(total * 3);
  const ends = new Float32Array(total * 3);
  const offsets = new Float32Array(total);
  const speeds = new Float32Array(total);
  const tints = new Float32Array(total * 3);

  links.forEach((link, linkIndex) => {
    for (let p = 0; p < perLink; p += 1) {
      const index = linkIndex * perLink + p;
      starts.set([link.start.x, link.start.y, link.start.z], index * 3);
      ends.set([link.end.x, link.end.y, link.end.z], index * 3);
      // Even spacing plus jitter: evenly spaced alone looks mechanical.
      offsets[index] = p / perLink + random() * 0.12;
      speeds[index] = link.long ? 0.26 + random() * 0.2 : 0.5 + random() * 0.65;
      tints.set([link.tint.r, link.tint.g, link.tint.b], index * 3);
    }
  });

  return { positions, starts, ends, offsets, speeds, tints, count: total };
}

/** Thin connecting lines, drawn under the packets to imply the topology. */
export function buildLineGeometry(links) {
  const positions = new Float32Array(links.length * 6);
  const colors = new Float32Array(links.length * 6);

  links.forEach((link, i) => {
    positions.set([link.start.x, link.start.y, link.start.z], i * 6);
    positions.set([link.end.x, link.end.y, link.end.z], i * 6 + 3);
    // Long-haul links are drawn dimmer so they recede behind local structure.
    const strength = link.long ? 0.16 : 0.09;
    const c = link.tint;
    colors.set([c.r * strength, c.g * strength, c.b * strength], i * 6);
    colors.set([c.r * strength, c.g * strength, c.b * strength], i * 6 + 3);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}
