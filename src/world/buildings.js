import * as THREE from 'three';
import { U, NOISE_GLSL, quality } from '../core/shared.js';

const FACADE_GLSL = /* glsl */`
vec3 wallPalette(float s){
  float k = floor(s * 8.0);
  if (k < 1.0) return vec3(0.95, 0.91, 0.80);
  if (k < 2.0) return vec3(0.96, 0.95, 0.92);
  if (k < 3.0) return vec3(0.95, 0.86, 0.60);
  if (k < 4.0) return vec3(0.80, 0.90, 0.84);
  if (k < 5.0) return vec3(0.80, 0.87, 0.93);
  if (k < 6.0) return vec3(0.93, 0.81, 0.77);
  if (k < 7.0) return vec3(0.94, 0.79, 0.62);
  return vec3(0.85, 0.85, 0.83);
}
vec3 roofPalette(float s){
  float k = floor(fract(s * 7.31) * 6.0);
  if (k < 2.0) return vec3(0.68, 0.33, 0.24);
  if (k < 3.0) return vec3(0.27, 0.43, 0.60);
  if (k < 4.0) return vec3(0.62, 0.27, 0.23);
  if (k < 5.0) return vec3(0.33, 0.52, 0.42);
  return vec3(0.62, 0.62, 0.60);
}
// returns colour in rgb, night glow in a
vec4 facade(vec2 uv, float h, float seed, float kind, float roof, float night){
  if (roof > 0.5) {
    vec3 rc = h > 22.0 ? vec3(0.58, 0.58, 0.57) : roofPalette(seed);
    float rib = 0.9 + 0.1 * step(0.5, fract(uv.x * 1.6));
    float edge = step(0.35, uv.x) * step(0.35, uv.y);
    return vec4(rc * rib * mix(0.8, 1.0, edge), 0.0);
  }
  vec3 wall = wallPalette(seed);
  float tall = smoothstep(24.0, 40.0, h);
  wall = mix(wall, vec3(0.86, 0.89, 0.92), tall * 0.7);
  float floorH = 3.4;
  float bay = mix(2.4 + fract(seed * 13.7) * 1.4, 3.0, tall);
  vec2 g = vec2(uv.x / bay, uv.y / floorH);
  vec2 id = floor(g); vec2 f = fract(g);
  float lod = clamp(max(fwidth(g.x), fwidth(g.y)) * 1.6, 0.0, 1.0);
  float wx0 = mix(0.2, 0.08, tall), wy0 = mix(0.3, 0.14, tall), wy1 = mix(0.8, 0.9, tall);
  float win = step(wx0, f.x) * step(f.x, 1.0 - wx0) * step(wy0, f.y) * step(f.y, wy1);
  float ground = step(id.y, 0.5);
  float shop = ground * step(0.08, f.x) * step(f.x, 0.92) * step(f.y, 0.74);
  win = mix(win, shop, ground);
  win *= step(uv.y, h - 0.7);                       // parapet
  if (kind > 1.5 && kind < 2.5) win *= 0.35;         // temples / churches: mostly wall
  float r = hash12(id + seed * 91.7);
  vec3 glass = mix(vec3(0.13, 0.19, 0.27), vec3(0.34, 0.5, 0.63), r * (0.5 + 0.5 * f.y));
  vec3 awning = mix(vec3(0.75, 0.2, 0.18), vec3(0.15, 0.4, 0.62), step(0.5, fract(seed * 5.3)));
  glass = mix(glass, mix(vec3(0.1, 0.1, 0.12), awning, step(0.62, f.y)), ground);
  float litP = mix(0.42, 0.7, ground);
  float lit = step(1.0 - litP, fract(r * 7.13 + seed)) * night * win;
  vec3 c = mix(wall, glass, mix(win, 0.3, lod));
  c *= 1.0 - 0.14 * step(f.y, 0.05) * (1.0 - lod);   // floor slab line
  c *= 0.9 + 0.1 * smoothstep(0.0, 6.0, uv.y);       // grime near the street
  return vec4(c, lit * (1.0 - lod * 0.6));
}`;

