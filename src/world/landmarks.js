import * as THREE from 'three';
import { U } from '../core/shared.js';
import { rng } from '../core/util.js';

// Every builder returns a Group whose +Z axis faces the sea and whose origin sits on the ground.
const L = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const add = (g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};

/** Text sign as a canvas texture. */
function signMesh(text, w, h, bg, fg, font = 'bold 76px system-ui, sans-serif') {
  if (typeof document === 'undefined') return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: bg }));
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
  const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, cv.width / 2, cv.height / 2 + 4, cv.width - 30);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

/** Tube with a varying radius along a curve (whale bodies, statues). */
function sweep(points, radii, radial = 16, segs = 48, flatten = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = curve.getPointAt(t);
    const f = t * (radii.length - 1), k = Math.min(Math.floor(f), radii.length - 2), r = radii[k] + (radii[k + 1] - radii[k]) * (f - k);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(c.x + (N.x * Math.cos(a) * flatten + B.x * Math.sin(a)) * r, c.y + (N.y * Math.cos(a) * flatten + B.y * Math.sin(a)) * r, c.z + (N.z * Math.cos(a) * flatten + B.z * Math.sin(a)) * r);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function water(r) {
  return new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x2f9fc4, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.88 }));
}

function fountainJets(g, n, ringR, h, y0) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0.55, depthWrite: false });
  const jets = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const j = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1, 6, 1, true).translate(0, 0.5, 0), mat);
    j.position.set(Math.cos(a) * ringR, y0, Math.sin(a) * ringR); g.add(j); jets.push(j);
  }
  return (t) => jets.forEach((j, i) => { j.scale.set(1, h * (0.65 + 0.35 * Math.sin(t * 2.2 + i * 0.9)), 1); });
}

// ---------------------------------------------------------------- Bãi Sau
/** Checker paving texture (the squares at Bãi Sau use big two-tone checkerboards). */
function checker(c1, c2, n = 16) {
  if (typeof document === 'undefined') return L(c1);
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d'), s = 256 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.fillStyle = (i + j) % 2 ? c2 : c1; c.fillRect(i * s, j * s, s, s); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshLambertMaterial({ map: tex });
}

/**
 * Tháp Tam Thắng (photos: VnExpress 30/8/2025): 143 white square pillars stacked into a symmetric
 * pyramid — tallest (34.25 m) in the middle, stepping down to 4.55 m at both ends and toward the land —
 * with a stage in front, a black-and-white checkered square with ground lights, magenta LEDs at night.
 */
function tamthang() {
  const g = new THREE.Group(), r = rng(143);
  const sq = checker('#2d2f33', '#e9e6df', 24);
  sq.map && sq.map.repeat.set(9, 3);
  add(g, new THREE.BoxGeometry(150, 4, 56), sq, 0, -1.75, -4);           // square on a sea wall
  // stage on the land side of the tower
  add(g, new THREE.BoxGeometry(30, 1.2, 9), L(0x8a3b3b), 0, 0.6, -14);
  for (let k = 0; k < 3; k++) add(g, new THREE.BoxGeometry(18 - k * 3, 0.3, 1.2), L(0xb04a4a), 0, 0.15 + k * 0.3, -19.4 + k * 1.2);
  // 13 columns across x 11 rows toward the sea = 143 pillars
  const items = [];
  const NX = 13, NZ = 11;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const xn = (i - (NX - 1) / 2) / ((NX - 1) / 2);           // -1..1 across
    const zn = j / (NZ - 1);                                   // 0 land .. 1 sea
    const x = xn * 26 + (r() - 0.5) * 0.8, z = -8 + zn * 18 + (r() - 0.5) * 0.6;
    const peak = Math.pow(1 - Math.abs(xn), 1.15) * (0.45 + 0.55 * Math.sin(zn * Math.PI * 0.85 + 0.25));
    const h = 4.55 + (34.25 - 4.55) * peak * (0.96 + r() * 0.04);
    items.push({ x, z, h, w: 0.9 + r() * 0.7 });
  }
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mat = L(0xffffff);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight; sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLed;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLed = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight, uTime;\nvarying vec3 vLed;')
      .replace('#include <map_fragment>', `
        vec2 tq = floor(vec2(vLed.x + vLed.z, vLed.y) / 0.3);
        float hh = fract(sin(dot(tq, vec2(12.9898, 78.233))) * 43758.5453);
        diffuseColor.rgb *= mix(vec3(0.97, 0.97, 0.96), vec3(0.86, 0.88, 0.9), step(0.7, hh));`)
      .replace('#include <emissivemap_fragment>', `
        float pulse = 0.75 + 0.25 * sin(uTime * 1.3 + vLed.y * 0.15);
        totalEmissiveRadiance += mix(vec3(0.85, 0.15, 0.75), vec3(0.55, 0.2, 1.0), 0.5 + 0.5 * sin(uTime * 0.4)) * uNight * pulse;`);
  };
  const inst = new THREE.InstancedMesh(geo, mat, items.length);
  const m4 = new THREE.Matrix4();
  items.forEach((it, i) => inst.setMatrixAt(i, m4.makeScale(it.w, it.h, it.w).setPosition(it.x, 0.25, it.z)));
  inst.castShadow = true; g.add(inst);
  // ground lights in the square
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.25, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), 120);
  for (let i = 0; i < 120; i++) dots.setMatrixAt(i, m4.makeTranslation(-60 + (i % 20) * 6.3, 0.27, -28 + Math.floor(i / 20) * 2.6));
  g.add(dots);
  g.userData.tick = () => { dots.visible = U.uNight.value > 0.3; };
  return g;
}

