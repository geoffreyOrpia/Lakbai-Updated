# Davao del Norte offline basemap

LakBai always saves a local municipality boundary with each destination pack, so offline mode has geographic context even when no detailed basemap archive is present. The boundary geometry comes from the 2023 PSGC-based Philippines JSON Maps dataset; see `BOUNDARY_SOURCE.md`.

LakBai also ships a shared local PMTiles vector basemap for roads, water, land, and buildings. The checked-in archive is bounded to Davao del Norte and capped at zoom 13 so it stays practical for the prototype.

To regenerate the detailed archive:

```powershell
npm run maps:prepare
```

The script expects the official `pmtiles` CLI on `PATH`. It extracts a bounded Davao del Norte region from a pinned Protomaps daily build at a limited maximum zoom, then enables the asset through `src/data/assets/offlineBasemapAsset.jsx`.

The generated `davao-del-norte.pmtiles` file is derived from OpenStreetMap/open data via Protomaps. Preserve the in-app attribution: **© OpenStreetMap contributors · Protomaps**.

Do not build this archive by bulk-downloading tiles from `tile.openstreetmap.org`; the standard OpenStreetMap tile service prohibits offline/bulk tile downloading.
