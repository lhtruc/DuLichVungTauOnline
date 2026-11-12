import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/util.js';

const UP = new THREE.Vector3(0, 1, 0);

/** Chase / first-person / free-fly / landmark-showcase camera. */
export class CameraRig {
  constructor(camera, terrain) {
    this.camera = camera; this.terrain = terrain;
    this.mode = 'chase';            // chase | first | fly | orbit
    this.yawOff = 0; this.pitch = 0.2; this.dist = 7.5; this.yaw = 0;
    this.fly = { pos: new THREE.Vector3(), yaw: 0, pitch: -0.3 };
    this.orbit = null; this.look = new THREE.Vector3(); this._tmp = new THREE.Vector3();
    this.blend = 1; this.from = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  }
  startBlend() { this.from.pos.copy(this.camera.position); this.from.quat.copy(this.camera.quaternion); this.blend = 0; }
  setMode(mode) { if (mode === this.mode) return; this.startBlend(); if (mode === 'fly') { this.fly.pos.copy(this.camera.position); this.fly.pos.y += 25; const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ'); this.fly.yaw = e.y; this.fly.pitch = Math.min(e.x, -0.25); } this.mode = mode; }
  showcase(center, bearingDeg, dist, height) {
    this.startBlend();
    this.orbit = { center: center.clone(), ang: THREE.MathUtils.degToRad(bearingDeg), dist, height };
    this.mode = 'orbit';
  }
  update(dt, input, rider) {
    const cam = this.camera;
    const sens = 0.0042;
    if (this.mode === 'chase' || this.mode === 'first') {
      this.yawOff -= input.dx * sens; this.pitch = clamp(this.pitch + input.dy * sens, this.mode === 'first' ? -0.7 : -0.12, 1.25);
      this.dist = clamp(this.dist * (1 + input.wheel * 0.0011), 3.2, 60);
      const idle = performance.now() - input.lastLook > 2600 && !input.dragging;
      if (idle && Math.abs(rider.v) > 2) this.yawOff = dampAngle(this.yawOff, 0, 1.6, dt);
      this.yaw = dampAngle(this.yaw, rider.heading, 5, dt);
      const yaw = this.yaw + this.yawOff;
      if (this.mode === 'first') {
        cam.position.copy(rider.pos).add(this._tmp.set(0, 1.62, 0)).addScaledVector(rider.fwd, 0.05);
        const p = -this.pitch + 0.12;
        this.look.set(Math.sin(yaw) * Math.cos(p), Math.sin(p), Math.cos(yaw) * Math.cos(p)).add(cam.position);
        cam.lookAt(this.look);
      } else {
        const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
        cam.position.set(rider.pos.x - Math.sin(yaw) * cp * this.dist, rider.pos.y + 1.5 + sp * this.dist, rider.pos.z - Math.cos(yaw) * cp * this.dist);
        const ground = this.terrain.heightAt(cam.position.x, cam.position.z) + 0.7;
        if (cam.position.y < ground) cam.position.y = ground;
        this.look.copy(rider.pos); this.look.y += 1.35;
        cam.lookAt(this.look);
      }
    } else if (this.mode === 'fly') {
      const f = this.fly;
      f.yaw -= input.dx * sens; f.pitch = clamp(f.pitch - input.dy * sens, -1.5, 1.2);
      const ax = input.axis();
      const sp = (ax.boost ? 240 : 70) * (1 + Math.max(0, f.pos.y) / 200);
      const dir = this._tmp.set(-Math.sin(f.yaw) * Math.cos(f.pitch), Math.sin(f.pitch), -Math.cos(f.yaw) * Math.cos(f.pitch));
      f.pos.addScaledVector(dir, ax.fwd * sp * dt);
      f.pos.x += Math.cos(f.yaw) * ax.steer * sp * dt; f.pos.z -= Math.sin(f.yaw) * ax.steer * sp * dt;
      f.pos.y += ((input.down('KeyE') ? 1 : 0) - (input.down('KeyQ') ? 1 : 0)) * sp * 0.6 * dt;
      f.pos.y -= input.wheel * 0.05;
      const t = this.terrain;
      f.pos.x = clamp(f.pos.x, t.x0 + 300, t.x1 - 300); f.pos.z = clamp(f.pos.z, t.z0 + 300, t.z1 - 300);
      f.pos.y = clamp(f.pos.y, Math.max(t.heightAt(f.pos.x, f.pos.z), 0) + 2.5, 1500);
      cam.position.copy(f.pos);
      cam.quaternion.setFromEuler(new THREE.Euler(f.pitch, f.yaw, 0, 'YXZ'));
    } else if (this.mode === 'orbit' && this.orbit) {
      const o = this.orbit;
      o.ang += dt * 0.11 - input.dx * sens; o.height = clamp(o.height + input.dy * 0.15, 3, 400);
      o.dist = clamp(o.dist * (1 + input.wheel * 0.0011), 15, 900);
      cam.position.set(o.center.x + Math.sin(o.ang) * o.dist, o.center.y + o.height, o.center.z - Math.cos(o.ang) * o.dist);
      const ground = Math.max(this.terrain.heightAt(cam.position.x, cam.position.z), 0) + 2;
      if (cam.position.y < ground) cam.position.y = ground;
      cam.lookAt(o.center);
    }
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 1.4);
      const k = this.blend * this.blend * (3 - 2 * this.blend);
      cam.position.lerpVectors(this.from.pos, cam.position, k);
      cam.quaternion.slerpQuaternions(this.from.quat, cam.quaternion, k);
    }
  }
}
