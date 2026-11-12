import * as THREE from 'three';
import { clamp, damp } from '../core/util.js';

/** Rides the scooter along the tour route (on rails, free to change lane and speed). */
export class Rider {
  constructor(route, bike) {
    this.route = route; this.bike = bike;
    this.s = 0; this.lat = 2.6; this.v = 0; this.dir = 1; this.auto = false; this.cruise = 11;
    this.lean = 0; this.heading = 0; this.frame = {};
    this.pos = new THREE.Vector3(); this.fwd = new THREE.Vector3(0, 0, 1);
    bike.rotation.order = 'YXZ';
    this.place();
  }
  teleport(s, dir = this.dir) { this.s = clamp(s, 2, this.route.length - 2); this.v = 0; this.dir = dir; this.place(); }
  turnAround() { this.dir *= -1; this.v = 0; this.place(); }
  update(dt, ax) {
    const max = ax.boost ? 42 : 16.5;
    let target = this.v;
    if (ax.fwd > 0) { target = max; this.autoPaused = false; }
    else if (this.auto && !this.autoPaused) target = this.cruise;
    else target = 0;
    if (ax.fwd < 0 || ax.brake) { this.v = Math.max(0, this.v - 22 * dt); if (ax.fwd < 0 && this.v < 0.2) this.v = -3; }
    else {
      const rate = target > this.v ? (ax.boost ? 14 : 5.5) : (ax.fwd > 0 ? 9 : 2.2);
      this.v += clamp(target - this.v, -rate * dt, rate * dt);
    }
    this.s += this.v * this.dir * dt;
    if (this.s < 2) { this.s = 2; this.v = 0; } else if (this.s > this.route.length - 2) { this.s = this.route.length - 2; this.v = 0; this.atEnd = true; } else this.atEnd = false;
    const f = this.route.at(this.s, this.frame);
    const lo = f.med > 0.1 ? f.med + 0.9 : -(f.cw - 1.0), hi = f.cw - 1.0;
    this.lat = clamp(this.lat + ax.steer * (2.2 + Math.abs(this.v) * 0.12) * dt, lo, hi);
    this.steer = ax.steer;
    this.place(dt);
  }
  place(dt = 0) {
    const f = this.route.at(this.s, this.frame), d = this.dir;
    this.pos.copy(f.pos).addScaledVector(f.right, this.lat * d);
    this.fwd.copy(f.fwd).multiplyScalar(d);
    this.heading = Math.atan2(this.fwd.x, this.fwd.z);
    const curv = this.route.curvature(this.s) * d;
    const targetLean = clamp(-curv * this.v * this.v / 9.8 * 0.9 - (this.steer || 0) * 0.12 * Math.min(1, Math.abs(this.v) / 4), -0.6, 0.6);
    this.lean = dt ? damp(this.lean, targetLean, 6, dt) : targetLean;
    this.bike.position.copy(this.pos);
    this.bike.rotation.set(-Math.asin(clamp(this.fwd.y, -0.5, 0.5)), this.heading, this.lean);
    if (dt) for (const w of this.bike.userData.wheels) w.rotation.x += this.v * dt / 0.32;
  }
  get kmh() { return Math.abs(this.v) * 3.6; }
}
