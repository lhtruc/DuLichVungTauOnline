"""Turn raw Overture + DEM data into the compact runtime world for the web app.

Outputs (public/data):
  world.json     meta, route, roads, polygons, signs, osm building polygons
  terrain.bin    uint16 heightmap  (h = v / 100 - 20  metres)
  cover.bin      uint8 land-cover class per grid cell
  buildings.bin  int16 x 8 per building (oriented rectangles)

Local frame: x = east metres, z = south metres (three.js), y = up. Origin LON0/LAT0.
"""
import heapq
import json
import math
import os
import sys

import numpy as np
import pyarrow.parquet as pq
from PIL import Image, ImageDraw
from scipy import ndimage
from shapely import wkb
from shapely.geometry import LineString, Point, Polygon, box
import shapely
from shapely.ops import substring, unary_union
from shapely.strtree import STRtree

LON0, LAT0 = 107.0825, 10.3525
R = 6378137.0
KX = math.cos(math.radians(LAT0)) * R * math.pi / 180
KY = R * math.pi / 180
REGION = (107.042, 10.307, 107.122, 10.398)  # w s e n
CELL = 12.0
OUT = "public/data"
DEBUG = "--debug" in sys.argv
os.makedirs(OUT, exist_ok=True)


def proj(lon, lat):
    """lon/lat -> (x east, n north) metres."""
    return (lon - LON0) * KX, (lat - LAT0) * KY


def proj_geom(g):
    return shapely.transform(g, lambda c: np.column_stack([(c[:, 0] - LON0) * KX, (c[:, 1] - LAT0) * KY]))


def nm(x):
    return x.get("primary") if isinstance(x, dict) else None


def clean(v):
    return v if isinstance(v, str) else None


def load(name):
    df = pq.read_table(f"data_raw/{name}.parquet").to_pandas()
    if "names" in df:
        df["name"] = df["names"].apply(nm)
    df["geom"] = df["geometry"].apply(lambda b: proj_geom(wkb.loads(b)))
    return df


XMIN, NMIN = proj(REGION[0], REGION[1])
XMAX, NMAX = proj(REGION[2], REGION[3])
NX = int(math.ceil((XMAX - XMIN) / CELL)) + 1
NZ = int(math.ceil((NMAX - NMIN) / CELL)) + 1
XMAX = XMIN + (NX - 1) * CELL
NMAX = NMIN + (NZ - 1) * CELL
REGION_BOX = box(XMIN, NMIN, XMAX, NMAX)
print(f"grid {NX} x {NZ} cell {CELL}  x[{XMIN:.0f},{XMAX:.0f}] n[{NMIN:.0f},{NMAX:.0f}]")

# grid row j = 0 is the NORTH edge (z = -NMAX), so z grows with j.
gx = XMIN + np.arange(NX) * CELL
gn = NMAX - np.arange(NZ) * CELL
GX, GN = np.meshgrid(gx, gn)


# --------------------------------------------------------------------------
# 1. Route
# --------------------------------------------------------------------------
seg = load("segment")
seg = seg[seg["subtype"] == "road"].copy()
MAIN = ["Trần Phú", "Quang Trung", "Hạ Long", "Thùy Vân"]
SKIP_GRAPH = {"footway", "steps", "path", "cycleway", "pedestrian", "track"}

adj, nodepos = {}, {}
for _, r in seg.iterrows():
    g = r["geom"]
    if r["class"] in SKIP_GRAPH or g.geom_type != "LineString":
        continue
    cs = sorted((c["at"], c["connector_id"]) for c in r["connectors"])
    main = r["name"] in MAIN and r["class"] == "primary"
    for (a0, c0), (a1, c1) in zip(cs[:-1], cs[1:]):
        sub = substring(g, a0, a1, normalized=True)
        pts = list(sub.coords)
        if len(pts) < 2:
            continue
        cost = sub.length * (1 if main else 25)
        adj.setdefault(c0, []).append((c1, cost, pts, r["name"], r["id"]))
        adj.setdefault(c1, []).append((c0, cost, pts[::-1], r["name"], r["id"]))
        nodepos[c0], nodepos[c1] = pts[0], pts[-1]


