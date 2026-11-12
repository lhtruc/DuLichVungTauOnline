# Vũng Tàu Landmark Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first set of famous Vũng Tàu locations recognizable in the existing Three.js coastal tour.

**Architecture:** Add purpose-built Three.js landmark builders and bind them through the existing POI `model` registry. Preserve the current geographic placement, stop-card flow, and scene loading path.

**Tech Stack:** Vite, Three.js, JavaScript ES modules.

**Spec:** `docs/superpowers/specs/2026-11-12-vung-tau-landmarks-design.md`

## Global Constraints

- Use Three.js geometry and materials already available in the project; do not add dependencies.
- Use web images as visual references only; do not bundle third-party photos.
- Keep landmark geometry at a moderate count for mobile devices.
- Keep POIs anchored to their real coordinates and integrated with the current visit controls.

## Review Focus

- Existing builder identifiers must continue to resolve for all current POIs; verify the production build.
- Small-screen performance must remain acceptable; avoid unbounded detail or dense repeated geometry.
- Park geometry must not imply a single compact monument when the location is a long coastal public space; use low-profile, bounded elements around the POI.
- The Đức Mẹ model should read as Mary with the child Jesus rather than an anonymous standing figure; inspect the assembled silhouette.
- The Dốc Hoàng Hôn place name has conflicting geographic results (commonly attributed to Phan Thiết); defer adding a Vũng Tàu coordinate until the intended local location is identified.

---

### Task 1: Build distinctive landmark geometry

**Files:**
- Modify: `src/world/landmarks.js`
- Create: `tests/landmarks.test.js`

**Interfaces:**
- Consumes: `buildLandmarks(pois, terrain)`, existing `add(group, geometry, material, x, y, z, ...)` helper.
- Produces: builders keyed `tamthang`, `baisau`, `baitruoc`, `honba`, `baidau`, and `hoanghon`; upgrade `ducme` to a recognizable Mary-and-child silhouette.

- [ ] **Step 1: Write and run the landmark coverage test**

Create `tests/landmarks.test.js` with Node's built-in test runner. Assert that the target POI IDs map to the intended builder keys, that all seven target models produce groups, and that the Đức Mẹ group has at least four child meshes. Run `node --test tests/landmarks.test.js` before implementation and confirm it fails because target builders or POI mappings are missing.

- [ ] **Step 2: Add the Tam Thắng tower builder**

Create a bounded base/plaza and 143 tapered polygon columns in an ascending three-prow composition, with light mosaic-like material variation. Register as `tamthang`.

- [ ] **Step 3: Add the two coastal park builders**

For `baisau`, create a compact shoreline promenade segment with curved path bands, lawns, palms, low planting and a few pavilion forms. For `baitruoc`, create a smaller waterfront garden with palms, paths and low public-space forms.

- [ ] **Step 4: Add Miếu Hòn Bà and Bãi Dâu builders**

Build a yellow-walled, red-tiled shrine and entrance gate for `honba`; build a low-profile rocky shore, sand and sparse planting for `baidau` without covering adjacent geometry excessively.

- [ ] **Step 5: Refine Đức Mẹ Bãi Dâu**

Replace the generic robe-and-sphere figure with a white standing Mary holding a smaller child figure, retaining the current approximate height and plinth placement.

- [ ] **Step 6: Add the Mũi Nghinh Phong slope builder and inspect geometry**

Create a modest sloping path segment with rails and restrained vegetation; review builder loops and dimensions for bounded geometry counts, and ensure no new animation ticks or external assets are required.

### Task 2: Bind the models to POIs

**Files:**
- Modify: `src/data/pois.js`

**Interfaces:**
- Consumes: builder keys from Task 1.
- Produces: existing `tamthang`, `baisau`, `baitruoc`, `baidau`, `ducme`, and `honba` POIs resolve to their dedicated builders; new Dốc Hoàng Hôn POI resolves to `hoanghon`; preserve established coordinates and stop text.

- [ ] **Step 1: Assign builder keys to existing POIs**

Set `Bãi Sau – Thùy Vân` to `baisau`, keep `Tháp Tam Thắng` on `tamthang`, keep Bãi Trước/Bãi Dâu/Đức Mẹ/Miếu Hòn Bà on their named keys, and retain current coordinates.

- [ ] **Step 2: Check POI-to-builder coverage**

Confirm each named POI has a registered model builder and that all other current POIs retain their existing model behavior.

### Task 3: Add the Dốc Hoàng Hôn stop at Mũi Nghinh Phong

**Files:**
- Modify: `src/data/pois.js` only after location is identified.

- [ ] **Step 1: Add a distinct Dốc Hoàng Hôn POI**

Add a stop near the existing Mũi Nghinh Phong coordinates (10.3222, 107.0838), using a small offset to place it on the approach slope. Give it a dedicated showcase angle and descriptive text, while preserving the existing Mũi Nghinh Phong POI. Register a bounded sloped path/railing builder under the `hoanghon` key.

### Task 4: Build and visually inspect

**Files:**
- No additional files.

- [ ] **Step 1: Run the production build**

Run `npm run build`; expected: Vite completes without syntax or bundling errors.

- [ ] **Step 2: Inspect the landmark stops**

Run the app with the existing local dev flow and inspect each changed stop from its showcase camera. Confirm recognizable silhouettes, ground placement, and no obvious overlap with the player route.
