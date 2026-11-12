import test from 'node:test';
import assert from 'node:assert/strict';
import { POIS } from '../src/data/pois.js';
import { buildLandmarks } from '../src/world/landmarks.js';

const expectedModels = new Map([
  ['tamthang', 'tamthang'],
  ['baisau', 'baisau'],
  ['baitruoc', 'baitruoc'],
  ['baidau', 'baidau'],
  ['ducme', 'ducme'],
  ['honba', 'honba'],
  ['docnghinhphong', 'hoanghon'],
]);

test('target Vũng Tàu POIs resolve to dedicated landmark builders', () => {
  const byId = new Map(POIS.map((poi) => [poi.id, poi]));
  for (const [id, model] of expectedModels) assert.equal(byId.get(id)?.model, model, `${id} should use ${model}`);

  const landmarks = [...expectedModels.keys()].map((id) => ({ ...byId.get(id), x: 0, z: 0 }));
  const { group } = buildLandmarks(landmarks, { heightAt: () => 0 });
  assert.equal(group.children.length, expectedModels.size, 'each target POI should build one landmark');
  const columns = group.children[0].children.find((child) => child.isInstancedMesh);
  assert.equal(columns?.count, 143, 'Tam Thắng should contain 143 shared-mesh columns');
  assert.ok(byId.get('ducme').model, 'the Đức Mẹ landmark should remain available');
  const mary = group.children[4];
  assert.ok(mary.children.length >= 4, 'the Đức Mẹ model should include the child Jesus');
});
