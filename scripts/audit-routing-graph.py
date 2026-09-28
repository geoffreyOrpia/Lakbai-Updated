"""Audit a candidate graph; coverage counts are not field validation."""
import argparse
from collections import Counter, deque
import hashlib
import json
from pathlib import Path

import shapely
from shapely.geometry import shape


def components(nodes, edges, mode):
    parent = {}
    adjacency = {}

    def find(node):
        parent.setdefault(node, node)
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    for edge in edges:
        if edge.get(mode, True) is False:
            continue
        start, end = edge['from'], edge['to']
        a, b = find(start), find(end)
        if a != b:
            parent[a] = b
        adjacency.setdefault(start, []).append(end)
        adjacency.setdefault(end, [])
    membership = {node: find(node) for node in parent}
    sizes = Counter(membership.values())
    return membership, sizes, adjacency


def reachable(adjacency, start):
    seen = {start}
    queue = deque([start])
    while queue:
        for target in adjacency.get(queue.popleft(), []):
            if target not in seen:
                seen.add(target)
                queue.append(target)
    return seen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--graph', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--boundaries', default=str(Path(__file__).resolve().parents[1] / 'src/data/assets/davaoDelNorteMunicipalities.json'))
    args = parser.parse_args()
    graph_path = Path(args.graph)
    content = graph_path.read_bytes()
    graph = json.loads(content)
    boundaries = json.loads(Path(args.boundaries).read_text())
    nodes = graph['nodes']
    node_ids = {node['id'] for node in nodes}
    invalid_edges = sum(edge['from'] not in node_ids or edge['to'] not in node_ids
                        or edge['distanceKm'] < 0 for edge in graph['edges'])
    if invalid_edges:
        raise ValueError(f'{invalid_edges} invalid graph edges')
    lngs, lats = [node['lng'] for node in nodes], [node['lat'] for node in nodes]
    areas = []
    for feature in boundaries['features']:
        polygon = shape(feature['geometry'])
        mask = shapely.contains_xy(polygon, lngs, lats)
        contained = [node for node, inside in zip(nodes, mask) if inside]
        center = polygon.representative_point()
        areas.append((feature['properties']['adm3_en'], contained, center))
    report = {
        'status': 'candidate-not-enabled',
        'source': {key: graph['meta'].get(key) for key in ['sourceUrl','sourceExportedAt','sourceSha256','roadsSha256','license']},
        'graphSha256': hashlib.sha256(content).hexdigest(),
        'graphBytes': len(content), 'nodes': len(nodes), 'directedEdges': len(graph['edges']),
        'bounds': graph['meta']['bounds'],
        'boundaryBufferKm': graph['meta'].get('boundaryBufferKm'),
        'preservedTurnRestrictions': len(graph.get('turnRestrictions', [])),
        'taggedBarrierNodes': sum(bool(node.get('osmTags', {}).get('barrier')) for node in nodes),
        'invalidEdges': invalid_edges,
        'modeConnectivity': {},
        'limitations': [
            'Counts establish mapped data presence, not complete or field-verified coverage.',
            'Weak components ignore travel direction. The anchor matrix separately checks directed reachability.',
            'Anchors are automatically chosen inside each municipality in its largest local component; they are not verified entrances.',
            'Turn restrictions and barriers are preserved but not enforced by the current engine.',
            'Ferries are excluded. Source-mapped road connectivity does not prove a crossing is open or usable.',
            'Desktop checks do not establish mobile memory, performance, battery use, or GPS reliability.',
        ],
    }
    for mode in ['walk', 'drive']:
        membership, sizes, adjacency = components(nodes, graph['edges'], mode)
        summary = {'routableNodes': len(membership), 'weakComponents': len(sizes),
                   'largestComponentNodes': sorted(sizes.values(), reverse=True)[:10], 'areas': []}
        anchors = {}
        for name, contained, center in areas:
            candidates = [node for node in contained if node['id'] in membership]
            area_components = Counter(membership[node['id']] for node in candidates)
            area = {'name': name, 'routableNodes': len(candidates), 'weakComponents': len(area_components)}
            if candidates:
                largest = area_components.most_common(1)[0][0]
                anchor = min((node for node in candidates if membership[node['id']] == largest),
                             key=lambda node: (node['lng'] - center.x) ** 2 + (node['lat'] - center.y) ** 2)
                area['largestLocalComponentSharePct'] = round(area_components[largest] / len(candidates) * 100, 2)
                area['anchor'] = {key: anchor[key] for key in ['id', 'lat', 'lng']}
                sample_end = max((node for node in candidates if membership[node['id']] == largest),
                                 key=lambda node: (node['lng'] - anchor['lng']) ** 2 + (node['lat'] - anchor['lat']) ** 2)
                area['sampleDestination'] = {key: sample_end[key] for key in ['id', 'lat', 'lng']}
                anchors[name] = anchor['id']
            summary['areas'].append(area)
        summary['directedAnchorReachability'] = {}
        for name, anchor in anchors.items():
            reached = reachable(adjacency, anchor)
            summary['directedAnchorReachability'][name] = [target for target, node_id in anchors.items() if node_id in reached]
        report['modeConnectivity'][mode] = summary
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['status','graphBytes','nodes','directedEdges','preservedTurnRestrictions','taggedBarrierNodes','invalidEdges']}, indent=2))


if __name__ == '__main__':
    main()
