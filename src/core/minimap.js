/**
 * Interactive 2D Minimap rendered from the baked Vũng Tàu peninsula ground canvas.
 * Shows the 16.3 km route, 17 POI pins, player position + heading cone, and supports
 * click-to-teleport anywhere along the route.
 */
export class Minimap {
  constructor(containerEl, groundCanvas, terrain, route, pois, onSelectS) {
    this.terrain = terrain;
    this.route = route;
    this.pois = pois;
    this.onSelectS = onSelectS;

    this.cv = document.createElement('canvas');
    this.cv.id = 'minimap';
    this.cv.title = 'Bản đồ bán đảo Vũng Tàu (Chạm để dịch chuyển nhanh)';
    const W = 168;
    const H = Math.round(W * (terrain.depth / terrain.width));
    this.W = W;
    this.H = H;
    this.cv.width = W * 2;
    this.cv.height = H * 2;
    this.ctx = this.cv.getContext('2d');
    this.ctx.scale(2, 2);

    // Pre-render static map layer
    this.bg = document.createElement('canvas');
    this.bg.width = W * 2;
    this.bg.height = H * 2;
    const bctx = this.bg.getContext('2d');
    bctx.scale(2, 2);
    bctx.drawImage(groundCanvas, 0, 0, W, H);

    // Highlight tour route in bright cyan/orange
    bctx.strokeStyle = 'rgba(255, 122, 69, 0.92)';
    bctx.lineWidth = 2.2;
    bctx.beginPath();
    const rp = route.pts;
    for (let i = 0; i < rp.length; i += 9) {
      const [mx, my] = this.worldToMap(rp[i], rp[i + 2]);
      if (i === 0) bctx.moveTo(mx, my);
      else bctx.lineTo(mx, my);
    }
    bctx.stroke();

    // Draw POI dots
    bctx.fillStyle = '#ffd166';
    bctx.strokeStyle = '#0b1d2b';
    bctx.lineWidth = 1;
    for (const p of pois) {
      const [px, py] = this.worldToMap(p.x, p.z);
      bctx.beginPath();
      bctx.arc(px, py, 2.4, 0, Math.PI * 2);
      bctx.fill();
      bctx.stroke();
    }

    containerEl.appendChild(this.cv);

    this.cv.addEventListener('click', (e) => {
      const rect = this.cv.getBoundingClientRect();
      const ux = (e.clientX - rect.left) / rect.width;
      const uz = (e.clientY - rect.top) / rect.height;
      const wx = terrain.x0 + ux * terrain.width;
      const wz = terrain.z0 + uz * terrain.depth;
      const pr = route.project(wx, wz);
      if (pr && onSelectS) onSelectS(pr.s);
    });
  }

  worldToMap(x, z) {
    return [
      ((x - this.terrain.x0) / this.terrain.width) * this.W,
      ((z - this.terrain.z0) / this.terrain.depth) * this.H
    ];
  }

  update(rider, camYaw) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.drawImage(this.bg, 0, 0, this.W, this.H);

    const [px, py] = this.worldToMap(rider.pos.x, rider.pos.z);

    // View cone
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-camYaw + Math.PI);
    ctx.fillStyle = 'rgba(46, 196, 182, 0.32)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 18, -Math.PI * 0.72, -Math.PI * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Rider marker pulse
    ctx.fillStyle = '#2ec4b6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(px, py, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
