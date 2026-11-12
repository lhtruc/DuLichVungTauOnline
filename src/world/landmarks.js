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

/** Palm silhouette used around the two promenades. */
function palm(g, x, z, scale = 1, materials) {
  add(g, new THREE.CylinderGeometry(0.28 * scale, 0.52 * scale, 7.5 * scale, 7), materials.trunk, x, 3.75 * scale, z);
  const crownY = 7.25 * scale;
  for (let i = 0; i < 6; i++) {
    const leaf = add(g, new THREE.SphereGeometry(1, 7, 5), materials.leaf, x, crownY, z);
    leaf.scale.set(0.62 * scale, 0.18 * scale, 2.2 * scale);
    leaf.rotation.y = i * Math.PI / 3;
    leaf.rotation.x = -0.16;
  }
}

/** Low-profile planted promenade segment, aligned along its long axis. */
function coastalPark(width, depth, palmCount, name) {
  const g = new THREE.Group(); g.name = name;
  const materials = {
    grass: new THREE.MeshLambertMaterial({ color: 0x67964f }),
    path: new THREE.MeshLambertMaterial({ color: 0xc9bca2 }),
    redPath: new THREE.MeshLambertMaterial({ color: 0xa96d58 }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x76583b }),
    leaf: new THREE.MeshLambertMaterial({ color: 0x397346 }),
    stone: new THREE.MeshLambertMaterial({ color: 0xaaa79e }),
    bench: new THREE.MeshLambertMaterial({ color: 0x765d45 }),
  };
  // buildLandmarks anchors groups half a metre below sampled terrain; lift surfaces above that offset.
  add(g, new THREE.BoxGeometry(width, 0.32, depth), materials.grass, 0, 0.4, 0);
  add(g, new THREE.BoxGeometry(width * 0.96, 0.16, 9), materials.path, 0, 0.64, -depth * 0.28);
  add(g, new THREE.BoxGeometry(width * 0.88, 0.14, 6), materials.redPath, 0, 0.65, depth * 0.25);
  add(g, new THREE.BoxGeometry(width, 0.7, 1.5), materials.stone, 0, 0.2, -depth * 0.49);
  for (let i = 0; i < palmCount; i++) {
    const x = -width * 0.44 + i * (width * 0.88 / Math.max(1, palmCount - 1));
    palm(g, x, (i % 2 ? 1 : -1) * depth * 0.39, 0.92, materials);
  }
  for (const x of [-width * 0.28, 0, width * 0.28]) {
    add(g, new THREE.BoxGeometry(4.2, 0.32, 1), materials.bench, x, 1.0, depth * 0.02);
    for (const dx of [-1.5, 1.5]) add(g, new THREE.BoxGeometry(0.25, 0.8, 0.3), materials.stone, x + dx, 0.62, depth * 0.02);
  }
  g.rotation.y = Math.PI / 4;
  return g;
}

/** Tam Thắng's three rising prow forms, represented by 143 shared-mesh columns. */
function tamThang() {
  const g = new THREE.Group(); g.name = 'tam-thang-tower';
  const plaza = new THREE.MeshLambertMaterial({ color: 0xb8b3a8 });
  add(g, new THREE.BoxGeometry(128, 0.8, 88), plaza, 0, 0.2, 0);
  const columnGeometry = new THREE.CylinderGeometry(1.35, 1.75, 1, 6);
  const columnMaterial = new THREE.MeshLambertMaterial({ color: 0xf3eee2 });
  const rowWidths = [4, 5, 6, 7, 7, 7, 6, 6]; // 48 columns per prow
  const total = 143;
  const columns = new THREE.InstancedMesh(columnGeometry, columnMaterial, total);
  columns.name = '143 mosaic pillars'; columns.castShadow = true; columns.receiveShadow = true;
  const tones = [0xf3eee2, 0xd9c59c, 0xe7dfd4, 0xfaf7ed];
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let prow = 0; prow < 3; prow++) {
    for (let row = 0; row < rowWidths.length; row++) {
      const count = rowWidths[row] - (prow === 2 && row === 7 ? 1 : 0);
      for (let col = 0; col < count; col++) {
        const center = (count - 1) / 2;
        const height = 5.2 + row * 3.9 + ((col + prow) % 3) * 0.25;
        const x = (prow - 1) * 39 + (col - center) * 3.15;
        const z = (row - 3.5) * 6.3 + Math.abs(col - center) * 0.35;
        dummy.position.set(x, 0.6 + height / 2, z);
        dummy.scale.set(1, height, 1); dummy.updateMatrix();
        columns.setMatrixAt(index, dummy.matrix);
        columns.setColorAt(index, new THREE.Color(tones[(index * 7 + prow) % tones.length]));
        index++;
      }
    }
  }
  columns.instanceMatrix.needsUpdate = true;
  if (columns.instanceColor) columns.instanceColor.needsUpdate = true;
  g.add(columns);
  return g;
}

