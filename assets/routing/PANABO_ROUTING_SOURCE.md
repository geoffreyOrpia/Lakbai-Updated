# Panabo offline routing pilot data

LakBai's first road/path routing graph is generated from the **HOT OSM Philippines Roads** line export.

- Source: Humanitarian OpenStreetMap Team / OpenStreetMap contributors
- HDX dataset: https://data.humdata.org/dataset/hotosm_phl_roads
- Source export timestamp: 2026-05-05 21:53:31 UTC
- License: Open Database License (ODbL) 1.0
- Pilot bounds: west 125.650, south 7.245, east 125.705, north 7.325

The checked-in graph is intentionally limited to the Panabo pilot area while LakBai's offline navigation engine is validated. It is separate from the PMTiles basemap: PMTiles draws the map, while this graph stores connected road/path topology for A* routing. Live navigation derives maneuver prompts, route progress, and confirmed off-route rerouting from this same local graph; those prompts are generated guidance, not a substitute for posted road signs or official access rules.

## Regeneration

Obtain the HOT OSM Philippines road-lines GeoJSON, then run:

```powershell
npm run routing:prepare -- --source="path\\to\\hotosm_phl_roads_lines_geojson.geojson"
```

The build script streams the source feature-by-feature, clips road segments to the pilot bounds, creates graph nodes from shared OSM geometry vertices, and records directed edges with distance, road class, name, surface, walking access, and prototype driving access.

## Current limitations

The HOT road export used here does not expose every OpenStreetMap access/restriction tag. LakBai therefore treats this first graph conservatively and clearly labels it a pilot. Real signs, closures, private-property restrictions, and official traffic rules always take precedence. The graph must not be presented as verified trail geometry; verified trails use their own source-reviewed data pipeline.
