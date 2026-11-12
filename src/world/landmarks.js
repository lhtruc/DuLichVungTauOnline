import * as THREE from 'three';
import { U } from '../core/shared.js';

const stone = () => new THREE.MeshLambertMaterial({ color: 0xf1efe8 });
const add = (g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };

/** Tượng Chúa Kitô Vua: 32 m tall, 18.4 m arm span, facing the sea to the south-east. */
function christ() {
  const g = new THREE.Group(), m = stone();
  add(g, new THREE.CylinderGeometry(5.5, 6.5, 4, 8), new THREE.MeshLambertMaterial({ color: 0xd8d2c4 }), 0, 2, 0);
  const robe = new THREE.LatheGeometry([[0, 0], [3.4, 0], [3.0, 6], [2.5, 14], [2.2, 20], [2.6, 23.2], [1.2, 24.6], [0, 24.6]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  add(g, robe, m, 0, 4, 0);
  add(g, new THREE.SphereGeometry(1.5, 14, 12), m, 0, 30.3, 0).scale.set(1, 1.2, 1);
  for (const sx of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.75, 1.15, 7.2, 8), m, sx * 5.4, 26.6, 0, 0, 0, sx * (Math.PI / 2 - 0.08));
    add(g, new THREE.BoxGeometry(2.6, 3.8, 0.7), m, sx * 4.6, 24.6, 0);          // hanging sleeve
    add(g, new THREE.SphereGeometry(0.7, 8, 6), m, sx * 9.2, 26.9, 0);            // hand
  }
  add(g, new THREE.TorusGeometry(2.2, 0.16, 6, 24), new THREE.MeshLambertMaterial({ color: 0xe9d9a0 }), 0, 30.6, -0.9);
  g.rotation.y = THREE.MathUtils.degToRad(-35);
  return g;
}

/** Hải đăng Vũng Tàu: white 18 m tower with a rotating beam at night. */
function lighthouse() {
  const g = new THREE.Group(), m = stone();
  add(g, new THREE.BoxGeometry(14, 4, 9), m, 0, 2, 0);
  add(g, new THREE.CylinderGeometry(1.5, 2.1, 15, 16), m, 0, 9.5, 0);
  add(g, new THREE.CylinderGeometry(2.5, 2.5, 0.4, 16), new THREE.MeshLambertMaterial({ color: 0x8a8f96 }), 0, 17, 0);
  const lamp = add(g, new THREE.CylinderGeometry(1.2, 1.2, 2, 12), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }), 0, 18.2, 0);
  add(g, new THREE.ConeGeometry(1.6, 1.4, 12), new THREE.MeshLambertMaterial({ color: 0xb23a2e }), 0, 19.9, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Group(); beam.position.y = 18.2; g.add(beam);
  for (const s of [1, -1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(14, 420, 12, 1, true), beamMat); c.rotation.z = s * Math.PI / 2; c.position.x = -s * 210; beam.add(c); }
  g.userData.tick = (t) => { beam.rotation.y = t * 0.5; beamMat.opacity = 0.16 * U.uNight.value; lamp.material.color.setHex(U.uNight.value > 0.4 ? 0xfff2b0 : 0xd8e4ea); };
  return g;
}

/** Simple white statue on a lotus plinth (Đức Mẹ, Quan Âm, Phật). */
function statue(h, color = 0xf4f2ec) {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color });
  add(g, new THREE.CylinderGeometry(h * 0.16, h * 0.2, h * 0.14, 10), new THREE.MeshLambertMaterial({ color: 0xd9d2c2 }), 0, h * 0.07, 0);
  const robe = new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.11, 0.3], [0.085, 0.58], [0.1, 0.7], [0.045, 0.76], [0, 0.76]].map(([x, y]) => new THREE.Vector2(x * h, y * h)), 12);
  add(g, robe, m, 0, h * 0.14, 0);
  add(g, new THREE.SphereGeometry(h * 0.055, 12, 10), m, 0, h * 0.95, 0);
  return g;
}

function flagpole() {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(5, 6, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0xcfc8ba }), 0, 0.6, 0);
  add(g, new THREE.CylinderGeometry(0.22, 0.35, 34, 8), new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }), 0, 18, 0);
  const geo = new THREE.PlaneGeometry(12, 8, 12, 4); geo.translate(6, 0, 0);
  const cv = document.createElement('canvas'); cv.width = 192; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#da251d'; c.fillRect(0, 0, 192, 128); c.fillStyle = '#ffeb3b'; c.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 13 : 34, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(96 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
  c.fill();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const flag = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  flag.position.set(0.2, 30.5, 0); g.add(flag);
  const base = geo.attributes.position.array.slice();
  g.userData.tick = (t) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3]; p.setZ(i, Math.sin(x * 0.8 - t * 4) * 0.12 * x); } p.needsUpdate = true; };
  return g;
}

const BUILDERS = {
  christ, lighthouse, flag: flagpole,
  ducme: () => statue(32), quanam: () => statue(16), thichca: () => statue(11),
};

/** Places landmark models at their real coordinates; returns { group, ticks }. */
export function buildLandmarks(pois, terrain) {
  const group = new THREE.Group(); group.name = 'landmarks';
  const ticks = [];
  for (const p of pois) {
    const b = BUILDERS[p.model]; if (!b) continue;
    const obj = b();
    obj.position.set(p.x, terrain.heightAt(p.x, p.z) - 0.5, p.z);
    group.add(obj);
    if (obj.userData.tick) ticks.push(obj.userData.tick);
  }
  return { group, ticks };
}
