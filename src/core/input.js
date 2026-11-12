/** Keyboard, pointer-drag and touch-button state. */
export class Input {
  constructor(el) {
    this.keys = new Set(); this.touch = { gas: false, brake: false, left: false, right: false };
    this.dx = 0; this.dy = 0; this.wheel = 0; this.dragging = false; this.pressed = new Set();
    this.lastLook = 0;
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    const pts = new Map(); let pinch = 0;
    el.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); this.dragging = true; el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 1) { this.dx += e.clientX - p[0]; this.dy += e.clientY - p[1]; this.lastLook = performance.now(); }
      p[0] = e.clientX; p[1] = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) this.wheel += (pinch - d) * 2; pinch = d;
      }
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; this.dragging = pts.size > 0; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { this.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  /** True once per key press. */
  hit(code) { return this.pressed.has(code); }
  axis() {
    const fwd = (this.down('KeyW', 'ArrowUp') || this.touch.gas ? 1 : 0) - (this.down('KeyS', 'ArrowDown') || this.touch.brake ? 1 : 0);
    const steer = (this.down('KeyD', 'ArrowRight') || this.touch.right ? 1 : 0) - (this.down('KeyA', 'ArrowLeft') || this.touch.left ? 1 : 0);
    return { fwd, steer, boost: this.down('ShiftLeft', 'ShiftRight'), brake: this.down('Space') };
  }
  endFrame() { this.dx = 0; this.dy = 0; this.wheel = 0; this.pressed.clear(); }
}
