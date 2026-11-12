import * as THREE from 'three';
import { hash2 } from '../core/util.js';

// cover classes from tools/build_world.py: 0 urban, 1 forest, 2 grass, 3 sand, 4 rock, 5 golf, 6 scrub
const COVER_RGB = [
  [176, 170, 156], [58, 104, 58], [118, 158, 84], [233, 215, 168], [142, 134, 122], [104, 176, 96], [108, 132, 78],
];
export const ROAD_W = [15, 12, 10, 7, 4.5, 6, 2.2];

/**
 * Paints the whole peninsula into one canvas: land cover, beaches, parks, lots and streets.
 * Used as the terrain albedo and (downscaled) as the minimap background.
 */
export function buildGroundCanvas(world, terrain, buildingsI16, size) {
  const { nx, nz } = terrain;
  const W = size, H = Math.round(size * terrain.depth / terrain.width);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // 1. land cover, one pixel per grid cell, upscaled smoothly
  const small = document.createElement('canvas');
  small.width = nx; small.height = nz;
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(nx, nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    const c = COVER_RGB[terrain.cover[k]] || COVER_RGB[0];
    const n = 0.92 + 0.16 * hash2(i, j);
    let r = c[0] * n, g = c[1] * n, b = c[2] * n;
    const h = terrain.h[k];
    if (terrain.cover[k] === 1) { // forest gets darker in the folds, lighter on ridges
      const s = (terrain.h[k + (i < nx - 1 ? 1 : 0)] - terrain.h[k - (i > 0 ? 1 : 0)]) * 0.02;
      r *= 1 - s; g *= 1 - s; b *= 1 - s;
    }
    if (h < 0) { r = 224; g = 208; b = 164; }
    img.data[k * 4] = r; img.data[k * 4 + 1] = g; img.data[k * 4 + 2] = b; img.data[k * 4 + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, nx, nz, -W / nx / 2, -H / nz / 2, W + W / nx, H + H / nz);

  const sx = W / terrain.width, sz = H / terrain.depth;
  const X = (x) => (x - terrain.x0) * sx, Z = (z) => (z - terrain.z0) * sz;
  const poly = (pts) => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const x = X(pts[i] / 10), y = Z(pts[i + 1] / 10);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // 2. polygons
  ctx.fillStyle = '#ead9ab';
  for (const b of world.beaches) { poly(b.pts); ctx.fill(); }
  for (const p of world.parks) {
    ctx.fillStyle = p.cls === 'pedestrian' ? '#cfc7b6' : '#7fae5c';
    poly(p.pts); ctx.fill();
  }
  ctx.fillStyle = '#8d877c';
  for (const r of world.rocks) { poly(r); ctx.fill(); }
  ctx.fillStyle = '#58c7cf';
  for (const p of world.pools) { poly(p); ctx.fill(); }

  // 3. soft dark lots under buildings (cheap ambient occlusion from above)
  ctx.fillStyle = 'rgba(70,64,58,0.34)';
  const n = buildingsI16.length / 8;
  for (let i = 0; i < n; i++) {
    const cx = buildingsI16[i * 8] / 4, cz = buildingsI16[i * 8 + 1] / 4;
    const w = buildingsI16[i * 8 + 2] / 10 + 3, d = buildingsI16[i * 8 + 3] / 10 + 3, a = buildingsI16[i * 8 + 4] / 10000;
    ctx.save(); ctx.translate(X(cx), Z(cz)); ctx.rotate(-a);
    ctx.fillRect(-w / 2 * sx, -d / 2 * sx, w * sx, d * sx);
    ctx.restore();
  }

  // 4. streets: pavement first, asphalt on top
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const stroke = (pts) => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const x = X(pts[i] / 10), y = Z(pts[i + 1] / 10);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  ctx.strokeStyle = '#c3bcae';
  for (const [code, pts] of world.roads) {
    if (code > 3) continue;
    ctx.lineWidth = Math.max(1.2, (ROAD_W[code] + 5) * sx); stroke(pts);
  }
  for (const [code, pts] of world.roads) {
    ctx.strokeStyle = code === 6 ? '#b9ad94' : code === 5 ? '#c9c0ae' : '#5e5f66';
    ctx.lineWidth = Math.max(code >= 4 ? 0.8 : 1.1, ROAD_W[code] * sx);
    stroke(pts);
  }
  // main route (the geometry ribbon sits on top; this is for far LOD + minimap)
  const rp = world.route.pts;
  ctx.strokeStyle = '#bdb6a7'; ctx.lineWidth = 34 * sx;
  ctx.beginPath();
  for (let i = 0; i < rp.length; i += 3) { if (i === 0) ctx.moveTo(X(rp[i]), Z(rp[i + 2])); else ctx.lineTo(X(rp[i]), Z(rp[i + 2])); }
  ctx.stroke();
  ctx.strokeStyle = '#55565d'; ctx.lineWidth = 15 * sx; ctx.stroke();
  return cv;
}

export function groundTexture(canvas, renderer) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}
