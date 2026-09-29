# Davao del Norte offline basemap

LakBai always saves a local municipality boundary with each destination pack, so offline mode has geographic context even when no detailed basemap archive is present. The boundary geometry comes from the 2023 PSGC-based Philippines JSON Maps dataset; see `BOUNDARY_SOURCE.md`.

LakBai also ships a shared local PMTiles vector basemap for roads, water, land, buildings, and useful places. The checked-in archive is bounded to Davao del Norte and includes zoom 15 (23,872,600 bytes). Zoom 13 omitted small amenities such as cafés, ATMs, toilets, and drinking water; zoom 15 contains these place types. This remains a mapped subset, not a complete directory of every business or facility.

The directions map uses distinct place symbols and category filters. Places from the open destination guide are also shown without the three-item limit used by the along-route list. Saved map filenames include the bundle revision so existing installations receive the detailed map when they next prepare a map, while previous files remain intact.

Inspect the kinds of places in an archive with `python scripts/inspect-map-places.py assets/maps/davao-del-norte.pmtiles`. Counts are tile features, not unique real-world places. The official CLI's `pmtiles verify` checks archive structure.

To regenerate the detailed archive:

```powershell
npm run maps:prepare
```

The script expects the official `pmtiles` CLI on `PATH`. It extracts a bounded Davao del Norte region from a pinned Protomaps daily build at a limited maximum zoom, then enables the asset through `src/data/assets/offlineBasemapAsset.jsx`.

The generated `davao-del-norte.pmtiles` file is derived from OpenStreetMap/open data via Protomaps. Preserve the in-app attribution: **© OpenStreetMap contributors · Protomaps**.

Do not build this archive by bulk-downloading tiles from `tile.openstreetmap.org`; the standard OpenStreetMap tile service prohibits offline/bulk tile downloading.
