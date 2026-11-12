import * as THREE from 'three';
import { NOISE_GLSL } from '../core/shared.js';

const KIND = { ASPHALT: 0, PAVE: 1, MEDIAN: 2, CURB: 3 };

/**
 * The tour road as real geometry: carriageway, median, kerbs and pavements.
 * Lane markings are drawn procedurally in the fragment shader from the lateral coordinate.
 */
export function buildRouteRoad(route) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 rd;\nattribute float kind;\nvarying vec4 vRd;\nvarying float vKind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRd = rd; vKind = kind;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec4 vRd;\nvarying float vKind;\n${NOISE_GLSL}
        float lineAA(float x, float w){ float f = fwidth(x); return 1.0 - smoothstep(w - f, w + f, abs(x)); }`)
      .replace('#include <map_fragment>', /* glsl */`
        {
          float u = vRd.x, v = vRd.y, cw = vRd.z, med = vRd.w;
          vec3 c;
          if (vKind < 0.5) {
            float n = vnoise(vec2(u, v) * 3.0) * 0.5 + vnoise(vec2(u, v) * 0.35) * 0.5;
            c = vec3(0.2, 0.205, 0.22) * (0.82 + 0.36 * n);
            // tyre-polished wheel tracks
            c *= 1.0 - 0.07 * smoothstep(0.9, 0.2, abs(fract(abs(u) / 3.4 + 0.5) - 0.5) * 3.4);
            float mark = 0.0; vec3 mcol = vec3(0.93);
            float dash = step(fract(v / 9.0), 0.36);
            mark += lineAA(abs(u) - (cw - 0.35), 0.075);                        // edge lines
            if (med < 0.1) {                                                     // single carriageway: yellow centre
              float y = lineAA(u, 0.085) * step(fract(v / 12.0), 0.62);
              c = mix(c, vec3(0.95, 0.74, 0.16), y * 0.92);
            } else {                                                             // dual: dashed lane line each side
              float lane = (cw + med) * 0.5;
              mark += lineAA(abs(u) - lane, 0.07) * dash;
              mark += lineAA(abs(u) - (med + 0.3), 0.07);
            }
            c = mix(c, mcol, clamp(mark, 0.0, 1.0) * 0.9);
          } else if (vKind < 1.5) {
            // terrazzo paving tiles
            vec2 t = vec2(u, v) / 0.5; vec2 id = floor(t); vec2 f = fract(t);
            float checker = mod(id.x + id.y, 2.0);
            c = mix(vec3(0.72, 0.68, 0.62), vec3(0.74, 0.5, 0.42), checker * 0.55);
            c *= 0.92 + 0.12 * hash12(id);
            float joint = smoothstep(0.0, 0.05, f.x) * smoothstep(0.0, 0.05, f.y);
            c *= mix(0.8, 1.0, joint);
          } else if (vKind < 2.5) {
            c = vec3(0.3, 0.47, 0.22) * (0.8 + 0.4 * vnoise(vec2(u, v) * 2.0));
          } else {
            c = mix(vec3(0.82), vec3(0.2), step(0.5, fract(v / 2.0)) * 0.0) * (0.9 + 0.1 * vnoise(vec2(v, u) * 4.0));
          }
          diffuseColor.rgb = c;
        }`);
  };

  const group = new THREE.Group();
  group.name = 'route-road';
  const CH = 50;
  const o = {};
  for (let c0 = 0; c0 < route.n - 1; c0 += CH) {
    const c1 = Math.min(c0 + CH, route.n - 1);
    const pos = [], nrm = [], rd = [], kind = [], idx = [];
    // lateral strips: [u0, y0, u1, y1, kind, nx, ny]  (u along `right`)
    const rows = [];
    for (let i = c0; i <= c1; i++) {
      const f = route.at(i * route.step, o);
      const { cw, med, swL, swR } = f;
      const strips = [
        [-cw, 0, cw, 0, KIND.ASPHALT, 0, 1],
        [cw, 0, cw, 0.16, KIND.CURB, -1, 0], [cw, 0.16, cw + swR, 0.16, KIND.PAVE, 0, 1], [cw + swR, 0.16, cw + swR + 0.4, -0.9, KIND.CURB, 1, 0.4],
        [-cw, 0.16, -cw, 0, KIND.CURB, 1, 0], [-cw - swL, 0.16, -cw, 0.16, KIND.PAVE, 0, 1], [-cw - swL - 0.4, -0.9, -cw - swL, 0.16, KIND.CURB, -1, 0.4],
      ];
      if (med > 0.08) strips.push([-med, 0.24, med, 0.24, KIND.MEDIAN, 0, 1], [-med, 0, -med, 0.24, KIND.CURB, -1, 0], [med, 0.24, med, 0, KIND.CURB, 1, 0]);
      else strips.push([0, -0.2, 0, -0.2, KIND.MEDIAN, 0, 1], [0, -0.2, 0, -0.2, KIND.CURB, 0, 1], [0, -0.2, 0, -0.2, KIND.CURB, 0, 1]);
      rows.push({ f: { x: f.pos.x, y: f.pos.y, z: f.pos.z, rx: f.right.x, rz: f.right.z, cw, med }, strips, v: i * route.step });
    }
    const nStrips = rows[0].strips.length;
    for (let s = 0; s < nStrips; s++) {
      const base = pos.length / 3;
      for (const row of rows) {
        const [u0, y0, u1, y1, k, nxl, ny] = row.strips[s];
        const { x, y, z, rx, rz, cw, med } = row.f;
        for (const [u, yy] of [[u0, y0], [u1, y1]]) {
          pos.push(x + rx * u, y + yy, z + rz * u);
          nrm.push(rx * nxl, ny, rz * nxl);
          rd.push(u, row.v, cw, med); kind.push(k);
        }
      }
      for (let r = 0; r < rows.length - 1; r++) {
        const a = base + r * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, b, c, b, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('rd', new THREE.Float32BufferAttribute(rd, 4));
    g.setAttribute('kind', new THREE.Float32BufferAttribute(kind, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}
