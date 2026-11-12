import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../core/util.js';

// carriageway half-width, median half-width, pavement on the land side, pavement on the sea side
const PROFILE = {
  'Trần Phú': { cw: 5.2, med: 0, land: 2.2, sea: 2.8 },
  'Quang Trung': { cw: 8.6, med: 1.0, land: 4.0, sea: 5.5 },
  'Hạ Long': { cw: 5.6, med: 0, land: 1.6, sea: 3.2 },
  'Thùy Vân': { cw: 8.8, med: 1.2, land: 5.0, sea: 7.5 },
};

/** The tour line: Thùy Vân (Bãi Sau) → Hạ Long → Quang Trung → Trần Phú, sampled every `step` metres. */
export class Route {
  constructor(data) {
    this.step = data.step; this.length = data.length;
    this.pts = Float32Array.from(data.pts);
    this.n = this.pts.length / 3;
    this.sections = data.sections;
    /** +1: sea on the right of travel, -1: sea on the left. */
    this.seaSide = data.seaSide || 1;
    const side = (p) => (this.seaSide > 0 ? { cw: p.cw, med: p.med, swL: p.land, swR: p.sea } : { cw: p.cw, med: p.med, swL: p.sea, swR: p.land });
    const profs = this.sections.map((sec) => side(PROFILE[sec.name] || PROFILE['Trần Phú']));
    const last = this.sections.length - 1;
    // per-sample cross-section, blended across section joins
    this.prof = new Float32Array(this.n * 4);
    const B = 48;
    for (let i = 0; i < this.n; i++) {
      const s = i * this.step;
      let k = this.sectionIndex(s);
      let p = profs[k], q = p, t = 0;
      const sec = this.sections[k];
      if (k < last && s > sec.to - B) { q = profs[k + 1]; t = 0.5 * smoothstep(sec.to - B, sec.to, s); }
      else if (k > 0 && s < sec.from + B) { q = profs[k - 1]; t = 0.5 * (1 - smoothstep(sec.from, sec.from + B, s)); }
      this.prof[i * 4] = lerp(p.cw, q.cw, t); this.prof[i * 4 + 1] = lerp(p.med, q.med, t);
      this.prof[i * 4 + 2] = lerp(p.swL, q.swL, t); this.prof[i * 4 + 3] = lerp(p.swR, q.swR, t);
    }
  }
  sectionIndex(s) {
    for (let k = 0; k < this.sections.length; k++) if (s < this.sections[k].to) return k;
    return this.sections.length - 1;
  }
  /** Position + frame at distance s. `out` = { pos, fwd, right, cw, med, swL, swR }. */
  at(s, out = {}) {
    s = clamp(s, 0, this.length - 0.01);
    const f = s / this.step, i = Math.min(f | 0, this.n - 2), t = f - i, p = this.pts;
    const pos = out.pos || (out.pos = new THREE.Vector3());
    pos.set(lerp(p[i * 3], p[i * 3 + 3], t), lerp(p[i * 3 + 1], p[i * 3 + 4], t), lerp(p[i * 3 + 2], p[i * 3 + 5], t));
    // smoothed tangent over +-2 samples
    const a = Math.max(0, i - 1), b = Math.min(this.n - 1, i + 2);
    const fwd = out.fwd || (out.fwd = new THREE.Vector3());
    fwd.set(p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]).normalize();
    const right = out.right || (out.right = new THREE.Vector3());
    right.set(-fwd.z, 0, fwd.x).normalize();
    const j = Math.min(Math.round(f), this.n - 1);
    out.sea = this.seaSide > 0 ? this.prof[j * 4 + 3] : this.prof[j * 4 + 2];
    out.land = this.seaSide > 0 ? this.prof[j * 4 + 2] : this.prof[j * 4 + 3];
    out.cw = this.prof[j * 4]; out.med = this.prof[j * 4 + 1]; out.swL = this.prof[j * 4 + 2]; out.swR = this.prof[j * 4 + 3];
    return out;
  }
  /** Signed curvature (1/m), positive when turning right. */
  curvature(s) {
    const a = this.at(s - 6, this._ca || (this._ca = {})).fwd, b = this.at(s + 6, this._cb || (this._cb = {})).fwd;
    return (a.x * b.z - a.z * b.x) / 12;
  }
  /** Nearest distance-along-route for a world point (coarse scan + refine). */
  project(x, z) {
    let best = 0, bd = 1e18; const p = this.pts;
    for (let i = 0; i < this.n; i += 4) { const d = (p[i * 3] - x) ** 2 + (p[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    for (let i = Math.max(0, best - 4); i < Math.min(this.n, best + 5); i++) { const d = (p[i * 3] - x) ** 2 + (p[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    return { s: best * this.step, dist: Math.sqrt(bd) };
  }
}
