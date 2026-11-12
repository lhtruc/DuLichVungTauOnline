import * as THREE from 'three';
import { U, quality } from '../core/shared.js';
import { buildScooter } from '../player/scooter.js';
import { hash2 } from '../core/util.js';

/**
 * Builds dynamic coastal life along Vung Tau:
 * 1. Streetlamps along the 16.3 km route that automatically light up at sunset/night.
 * 2. AI traffic (local scooters and touring cars cruising both directions).
 * 3. Offshore fishing boats and cargo vessels anchored in Bãi Trước & Gành Rái bay.
 */
export function buildCoastalLife(route, terrain) {
  const group = new THREE.Group();
  group.name = 'coastal-life';

  // --- 1. Streetlights along the route (InstancedMesh with night glow) ---
  const lampPosts = [];
  const lampBulbs = [];
  const f = {};
  const step = quality.pick(72, 48, 36);
  for (let s = 30; s < route.length - 30; s += step) {
    const fr = route.at(s, f);
    // Sea-side promenade lamps
    const offR = fr.cw + 0.65;
    lampPosts.push({
      x: fr.pos.x + fr.right.x * offR,
      y: fr.pos.y,
      z: fr.pos.z + fr.right.z * offR,
      ry: Math.atan2(-fr.right.x, -fr.right.z)
    });
    // Dual carriageway median lamps on Quang Trung & Thùy Vân
    if (fr.med > 0.6) {
      lampPosts.push({
        x: fr.pos.x,
        y: fr.pos.y + 0.2,
        z: fr.pos.z,
        ry: Math.atan2(fr.right.x, fr.right.z)
      });
    }
  }

  const poleGeo = new THREE.CylinderGeometry(0.07, 0.11, 6.2, 6);
  poleGeo.translate(0, 3.1, 0);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3b424c });
  const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lampPosts.length);

  const bulbGeo = new THREE.SphereGeometry(0.24, 8, 6);
  bulbGeo.translate(0, 6.25, 0.35);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0x99a3ad });
  const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, lampPosts.length);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const vPos = new THREE.Vector3();
  const vScale = new THREE.Vector3(1, 1, 1);
  const eul = new THREE.Euler();

  lampPosts.forEach((it, idx) => {
    vPos.set(it.x, it.y, it.z);
    eul.set(0, it.ry, 0);
    q.setFromEuler(eul);
    m4.compose(vPos, q, vScale);
    poleInst.setMatrixAt(idx, m4);
    bulbInst.setMatrixAt(idx, m4);
  });
  poleInst.instanceMatrix.needsUpdate = true;
  bulbInst.instanceMatrix.needsUpdate = true;
  poleInst.matrixAutoUpdate = false;
  bulbInst.matrixAutoUpdate = false;
  group.add(poleInst, bulbInst);

  // --- 2. AI Traffic (Scooters + Compact Cars) ---
  const colors = [0x2ec4b6, 0xff9f1c, 0x3a86ff, 0xff595e, 0x8ac926, 0xf1faee, 0xe76f51];
  const nVehicles = quality.pick(14, 24, 34);
  const agents = [];

  function buildCarMesh(col) {
    const cg = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: col });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e242b });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x283848 });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6cc });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });

    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.62, 3.8), bodyMat);
    lower.position.y = 0.52;
    lower.castShadow = true;
    cg.add(lower);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.52, 2.0), glassMat);
    cabin.position.set(0, 1.02, -0.15);
    cg.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 1.85), bodyMat);
    roof.position.set(0, 1.29, -0.15);
    cg.add(roof);

    const wGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 12);
    wGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.82, 1.15], [0.82, 1.15], [-0.82, -1.15], [0.82, -1.15]]) {
      const w = new THREE.Mesh(wGeo, darkMat);
      w.position.set(wx, 0.3, wz);
      cg.add(w);
    }
    // Headlights & Taillights
    for (const sx of [-0.58, 0.58]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.05), headMat);
      hl.position.set(sx, 0.58, 1.91);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.05), tailMat);
      tl.position.set(sx, 0.62, -1.91);
      cg.add(hl, tl);
    }
    return cg;
  }

  for (let i = 0; i < nVehicles; i++) {
    const h = hash2(i, 41);
    const isCar = i % 4 === 0;
    const col = colors[i % colors.length];
    const mesh = isCar ? buildCarMesh(col) : buildScooter(col);
    mesh.rotation.order = 'YXZ';
    const dir = i % 2 === 0 ? 1 : -1;
    const s = ((i + 0.5) / nVehicles) * (route.length - 200) + 100;
    const speed = isCar ? (10.5 + h * 4.5) : (7.8 + h * 5.2);
    const laneFactor = 0.42 + (i % 3) * 0.16;
    group.add(mesh);
    agents.push({ mesh, s, dir, speed, laneFactor, isCar });
  }

  // --- 3. Offshore Fishing Boats & Ships in Bãi Trước / Bến Đá / Bãi Sau ---
  const boats = [];
  const boatAnchors = [
    [-820, -1450], [-960, -1120], [-740, -680], [-880, -320],
    [-640, 220], [-790, 560], [-520, 920], [-1150, -3400],
    [-1280, -3950], [1650, 2600], [2400, 1400], [3450, 120]
  ];
  const hullGeo = new THREE.BoxGeometry(2.6, 1.1, 8.5);
  const cabinGeo = new THREE.BoxGeometry(2.0, 1.4, 2.8);
  const hullMat = new THREE.MeshLambertMaterial({ color: 0x26547c });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0xef476f });
  const boatLightMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });

  boatAnchors.forEach(([bx, bz], idx) => {
    if (!terrain.inside(bx, bz) || terrain.heightAt(bx, bz) > -1.2) return;
    const bg = new THREE.Group();
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.35;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.25, 8.6), trimMat);
    trim.position.y = 0.85;
    const cab = new THREE.Mesh(cabinGeo, new THREE.MeshLambertMaterial({ color: 0xf8f9fa }));
    cab.position.set(0, 1.5, -1.0);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), boatLightMat);
    lantern.position.set(0, 2.6, 0.4);
    bg.add(hull, trim, cab, lantern);
    bg.position.set(bx, 0.15, bz);
    bg.rotation.y = hash2(idx, 99) * Math.PI * 2;
    group.add(bg);
    boats.push({ mesh: bg, phase: idx * 1.3, baseRot: bg.rotation.y });
  });

  const tf = {};
  function tick(dt, timeSec) {
    // Update streetlamp bulb glow at night
    const night = U.uNight ? U.uNight.value : 0;
    bulbMat.color.setHex(night > 0.15 ? 0xffd166 : 0x8d99ae);

    // Move AI vehicles along the route
    for (const a of agents) {
      a.s += a.speed * a.dir * dt;
      if (a.s > route.length - 25) a.s = 25;
      else if (a.s < 25) a.s = route.length - 25;
      const fr = route.at(a.s, tf);
      const latOffset = (fr.med > 0.2 ? fr.med + (fr.cw - fr.med) * a.laneFactor : fr.cw * a.laneFactor) * a.dir;
      a.mesh.position.copy(fr.pos).addScaledVector(fr.right, latOffset);
      a.mesh.position.y = fr.pos.y + 0.08;
      const yaw = Math.atan2(fr.fwd.x * a.dir, fr.fwd.z * a.dir);
      a.mesh.rotation.set(0, yaw, 0);
    }

    // Bobbing offshore boats
    for (const b of boats) {
      b.mesh.position.y = 0.12 + Math.sin(timeSec * 1.6 + b.phase) * 0.12;
      b.mesh.rotation.z = Math.sin(timeSec * 1.2 + b.phase) * 0.04;
    }
  }

  return { group, tick };
}
