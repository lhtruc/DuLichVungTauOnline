import * as THREE from 'three';

const M = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

/** A little Vietnamese scooter with its rider. Origin on the ground between the wheels, +Z = forward. */
export function buildScooter(color = 0xe2483d) {
  const g = new THREE.Group();
  const body = M(color), dark = M(0x1c1d21), chrome = M(0xb9c0c8), seat = M(0x2a2420), skin = M(0xe0b08a);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = g) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
  };
  // wheels
  const wheelGeo = new THREE.TorusGeometry(0.24, 0.085, 8, 18);
  const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.07, 12);
  const wheels = [];
  for (const z of [0.62, -0.6]) {
    const w = new THREE.Group(); w.position.set(0, 0.32, z); g.add(w);
    add(wheelGeo, dark, 0, 0, 0, 0, Math.PI / 2, 0, w);
    add(hubGeo, chrome, 0, 0, 0, 0, 0, Math.PI / 2, w);
    wheels.push(w);
  }
  // floorboard, body shell, front shield
  add(new THREE.BoxGeometry(0.34, 0.07, 0.62), dark, 0, 0.36, 0.08);
  add(new THREE.BoxGeometry(0.4, 0.34, 0.78), body, 0, 0.6, -0.48);
  add(new THREE.BoxGeometry(0.36, 0.1, 0.4), body, 0, 0.5, -0.86, 0.3);
  add(new THREE.BoxGeometry(0.42, 0.62, 0.1), body, 0, 0.72, 0.44, -0.28);
  add(new THREE.BoxGeometry(0.3, 0.1, 0.36), body, 0, 0.5, 0.64, 0.1);           // front mudguard
  add(new THREE.BoxGeometry(0.36, 0.09, 0.74), seat, 0, 0.82, -0.44);            // seat
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 8), chrome, 0, 0.62, 0.56, -0.3); // fork
  add(new THREE.BoxGeometry(0.3, 0.2, 0.16), body, 0, 1.06, 0.36, -0.2);         // headlight cowl
  const lamp = add(new THREE.CircleGeometry(0.075, 12), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }), 0, 1.06, 0.45, -0.2);
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.64, 6), dark, 0, 1.14, 0.3, 0, 0, Math.PI / 2);  // handlebar
  for (const x of [-0.34, 0.34]) add(new THREE.BoxGeometry(0.1, 0.07, 0.02), chrome, x, 1.26, 0.3); // mirrors
  add(new THREE.BoxGeometry(0.16, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0xff3020 }), 0, 0.66, -0.88); // tail light
  add(new THREE.BoxGeometry(0.2, 0.11, 0.01), M(0xf4f4f0), 0, 0.5, -0.94);        // plate

  // rider
  const rider = new THREE.Group(); g.add(rider);
  const shirt = M(0xf5f1e6), pants = M(0x2c3b55), helmet = M(0xf2c230);
  add(new THREE.CapsuleGeometry(0.17, 0.36, 4, 10), shirt, 0, 1.22, -0.3, 0.12, 0, 0, rider);   // torso
  add(new THREE.SphereGeometry(0.115, 12, 10), skin, 0, 1.6, -0.24, 0, 0, 0, rider);            // head
  const hm = add(new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), helmet, 0, 1.62, -0.25, -0.1, 0, 0, rider);
  add(new THREE.BoxGeometry(0.2, 0.02, 0.1), helmet, 0, 1.63, -0.11, 0, 0, 0, rider);           // visor
  for (const sx of [-1, 1]) {
    add(new THREE.CapsuleGeometry(0.05, 0.42, 3, 6), shirt, sx * 0.24, 1.26, 0.0, -1.05, 0, sx * 0.18, rider);   // arm
    add(new THREE.CapsuleGeometry(0.075, 0.36, 3, 6), pants, sx * 0.15, 0.88, -0.12, -1.25, 0, 0, rider);        // thigh
    add(new THREE.CapsuleGeometry(0.06, 0.36, 3, 6), pants, sx * 0.16, 0.62, 0.12, -0.15, 0, 0, rider);          // shin
    add(new THREE.BoxGeometry(0.09, 0.06, 0.22), dark, sx * 0.16, 0.42, 0.18, 0, 0, 0, rider);                   // shoe
  }
  g.userData = { wheels, lamp, helmet: hm, body };
  return g;
}
