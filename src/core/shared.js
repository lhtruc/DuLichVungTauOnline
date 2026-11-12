import * as THREE from 'three';

/** Uniforms shared by every custom material (time of day, clock). */
export const U = {
  uTime: { value: 0 },
  uNight: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3) },
  uSunColor: { value: new THREE.Color(1, 1, 1) },
  uSkyZenith: { value: new THREE.Color(0x2f7fd6) },
  uSkyHorizon: { value: new THREE.Color(0xbfe3f5) },
};

/** GLSL value-noise helpers injected into custom shaders. */
export const NOISE_GLSL = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= .5; } return s; }
`;

export const quality = {
  tier: 'high',
  set(tier) { this.tier = tier; },
  get low() { return this.tier === 'low'; },
  get high() { return this.tier === 'high'; },
  pick(low, medium, high) { return this.tier === 'low' ? low : this.tier === 'medium' ? medium : high; },
};