/**
 * Cá Ông (photos: VnExpress/Dân trí 3/2/2026): a patina-green bronze humpback whale, 8.8 m tall, rising
 * diagonally out of curling wave sculptures, in a round dark pool ringed with jets, on a blue-and-white
 * checkered round square.
 */
function caong() {
  const g = new THREE.Group();
  const sq = checker('#2f5d9a', '#eef0f2', 20);
  sq.map && sq.map.repeat.set(3, 3);
  add(g, new THREE.CylinderGeometry(27, 27, 4, 48), sq, 0, -1.75, 0);
  add(g, new THREE.CylinderGeometry(12.6, 12.6, 0.55, 48), L(0x9aa3a8), 0, 0.27, 0);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(12, 48).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x23343d, specular: 0x88aabb, shininess: 80 }));
  pool.position.y = 0.5; g.add(pool);
  const bronze = new THREE.MeshPhongMaterial({ color: 0x46766c, specular: 0x9cc7b8, shininess: 30 });
  // curling wave base
  add(g, new THREE.CylinderGeometry(3.6, 4.4, 2.2, 18), bronze, 0, 1.4, 0);
  const curls = [[-2.2, 2.6, 1.2, 1.5, 0.6], [2.0, 2.4, 0.8, 1.3, -0.5], [0.2, 3.4, -1.4, 1.7, 2.6], [-1.0, 4.6, 0.6, 1.2, 1.2], [1.4, 3.9, 1.7, 1.0, -1.9]];
  for (const [x, y, z, rad, ry] of curls) add(g, new THREE.TorusGeometry(rad, rad * 0.32, 8, 20, Math.PI * 1.55), bronze, x, y, z, 0, ry, 0.3);
  // humpback rising diagonally: tail down in the waves, head up and forward
  const spine = [[0, 2.0, -2.6], [0, 3.4, -1.8], [0, 5.0, -0.6], [0, 6.6, 0.8], [0, 7.9, 2.2], [0, 8.6, 3.4], [0, 8.8, 4.2]];
  add(g, sweep(spine, [0.35, 1.0, 1.55, 1.7, 1.45, 0.95, 0.2], 18, 60, 0.82), bronze, 0, 0, 0);
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(1, 14, 8).scale(0.9, 0.12, 2.6), bronze, s * 1.9, 6.0, 1.6, -0.5, s * 0.55, s * 0.5);  // long pectoral fins
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(1, 12, 8).scale(1.6, 0.16, 0.6), bronze, s * 1.2, 2.0, -3.0, 0.2, s * 0.5, s * 0.3); // flukes in the waves
  const jets = fountainJets(g, 28, 11, 1.8, 0.5);
  g.userData.tick = jets;
  return g;
}

