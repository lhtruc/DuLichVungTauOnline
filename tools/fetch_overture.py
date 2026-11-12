"""Fetch Overture Maps features for the Vung Tau peninsula into local parquet files.

Usage: python3 tools/fetch_overture.py [type ...]
Reads straight from the public Overture S3 bucket with bbox predicate pushdown.
"""
import sys
import time
import pyarrow.dataset as ds
import pyarrow.compute as pc
import pyarrow.parquet as pq
from pyarrow import fs

RELEASE = "2026-10-21.0"
# west, south, east, north — covers Tran Phu (Ben Da) -> Bai Truoc -> Ha Long -> Thuy Van
BBOX = (107.040, 10.305, 107.125, 10.400)

TYPES = {
    "segment": "theme=transportation/type=segment",
    "building": "theme=buildings/type=building",
    "building_part": "theme=buildings/type=building_part",
    "water": "theme=base/type=water",
    "land": "theme=base/type=land",
    "land_use": "theme=base/type=land_use",
    "land_cover": "theme=base/type=land_cover",
    "infrastructure": "theme=base/type=infrastructure",
    "place": "theme=places/type=place",
}


def fetch(name: str) -> None:
    t0 = time.time()
    s3 = fs.S3FileSystem(anonymous=True, region="us-west-2")
    path = f"overturemaps-us-west-2/release/{RELEASE}/{TYPES[name]}/"
    dataset = ds.dataset(path, filesystem=s3, format="parquet")
    w, s, e, n = BBOX
    flt = (
        (pc.field("bbox", "xmin") < e)
        & (pc.field("bbox", "xmax") > w)
        & (pc.field("bbox", "ymin") < n)
        & (pc.field("bbox", "ymax") > s)
    )
    table = dataset.to_table(filter=flt)
    out = f"data_raw/{name}.parquet"
    pq.write_table(table, out)
    print(f"{name}: {table.num_rows} rows -> {out} ({time.time() - t0:.1f}s)", flush=True)


if __name__ == "__main__":
    names = sys.argv[1:] or list(TYPES)
    for nm in names:
        fetch(nm)