def main_nodes(name):
    s = set()
    for _, r in seg[(seg["name"] == name) & (seg["class"] == "primary")].iterrows():
        for c in r["connectors"]:
            if c["connector_id"] in nodepos:
                s.add(c["connector_id"])
    return s


start = max(main_nodes("Trần Phú"), key=lambda n: nodepos[n][0])
end = max(main_nodes("Thùy Vân"), key=lambda n: nodepos[n][1])
dist, prev, heap = {start: 0.0}, {}, [(0.0, start)]
while heap:
    d, u = heapq.heappop(heap)
    if d > dist.get(u, 1e18):
        continue
    if u == end:
        break
    for v, c, pts, name, sid in adj[u]:
        nd = d + c
        if nd < dist.get(v, 1e18):
            dist[v] = nd
            prev[v] = (u, pts, name, sid)
            heapq.heappush(heap, (nd, v))
path, u = [], end
while u != start:
    p, pts, name, sid = prev[u]
    path.append((pts, name, sid))
    u = p
path.reverse()
route_ids = {sid for _, _, sid in path}

raw_pts, raw_names = [], []
for pts, name, _ in path:
    for p in pts[(1 if raw_pts else 0):]:
        raw_pts.append(p)
        raw_names.append(name if name in MAIN else None)
# fill unnamed link pieces with the previous name
for i, n_ in enumerate(raw_names):
    if n_ is None:
        raw_names[i] = raw_names[i - 1] if i else MAIN[0]

raw_line = LineString(raw_pts)
STEP = 4.0
n_s = int(raw_line.length // STEP) + 1
samples = np.array([raw_line.interpolate(i * STEP).coords[0] for i in range(n_s)] + [raw_pts[-1]])
# section name per sample: nearest raw vertex by arc length
raw_arc = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(np.array(raw_pts), axis=0).T))])
samp_arc = np.minimum(np.arange(len(samples)) * STEP, raw_line.length)
idx = np.clip(np.searchsorted(raw_arc, samp_arc), 0, len(raw_names) - 1)
samp_name = [raw_names[i] for i in idx]
# enforce monotone section order (Trần Phú -> Quang Trung -> Hạ Long -> Thùy Vân)
order = {n_: i for i, n_ in enumerate(MAIN)}
cur = 0
sec_idx = []
for n_ in samp_name:
    cur = max(cur, order[n_])
    sec_idx.append(cur)
sec_idx = np.array(sec_idx)

# detect dual carriageways: other main primary segments running parallel
others = [r["geom"] for _, r in seg[(seg["name"].isin(MAIN)) & (seg["class"] == "primary")].iterrows()
          if r["id"] not in route_ids and r["geom"].geom_type == "LineString"]
otree = STRtree(others)
twin_shift = np.zeros_like(samples)
twin_flag = np.zeros(len(samples), bool)
for i, p in enumerate(samples):
    pt = Point(p)
    j = otree.nearest(pt)
    o = others[j]
    d = o.distance(pt)
    if 3.0 < d < 30.0:
        q = o.interpolate(o.project(pt))
        # must be roughly parallel: direction of twin vs ours
        a = samples[min(i + 1, len(samples) - 1)] - samples[max(i - 1, 0)]
        s_ = o.project(pt)
        b = np.array(o.interpolate(min(s_ + 2, o.length)).coords[0]) - np.array(o.interpolate(max(s_ - 2, 0)).coords[0])
        if abs(np.dot(a, b)) > 0.8 * (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9):
            twin_shift[i] = (np.array(q.coords[0]) - p) / 2
            twin_flag[i] = True
for s_i, name in enumerate(MAIN):
    m = sec_idx == s_i
    print(f"  {name}: {m.sum() * STEP:.0f} m, dual {twin_flag[m].mean() * 100:.0f}%")
# smooth the dual flag / shift so the centreline does not jitter
k = np.ones(15) / 15
tw = np.convolve(twin_flag.astype(float), k, mode="same")
shift_s = np.stack([np.convolve(twin_shift[:, a], k, mode="same") for a in (0, 1)], axis=1)
samples = samples + shift_s


