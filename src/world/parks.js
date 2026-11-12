import * as THREE from 'three';
import { NOISE_GLSL } from '../core/shared.js';
import { hash2 } from '../core/util.js';
import { palmGeometry, streetTreeGeometry, foliageMat, instancedTiles } from './vegetation.js';

// Seafront parks on the sea side of the road: lawn, a winding promenade, plaza paving near the squares.
const PARKS = {
  'Thùy Vân': { width: 24, palms: 0.55, trees: 0.12, pergola: 95 },   // Công viên Bãi Sau (2025)
  'Quang Trung': { width: 16, palms: 0.7, trees: 0.35, pergola: 0 },   // Công viên Bãi Trước
};

export function buildSeafrontParks(route, terrain, pois) {
  const group = new THREE.Group(); group.name = 'seafront-parks';
  // paved squares: around Tháp Tam Thắng and Cá Ông the park becomes plaza
  const plazas = pois.filter((p) => p.id === 'tamthang' || p.id === 'caong').map((p) => [p.s, p.id === 'tamthang' ? 210 : 34]);

  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 pk;\nvarying vec3 vPk;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPk = pk;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vPk;\n${NOISE_GLSL}`)
      .replace('#include <map_fragment>', `
        float u = vPk.x, v = vPk.y, plaza = vPk.z;
        vec3 lawn = vec3(0.33, 0.55, 0.24) * (0.82 + 0.3 * vnoise(vec2(u, v) * 0.6));
        float centre = 9.0 + 4.0 * sin(v / 37.0) + 2.0 * sin(v / 13.0);
        float path = 1.0 - smoothstep(1.6, 1.9, abs(u - centre));
        float edge = 1.0 - smoothstep(0.0, 0.25, u);
        vec2 t = vec2(u, v) / 0.6; vec2 id = floor(t);
        vec3 paving = mix(vec3(0.82, 0.78, 0.7), vec3(0.72, 0.62, 0.52), step(0.5, fract((id.x + id.y) * 0.5))) * (0.93 + 0.08 * hash12(id));
        vec3 c = mix(lawn, paving, max(max(path, edge), plaza));
        // flower beds along the promenade
        float bed = step(0.5, sin(v / 6.0)) * (1.0 - smoothstep(0.6, 0.9, abs(abs(u - centre) - 2.9)));
        c = mix(c, mix(vec3(0.9, 0.3, 0.45), vec3(0.98, 0.78, 0.2), step(0.5, fract(v / 12.0))), bed * (1.0 - plaza) * 0.85);
        diffuseColor.rgb = c;`);
  };

  const f = {};
  const palmItems = [], treeItems = [], pergolas = [];
  for (const sec of route.sections) {
    const P = PARKS[sec.name]; if (!P) continue;
    const pos = [], nrm = [], pk = [], idx = [];
    const COLS = 7, STEP = 6;
    let rows = 0;
    for (let s = sec.from + 6; s <= sec.to - 6; s += STEP) {
      const fr = route.at(s, f), sea = route.seaSide;
      const u0 = fr.cw + fr.sea + 0.4;
      const plaza = plazas.some(([ps, r]) => Math.abs(s - ps) < r) ? 1 : 0;
      for (let c = 0; c <= COLS; c++) {
        const u = (c / COLS) * P.width;
        const lat = sea * (u0 + u);
        const x = fr.pos.x + fr.right.x * lat, z = fr.pos.z + fr.right.z * lat;
        const yRoad = fr.pos.y + 0.17, yT = terrain.heightAt(x, z) + 0.06;
        const t = THREE.MathUtils.smoothstep(c / COLS, 0.7, 1.0);
        const y = THREE.MathUtils.lerp(yRoad, Math.max(yT, yRoad - 2.5), t);
        pos.push(x, y, z); nrm.push(0, 1, 0); pk.push(u, s, plaza);
      }
      // trees and pergolas on the lawn
      if (!plaza) {
        const h = hash2(Math.round(s), 77), h2 = hash2(Math.round(s), 91);
        const put = (list, uu, sc) => { const lat = sea * (u0 + uu); list.push({ x: fr.pos.x + fr.right.x * lat, y: fr.pos.y + 0.1, z: fr.pos.z + fr.right.z * lat, ry: h * 40, s: sc }); };
        if (h < P.palms) put(palmItems, 4 + h2 * (P.width - 8), 0.8 + h * 0.5);
        if (h2 < P.trees) put(treeItems, 3 + h * 4, 0.9 + h2);
        if (P.pergola && Math.round(s) % P.pergola < STEP) {
          const centre = 9 + 4 * Math.sin(s / 37) + 2 * Math.sin(s / 13);
          const lat = sea * (u0 + centre + 4.5);
          pergolas.push({ x: fr.pos.x + fr.right.x * lat, y: fr.pos.y + 0.17, z: fr.pos.z + fr.right.z * lat, ry: Math.atan2(fr.fwd.x, fr.fwd.z) });
        }
      }
      rows++;
    }
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < COLS; c++) {
      const a = r * (COLS + 1) + c, b = a + 1, d = a + COLS + 1, e = d + 1;
      if (route.seaSide < 0) idx.push(a, b, d, b, e, d); else idx.push(a, d, b, b, d, e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('pk', new THREE.Float32BufferAttribute(pk, 3));
    g.setIndex(idx); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true;
    group.add(mesh);
  }
  const fm = foliageMat();
  group.add(instancedTiles(palmGeometry(5), fm, palmItems, 500, { castShadow: true }));
  group.add(instancedTiles(streetTreeGeometry(0x467f37), fm, treeItems, 500, { castShadow: true }));
  // white pergola shelters (slatted roof on four posts)
  const parts = [];
  for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) parts.push(new THREE.BoxGeometry(0.18, 2.8, 0.18).translate(x, 1.4, z));
  for (let i = -4; i <= 4; i++) parts.push(new THREE.BoxGeometry(0.12, 0.14, 4.4).translate(i * 0.48, 2.85, 0));
  parts.push(new THREE.BoxGeometry(2.4, 0.45, 0.5).translate(0, 0.25, -1.2));
  const pg = mergeBoxes(parts);
  group.add(instancedTiles(pg, new THREE.MeshLambertMaterial({ color: 0xf6f3ec }), pergolas, 600, { castShadow: true }));
  return group;
}

function mergeBoxes(list) {
  const pos = [], nrm = [], idx = [];
  for (const g of list) {
    const base = pos.length / 3;
    pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array);
    for (const i of g.index.array) idx.push(base + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}
