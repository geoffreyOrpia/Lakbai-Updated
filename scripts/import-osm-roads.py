"""Extract road ways and restriction relations from a dated OSM PBF.

Build-time only: pip install -r scripts/requirements-routing.txt
The GeoJSON lines preserve OSM node identity and all way tags. The metadata
sidecar preserves node tags, restriction members, provenance and checksums.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path

import osmium


def digest(path, algorithm='sha256'):
    result = hashlib.new(algorithm)
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def province_bounds(path, buffer_km):
    boundaries = json.loads(Path(path).read_text(encoding='utf-8'))
    points = []

    def visit(coordinates):
        if isinstance(coordinates[0], (int, float)):
            points.append(coordinates)
        else:
            for child in coordinates:
                visit(child)

    for feature in boundaries['features']:
        visit(feature['geometry']['coordinates'])
    west, south = min(p[0] for p in points), min(p[1] for p in points)
    east, north = max(p[0] for p in points), max(p[1] for p in points)
    import math
    lat_padding = buffer_km / 110
    lng_padding = lat_padding / math.cos(math.radians((south + north) / 2))
    return [west - lng_padding, south - lat_padding, east + lng_padding, north + lat_padding]


def segment_touches(a, b, bounds):
    west, south, east, north = bounds
    return not (max(a[0], b[0]) < west or min(a[0], b[0]) > east
                or max(a[1], b[1]) < south or min(a[1], b[1]) > north)


class Roads(osmium.SimpleHandler):
    def __init__(self, stream, bounds):
        super().__init__()
        self.stream = stream
        self.bounds = bounds
        self.way_ids = set()
        self.node_ids = set()
        self.node_tags = {}
        self.restrictions = []
        self.invalid_ways = 0

    def node(self, node):
        if node.tags and node.location.valid():
            lng, lat = node.location.lon, node.location.lat
            west, south, east, north = self.bounds
            if west <= lng <= east and south <= lat <= north:
                self.node_tags[str(node.id)] = dict(node.tags)

    def way(self, way):
        if 'highway' not in way.tags:
            return
        if len(way.nodes) < 2:
            return
        if any(not node.location.valid() for node in way.nodes):
            self.invalid_ways += 1
            return
        coordinates = [[node.lon, node.lat] for node in way.nodes]
        if not any(segment_touches(a, b, self.bounds) for a, b in zip(coordinates, coordinates[1:])):
            return
        self.way_ids.add(way.id)
        refs = [str(node.ref) for node in way.nodes]
        self.node_ids.update(refs)
        properties = dict(way.tags)
        properties.update(osm_id=str(way.id), osm_node_ids=refs)
        self.stream.write(json.dumps({
            'type': 'Feature', 'properties': properties,
            'geometry': {'type': 'LineString', 'coordinates': coordinates},
        }, separators=(',', ':')) + '\n')

    def relation(self, relation):
        tags = dict(relation.tags)
        if tags.get('type') != 'restriction':
            return
        members = [{'type': member.type, 'ref': str(member.ref), 'role': member.role}
                   for member in relation.members]
        if any(member.type == 'w' and member.ref in self.way_ids for member in relation.members):
            self.restrictions.append({'id': str(relation.id), 'tags': tags, 'members': members})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--source-url', required=True)
    parser.add_argument('--source-exported-at', help='Fallback when the input has no replication timestamp')
    parser.add_argument('--boundary', default=str(Path(__file__).resolve().parents[1] / 'src/data/assets/davaoDelNorteMunicipalities.json'))
    parser.add_argument('--buffer-km', type=float, default=2)
    args = parser.parse_args()
    if not 0 <= args.buffer_km <= 10:
        parser.error('--buffer-km must be between 0 and 10')
    source = Path(args.source).resolve()
    output = Path(args.output).resolve()
    if source == output:
        parser.error('Source and output must differ')
    with osmium.io.Reader(str(source)) as reader:
        timestamp = reader.header().get('osmosis_replication_timestamp') or args.source_exported_at
    if not timestamp:
        parser.error('Input has no replication timestamp; provide --source-exported-at')
    bounds = province_bounds(args.boundary, args.buffer_km)
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = output.with_suffix(output.suffix + '.partial')
    try:
        with staging.open('w', encoding='utf-8', newline='\n') as stream:
            handler = Roads(stream, bounds)
            handler.apply_file(str(source), locations=True, idx='flex_mem')
        if not handler.way_ids or handler.invalid_ways:
            raise ValueError(f'Extraction incomplete: {len(handler.way_ids)} ways, {handler.invalid_ways} ways with missing locations')
        metadata = {
            'format': 'lakbai-osm-roads-v1',
            'sourceDataset': 'Geofabrik Philippines OpenStreetMap extract',
            'source': 'OpenStreetMap contributors / Geofabrik',
            'sourceUrl': args.source_url,
            'sourceExportedAt': timestamp,
            'sourceSha256': digest(source),
            'roadsSha256': digest(staging),
            'sourceBytes': source.stat().st_size,
            'license': 'ODbL 1.0',
            'region': 'davao-del-norte',
            'bounds': bounds,
            'bufferKm': args.buffer_km,
            'wayCount': len(handler.way_ids),
            'nodeCount': len(handler.node_ids),
            'nodeTags': {key: value for key, value in handler.node_tags.items() if key in handler.node_ids},
            'restrictions': handler.restrictions,
            'validationStatus': 'unverified',
        }
        metadata_path = output.with_suffix('.metadata.json')
        metadata_staging = metadata_path.with_suffix('.json.partial')
        metadata_staging.write_text(json.dumps(metadata, separators=(',', ':')), encoding='utf-8')
        os.replace(staging, output)
        os.replace(metadata_staging, metadata_path)
        print(json.dumps({
            'roads': str(output), 'metadata': str(metadata_path), 'bounds': bounds,
            'ways': metadata['wayCount'], 'nodes': metadata['nodeCount'],
            'restrictions': len(handler.restrictions), 'sourceExportedAt': timestamp,
            'sourceSha256': metadata['sourceSha256'],
        }, indent=2))
    finally:
        if staging.exists():
            staging.unlink()


if __name__ == '__main__':
    main()