def smooth_poly(p, win, iters):
    p = p.copy()
    k_ = np.ones(win) / win
    for _ in range(iters):
        q = p.copy()
        for a in (0, 1):
            pad = np.pad(p[:, a], (win // 2, win // 2), mode="edge")
            q[:, a] = np.convolve(pad, k_, mode="valid")
        q[0], q[-1] = p[0], p[-1]
        p = q
    return p


samples = smooth_poly(samples, 7, 2)
# re-sample uniformly after smoothing
line = LineString(samples)
ROUTE_LEN = line.length
n_s = int(ROUTE_LEN // STEP) + 1
old_arc = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(samples, axis=0).T))])
new_arc = np.minimum(np.arange(n_s + 1) * STEP, ROUTE_LEN)
route_xy = np.stack([np.interp(new_arc, old_arc, samples[:, a]) for a in (0, 1)], axis=1)
route_sec = sec_idx[np.clip(np.searchsorted(old_arc, new_arc), 0, len(sec_idx) - 1)]
route_dual = np.interp(new_arc, old_arc, tw) > 0.5
route_line = LineString(route_xy)
print(f"route length {ROUTE_LEN:.0f} m, {len(route_xy)} samples")

# per-section half width of the levelled corridor (carriageway + pavements)
SEC_HALF = np.array([10.0, 15.0, 10.5, 19.0])
route_half = SEC_HALF[route_sec]
route_half = np.convolve(np.pad(route_half, (10, 10), mode="edge"), np.ones(21) / 21, mode="valid")


# --------------------------------------------------------------------------
# 2. Land mask + DEM -> heightmap
# --------------------------------------------------------------------------
land = load("land")
water = load("water")
MS = 4.0  # mask raster resolution (m)
MW, MH = int((XMAX - XMIN) / MS) + 1, int((NMAX - NMIN) / MS) + 1


def to_px(coords, s=MS):
    return [((x - XMIN) / s, (NMAX - y) / s) for x, y in coords]


def draw_poly(dr, g, fill, s=MS):
    if g.is_empty:
        return
    if g.geom_type == "Polygon":
        dr.polygon(to_px(g.exterior.coords, s), fill=fill)
        for h in g.interiors:
            dr.polygon(to_px(h.coords, s), fill=0)
    elif g.geom_type in ("MultiPolygon", "GeometryCollection"):
        for p in g.geoms:
            draw_poly(dr, p, fill, s)


mask_img = Image.new("L", (MW, MH), 0)
mdr = ImageDraw.Draw(mask_img)
land_polys = []
for _, r in land[land["class"].isin(["land", "island", "islet"])].iterrows():
    g = r["geom"]
    if g.geom_type in ("Polygon", "MultiPolygon"):
        g = g.intersection(REGION_BOX.buffer(200))
        land_polys.append(g)
        draw_poly(mdr, g, 255)
land_union = unary_union(land_polys)
# inland water bodies (big ones only)
inland = []
for _, r in water.iterrows():
    g = r["geom"]
    if g.geom_type in ("Polygon", "MultiPolygon") and r["class"] in ("river", "lake", "reservoir", "water", "pond", "canal") and g.area > 1500:
        if g.intersects(REGION_BOX):
            inland.append(g)
inland_img = Image.new("L", (MW, MH), 0)
idr = ImageDraw.Draw(inland_img)
for g in inland:
    draw_poly(idr, g, 255)
land_m = np.asarray(mask_img) > 0
inland_m = np.asarray(inland_img) > 0
# signed distance to coast in metres (positive on land)
sd_f = (ndimage.distance_transform_edt(land_m) - ndimage.distance_transform_edt(~land_m)) * MS
sd_inl = ndimage.distance_transform_edt(~inland_m) * MS  # distance to inland water


def sample_raster(arr, s=MS):
    cx = (GX - XMIN) / s
    cy = (NMAX - GN) / s
    return ndimage.map_coordinates(arr.astype(np.float32), [cy, cx], order=1, mode="nearest")


SD = sample_raster(sd_f)
SDI = sample_raster(sd_inl)
INL = sample_raster(inland_m.astype(np.float32)) > 0.5

