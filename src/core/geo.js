// Local tangent-plane projection shared with tools/build_world.py.
// World frame: x = east (m), y = up (m), z = south (m).
export const geo = { lon0: 107.0825, lat0: 10.3525, kx: 109507.2973, ky: 111319.4908 };

export function setGeo(meta) {
  geo.lon0 = meta.lon0; geo.lat0 = meta.lat0; geo.kx = meta.kx; geo.ky = meta.ky;
}
export function ll2xz(lat, lon) {
  return [(lon - geo.lon0) * geo.kx, -(lat - geo.lat0) * geo.ky];
}
export function xz2ll(x, z) {
  return [geo.lat0 - z / geo.ky, geo.lon0 + x / geo.kx];
}
/** Compass bearing in degrees (0 = north, 90 = east) for a world-space direction. */
export function bearingDeg(dx, dz) {
  return (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
}
