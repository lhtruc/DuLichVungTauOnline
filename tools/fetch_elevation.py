"""Download Terrarium elevation tiles (AWS open data) for the Vung Tau bbox and
mosaic them into one float32 array (data_raw/dem.npy + dem.json with georef)."""
import io
import json
import math
import urllib.request
import numpy as np
from PIL import Image

Z = 14
BBOX = (107.040, 10.305, 107.125, 10.400)
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def lonlat_to_tile(lon, lat, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def tile_to_lonlat(x, y, z):
    n = 2 ** z
    lon = x / n * 360.0 - 180.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    return lon, lat


w, s, e, n = BBOX
x0, y0 = lonlat_to_tile(w, n, Z)
x1, y1 = lonlat_to_tile(e, s, Z)
tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
W = (tx1 - tx0 + 1) * 256
H = (ty1 - ty0 + 1) * 256
dem = np.zeros((H, W), dtype=np.float32)
for ty in range(ty0, ty1 + 1):
    for tx in range(tx0, tx1 + 1):
        url = URL.format(z=Z, x=tx, y=ty)
        with urllib.request.urlopen(url, timeout=60) as r:
            img = np.asarray(Image.open(io.BytesIO(r.read())).convert("RGB"), dtype=np.float32)
        h = img[..., 0] * 256 + img[..., 1] + img[..., 2] / 256 - 32768
        dem[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = h
        print("tile", tx, ty, float(h.min()), float(h.max()), flush=True)

np.save("data_raw/dem.npy", dem)
json.dump({"z": Z, "tx0": tx0, "ty0": ty0, "w": W, "h": H}, open("data_raw/dem.json", "w"))
print("dem", dem.shape, dem.min(), dem.max())
