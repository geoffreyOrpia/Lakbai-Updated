"""Report place kinds present at an archive's highest zoom, without dependencies.

Usage: python scripts/inspect-map-places.py assets/maps/davao-del-norte.pmtiles
Reads PMTiles v3 directories and the MVT `pois` layer; counts tile features,
not unique real-world places (tile edges can repeat a feature).
"""
import collections
import gzip
import json
import struct
import sys
from pathlib import Path


def varint(data, position):
    result = shift = 0
    while True:
        value = data[position]
        position += 1
        result |= (value & 127) << shift
        if value < 128:
            return result, position
        shift += 7


def fields(data):
    position = 0
    while position < len(data):
        tag, position = varint(data, position)
        wire = tag & 7
        if wire == 0:
            value, position = varint(data, position)
        elif wire == 2:
            length, position = varint(data, position)
            value = data[position:position + length]
            position += length
        elif wire in (1, 5):
            length = 8 if wire == 1 else 4
            value = data[position:position + length]
            position += length
        else:
            raise ValueError(f'Unknown protobuf wire type: {wire}')
        yield tag >> 3, wire, value


def decompress(data):
    return gzip.decompress(data) if data[:2] == b'\x1f\x8b' else data


def directory(data):
    data = decompress(data)
    count, position = varint(data, 0)
    ids, runs, lengths, offsets = [], [], [], []
    last = 0
    for _ in range(count):
        value, position = varint(data, position)
        last += value
        ids.append(last)
    for values in (runs, lengths):
        for _ in range(count):
            value, position = varint(data, position)
            values.append(value)
    for index in range(count):
        value, position = varint(data, position)
        offsets.append(offsets[-1] + lengths[index - 1] if value == 0 and index else value - 1)
    return zip(ids, runs, lengths, offsets)


def inspect(path):
    archive = Path(path).read_bytes()
    assert archive[:8] == b'PMTiles\x03', 'Expected PMTiles v3'
    root, root_length = struct.unpack_from('<QQ', archive, 8)
    leaf = struct.unpack_from('<Q', archive, 40)[0]
    tiles = struct.unpack_from('<Q', archive, 56)[0]
    zoom = archive[101]
    first = (4 ** zoom - 1) // 3
    last = (4 ** (zoom + 1) - 1) // 3

    def entries(data):
        for tile, run, length, offset in directory(data):
            if run:
                yield tile, length, offset
            else:
                yield from entries(archive[leaf + offset:leaf + offset + length])

    counts, seen = collections.Counter(), set()
    for tile, length, offset in entries(archive[root:root + root_length]):
        if not first <= tile < last or offset in seen:
            continue
        seen.add(offset)
        for field, _, layer in fields(decompress(archive[tiles + offset:tiles + offset + length])):
            if field != 3:
                continue
            parts = list(fields(layer))
            if next((v for f, _, v in parts if f == 1), b'') != b'pois':
                continue
            keys = [v.decode() for f, _, v in parts if f == 3]
            values = [next((v.decode() for f, _, v in fields(value) if f == 1), None)
                      for field, _, value in parts if field == 4]
            for field, _, feature in parts:
                if field != 2:
                    continue
                tags = next((v for f, _, v in fields(feature) if f == 2), b'')
                position, properties = 0, {}
                while position < len(tags):
                    key, position = varint(tags, position)
                    value, position = varint(tags, position)
                    properties[keys[key]] = values[value]
                counts[properties.get('kind', '?')] += 1
    return {'maxzoom': zoom, 'bytes': len(archive), 'tile_contents_checked': len(seen),
            'place_features': sum(counts.values()), 'kinds': dict(counts.most_common())}


if __name__ == '__main__':
    print(json.dumps(inspect(sys.argv[1]), indent=2))
