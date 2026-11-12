import * as THREE from 'three';
import { NOISE_GLSL, quality } from '../core/shared.js';

/** Heightmap terrain built from the real DEM (baked by tools/build_world.py). */
export class Terrain {
  constructor(meta, u16, cover) {
    this.nx = meta.nx; this.nz = meta.nz; this.cell = meta.cell;
    this.x0 = meta.x0; this.z0 = meta.z0;
    this.width = (this.nx - 1) * this.cell;
    this.depth = (this.nz - 1) * this.cell;
    this.x1 = this.x0 + this.width; this.z1 = this.z0 + this.depth;
    const h = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) h[i] = u16[i] * meta.hScale + meta.hOffset;
    this.h = h;
    this.cover = cover;
  }

  inside(x, z, margin = 0) {
    return x > this.x0 + margin && x < this.x1 - margin && z > this.z0 + margin && z < this.z1 - margin;
  }

  heightAt(x, z) {
    const { nx, nz, cell, h } = this;
    let fx = (x - this.x0) / cell, fz = (z - this.z0) / cell;
    if (fx < 0) fx = 0; else if (fx > nx - 1.001) fx = nx - 1.001;
    if (fz < 0) fz = 0; else if (fz > nz - 1.001) fz = nz - 1.001;
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * nx + i;
    return (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + nx] * (1 - u) + h[k + nx + 1] * u) * v;
  }

  /** Surface normal (world space) written into `out`. */
  normalAt(x, z, out) {
    const e = this.cell;
    const dx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const dz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return out.set(-dx, 2 * e, -dz).normalize();
  }

  slopeAt(x, z) {
    const e = this.cell;
    const dx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const dz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  }

  coverAt(x, z) {
    const i = Math.round((x - this.x0) / this.cell), j = Math.round((z - this.z0) / this.cell);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return 0;
    return this.cover[j * this.nx + i];
  }

  /** R8 texture of sea depth used by the water shader (h in [-14, 2] m -> [0, 1]). */
  depthTexture() {
    const data = new Uint8Array(this.nx * this.nz);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.max(0, Math.min(255, Math.round((this.h[i] + 14) / 16 * 255)));
    }
    const tex = new THREE.DataTexture(data, this.nx, this.nz, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  buildMesh(groundTex) {
    const mat = new THREE.MeshLambertMaterial({ map: groundTex });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvWNrm = normal;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\n${NOISE_GLSL}`)
        .replace('#include <map_fragment>', /* glsl */`#include <map_fragment>
          {
            float dist = length(vWPos - cameraPosition);
            float nA = vnoise(vWPos.xz * 0.9);
            float nB = vnoise(vWPos.xz * 0.11);
            float nC = vnoise(vWPos.xz * 0.012);
            float near = 1.0 - smoothstep(60.0, 400.0, dist);
            diffuseColor.rgb *= 0.9 + 0.16 * (nB - 0.5) + 0.2 * (nC - 0.5) + near * 0.14 * (nA - 0.5);
            // bare rock on steep mountain faces
            float slope = 1.0 - vWNrm.y;
            float rock = smoothstep(0.24, 0.42, slope + (nB - 0.5) * 0.12) * smoothstep(4.0, 12.0, vWPos.y);
            vec3 rockCol = mix(vec3(0.42, 0.38, 0.33), vec3(0.58, 0.54, 0.48), nA);
            diffuseColor.rgb = mix(diffuseColor.rgb, rockCol, rock * 0.85);
            // wet sand at the waterline
            float wet = smoothstep(0.7, 0.05, vWPos.y);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.66, 0.64, 0.6), wet);
          }`);
    };

    const group = new THREE.Group();
    group.name = 'terrain';
    const CH = 64;
    const strides = quality.low ? [2, 8] : [1, 4];
    const switchDist = quality.low ? 900 : 1500;
    for (let cj = 0; cj < this.nz - 1; cj += CH) {
      for (let ci = 0; ci < this.nx - 1; ci += CH) {
        const wi = Math.min(CH, this.nx - 1 - ci), wj = Math.min(CH, this.nz - 1 - cj);
        const cx = this.x0 + (ci + wi / 2) * this.cell, cz = this.z0 + (cj + wj / 2) * this.cell;
        let hmax = -1e9, hmin = 1e9;
        for (let j = cj; j <= cj + wj; j += 4) for (let i = ci; i <= ci + wi; i += 4) {
          const v = this.h[j * this.nx + i]; if (v > hmax) hmax = v; if (v < hmin) hmin = v;
        }
        if (hmax < -6) continue; // deep open sea: the water plane covers it
        const lod = new THREE.LOD();
        lod.position.set(cx, 0, cz);
        strides.forEach((s, li) => {
          const mesh = new THREE.Mesh(this._chunkGeometry(ci, cj, wi, wj, s, cx, cz), mat);
          mesh.receiveShadow = true;
          mesh.matrixAutoUpdate = false;
          lod.addLevel(mesh, li === 0 ? 0 : switchDist);
        });
        lod.matrixAutoUpdate = false; lod.updateMatrix();
        group.add(lod);
      }
    }
    return group;
  }

  _chunkGeometry(ci, cj, wi, wj, s, cx, cz) {
    const { nx, nz, cell, h } = this;
    const is = [], js = [];
    for (let i = 0; i < wi; i += s) is.push(ci + i); is.push(ci + wi);
    for (let j = 0; j < wj; j += s) js.push(cj + j); js.push(cj + wj);
    const cols = is.length, rows = js.length;
    const nV = cols * rows + 2 * (cols + rows);
    const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
    const H = (i, j) => h[Math.min(nz - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))];
    let p = 0;
    const put = (i, j, drop) => {
      const x = this.x0 + i * cell, z = this.z0 + j * cell;
      pos[p * 3] = x - cx; pos[p * 3 + 1] = H(i, j) - drop; pos[p * 3 + 2] = z - cz;
      const ddx = (H(i + 1, j) - H(i - 1, j)) / (2 * cell), ddz = (H(i, j + 1) - H(i, j - 1)) / (2 * cell);
      const l = Math.hypot(ddx, 1, ddz);
      nrm[p * 3] = -ddx / l; nrm[p * 3 + 1] = 1 / l; nrm[p * 3 + 2] = -ddz / l;
      uv[p * 2] = (x - this.x0) / this.width; uv[p * 2 + 1] = 1 - (z - this.z0) / this.depth;
      return p++;
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) put(is[c], js[r], 0);
    const idx = [];
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    // skirts hide cracks between LOD levels
    const drop = 10 + s * 4;
    const skirt = (list, flip) => {
      let prevTop = -1, prevBot = -1;
      for (const [i, j, top] of list) {
        const bot = put(i, j, drop);
        if (prevTop >= 0) {
          if (flip) idx.push(prevTop, top, prevBot, top, bot, prevBot);
          else idx.push(prevTop, prevBot, top, top, prevBot, bot);
        }
        prevTop = top; prevBot = bot;
      }
    };
    skirt(is.map((i, c) => [i, js[0], c]), true);
    skirt(is.map((i, c) => [i, js[rows - 1], (rows - 1) * cols + c]), false);
    skirt(js.map((j, r) => [is[0], j, r * cols]), false);
    skirt(js.map((j, r) => [is[cols - 1], j, r * cols + cols - 1]), true);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(nV > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