// ---------------------------------------------------------------- Núi Nhỏ
function rockMat() { return L(0x8a8378); }
function rock(g, r, x, y, z, s, seed) {
  const k = rng(seed);
  const m = add(g, new THREE.DodecahedronGeometry(s, 0), r, x, y, z, k() * 3, k() * 3, k() * 3);
  m.scale.set(1, 0.6 + k() * 0.5, 0.8 + k() * 0.4);
  return m;
}

/** Hòn Bà: rocky islet, Miếu Hòn Bà (1781) with its two-pillar tiled gate. Causeway added in buildLandmarks. */
function honba() {
  const g = new THREE.Group(), rm = rockMat();
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2, d = 9 + (i % 3) * 3;
    rock(g, rm, Math.cos(a) * d, 0.2, Math.sin(a) * d, 2.2 + (i % 4) * 0.8, i + 7);
  }
  add(g, new THREE.CylinderGeometry(9, 12, 3.2, 12), L(0x7d776c), 0, 1.1, 0);
  for (let i = 0; i < 7; i++) add(g, new THREE.IcosahedronGeometry(1.6, 0), L(0x4f7d3e), Math.cos(i) * 6.5, 3.2, Math.sin(i * 1.7) * 6.5);
  const wall = L(0xf2d27a), roof = L(0xb5482c), wood = L(0x8c2e22);
  const top = 2.7;
  // main hall
  add(g, new THREE.BoxGeometry(6, 3, 4.6), wall, 0, top + 1.5, -1.5);
  const roofShape = new THREE.Shape([new THREE.Vector2(-3.8, 0), new THREE.Vector2(3.8, 0), new THREE.Vector2(0, 2.0)]);
  const rg = new THREE.ExtrudeGeometry(roofShape, { depth: 5.8, bevelEnabled: false }).translate(0, 0, -2.9);
  add(g, rg, roof, 0, top + 3, -1.5);
  add(g, new THREE.BoxGeometry(1.6, 2.1, 0.1), wood, 0, top + 1.05, 0.81);
  // "lưỡng long chầu nhật" on the ridge: a red sun disc between two curled ridge ends
  add(g, new THREE.SphereGeometry(0.35, 10, 8), L(0xe23b2b), 0, top + 5.2, -1.5);
  for (const s of [-1, 1]) add(g, new THREE.TorusGeometry(0.5, 0.12, 6, 12, Math.PI * 1.3), L(0x3f8a5a), s * 1.6, top + 5.1, -1.5, 0, 0, s * 0.8);
  // gate: two pillars carrying a small tiled roof
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.5, 3.2, 0.5), L(0xe8e2d4), s * 1.5, top + 1.6, 4.5);
  add(g, new THREE.BoxGeometry(4.4, 0.25, 1.4), roof, 0, top + 3.3, 4.5);
  add(g, new THREE.BoxGeometry(3.2, 0.5, 0.15), signMesh('MIẾU HÒN BÀ', 3.2, 0.5, '#8c2e22', '#ffd36a', 'bold 64px serif').material, 0, top + 2.8, 4.58);
  return g;
}

/** Mũi Nghinh Phong: rugged cape tip with the "Cổng Trời" stone gate looking out to sea. */
function nghinhphong() {
  const g = new THREE.Group(), rm = rockMat();
  for (let i = 0; i < 18; i++) rock(g, rm, (i % 6 - 2.5) * 3.2, -0.6, Math.floor(i / 6) * 3 - 3, 2 + (i % 3), 40 + i);
  const stone = L(0x9b9284);
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) add(g, new THREE.DodecahedronGeometry(0.9 - k * 0.06, 0), stone, s * 1.9 + (k % 2) * 0.15, 1.2 + k * 1.15, 3, k, k * 2, 0);
  add(g, new THREE.BoxGeometry(5.6, 0.9, 1.4), stone, 0, 5.8, 3, 0, 0, 0.04);
  g.scale.setScalar(1.6);
  return g;
}

