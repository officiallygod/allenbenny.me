/* ================================================================
   gfx/skyShaders.ts — GLSL sources for the sky dome (gfx/sky.ts).
   Kept separate so sky.ts stays pure orchestration.
   GLSL1-style (varying/gl_FragColor) — three compiles ShaderMaterial
   as ES 1.00 unless glslVersion is overridden.
   ================================================================ */

/** World-space view direction pass-through. Dome sits at the origin
 *  with identity transform, so object-space position IS the direction. */
export const SKY_VERT = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Vertical gradient (zenith -> biome-tinted horizon), warm sun made of a
 * wide haze lobe + tight glow + hot core disc, night side with a hash-based
 * procedural star field and a faint galactic band, blended by uDayFactor.
 * One draw call, zero textures. Output is roughly display-referred; the
 * ACES tonemap in the pipeline tames it.
 */
export const SKY_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uSunDir;
uniform float uDayFactor;   // 0 = night, 1 = noon
uniform vec3 uHorizonTint;  // biome fog colour
varying vec3 vDir;

/* Dave Hoskins-style hash — deterministic, no big-sin precision cliffs */
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  float up = clamp(h, 0.0, 1.0);
  float grad = pow(1.0 - up, 2.4);          // 1 at horizon, 0 at zenith
  float dayF = clamp(uDayFactor, 0.0, 1.0);
  vec3 sunDir = normalize(uSunDir);

  /* ---- day gradient ---- */
  vec3 zenDay = vec3(0.145, 0.36, 0.76);
  vec3 horDay = uHorizonTint * 1.08 + vec3(0.05);
  vec3 dayCol = mix(zenDay, horDay, grad);

  /* warm cast while the sun grazes the horizon */
  float sunUp = clamp(sunDir.y, 0.0, 1.0);
  float warmth = 1.0 - smoothstep(0.04, 0.42, sunUp);
  dayCol = mix(dayCol, dayCol * vec3(1.30, 0.62, 0.38), warmth * (0.35 + 0.65 * grad));

  /* ---- night gradient ---- */
  vec3 zenNight = vec3(0.008, 0.011, 0.028);
  vec3 horNight = uHorizonTint * 0.10 + vec3(0.005, 0.007, 0.014);
  vec3 col = mix(mix(zenNight, horNight, grad), dayCol, dayF);

  /* ---- procedural stars (fade out with daylight) ---- */
  vec3 sp = dir * 170.0;
  vec3 cell = floor(sp);
  vec3 fp = fract(sp) - 0.5;
  float rnd = hash13(cell);
  vec3 jitter = vec3(
    hash13(cell + 7.17),
    hash13(cell + 13.71),
    hash13(cell + 29.33)
  ) - 0.5;
  float sd = length(fp - jitter * 0.74);
  float sz = mix(0.055, 0.105, hash13(cell + 41.7));
  float star = smoothstep(sz, 0.0, sd);
  star *= step(0.982, rnd);                  // sparse: ~2% of cells lit
  star *= star;                              // sharper falloff
  star *= smoothstep(0.02, 0.16, h);         // none at the horizon line
  vec3 starTint = mix(vec3(1.0), vec3(0.72, 0.82, 1.0), hash13(cell + 63.9));
  col += star * starTint * (0.75 + 0.5 * hash13(cell + 57.1)) * (1.0 - dayF);

  /* ---- faint galactic band (night only) ---- */
  vec3 galAxis = normalize(vec3(0.42, 0.20, 0.88));
  float gdot = dot(dir, galAxis);
  float band = exp(-gdot * gdot * 24.0);
  col += vec3(0.045, 0.055, 0.085) * band * (1.0 - dayF) * smoothstep(0.0, 0.2, h);

  /* ---- sun: wide haze lobe + tight glow + hot disc ---- */
  float sdot = dot(dir, sunDir);
  float haze = pow(clamp(sdot, 0.0, 1.0), 6.0);
  float glow = smoothstep(0.972, 0.9995, sdot);
  float disc = smoothstep(0.99875, 0.99945, sdot);
  vec3 sunCol = mix(
    vec3(1.25, 0.50, 0.22),
    vec3(1.00, 0.93, 0.78),
    smoothstep(0.03, 0.35, sunDir.y)
  );
  col += sunCol * haze * 0.32 * dayF;
  col += sunCol * glow * 0.55 * dayF;
  col += sunCol * disc * 1.70 * dayF;

  /* ---- below-horizon skirt: settle onto the fog colour ---- */
  float down = clamp(-h * 4.0, 0.0, 1.0);
  vec3 horMix = mix(horNight, horDay, dayF);
  col = mix(col, horMix * 0.85, down);

  gl_FragColor = vec4(col, 1.0);
}
`;