/** Small yellow shrine and red tiled roofs on Hòn Bà's rocky islet. */
function honBa() {
  const g = new THREE.Group(); g.name = 'mieu-hon-ba';
  const rock = new THREE.MeshLambertMaterial({ color: 0x77736a });
  const yellow = new THREE.MeshLambertMaterial({ color: 0xe3ba4f });
  const red = new THREE.MeshLambertMaterial({ color: 0x9b3930 });
  const wood = new THREE.MeshLambertMaterial({ color: 0x75452e });
  add(g, new THREE.CylinderGeometry(18, 22, 4, 9), rock, 0, 2, 0);
  add(g, new THREE.BoxGeometry(14, 5, 10), yellow, 0, 6.5, 0);
  add(g, new THREE.BoxGeometry(10, 3.5, 0.5), wood, 0, 6.1, 5.15);
  for (const sx of [-3.4, 3.4]) {
    const roof = add(g, new THREE.BoxGeometry(8.3, 0.8, 12), red, sx, 9.35, 0);
    roof.rotation.z = sx < 0 ? -0.42 : 0.42;
  }
  add(g, new THREE.BoxGeometry(1.5, 1, 12.4), red, 0, 11.0, 0);
  add(g, new THREE.BoxGeometry(20, 0.9, 2), red, 0, 10.1, 0);
  // Gate at the islet approach: three gold posts and a red sign beam.
  for (const x of [-7, 0, 7]) add(g, new THREE.CylinderGeometry(0.42, 0.55, 6, 8), yellow, x, 3.1, 13);
  add(g, new THREE.BoxGeometry(16, 1.4, 1.2), red, 0, 6.2, 13);
  add(g, new THREE.BoxGeometry(10, 0.45, 8), rock, 0, 4.2, 8);
  return g;
}

/** Rocky, sheltered Bãi Dâu shoreline with a narrow sand apron. */
function baiDau() {
  const g = new THREE.Group(); g.name = 'bai-dau-shore';
  const sand = new THREE.MeshLambertMaterial({ color: 0xe0ce9b });
  const rock = new THREE.MeshLambertMaterial({ color: 0x77766e });
  const green = new THREE.MeshLambertMaterial({ color: 0x4f7545 });
  const apron = add(g, new THREE.SphereGeometry(1, 18, 10), sand, 0, 0.15, 4);
  apron.scale.set(62, 0.7, 22);
  for (let i = 0; i < 12; i++) {
    const angle = Math.PI * (0.12 + i * 0.76 / 11);
    const x = Math.cos(angle) * 54, z = -Math.sin(angle) * 19 - 5;
    const boulder = add(g, new THREE.DodecahedronGeometry(1, 0), rock, x, 0.8 + (i % 3) * 0.35, z);
    boulder.scale.set(2.2 + (i % 2), 1.3 + (i % 3) * 0.25, 1.8);
    if (i % 3 === 0) {
      const shrub = add(g, new THREE.SphereGeometry(1.7, 7, 5), green, x * 0.72, 2.1, z - 3);
      shrub.scale.set(1.5, 1, 1.4);
    }
  }
  return g;
}

