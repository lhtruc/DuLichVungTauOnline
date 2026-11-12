import * as THREE from 'three';
import { setGeo, ll2xz, xz2ll, bearingDeg } from './core/geo.js';
import { U, quality } from './core/shared.js';
import { isTouch, fmtKm } from './core/util.js';
import { Input } from './core/input.js';
import { Terrain } from './world/terrain.js';
import { buildGroundCanvas, groundTexture } from './world/groundmap.js';
import { buildSea } from './world/sea.js';
import { buildSky, Environment } from './world/sky.js';
import { Route } from './world/route.js';
import { buildRouteRoad } from './world/road.js';
import { buildBuildings } from './world/buildings.js';
import { buildForest, buildRoadsideTrees } from './world/vegetation.js';
import { buildLandmarks } from './world/landmarks.js';
import { buildScooter } from './player/scooter.js';
import { Rider } from './player/rider.js';
import { CameraRig } from './player/camera.js';
import { POIS } from './data/pois.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
quality.set(params.get('q') || (isTouch ? 'low' : 'high'));

const setLoad = (f, txt) => { $('#loadbar i').style.width = Math.round(f * 100) + '%'; if (txt) $('#loadtxt').textContent = txt; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
// Some static hosts refuse .bin files; the same bytes are then published under a .wasm name.
const bin = async (url, T) => {
  let r = await fetch(url).catch(() => null);
  if (!r || !r.ok) r = await fetch(url.replace(/\.bin$/, '.wasm'));
  return new T(await r.arrayBuffer());
};

async function boot() {
  setLoad(0.05, 'Đang tải bản đồ Vũng Tàu…');
  const [world, hU16, cover, bI16] = await Promise.all([
    fetch('./data/world.json').then((r) => r.json()),
    bin('./data/terrain.bin', Uint16Array), bin('./data/cover.bin', Uint8Array), bin('./data/buildings.bin', Int16Array),
  ]);
  setGeo(world.meta);
  setLoad(0.3, 'Đang dựng địa hình Núi Lớn, Núi Nhỏ…'); await nextFrame();

  const canvas = $('#c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !quality.low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pick(1.25, 1.5, 2)));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 30000);
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();

  const terrain = new Terrain(world.meta, hU16, cover);
  const route = new Route(world.route);
  const sky = buildSky(); scene.add(sky);
  const env = new Environment(scene, sky);
  env.setHour(parseFloat(params.get('t') || '16.6'));

  const ground = buildGroundCanvas(world, terrain, bI16, quality.pick(2048, 4096, 4096));
  scene.add(terrain.buildMesh(groundTexture(ground, renderer)));
  scene.add(buildSea(terrain));
  setLoad(0.5, 'Đang trải nhựa đường Trần Phú → Thùy Vân…'); await nextFrame();
  scene.add(buildRouteRoad(route));
  setLoad(0.62, 'Đang xây ' + (bI16.length / 8).toLocaleString('vi') + ' ngôi nhà…'); await nextFrame();
  scene.add(buildBuildings(bI16, world.bpolys, route));
  setLoad(0.8, 'Đang trồng dừa và phủ rừng…'); await nextFrame();
  scene.add(buildForest(terrain, route));
  scene.add(buildRoadsideTrees(route, terrain));

  // points of interest: world position + nearest spot on the route
  const pois = POIS.map((p) => {
    const [x, z] = ll2xz(p.lat, p.lon);
    const pr = route.project(x, z);
    return { ...p, x, z, s: pr.s, y: terrain.heightAt(x, z) };
  }).sort((a, b) => a.s - b.s);
  const lm = buildLandmarks(pois, terrain); scene.add(lm.group);

  const bike = buildScooter(); scene.add(bike);
  const rider = new Rider(route, bike);
  rider.teleport(parseFloat(params.get('s') || '40'));
  const rig = new CameraRig(camera, terrain);
  rig.yaw = rider.heading;
  const input = new Input(canvas);
  setLoad(1, 'Sẵn sàng!');

  // ---------------------------------------------------------------- UI
  const labels = pois.map((p) => { const el = document.createElement('div'); el.className = 'lbl'; $('#labels').appendChild(el); return el; });
  $('#ticks').innerHTML = pois.map((p) => `<i style="left:${(p.s / route.length * 100).toFixed(2)}%" title="${p.name}"></i>`).join('');
  $('#stops').innerHTML = pois.map((p, i) => `<div data-i="${i}"><span>${p.icon} ${p.name}</span><small>km ${(p.s / 1000).toFixed(1)}</small></div>`).join('');
  let visiting = null;
  const card = $('#card');
  function svUrl() {
    const [lat, lon] = xz2ll(rider.pos.x, rider.pos.z);
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat.toFixed(6)},${lon.toFixed(6)}&heading=${Math.round(bearingDeg(rider.fwd.x, rider.fwd.z))}`;
  }
  function visit(p) {
    visiting = p; rider.autoPaused = true;
    const c = new THREE.Vector3(p.x, p.y + (p.view[2] > 40 ? 10 : p.view[2] * 0.45), p.z);
    rig.showcase(c, p.view[0], p.view[1], p.view[2]);
    card.innerHTML = `<div class="tag">${p.tag}</div><h2>${p.icon} ${p.name}</h2><p>${p.text}</p><ul>${p.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
      <div class="row"><button id="leave">Tiếp tục hành trình</button>
      <a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}">Google Maps ↗</a></div>`;
    card.hidden = false;
    $('#leave').onclick = leave;
  }
  function leave() { if (!visiting) return; visiting = null; card.hidden = true; rider.autoPaused = false; rig.setMode('chase'); rig.mode = 'chase'; }
  const TIMES = [16.6, 17.55, 20.5, 6.1, 10.5];
  let timeIdx = 0;
  const act = {
    auto() { rider.auto = !rider.auto; rider.autoPaused = false; document.querySelector('[data-act=auto]').classList.toggle('on', rider.auto); },
    turn() { rider.turnAround(); },
    cam() { leave(); rig.setMode(rig.mode === 'chase' ? 'first' : 'chase'); },
    fly() { leave(); rig.setMode(rig.mode === 'fly' ? 'chase' : 'fly'); document.querySelector('[data-act=fly]').classList.toggle('on', rig.mode === 'fly'); },
    time() { timeIdx = (timeIdx + 1) % TIMES.length; env.setHour(TIMES[timeIdx]); },
    stops() { $('#stops').hidden = !$('#stops').hidden; },
  };
  $('#btns').addEventListener('click', (e) => { const a = e.target.dataset.act; if (a) act[a](); });
  for (const ev of ['pointerdown', 'mouseenter', 'focus']) $('#sv').addEventListener(ev, () => { $('#sv').href = svUrl(); });
  $('#stops').addEventListener('click', (e) => {
    const d = e.target.closest('[data-i]'); if (!d) return;
    const p = pois[+d.dataset.i]; leave(); rider.teleport(Math.max(5, p.s - 60), 1); rig.yaw = rider.heading; rig.yawOff = 0; $('#stops').hidden = true;
  });
  for (const b of document.querySelectorAll('#pad button')) {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { input.touch[k] = true; e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { input.touch[k] = false; });
  }
  $('#start').disabled = false;
  const start = () => { $('#intro').classList.add('hide'); $('#hud').hidden = false; };
  $('#start').onclick = start;
  if (params.has('nointro')) start();

  // ---------------------------------------------------------------- loop
  const clock = new THREE.Clock();
  const v3 = new THREE.Vector3();
  let near = null;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    U.uTime.value += dt;
    if (input.hit('KeyT')) act.auto();
    if (input.hit('KeyR')) act.turn();
    if (input.hit('KeyC')) act.cam();
    if (input.hit('KeyF')) act.fly();
    if (input.hit('KeyN')) act.time();
    if (input.hit('KeyE') && rig.mode !== 'fly') { if (visiting) leave(); else if (near) visit(near); }
    if (input.hit('Escape')) leave();
    const ax = input.axis();
    if (rig.mode === 'fly' || visiting) rider.update(dt, { fwd: 0, steer: 0, boost: false, brake: false });
    else { if (ax.fwd !== 0 && visiting) leave(); rider.update(dt, ax); }
    rig.update(dt, input, rider);
    env.follow(rider.pos);
    for (const t of lm.ticks) t(U.uTime.value);

    // HUD
    const sec = route.sections[route.sectionIndex(rider.s)];
    $('#street').textContent = sec.name;
    $('#speed b').textContent = Math.round(rider.kmh);
    $('#barfill').style.width = (rider.s / route.length * 100).toFixed(2) + '%';
    near = null; let ahead = null;
    for (const p of pois) {
      const d = (p.s - rider.s) * rider.dir;
      if (Math.abs(p.s - rider.s) < 130) near = !near || Math.abs(p.s - rider.s) < Math.abs(near.s - rider.s) ? p : near;
      if (d > 130 && (!ahead || d < (ahead.s - rider.s) * rider.dir)) ahead = p;
    }
    $('#next').innerHTML = visiting ? '' : near ? `<b>${near.icon} ${near.name}</b> — nhấn <b>E</b> hoặc <a href="#" id="go" style="color:#ffd2b8">chạm để tham quan</a>`
      : ahead ? `Sắp tới: ${ahead.icon} ${ahead.name} · ${fmtKm(Math.abs(ahead.s - rider.s))}` : (rider.atEnd ? '🏁 Hết đường Thùy Vân — nhấn R để quay đầu' : '');
    const go = document.getElementById('go'); if (go) go.onclick = (e) => { e.preventDefault(); if (near) visit(near); };
    // floating labels
    pois.forEach((p, i) => {
      const el = labels[i];
      v3.set(p.x, p.y + (p.model ? 40 : 14), p.z);
      const dist = v3.distanceTo(camera.position);
      v3.project(camera);
      if (v3.z > 1 || dist > 2600 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) { el.style.display = 'none'; return; }
      el.style.display = ''; el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
      el.innerHTML = `${p.icon} ${p.name}<small>${fmtKm(dist)}</small>`;
    });
    input.endFrame();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  window.__app = { rider, rig, env, route, pois, visit, leave, act, scene, renderer, camera };
  frame();
}

boot().catch((e) => { console.error(e); $('#loadtxt').textContent = 'Lỗi tải: ' + e.message; });