// ---------------------------------------------------------------- statues
function christ() {
  const g = new THREE.Group(), m = L(0xf1efe8);
  add(g, new THREE.CylinderGeometry(5.5, 6.5, 4, 8), L(0xd8d2c4), 0, 2, 0);
  const robe = new THREE.LatheGeometry([[0, 0], [3.4, 0], [3.0, 6], [2.5, 14], [2.2, 20], [2.6, 23.2], [1.2, 24.6], [0, 24.6]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  add(g, robe, m, 0, 4, 0);
  add(g, new THREE.SphereGeometry(1.5, 14, 12), m, 0, 30.3, 0).scale.set(1, 1.2, 1);
  for (const sx of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.75, 1.15, 7.2, 8), m, sx * 5.4, 26.6, 0, 0, 0, sx * (Math.PI / 2 - 0.08));
    add(g, new THREE.BoxGeometry(2.6, 3.8, 0.7), m, sx * 4.6, 24.6, 0);
    add(g, new THREE.SphereGeometry(0.7, 8, 6), m, sx * 9.2, 26.9, 0);
  }
  return g;
}

/** Đức Mẹ Bãi Dâu: 32 m white stone statue holding the Child Jesus up toward the sea. */
function ducme() {
  const g = new THREE.Group(), m = L(0xf4f2ec);
  add(g, new THREE.CylinderGeometry(4.2, 5, 3, 10), L(0xd9d2c2), 0, 1.5, 0);
  const robe = new THREE.LatheGeometry([[0, 0], [3.0, 0], [2.7, 6], [2.2, 13], [1.9, 18], [2.2, 21.5], [1.1, 23], [0, 23]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
  add(g, robe, m, 0, 3, 0);
  add(g, new THREE.SphereGeometry(1.2, 14, 12), m, 0, 27.2, 0.1).scale.set(1, 1.15, 1);
  add(g, new THREE.LatheGeometry([[0, 0], [2.0, 0], [1.5, 2.5], [1.25, 4.6], [0, 5.2]].map(([x, y]) => new THREE.Vector2(x, y)), 14), m, 0, 23, -0.3); // veil
  // arms raised, lifting the Child above her head
  for (const s of [-1, 1]) add(g, new THREE.CapsuleGeometry(0.55, 5.2, 4, 8), m, s * 1.6, 27.4, 0.7, 0.3, 0, s * -0.35);
  add(g, new THREE.CapsuleGeometry(0.75, 1.6, 4, 8), m, 0, 30.7, 1.4, 0.2, 0, 0);
  add(g, new THREE.SphereGeometry(0.6, 10, 8), m, 0, 32.0, 1.6);
  for (const s of [-1, 1]) add(g, new THREE.CapsuleGeometry(0.22, 1.2, 3, 6), m, s * 0.75, 31.6, 1.6, 0, 0, s * -0.9);
  return g;
}

function statue(h) {
  const g = new THREE.Group(), m = L(0xf4f2ec);
  add(g, new THREE.CylinderGeometry(h * 0.16, h * 0.2, h * 0.14, 10), L(0xd9d2c2), 0, h * 0.07, 0);
  add(g, new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.11, 0.3], [0.085, 0.58], [0.1, 0.7], [0.045, 0.76], [0, 0.76]].map(([x, y]) => new THREE.Vector2(x * h, y * h)), 12), m, 0, h * 0.14, 0);
  add(g, new THREE.SphereGeometry(h * 0.055, 12, 10), m, 0, h * 0.95, 0);
  return g;
}