dem = np.load("data_raw/dem.npy")
dj = json.load(open("data_raw/dem.json"))
dem = np.clip(dem, -30, 300)
lon = GX / KX + LON0
lat = GN / KY + LAT0
n2 = 2 ** dj["z"]
px = ((lon + 180) / 360 * n2 - dj["tx0"]) * 256
py = ((1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * n2 - dj["ty0"]) * 256
H0 = ndimage.map_coordinates(dem, [py - 0.5, px - 0.5], order=1, mode="nearest")
H_fine = ndimage.gaussian_filter(H0, 1.3)
H_low = ndimage.gaussian_filter(H0, 5.0)
w_hi = np.clip((H_low - 6) / 16, 0, 1)
w_hi = w_hi * w_hi * (3 - 2 * w_hi)
H = H_low * (1 - w_hi) + H_fine * w_hi
# Núi Lớn / Núi Nhỏ: the 30 m DEM rounds the hills off, so lift them back a little
EXAG = 1.3
H = np.where(H > 3, 3 + (H - 3) * EXAG, H)
# flat urban land sits a little above the sea
H_land = np.maximum(H, 1.6)
# coastal envelope: land rises from the waterline
H_land = np.minimum(H_land, 0.25 + np.maximum(SD, 0) * 0.55)  # steep cliffs where the hills meet the sea
H_sea = np.maximum(-0.35 + SD * 0.035, -14.0)
Hm = np.where(SD > 0, H_land, H_sea)
# inland water: basin below sea level so the water plane shows
basin = -1.2
Hm = np.where(INL, basin, np.where((SD > 0) & (SDI < 14), np.minimum(Hm, basin + SDI * 0.2 + 0.3), Hm))


# --------------------------------------------------------------------------
# 3. Route elevation profile + carve corridor into terrain
# --------------------------------------------------------------------------
def sample_grid(arr, x, n):
    cx = (np.asarray(x) - XMIN) / CELL
    cy = (NMAX - np.asarray(n)) / CELL
    return ndimage.map_coordinates(arr, [cy, cx], order=1, mode="nearest")


prof = sample_grid(np.where(SD > 0, np.maximum(H, 1.6), 1.6), route_xy[:, 0], route_xy[:, 1])
prof = np.maximum(prof, 2.6)
for win in (21, 11):  # ~ +-40 m: keep the real ups and downs of the coast road
    prof = np.convolve(np.pad(prof, (win // 2, win // 2), mode="edge"), np.ones(win) / win, mode="valid")
prof = np.maximum(prof, 2.6)
# limit grade to ~12 % (steep but drivable, like Dốc Nghinh Phong) with symmetric passes
G = 0.12 * STEP
for _ in range(3):
    for i in range(1, len(prof)):
        prof[i] = np.clip(prof[i], prof[i - 1] - G, prof[i - 1] + G)
    for i in range(len(prof) - 2, -1, -1):
        prof[i] = np.clip(prof[i], prof[i + 1] - G, prof[i + 1] + G)
prof = np.convolve(np.pad(prof, (3, 3), mode="edge"), np.ones(7) / 7, mode="valid")
print(f"route elevation {prof.min():.1f} .. {prof.max():.1f} m")

best_d = np.full((NZ, NX), 1e9, np.float32)
best_h = np.zeros((NZ, NX), np.float32)
best_w = np.zeros((NZ, NX), np.float32)
best_f = np.zeros((NZ, NX), np.float32)
# extra level ground beside the big seafront parks (Bãi Trước on Quang Trung, Bãi Sau on Thùy Vân)
SEC_FLAT = np.array([0.0, 14.0, 0.0, 22.0])
route_flat = SEC_FLAT[route_sec]
RAD = 70.0
rc = int(RAD / CELL) + 1
for i in range(len(route_xy)):
    x, n_ = route_xy[i]
    ci = int(round((x - XMIN) / CELL))
    cj = int(round((NMAX - n_) / CELL))
    i0, i1 = max(ci - rc, 0), min(ci + rc + 1, NX)
    j0, j1 = max(cj - rc, 0), min(cj + rc + 1, NZ)
    if i0 >= i1 or j0 >= j1:
        continue
    d = np.hypot(GX[j0:j1, i0:i1] - x, GN[j0:j1, i0:i1] - n_)
    m = d < best_d[j0:j1, i0:i1]
    best_d[j0:j1, i0:i1][m] = d[m]
    best_h[j0:j1, i0:i1][m] = prof[i]
    best_w[j0:j1, i0:i1][m] = route_half[i]
    best_f[j0:j1, i0:i1][m] = route_flat[i]
flat = best_w + 9.0 + best_f
t = np.clip((best_d - flat) / 38.0, 0, 1)
t = t * t * (3 - 2 * t)
carved = (best_h - 0.25) * (1 - t) + Hm * t
# on the seaward side keep a sea wall: do not let the corridor drag the seabed far out
Hf = np.where(best_d < RAD, carved, Hm)
Hf = np.where((SD < -45) & (best_d > flat), np.minimum(Hf, Hm * 0.5 + Hf * 0.5), Hf)
Hf = np.clip(Hf, -19.5, 400).astype(np.float32)
(np.round((Hf + 20) * 100)).astype("<u2").tofile(f"{OUT}/terrain.bin")
print(f"terrain h {Hf.min():.1f} .. {Hf.max():.1f}")


def terrain_at(x, n):
    return sample_grid(Hf, x, n)


# --------------------------------------------------------------------------
# 4. Land cover grid
# --------------------------------------------------------------------------
# 0 urban, 1 forest, 2 grass/park, 3 sand, 4 rock, 5 golf green, 6 scrub
land_use = load("land_use")
land_cover = load("land_cover")
cov = Image.new("L", (NX, NZ), 0)
cdr = ImageDraw.Draw(cov)


def paint(df, sel, val):
    for _, r in df[sel].iterrows():
        g = r["geom"]
        if g.geom_type in ("Polygon", "MultiPolygon") and g.intersects(REGION_BOX):
            draw_poly(cdr, g, val, CELL)


paint(land_cover, land_cover["subtype"].isin(["shrub"]), 6)
paint(land_cover, land_cover["subtype"].isin(["forest", "mangrove"]), 1)
paint(land, land["class"].isin(["scrub"]), 6)
paint(land, land["class"].isin(["wood", "forest"]), 1)
paint(land, land["class"].isin(["grassland", "grass"]), 2)
paint(land_use, land_use["class"].isin(["park", "grass", "garden", "meadow", "pitch", "flowerbed"]), 2)
paint(land_use, land_use["subtype"].isin(["golf"]), 5)
paint(land, land["class"].isin(["bare_rock", "scree", "shingle"]), 4)
paint(land, land["class"].isin(["beach"]), 3)
cover = np.asarray(cov).copy()
# mountains without mapped cover are forest
slope = np.hypot(*np.gradient(Hf, CELL))
cover[(cover == 0) & (Hf > 22) & (SD > 0)] = 1
cover[(cover == 6) & (Hf > 30)] = 1
# natural sand strip along open coast where nothing else is mapped
cover[(cover == 0) & (SD > -30) & (SD < 14) & (Hf < 2.2)] = 3
cover[(Hf < 0.2) & (SD < 0)] = 3
cover[best_d < best_w + 2] = 0
cover.astype(np.uint8).tofile(f"{OUT}/cover.bin")


# --------------------------------------------------------------------------
# 5. Roads (everything except the main route)
# --------------------------------------------------------------------------
CLASS_CODE = {"primary": 0, "secondary": 1, "tertiary": 2, "residential": 3, "unclassified": 3,
              "living_street": 3, "service": 4, "unknown": 4, "pedestrian": 5, "footway": 6, "path": 6,
              "steps": 6, "track": 6, "cycleway": 6}
roads = []
for _, r in seg.iterrows():
    g = r["geom"]
    if g.geom_type != "LineString" or r["id"] in route_ids:
        continue
    code = CLASS_CODE.get(r["class"], 4)
    if not g.intersects(REGION_BOX):
        continue
    # twin carriageways of the main route are represented by the route itself
    if r["name"] in MAIN and r["class"] == "primary" and route_line.distance(g) < 24 and \
            route_line.distance(Point(g.coords[0])) < 30 and route_line.distance(Point(g.coords[-1])) < 30:
        continue
    g = g.intersection(REGION_BOX)
    if g.is_empty:
        continue
    for part in (g.geoms if g.geom_type.startswith("Multi") else [g]):
        if part.geom_type != "LineString" or part.length < 6:
            continue
        part = part.simplify(0.6)
        flat_ = []
        for x, n_ in part.coords:
            flat_ += [round(x * 10), round(-n_ * 10)]
        roads.append([code, flat_])
print("roads", len(roads))


# --------------------------------------------------------------------------
# 6. Buildings
# --------------------------------------------------------------------------
bld = load("building")
places = load("place")
hotel_pts = [g for g, c, conf in zip(places["geom"], places["basic_category"], places["confidence"])
             if c in ("hotel", "resort", "lodging") and conf > 0.6]
htree = STRtree(hotel_pts)


def hash01(s, salt=0):
    h = 2166136261
    for ch in (s + str(salt)):
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return h / 0xFFFFFFFF


sec_of_route = route_sec
rtree_pts = route_xy
from scipy.spatial import cKDTree
rkd = cKDTree(route_xy)

rects = []
polys = []
n_drop = 0
for _, r in bld.iterrows():
    g = r["geom"]
    if g.geom_type == "MultiPolygon":
        g = max(g.geoms, key=lambda p: p.area)
    if g.geom_type != "Polygon" or g.area < 14:
        continue
    c = g.centroid
    if not REGION_BOX.contains(c):
        continue
    dr_, ri = rkd.query([c.x, c.y])
    half = route_half[ri]
    if dr_ < 80 and route_line.distance(g) < half + 1.5:
        n_drop += 1
        continue
    # must stand on land
    if sample_grid(SD, [c.x], [c.y])[0] < 6 or sample_grid(Hf, [c.x], [c.y])[0] < 0.6:
        continue
    area = g.area
    hgt = r["height"]
    fl = r["num_floors"]
    u = hash01(r["id"])
    u2 = hash01(r["id"], 7)
    sec = sec_of_route[ri]
    strip = dr_ < 170 and sec in (1, 3)  # Bai Truoc / Thuy Van hotel strips
    is_hotel = False
    if area > 120:
        j = htree.nearest(c)
        is_hotel = hotel_pts[j].distance(g) < 4
    if hgt == hgt and hgt > 0:
        h = float(hgt)
    elif fl == fl and fl > 0:
        h = float(fl) * 3.4 + 1
    else:
        if area < 60:
            f = 1 + int(u * 2)
        elif area < 150:
            f = 2 + int(u * 3)
        elif area < 400:
            f = 2 + int(u * 4) + (3 if (strip and u2 > 0.5) else 0)
        elif area < 1300:
            f = 3 + int(u * 5) + (int(u2 * 12) if strip else 0)
        else:
            f = 2 + int(u * 3) + (int(u2 * 10) if strip else 0)
        if is_hotel:
            f = max(f, 5 + int(u2 * (10 if strip else 5)))
        h = f * 3.4 + 0.8
    h = min(h, 130)
    kind = {"religious": 2, "industrial": 3, "commercial": 1, "education": 4, "civic": 4}.get(r["subtype"], 0)
    if is_hotel:
        kind = 1
    is_osm = r["sources"] is not None and len(r["sources"]) and r["sources"][0]["dataset"] == "OpenStreetMap"
    mrr = g.minimum_rotated_rectangle
    rc_ = list(mrr.exterior.coords)[:4]
    e0 = (rc_[1][0] - rc_[0][0], rc_[1][1] - rc_[0][1])
    e1 = (rc_[2][0] - rc_[1][0], rc_[2][1] - rc_[1][1])
    w_, d_ = math.hypot(*e0), math.hypot(*e1)
    ang = math.atan2(e0[1], e0[0])
    fill = area / max(w_ * d_, 1e-6)
    corners_h = terrain_at([p[0] for p in rc_] + [c.x], [p[1] for p in rc_] + [c.y])
    base = float(corners_h.min()) - 0.4
    top_extra = float(corners_h.max() - corners_h.min())
    hh = h + top_extra
    seed = int(u * 255)
    use_poly = is_osm and fill < 0.86 and dr_ < 900 and area > 80
    if use_poly:
        s_ = g.simplify(0.8)
        if s_.geom_type != "Polygon" or len(s_.exterior.coords) < 4:
            s_ = mrr
        ring = list(s_.exterior.coords)[:-1]
        if not s_.exterior.is_ccw:
            ring = ring[::-1]
        flat_ = []
        for x, n_ in ring:
            flat_ += [round(x * 10), round(-n_ * 10)]
        polys.append([flat_, round(hh * 10), round(base * 10), kind, seed])
    else:
        mc = mrr.centroid
        # in three.js space (x, z=-n): rotation about Y by angle a maps local X to (cos a, -sin a)
        rects.append([round(mc.x * 4), round(-mc.y * 4), round(w_ * 10), round(d_ * 10),
                      round(ang * 10000), round(hh * 10), round(base * 10), kind | (seed << 3)])
ra = np.array(rects, dtype=np.int64)
assert np.abs(ra).max() < 32768, np.abs(ra).max(axis=0)
ra.astype("<i2").tofile(f"{OUT}/buildings.bin")
print(f"buildings: {len(rects)} rects, {len(polys)} polys, dropped on corridor {n_drop}")


# --------------------------------------------------------------------------
# 7. Signs: real business names along the route
# --------------------------------------------------------------------------
CAT_GROUP = {"hotel": "hotel", "resort": "hotel", "lodging": "hotel", "private_lodging": "hotel",
             "restaurant": "food", "casual_eatery": "food", "fast_food_restaurant": "food", "food_and_drink": "food",
             "coffee_shop": "cafe", "cafe": "cafe", "non_alcoholic_beverage_venue": "cafe", "bar": "bar",
             "lounge": "bar", "shopping": "shop", "convenience_store": "shop", "food_and_beverage_store": "shop",
             "fashion_and_apparel_store": "shop", "travel_service": "travel", "bank_or_credit_union": "bank",
             "wellness_service": "spa", "personal_or_beauty_service": "spa"}
cands = []
for g, name, cat, conf in zip(places["geom"], places["name"], places["basic_category"], places["confidence"]):
    if not name or conf < 0.6 or cat not in CAT_GROUP:
        continue
    if len(name) > 34 or len(name) < 3:
        continue
    d, ri = rkd.query([g.x, g.y])
    half = route_half[ri]
    if d > half + 38 or d < 2:
        continue
    # side: sign of cross product (route dir x offset)
    a = route_xy[min(ri + 1, len(route_xy) - 1)] - route_xy[max(ri - 1, 0)]
    off = np.array([g.x, g.y]) - route_xy[ri]
    side = 1 if (a[0] * off[1] - a[1] * off[0]) > 0 else -1  # +1 = left of travel direction
    cands.append((conf + (0.15 if CAT_GROUP[cat] == "hotel" else 0), ri, side, name, CAT_GROUP[cat], float(d)))
cands.sort(reverse=True)
taken = {1: [], -1: []}
signs = []
for conf, ri, side, name, grp, d in cands:
    if any(abs(ri - o) < 5 for o in taken[side]):  # 20 m spacing per side
        continue
    taken[side].append(ri)
    signs.append([int(ri), side, name, grp])
signs.sort()
print("signs", len(signs))


# --------------------------------------------------------------------------
# 8. Misc polygons: beaches, parks, piers, pools
# --------------------------------------------------------------------------
def poly_out(g, tol=1.5):
    out = []
    g = g.intersection(REGION_BOX)
    for p in (g.geoms if g.geom_type in ("MultiPolygon", "GeometryCollection") else [g]):
        if p.geom_type != "Polygon" or p.area < 20:
            continue
        p = p.simplify(tol)
        if p.geom_type != "Polygon":
            continue
        flat_ = []
        for x, n_ in list(p.exterior.coords)[:-1]:
            flat_ += [round(x * 10), round(-n_ * 10)]
        out.append(flat_)
    return out


beaches = []
for _, r in land[land["class"] == "beach"].iterrows():
    if r["geom"].geom_type in ("Polygon", "MultiPolygon") and r["geom"].intersects(REGION_BOX):
        for f in poly_out(r["geom"], 2.5):
            beaches.append({"name": clean(r["name"]), "pts": f})
parks = []
for _, r in land_use[land_use["class"].isin(["park", "garden", "pedestrian"])].iterrows():
    if r["geom"].geom_type in ("Polygon", "MultiPolygon") and r["geom"].intersects(REGION_BOX):
        for f in poly_out(r["geom"], 1.5):
            parks.append({"name": clean(r["name"]), "cls": r["class"], "pts": f})
infra = load("infrastructure")
piers = []
for _, r in infra[infra["class"] == "pier"].iterrows():
    g = r["geom"]
    if not g.intersects(REGION_BOX):
        continue
    if g.geom_type == "LineString":
        g = g.buffer(2.5, cap_style=2)
    for f in poly_out(g, 0.8):
        piers.append(f)
pools = []
for _, r in water[water["class"] == "swimming_pool"].iterrows():
    if r["geom"].geom_type == "Polygon" and r["geom"].intersects(REGION_BOX):
        pools += poly_out(r["geom"], 0.5)
waters = []
for g in inland:
    waters += poly_out(g, 3)
rocks = []
for _, r in land[land["class"].isin(["bare_rock", "scree", "shingle"])].iterrows():
    if r["geom"].geom_type in ("Polygon", "MultiPolygon") and r["geom"].intersects(REGION_BOX):
        rocks += poly_out(r["geom"], 2)
print("beaches", len(beaches), "parks", len(parks), "piers", len(piers), "pools", len(pools))


# --------------------------------------------------------------------------
# 9. Write world.json
# --------------------------------------------------------------------------
# The tour starts at Bãi Sau: reverse the route (Thùy Vân -> Hạ Long -> Quang Trung -> Trần Phú).
# Driving that way the sea is on the LEFT (seaSide = -1).
sections = []
for s_i, name in reversed(list(enumerate(MAIN))):
    ii = np.where(route_sec == s_i)[0]
    a, b = float(ii[0] * STEP), float(min((ii[-1] + 1) * STEP, ROUTE_LEN))
    sections.append({"name": name, "from": round(ROUTE_LEN - b, 1), "to": round(ROUTE_LEN - a, 1)})
sections[0]["from"] = 0.0
sections[-1]["to"] = round(float(ROUTE_LEN), 1)
route_xy, prof, route_half, route_dual = route_xy[::-1], prof[::-1], route_half[::-1], route_dual[::-1]
signs = [[len(route_xy) - 1 - ri, -side, name, grp] for ri, side, name, grp in signs][::-1]
route_out = []
for (x, n_), y in zip(route_xy, prof):
    route_out += [round(float(x), 2), round(float(y), 2), round(float(-n_), 2)]
world = {
    "meta": {"lon0": LON0, "lat0": LAT0, "kx": KX, "ky": KY, "cell": CELL, "nx": NX, "nz": NZ,
             "x0": XMIN, "z0": -NMAX, "hScale": 0.01, "hOffset": -20},
    "route": {"step": STEP, "length": round(float(ROUTE_LEN), 2), "pts": route_out,
              "half": [round(float(v), 2) for v in route_half],
              "dual": [int(b) for b in route_dual], "sections": sections, "seaSide": -1},
    "roads": roads,
    "bpolys": polys,
    "signs": signs,
    "beaches": beaches,
    "parks": parks,
    "piers": piers,
    "pools": pools,
    "waters": waters,
    "rocks": rocks,
}
json.dump(world, open(f"{OUT}/world.json", "w"), ensure_ascii=False, separators=(",", ":"), allow_nan=False)
for f in os.listdir(OUT):
    print(f"  {f}: {os.path.getsize(os.path.join(OUT, f)) / 1024:.0f} KB")

if DEBUG:
    S = 2
    img = np.zeros((NZ, NX, 3), np.uint8)
    sh = np.clip(1 - (np.gradient(Hf, axis=1) + np.gradient(Hf, axis=0)) * 0.12, 0.4, 1.5)
    pal = np.array([[150, 150, 140], [50, 120, 60], [120, 180, 90], [235, 220, 160], [120, 110, 100], [90, 200, 110], [110, 140, 80]])
    col = pal[cover] * sh[..., None]
    sea = Hf < 0
    col[sea] = np.stack([30 + 0 * Hf, 110 + Hf * 4, 190 + Hf * 5], -1)[sea]
    im = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).resize((NX * S, NZ * S))
    d_ = ImageDraw.Draw(im)
    k_ = S / CELL
    for b in rects:
        cx, cz = b[0] / 4, b[1] / 4
        d_.point(((cx - XMIN) * k_, (cz + NMAX) * k_), fill=(90, 70, 60))
    for code, f in roads:
        if code <= 3:
            d_.line([((f[i] / 10 - XMIN) * k_, (f[i + 1] / 10 + NMAX) * k_) for i in range(0, len(f), 2)], fill=(255, 255, 255), width=1)
    d_.line([((x - XMIN) * k_, (NMAX - n_) * k_) for x, n_ in route_xy], fill=(255, 40, 40), width=3)
    im.save("data_raw/debug_world.png")