/** Mary holding the child Jesus, sized to the Bãi Dâu monument. */
function virginMary() {
  const g = new THREE.Group(), white = new THREE.MeshLambertMaterial({ color: 0xf5f3ed });
  const base = new THREE.MeshLambertMaterial({ color: 0xd5cfc2 });
  add(g, new THREE.CylinderGeometry(5.8, 6.5, 3.2, 12), base, 0, 1.6, 0);
  const robe = new THREE.LatheGeometry([[0, 0], [5.2, 0], [4.2, 5], [3.4, 12], [2.9, 18], [2.2, 21], [0, 21]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
  add(g, robe, white, 0, 3, 0);
  const veil = add(g, new THREE.SphereGeometry(2.6, 12, 10), white, 0, 25.2, -0.25);
  veil.scale.set(1.12, 1.2, 0.72);
  const head = add(g, new THREE.SphereGeometry(1.65, 12, 10), white, 0, 25.4, 0.95);
  head.scale.set(0.92, 1.12, 0.86);
  // Child held on Mary's left side; the swaddling is separate from the head.
  const bundle = add(g, new THREE.SphereGeometry(1, 10, 8), white, -2.5, 19.2, 1.65);
  bundle.scale.set(1.05, 2.45, 1.0);
  add(g, new THREE.SphereGeometry(0.92, 10, 8), white, -2.5, 22.0, 1.7);
  for (const side of [-1, 1]) {
    const arm = add(g, new THREE.CylinderGeometry(0.62, 0.82, 7.3, 10), white, side * 2.15, 19.0, 1.45, 0, 0, side < 0 ? -0.7 : 0.35);
    arm.rotation.x = 0.18;
  }
  g.rotation.y = -0.35;
  g.scale.setScalar(1.15);
  return g;
}

/** Sloped lookout approach at Mũi Nghinh Phong, with low roadside rails. */
function sunsetSlope() {
  const g = new THREE.Group(); g.name = 'doc-hoang-hon-nghinh-phong';
  const road = new THREE.MeshLambertMaterial({ color: 0x55585b });
  const rail = new THREE.MeshLambertMaterial({ color: 0xe7e1d5 });
  const red = new THREE.MeshLambertMaterial({ color: 0xb74b3c });
  const vertices = new Float32Array([-9, -1, -24, 9, -1, -24, -9, 3.5, 24, 9, 3.5, 24]);
  const rampGeometry = new THREE.BufferGeometry();
  rampGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  rampGeometry.setIndex([0, 2, 1, 1, 2, 3]); rampGeometry.computeVertexNormals();
  const ramp = new THREE.Mesh(rampGeometry, road); ramp.name = 'sloped road'; ramp.receiveShadow = true; g.add(ramp);
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 6; i++) {
      const z = -22 + i * 7.3, y = -0.8 + (z + 24) * 4.5 / 48;
      add(g, new THREE.BoxGeometry(0.45, 2.2, 0.45), rail, side * 10.2, y + 1, z);
    }
    const beam = add(g, new THREE.BoxGeometry(0.35, 0.45, 48), rail, side * 10.2, 2.6, 0);
    beam.rotation.x = -0.094;
    for (let i = 0; i < 5; i++) add(g, new THREE.BoxGeometry(0.5, 1.2, 0.45), red, side * 10.2, 0.5 + i * 0.48, -18 + i * 9);
  }
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
  ducme: virginMary, quanam: () => statue(16), thichca: () => statue(11),
  tamthang: tamThang,
  baisau: () => coastalPark(300, 82, 11, 'bai-sau-park'),
  baitruoc: () => coastalPark(158, 58, 7, 'bai-truoc-park'),
  honba: honBa,
  baidau: baiDau,
  hoanghon: sunsetSlope,
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