function lighthouse() {
  const g = new THREE.Group(), m = L(0xf1efe8);
  add(g, new THREE.BoxGeometry(14, 4, 9), m, 0, 2, 0);
  add(g, new THREE.CylinderGeometry(1.5, 2.1, 15, 16), m, 0, 9.5, 0);
  add(g, new THREE.CylinderGeometry(2.5, 2.5, 0.4, 16), L(0x8a8f96), 0, 17, 0);
  const lamp = add(g, new THREE.CylinderGeometry(1.2, 1.2, 2, 12), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }), 0, 18.2, 0);
  add(g, new THREE.ConeGeometry(1.6, 1.4, 12), L(0xb23a2e), 0, 19.9, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Group(); beam.position.y = 18.2; g.add(beam);
  for (const s of [1, -1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(14, 420, 12, 1, true), beamMat); c.rotation.z = s * Math.PI / 2; c.position.x = -s * 210; beam.add(c); }
  g.userData.tick = (t) => { beam.rotation.y = t * 0.5; beamMat.opacity = 0.16 * U.uNight.value; lamp.material.color.setHex(U.uNight.value > 0.4 ? 0xfff2b0 : 0xd8e4ea); };
  return g;
}

// ---------------------------------------------------------------- cafés & restaurants
function umbrellas(g, n, x0, z0, dx, color) {
  for (let i = 0; i < n; i++) {
    add(g, new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5), L(0xdddddd), x0 + i * dx, 1.2, z0);
    add(g, new THREE.ConeGeometry(1.4, 0.6, 8), L(color), x0 + i * dx, 2.5, z0);
    add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.7, 10), L(0xf5f0e6), x0 + i * dx, 0.35, z0);
  }
}

/** Gành Hào: big seafood restaurant with sea-facing terraces. */
function ganhhao() {
  const g = new THREE.Group();
  const wall = L(0xf3efe6), glass = L(0x2c4250), roof = L(0x2e5d8a);
  add(g, new THREE.BoxGeometry(30, 0.6, 18), L(0xcfc6b5), 0, 0.3, 0);
  add(g, new THREE.BoxGeometry(26, 4, 10), wall, 0, 2.6, -3);
  add(g, new THREE.BoxGeometry(24, 2.4, 0.1), glass, 0, 2.8, 2.06);
  add(g, new THREE.BoxGeometry(28, 0.4, 14), wall, 0, 4.8, -1);           // upper terrace floor
  for (let i = -3; i <= 3; i++) add(g, new THREE.BoxGeometry(0.4, 4.2, 0.4), wall, i * 4.2, 2.6, 5.6);
  add(g, new THREE.BoxGeometry(28, 1.0, 0.1), L(0xffffff, { transparent: true, opacity: 0.6 }), 0, 5.5, 5.9);
  add(g, new THREE.BoxGeometry(20, 3.2, 8), wall, 0, 6.6, -4);
  add(g, new THREE.BoxGeometry(22, 0.5, 10), roof, 0, 8.4, -4);
  const sign = signMesh('GÀNH HÀO', 10, 1.8, '#1f4f7a', '#ffffff');
  sign.position.set(0, 9.6, 0.4); g.add(sign);
  umbrellas(g, 5, -10, 3, 5, 0xe8e2d0);
  return g;
}

/** Soho Coffee: small white café on Hạ Long, facing the sea across the road. */
function soho() {
  const g = new THREE.Group();
  const wall = L(0xfafaf7);
  add(g, new THREE.BoxGeometry(12, 0.4, 11), L(0xd7cfc2), 0, 0.2, 0);
  add(g, new THREE.BoxGeometry(10, 3.4, 7), wall, 0, 2.1, -1.5);
  add(g, new THREE.BoxGeometry(8.6, 2.2, 0.1), L(0x3a4a52), 0, 1.9, 2.02);
  add(g, new THREE.BoxGeometry(10.4, 0.3, 7.4), wall, 0, 3.95, -1.5);
  add(g, new THREE.BoxGeometry(7, 2.6, 5), wall, -1, 5.4, -2.5);
  add(g, new THREE.BoxGeometry(10.4, 0.8, 0.12), wall, 0, 4.5, 2.0);
  const sign = signMesh('SOHO COFFEE', 6, 1.0, '#ffffff', '#111111');
  sign.position.set(0, 4.5, 2.1); g.add(sign);
  umbrellas(g, 3, -3.5, 4, 3.5, 0xf4f4f4);
  return g;
}

// ---------------------------------------------------------------- shoreline & park entrances
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

