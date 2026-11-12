import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { quality } from '../core/shared.js';
import { hash2, rng } from '../core/util.js';

function paint(geo, color) {
  const c = new THREE.Color(color), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const strip = (g) => { const o = g.toNonIndexed(); o.deleteAttribute('uv'); return o; };

/** Coconut palm: leaning trunk + drooping fronds, ~9 m tall. */
export function palmGeometry(seed = 1) {
  const r = rng(seed), parts = [];
  const lean = 0.5 + r() * 0.9, H = 8;
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const g = new THREE.CylinderGeometry(0.2 - t1 * 0.07, 0.24 - t0 * 0.07, H / segs + 0.05, 6, 1, true);
    g.translate(lean * ((t0 + t1) / 2) ** 2, H * (t0 + t1) / 2, 0);
    parts.push(paint(strip(g), i % 2 ? 0x8a7458 : 0x7a664c));
  }
  const top = new THREE.Vector3(lean, H, 0);
  const nF = 9;
  for (let k = 0; k < nF; k++) {
    const ang = (k / nF) * Math.PI * 2 + r() * 0.4, len = 3.6 + r() * 1.1, droop = 0.5 + r() * 0.5;
    const pos = [];
    const N = 4, w = 0.75;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, rad = len * t;
      const y = Math.sin(t * 2.2) * 0.9 - droop * t * t * 3.0;
      pts.push([Math.cos(ang) * rad, y, Math.sin(ang) * rad, w * Math.sin(Math.PI * (0.15 + 0.85 * t)) * (1 - t * 0.35)]);
    }
    const sx = -Math.sin(ang), sz = Math.cos(ang);
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1];
      const A0 = [a[0] - sx * a[3], a[1] - 0.12, a[2] - sz * a[3]], A1 = [a[0] + sx * a[3], a[1] - 0.12, a[2] + sz * a[3]];
      const B0 = [b[0] - sx * b[3], b[1] - 0.12, b[2] - sz * b[3]], B1 = [b[0] + sx * b[3], b[1] - 0.12, b[2] + sz * b[3]];
      const Am = [a[0], a[1], a[2]], Bm = [b[0], b[1], b[2]];
      pos.push(...A0, ...Am, ...B0, ...Am, ...Bm, ...B0, ...Am, ...A1, ...Bm, ...A1, ...B1, ...Bm);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.translate(top.x, top.y, top.z);
    g.computeVertexNormals();
    parts.push(paint(g, k % 3 === 0 ? 0x3f7a35 : k % 3 === 1 ? 0x4b8a3c : 0x5a9643));
  }
  const nuts = new THREE.IcosahedronGeometry(0.34, 0); nuts.translate(top.x, top.y - 0.25, top.z);
  parts.push(paint(strip(nuts), 0x6a5a2c));
  return mergeGeometries(parts);
}

/** Round street tree (bàng / phượng). */
export function streetTreeGeometry(canopy = 0x3d7d3a) {
  const trunk = paint(strip(new THREE.CylinderGeometry(0.16, 0.24, 3.2, 6, 1, true).translate(0, 1.6, 0)), 0x6b5642);
  const c1 = paint(strip(new THREE.IcosahedronGeometry(2.3, 1).scale(1.15, 0.8, 1.15).translate(0, 4.6, 0)), canopy);
  const c2 = paint(strip(new THREE.IcosahedronGeometry(1.5, 0).translate(1.1, 5.4, 0.5)), canopy);
  return mergeGeometries([trunk, c1, c2]);
}

function canopyGeometry() {
  const g = strip(new THREE.IcosahedronGeometry(1, 0)).scale(1, 0.72, 1).translate(0, 0.35, 0);
  // darker underside
  const n = g.attributes.position.count, a = new Float32Array(n * 3), p = g.attributes.position;
  for (let i = 0; i < n; i++) { const s = 0.62 + 0.38 * Math.max(0, p.getY(i)); a[i * 3] = s; a[i * 3 + 1] = s; a[i * 3 + 2] = s; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.computeVertexNormals();
  return g;
}

export const foliageMat = () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });

