import * as THREE from 'three';
import { U, NOISE_GLSL } from '../core/shared.js';
import { clamp, lerp, smoothstep } from '../core/util.js';

/** Sky dome with sun, stars and drifting clouds. */
export function buildSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: {
      uTime: U.uTime, uNight: U.uNight, uSunDir: U.uSunDir, uSunColor: U.uSunColor,
      uSkyZenith: U.uSkyZenith, uSkyHorizon: U.uSkyHorizon,
      uCloud: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uNight; uniform vec3 uSunDir, uSunColor, uSkyZenith, uSkyHorizon, uCloud;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main(){
        vec3 d = normalize(vDir);
        float t = pow(clamp(d.y, 0.0, 1.0), 0.55);
        vec3 col = mix(uSkyHorizon, uSkyZenith, t);
        float sd = max(dot(d, uSunDir), 0.0);
        col += uSunColor * (pow(sd, 900.0) * 6.0 + pow(sd, 12.0) * 0.28 + pow(sd, 3.0) * 0.1) * (1.0 - uNight);
        // stars
        vec3 sp = d * 220.0; vec3 cell = floor(sp);
        float st = step(0.9975, fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453));
        col += vec3(0.9, 0.95, 1.0) * st * uNight * smoothstep(0.02, 0.3, d.y) * (0.6 + 0.4 * sin(uTime * 2.0 + cell.x));
        // moon
        vec3 md = normalize(vec3(-0.35, 0.62, 0.7));
        col += vec3(0.95, 0.96, 1.0) * smoothstep(0.9993, 0.9996, dot(d, md)) * uNight;
        // clouds on a far plane
        if (d.y > 0.015) {
          vec2 cp = d.xz / (d.y + 0.12) * 1.4 + vec2(uTime * 0.004, uTime * 0.002);
          float c = fbm(cp * 1.3) ; c = smoothstep(0.52, 0.86, c + 0.12 * fbm(cp * 5.0));
          float lit = 0.75 + 0.35 * pow(sd, 3.0);
          vec3 cc = mix(uSkyHorizon * 1.05, uCloud * lit, 0.75);
          col = mix(col, cc, c * smoothstep(0.015, 0.16, d.y) * 0.9);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = 'sky';
  return mesh;
}

const C = (hex) => new THREE.Color(hex);
// keyed by sun elevation (degrees)
const KEYS = [
  { el: -18, zen: C(0x040816), hor: C(0x0d1730), sun: C(0x8fa6ff), sunI: 0.32, amb: C(0x2a3558), ambG: C(0x12141c), ambI: 0.75, fog: C(0x0a1122), cloud: C(0x1c2440), dens: 0.00016 },
  { el: -6, zen: C(0x16204a), hor: C(0xb8567a), sun: C(0xff8a66), sunI: 0.25, amb: C(0x57557f), ambG: C(0x2a2430), ambI: 0.9, fog: C(0x6b4a6c), cloud: C(0xd97a86), dens: 0.00017 },
  { el: 0, zen: C(0x2b4a8c), hor: C(0xff9a58), sun: C(0xff6f33), sunI: 1.3, amb: C(0x8f8fb5), ambG: C(0x5a4a40), ambI: 1.0, fog: C(0xeea77c), cloud: C(0xffb089), dens: 0.00018 },
  { el: 9, zen: C(0x3476c8), hor: C(0xf7d2a4), sun: C(0xffc98a), sunI: 2.3, amb: C(0xbfd2ee), ambG: C(0x80725f), ambI: 1.1, fog: C(0xe9d3b8), cloud: C(0xfff0dc), dens: 0.00015 },
  { el: 30, zen: C(0x2a7ad8), hor: C(0xbfe2f6), sun: C(0xfff1dc), sunI: 3.0, amb: C(0xcfe4ff), ambG: C(0x8d8a76), ambI: 1.25, fog: C(0xc4e0f0), cloud: C(0xffffff), dens: 0.00011 },
  { el: 80, zen: C(0x2274d6), hor: C(0xb5dcf5), sun: C(0xfffaf0), sunI: 3.3, amb: C(0xd5e8ff), ambG: C(0x8f8c78), ambI: 1.3, fog: C(0xbcdcf0), cloud: C(0xffffff), dens: 0.0001 },
];

/** Time-of-day controller: moves the sun and recolours lights, fog, sky and sea. */
export class Environment {
  constructor(scene, sky) {
    this.scene = scene; this.sky = sky;
    this.hour = 16.4;
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x8d8a76, 1.2);
    scene.add(this.sun, this.sun.target, this.hemi);
    scene.fog = new THREE.FogExp2(0xc4e0f0, 0.00011);
    this.sunElevation = 45;
    this.apply();
  }
  setHour(h) { this.hour = ((h % 24) + 24) % 24; this.apply(); }
  apply() {
    const h = this.hour;
    // sunrise 5:45 over Bãi Sau (east), sunset 17:45 behind Bãi Trước (west); the sun passes to the south
    const day = (h - 5.75) / 12;
    const elev = Math.sin(day * Math.PI) * 72 * (day >= 0 && day <= 1 ? 1 : 0.5);
    const el = day >= 0 && day <= 1 ? elev : -Math.min(18, Math.abs(Math.sin(day * Math.PI)) * 40);
    const az = THREE.MathUtils.degToRad(lerp(88, 272, clamp(day, 0, 1)));
    this.sunElevation = el;
    const er = THREE.MathUtils.degToRad(Math.max(el, -2));
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(er), Math.sin(er), -Math.cos(az) * Math.cos(er)).normalize();

    let a = KEYS[0], b = KEYS[KEYS.length - 1], t = 0;
    if (el <= KEYS[0].el) { a = b = KEYS[0]; }
    else if (el >= b.el) { a = b; }
    else for (let i = 0; i < KEYS.length - 1; i++) if (el >= KEYS[i].el && el <= KEYS[i + 1].el) { a = KEYS[i]; b = KEYS[i + 1]; t = (el - a.el) / (b.el - a.el); break; }
    const night = 1 - smoothstep(-7, 3, el);
    U.uNight.value = night;
    U.uSkyZenith.value.lerpColors(a.zen, b.zen, t);
    U.uSkyHorizon.value.lerpColors(a.hor, b.hor, t);
    U.uSunColor.value.lerpColors(a.sun, b.sun, t);
    this.sky.material.uniforms.uCloud.value.lerpColors(a.cloud, b.cloud, t);
    // at night the "sun" light becomes the moon
    const lightDir = el > -4 ? dir : new THREE.Vector3(-0.35, 0.62, 0.7).normalize();
    U.uSunDir.value.copy(el > -4 ? dir : lightDir);
    this.sun.color.copy(U.uSunColor.value);
    this.sun.intensity = lerp(a.sunI, b.sunI, t);
    this.lightDir = lightDir;
    this.hemi.color.lerpColors(a.amb, b.amb, t);
    this.hemi.groundColor.lerpColors(a.ambG, b.ambG, t);
    this.hemi.intensity = lerp(a.ambI, b.ambI, t);
    this.scene.fog.color.lerpColors(a.fog, b.fog, t);
    this.scene.fog.density = lerp(a.dens, b.dens, t);
  }
  /** Keep the light (and its shadow frustum) centred on the player. */
  follow(target) {
    this.sun.target.position.copy(target);
    this.sun.position.copy(target).addScaledVector(this.lightDir, 400);
  }
}