/** Lookout on Dốc Hoàng Hôn: a small railed deck on the hillside facing the sunset; the slope itself is the terrain. */
function sunsetSlope() {
  const g = new THREE.Group(); g.name = 'doc-hoang-hon-nghinh-phong';
  const deck = L(0xcfc4b2), rail = L(0xf2eee6), red = L(0xb74b3c);
  add(g, new THREE.BoxGeometry(10, 3, 6), deck, 0, -0.9, 0);
  for (let i = -4; i <= 4; i++) add(g, new THREE.BoxGeometry(0.16, 1.1, 0.16), rail, i * 1.2, 1.15, 2.9);
  add(g, new THREE.BoxGeometry(10, 0.14, 0.14), rail, 0, 1.7, 2.9);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.14, 0.14, 5.8), rail, s * 4.95, 1.7, 0);
  add(g, new THREE.BoxGeometry(2.6, 0.12, 0.6), red, 0, 1.0, 1.2);   // bench
  return g;
}

/** Entrance sign of a seafront park; the park itself is laid along the road by world/parks.js. */
function parkGate(name) {
  return () => {
    const g = new THREE.Group(); g.name = name;
    const stone = L(0xe9e3d6), lamp = L(0x3b424c);
    add(g, new THREE.BoxGeometry(9, 1.6, 1.2), stone, 0, 0.8, 0);
    const label = signMesh(name, 8.4, 1.1, '#f4efe4', '#1f4f5f', 'bold 58px system-ui, sans-serif');
    label.position.set(0, 0.85, 0.62); g.add(label);
    for (const s of [-1, 1]) {
      add(g, new THREE.CylinderGeometry(0.08, 0.12, 4.2, 6), lamp, s * 5.5, 2.1, 0);
      add(g, new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }), s * 5.5, 4.3, 0);
    }
    return g;
  };
}

const BUILDERS = {
  baidau: baiDau, hoanghon: sunsetSlope,
  baisau: parkGate('CÔNG VIÊN BÃI SAU'), baitruoc: parkGate('CÔNG VIÊN BÃI TRƯỚC'),
  tamthang, caong, honba, nghinhphong, christ, ducme, lighthouse, ganhhao, soho,
  quanam: () => statue(16), thichca: () => statue(11),
};

/** Places landmark models at their real coordinates, front facing the sea; returns { group, ticks }. */
export function buildLandmarks(pois, terrain, route) {
  const group = new THREE.Group(); group.name = 'landmarks';
  const ticks = [];
  const f = {};
  for (const p of pois) {
    const b = BUILDERS[p.model]; if (!b) continue;
    const obj = b();
    const fr = route ? route.at(p.s || 0, f) : null;
    if (fr) obj.rotation.y = Math.atan2(fr.right.x * route.seaSide, fr.right.z * route.seaSide);  // front toward the sea
    const ground = terrain.heightAt(p.x, p.z);
    obj.position.set(p.x, Math.max(ground, 0.2) - 0.25, p.z);
    group.add(obj);
    if (obj.userData.tick) ticks.push(obj.userData.tick);
    if (p.model === 'honba' && fr) {
      // low-tide stone path from the islet back to Bãi Sau
      const rm = rockMat(), dx = fr.pos.x - p.x, dz = fr.pos.z - p.z, len = Math.hypot(dx, dz);
      const inst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rm, 160);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), k = rng(9);
      let n = 0, offIslet = false;
      for (let d = 12; d < len && n < 160; d += 1.6) {
        const x = p.x + dx / len * d + (k() - 0.5) * 2.4, z = p.z + dz / len * d + (k() - 0.5) * 2.4;
        const h = terrain.heightAt(x, z);
        if (h <= 0.6) offIslet = true;
        else if (offIslet) break;   // reached the Bãi Sau shore
        else continue;              // still on the islet
        q.setFromEuler(e.set(k() * 3, k() * 3, k() * 3));
        const s = 0.6 + k() * 0.7;
        inst.setMatrixAt(n++, m4.compose(new THREE.Vector3(x, -0.15, z), q, new THREE.Vector3(s * 1.3, s * 0.5, s)));
      }
      inst.count = n; inst.instanceMatrix.needsUpdate = true; group.add(inst);
    }
  }
  return { group, ticks };
}
