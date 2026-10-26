"""
Builds public/data/facilities-<country>.json, the country-wide list of hospitals, clinics and
pharmacies that the app searches on the device.

The data comes from Geofabrik's daily OpenStreetMap extract for the country (no API, no rate
limits). The output uses the same shape as an Overpass response, so the app cleans both up
with the same code.

Usage:
    pip install osmium
    python scripts/export_facilities.py                   # downloads Malawi from Geofabrik
    python scripts/export_facilities.py --pbf malawi.osm.pbf
    python scripts/export_facilities.py --region africa/zambia --code zm

Re-run to refresh the data; .github/workflows/update-facilities.yml does this monthly.
"""

import argparse
import json
import re
import sys
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import osmium

TYPES = {"hospital", "clinic", "pharmacy"}
# Primary-care places mapped under other tags (common for rural health posts); the app shows them as clinics.
CLINIC_AMENITIES = {"doctors", "health_post"}
CLINIC_HEALTHCARE = {"doctor", "health_post", "centre"}
# Only the tags the app reads are kept, to keep the file small.
KEPT_TAGS = re.compile(r"^(amenity|healthcare|name|name:en|phone|contact:phone|mobile|contact:mobile|opening_hours|addr:.*)$")
ROOT = Path(__file__).resolve().parent.parent


def is_facility(tags) -> bool:
    amenity, healthcare = tags.get("amenity"), tags.get("healthcare")
    return amenity in TYPES | CLINIC_AMENITIES or healthcare in TYPES | CLINIC_HEALTHCARE


def kept_tags(tags) -> dict:
    return {tag.k: tag.v for tag in tags if KEPT_TAGS.match(tag.k)}


def bbox_center(points):
    lats = [lat for lat, _ in points]
    lons = [lon for _, lon in points]
    return (min(lats) + max(lats)) / 2, (min(lons) + max(lons)) / 2


def record(osm_type: str, osm_id: int, lat: float, lon: float, tags) -> dict:
    return {"type": osm_type, "id": osm_id, "lat": round(lat, 6), "lon": round(lon, 6), "tags": kept_tags(tags)}


def extract(pbf: Path) -> list[dict]:
    facilities = []
    # Locations let ways report their nodes' coordinates; areas assemble multipolygon relations.
    for obj in osmium.FileProcessor(str(pbf)).with_locations().with_areas():
        if not obj.tags or not is_facility(obj.tags):
            continue
        if obj.is_node():
            if obj.location.valid():
                facilities.append(record("node", obj.id, obj.location.lat, obj.location.lon, obj.tags))
        elif obj.is_way():
            points = [(n.location.lat, n.location.lon) for n in obj.nodes if n.location.valid()]
            if points:
                facilities.append(record("way", obj.id, *bbox_center(points), obj.tags))
        elif obj.is_area() and not obj.from_way():
            # Ways are handled above; areas cover facilities mapped as relations.
            points = [(n.lat, n.lon) for ring in obj.outer_rings() for n in ring if n.location.valid()]
            if points:
                facilities.append(record("relation", obj.orig_id(), *bbox_center(points), obj.tags))
    return facilities


def download(region: str, folder: Path) -> Path:
    url = f"https://download.geofabrik.de/{region}-latest.osm.pbf"
    target = folder / f"{region.split('/')[-1]}-latest.osm.pbf"
    print(f"Downloading {url}", flush=True)
    urllib.request.urlretrieve(url, target)
    return target


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pbf", type=Path, help="Use an already downloaded .osm.pbf file")
    parser.add_argument("--region", default="africa/malawi", help="Geofabrik region path (default: africa/malawi)")
    parser.add_argument("--code", default="mw", help="Country code used in the output file name (default: mw)")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        pbf = args.pbf or download(args.region, Path(tmp))
        facilities = extract(pbf)

    if not facilities:
        sys.exit("No facilities found; not overwriting the data file.")

    facilities.sort(key=lambda f: (f["type"], f["id"]))
    output = ROOT / "public" / "data" / f"facilities-{args.code.lower()}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            {
                "country": args.code.upper(),
                "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "source": f"Geofabrik {args.region} extract",
                "attribution": "© OpenStreetMap contributors, ODbL",
                "elements": facilities,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(facilities)} facilities to {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
