/**
 * GLSL for the background system.
 *
 * Both effects run entirely on the GPU: node positions and packet progress are
 * computed per-vertex from a single uniform clock, so animating tens of
 * thousands of points costs one draw call and no per-frame CPU work.
 */

/** Service nodes: drifting points that brighten near the cursor. */
export const nodeVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform vec3  uPointer;
  uniform float uPointerStrength;

  attribute float aScale;
  attribute float aSeed;
  attribute vec3  aTint;

  varying float vGlow;
  varying vec3  vTint;

  void main() {
    vec3 pos = position;

    // Each node drifts on its own phase so the field never pulses in unison.
    float t = uTime * 0.22 + aSeed * 6.2831;
    pos.x += sin(t * 0.9) * 2.4;
    pos.y += cos(t * 0.7) * 2.0;
    pos.z += sin(t * 0.5 + aSeed) * 1.6;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // Proximity to the cursor ray drives both size and brightness, so the
    // field feels like it is responding rather than merely moving.
    float d = distance(pos.xy, uPointer.xy);
    float influence = smoothstep(46.0, 0.0, d) * uPointerStrength;

    vGlow = 0.34 + influence * 0.66;
    vTint = aTint;

    gl_PointSize = uSize * aScale * (1.0 + influence * 1.7) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const nodeFragment = /* glsl */ `
  varying float vGlow;
  varying vec3  vTint;

  void main() {
    // Round sprite with a soft falloff — cheaper and crisper than a texture.
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.0, d);
    float halo = pow(core, 3.0);

    gl_FragColor = vec4(vTint * (0.6 + vGlow), halo * vGlow);
  }
`;

/**
 * Event packets: points that travel along a connection from A to B.
 *
 * Each packet stores its endpoints and an offset; its position is just a mix()
 * of the endpoints driven by the clock, so the CPU never touches it.
 */
export const packetVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uSpeed;

  attribute vec3  aStart;
  attribute vec3  aEnd;
  attribute float aOffset;
  attribute float aSpeed;
  attribute vec3  aTint;

  varying float vFade;
  varying vec3  vTint;

  void main() {
    float progress = fract(uTime * uSpeed * aSpeed + aOffset);

    vec3 pos = mix(aStart, aEnd, progress);

    // Bow the path slightly so packets arc instead of sliding along a ruler.
    float arc = sin(progress * 3.14159);
    pos += normalize(cross(aEnd - aStart, vec3(0.0, 0.0, 1.0))) * arc * 1.6;

    // Fade in on departure and out on arrival; a packet that pops is noise.
    vFade = sin(progress * 3.14159);
    vTint = aTint;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (300.0 / -mv.z) * (0.5 + vFade * 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;

export const packetFragment = /* glsl */ `
  varying float vFade;
  varying vec3  vTint;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = pow(smoothstep(0.5, 0.0, d), 2.2);
    gl_FragColor = vec4(vTint, core * vFade * 0.95);
  }
`;