/** Group instances into square tiles so the frustum can cull them. */
export function instancedTiles(geo, mat, items, tile = 500, opts = {}) {
  const group = new THREE.Group();
  const tiles = new Map();
  for (const it of items) {
    const key = Math.floor(it.x / tile) + ',' + Math.floor(it.z / tile);
    let t = tiles.get(key); if (!t) tiles.set(key, t = []);
    t.push(it);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
  for (const list of tiles.values()) {
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, k) => {
      p.set(it.x, it.y, it.z); e.set(it.rx || 0, it.ry || 0, it.rz || 0); q.setFromEuler(e);
      s.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.sx ?? it.s ?? 1);
      mesh.setMatrixAt(k, m.compose(p, q, s));
      if (it.color !== undefined) mesh.setColorAt(k, col.set(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = !!opts.castShadow; mesh.receiveShadow = false;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}

/** Forest canopy on Núi Lớn / Núi Nhỏ from the baked cover grid. */
export function buildForest(terrain, route) {
  const items = [];
  const budget = quality.pick(9000, 26000, 52000);
  const { nx, nz, cell, cover } = terrain;
  let cells = 0;
  for (let k = 0; k < cover.length; k++) if (cover[k] === 1 || cover[k] === 6) cells++;
  const keep = Math.min(1, budget / cells);
  const greens = [0x3f7a3c, 0x356b36, 0x4a8a42, 0x2f6233, 0x5a9448, 0x3c7a4a];
  for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const c = cover[j * nx + i];
    if (c !== 1 && c !== 6) continue;
    const r0 = hash2(i, j);
    if (r0 > keep) continue;
    const x = terrain.x0 + (i + hash2(i + 71, j) - 0.5) * cell, z = terrain.z0 + (j + hash2(i, j + 53) - 0.5) * cell;
    const y = terrain.heightAt(x, z);
    if (y < 1.5) continue;
    const big = (c === 6 ? 3.2 : 5.2) * (0.75 + hash2(i + 9, j + 4) * 0.7) / Math.sqrt(Math.max(keep, 0.35));
    items.push({ x, y: y + big * 0.25, z, sx: big, sy: big * (0.8 + hash2(i + 3, j + 8) * 0.6), ry: r0 * 6.28, color: greens[(hash2(i + 5, j + 1) * greens.length) | 0] });
  }
  const g = instancedTiles(canopyGeometry(), foliageMat(), items, 640);
  g.name = 'forest';
  return g;
}

/** Palms on the sea side, shade trees on the land side of the tour road. */
export function buildRoadsideTrees(route, terrain) {
  const palms = [[], [], []], trees = [[], []];
  const f = {};
  const spacing = [26, 13, 30, 12];
  for (let s = 20; s < route.length - 10;) {
    const k = route.sectionIndex(s);
    const fr = route.at(s, f);
    const h = hash2(Math.round(s), 7);
    // sea side (right of travel)
    const offR = fr.cw + Math.max(1.2, fr.swR - 1.0);
    const px = fr.pos.x + fr.right.x * offR, pz = fr.pos.z + fr.right.z * offR;
    if (h > (k === 0 || k === 2 ? 0.35 : 0.05)) {
      palms[(h * 3) | 0].push({ x: px, y: fr.pos.y + 0.1, z: pz, ry: h * 40, s: 0.85 + hash2(Math.round(s), 3) * 0.45 });
    }
    // land side
    const h2 = hash2(Math.round(s), 19);
    if (h2 > 0.3) {
      const offL = -(fr.cw + Math.max(1.0, fr.swL - 0.9));
      trees[h2 > 0.86 ? 1 : 0].push({ x: fr.pos.x + fr.right.x * offL, y: fr.pos.y + 0.1, z: fr.pos.z + fr.right.z * offL, ry: h2 * 30, s: 0.8 + h2 * 0.5 });
    }
    // extra palms on the central reservation of the big avenues
    if (fr.med > 0.8 && hash2(Math.round(s), 31) > 0.5) {
      palms[1].push({ x: fr.pos.x, y: fr.pos.y + 0.2, z: fr.pos.z, ry: h2 * 50, s: 0.7 + h * 0.3 });
    }
    s += spacing[k] * (0.8 + h * 0.5);
  }
  const mat = foliageMat();
  const group = new THREE.Group(); group.name = 'roadside-trees';
  palms.forEach((list, i) => group.add(instancedTiles(palmGeometry(11 + i * 7), mat, list, 600, { castShadow: true })));
  group.add(instancedTiles(streetTreeGeometry(0x3d7d3a), mat, trees[0], 600, { castShadow: true }));
  group.add(instancedTiles(streetTreeGeometry(0xd9502f), mat, trees[1], 600, { castShadow: true })); // phượng đỏ in bloom
  return group;
}