function facadeMaterial(instanced) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 fuv; attribute ${instanced ? 'vec2' : 'vec3'} binfo;
        varying vec2 vFuv; varying vec4 vInfo;`)
      .replace('#include <begin_vertex>', instanced ? /* glsl */`#include <begin_vertex>
        {
          float w = length(instanceMatrix[0].xyz), h = length(instanceMatrix[1].xyz), d = length(instanceMatrix[2].xyz);
          float along = fuv.z < 0.5 ? w : d;
          vFuv = fuv.z > 1.5 ? fuv.xy * vec2(w, d) : vec2(fuv.x * along, fuv.y * h);
          vInfo = vec4(binfo.x, binfo.y, fuv.z > 1.5 ? 1.0 : 0.0, h);
        }` : /* glsl */`#include <begin_vertex>
        vFuv = fuv.xy; vInfo = vec4(binfo.x, binfo.y, fuv.z > 1.5 ? 1.0 : 0.0, binfo.z);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uNight;\nvarying vec2 vFuv; varying vec4 vInfo;\n${NOISE_GLSL}\n${FACADE_GLSL}`)
      .replace('#include <map_fragment>', `vec4 fc = facade(vFuv, vInfo.w, vInfo.x, vInfo.y, vInfo.z, uNight);\ndiffuseColor.rgb = fc.rgb;`)
      .replace('#include <emissivemap_fragment>', `totalEmissiveRadiance += vec3(1.0, 0.78, 0.45) * fc.a * 1.6;`);
  };
  return mat;
}

function unitBox() {
  // 4 walls + roof; fuv.z: 0 = wall along X, 1 = wall along Z, 2 = roof
  const pos = [], nrm = [], fuv = [], idx = [];
  const quad = (a, b, c, d, n, face) => {
    const base = pos.length / 3;
    for (const [p, u, v] of [[a, 0, 0], [b, 1, 0], [c, 1, 1], [d, 0, 1]]) { pos.push(...p); nrm.push(...n); fuv.push(u, v, face); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const x0 = -0.5, x1 = 0.5, z0 = -0.5, z1 = 0.5;
  quad([x0, 0, z1], [x1, 0, z1], [x1, 1, z1], [x0, 1, z1], [0, 0, 1], 0);
  quad([x1, 0, z0], [x0, 0, z0], [x0, 1, z0], [x1, 1, z0], [0, 0, -1], 0);
  quad([x1, 0, z1], [x1, 0, z0], [x1, 1, z0], [x1, 1, z1], [1, 0, 0], 1);
  quad([x0, 0, z0], [x0, 0, z1], [x0, 1, z1], [x0, 1, z0], [-1, 0, 0], 1);
  quad([x0, 1, z1], [x1, 1, z1], [x1, 1, z0], [x0, 1, z0], [0, 1, 0], 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('fuv', new THREE.Float32BufferAttribute(fuv, 3));
  g.setIndex(idx);
  return g;
}

/**
 * Drops mapped buildings that no longer exist: landmark sites (`clear`: [{x, z, r}]) and the beach side of
 * Thùy Vân / Quang Trung. Returns { rects: Int16Array, polys } used for both the 3D city and the ground map.
 */
export function filterBuildings(i16, bpolys, route, clear = []) {
  const blocked = (x, z) => clear.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r);
  // Thùy Vân (Bãi Sau, rebuilt as a park in 2025) and Quang Trung (Bãi Trước park) have no buildings
  // between the road and the sea; the map data still holds old kiosks there.
  const f = {};
  const onParkBeach = (x, z) => {
    const pr = route.project(x, z);
    if (pr.dist > 160) return false;
    const name = route.sections[route.sectionIndex(pr.s)].name;
    if (name !== 'Thùy Vân' && name !== 'Quang Trung') return false;
    const fr = route.at(pr.s, f);
    const lat = (x - fr.pos.x) * fr.right.x + (z - fr.pos.z) * fr.right.z;
    return lat * route.seaSide > 0;
  };
  const keep = [];
  for (let i = 0; i < i16.length / 8; i++) if (!blocked(i16[i * 8] / 4, i16[i * 8 + 1] / 4) && !onParkBeach(i16[i * 8] / 4, i16[i * 8 + 1] / 4)) keep.push(i);
  const rects = new Int16Array(keep.length * 8);
  keep.forEach((i, k) => rects.set(i16.subarray(i * 8, i * 8 + 8), k * 8));
  const polys = bpolys.filter(([pts]) => !blocked(pts[0] / 10, pts[1] / 10) && !onParkBeach(pts[0] / 10, pts[1] / 10));
  return { rects, polys };
}

/** All mapped buildings of the peninsula as instanced boxes with a procedural facade. */
export function buildBuildings(i16, bpolys, route) {
  const group = new THREE.Group();
  group.name = 'buildings';
  const TILE = 420;
  const tiles = new Map();
  const n = i16.length / 8;
  const maxDist = quality.pick(700, 2600, 1e9);
  for (let i = 0; i < n; i++) {
    const cx = i16[i * 8] / 4, cz = i16[i * 8 + 1] / 4;
    if (maxDist < 1e8 && route.project(cx, cz).dist > maxDist) continue;
    const key = Math.floor(cx / TILE) + ',' + Math.floor(cz / TILE);
    let t = tiles.get(key); if (!t) tiles.set(key, t = []);
    t.push(i);
  }
  const box = unitBox();
  const mat = facadeMaterial(true);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  for (const list of tiles.values()) {
    const geo = box.clone();
    const info = new Float32Array(list.length * 2);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((i, k) => {
      const o = i * 8;
      const flags = i16[o + 7];
      p.set(i16[o] / 4, i16[o + 6] / 10, i16[o + 1] / 4);
      q.setFromAxisAngle(Y, i16[o + 4] / 10000);
      s.set(i16[o + 2] / 10, i16[o + 5] / 10, i16[o + 3] / 10);
      mesh.setMatrixAt(k, m.compose(p, q, s));
      info[k * 2] = ((flags >> 3) & 255) / 255; info[k * 2 + 1] = flags & 7;
    });
    geo.setAttribute('binfo', new THREE.InstancedBufferAttribute(info, 2));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }

  // OSM footprints with real shapes (hotels, churches, temples ...) — extruded
  if (bpolys.length) {
    const pos = [], nrm = [], fuv = [], binfo = [], idx = [];
    for (const [pts, h10, b10, kind, seed] of bpolys) {
      const h = h10 / 10, base = b10 / 10, sd = seed / 255, nP = pts.length / 2;
      const P = []; for (let i = 0; i < nP; i++) P.push(new THREE.Vector2(pts[i * 2] / 10, pts[i * 2 + 1] / 10));
      let acc = 0;
      for (let i = 0; i < nP; i++) {
        const a = P[i], b = P[(i + 1) % nP];
        const len = a.distanceTo(b); if (len < 0.05) continue;
        // footprint is CCW in (x, north) => clockwise seen from above in (x, z); outward normal = (dz, -dx)
        const nx = (b.y - a.y) / len, nz = -(b.x - a.x) / len;
        const v0 = pos.length / 3;
        pos.push(a.x, base, a.y, b.x, base, b.y, b.x, base + h, b.y, a.x, base + h, a.y);
        for (let k = 0; k < 4; k++) { nrm.push(nx, 0, nz); binfo.push(sd, kind, h); }
        fuv.push(acc, 0, 0, acc + len, 0, 0, acc + len, h, 0, acc, h, 0);
        idx.push(v0, v0 + 2, v0 + 1, v0, v0 + 3, v0 + 2);
        acc += len;
      }
      const tris = THREE.ShapeUtils.triangulateShape(P, []);
      const r0 = pos.length / 3;
      for (const v of P) { pos.push(v.x, base + h, v.y); nrm.push(0, 1, 0); fuv.push(v.x, v.y, 2); binfo.push(sd, kind, h); }
      for (const t of tris) idx.push(r0 + t[0], r0 + t[1], r0 + t[2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('fuv', new THREE.Float32BufferAttribute(fuv, 3));
    g.setAttribute('binfo', new THREE.Float32BufferAttribute(binfo, 3));
    g.setIndex(idx);
    const pm = facadeMaterial(false);
    pm.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(g, pm);
    mesh.castShadow = true; mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}
