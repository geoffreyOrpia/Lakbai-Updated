import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createDestinationMapData, destinationMapBounds } from "../../../core/maps/destinationMapData.jsx";
import { createOfflineBasemapStyle } from "../../../core/maps/offlineBasemapStyle.jsx";
import { createOfflineContextMapData, offlineContextMapBounds } from "../../../core/maps/offlineContextMapData.jsx";
import { colors, radius, spacing } from "../../../theme.jsx";

const OSM_STYLE = {
  version: 8,
  sources: {
    openstreetmap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{
    id: 'openstreetmap',
    type: 'raster',
    source: 'openstreetmap',
  }],
};

const OFFLINE_STYLE = {
  version: 8,
  sources: {},
  layers: [{
    id: 'offline-background',
    type: 'background',
    paint: {
      'background-color': colors.surfaceSunken,
    },
  }],
};

export const DestinationMap = ({
  pack,
  offlineMapUri = null,
  offlineContextUri = null,
  offlineBasemapUri = null,
}) => {
  const geojson = createDestinationMapData(pack);
  const bounds = destinationMapBounds(geojson);
  const contextGeojson = createOfflineContextMapData(pack);
  const contextBounds = offlineContextMapBounds(contextGeojson);
  const canUseOffline = Boolean(offlineMapUri);
  const [mode, setMode] = useState(canUseOffline ? 'offline' : 'online');
  useEffect(() => {
    if (!canUseOffline && mode === 'offline') {
      setMode('online');
    }
  }, [canUseOffline, mode]);
  if (!bounds) return null;

  const offline = mode === 'offline' && canUseOffline;
  const detailedOffline = offline && Boolean(offlineBasemapUri);
  const hasOfflineContext = offline && Boolean(offlineContextUri);
  const offlineStyle = detailedOffline
    ? createOfflineBasemapStyle(offlineBasemapUri)
    : OFFLINE_STYLE;
  const mapData = offline ? offlineMapUri : geojson;
  const activeBounds = hasOfflineContext ? (contextBounds ?? bounds) : bounds;
  return <View style={styles.card}>
      {canUseOffline ? <View style={styles.modeRow}>
          <MapModeButton label="Offline pack" active={offline} onPress={() => setMode('offline')} />
          <MapModeButton label="Online OSM" active={!offline} onPress={() => setMode('online')} />
        </View> : null}
      <View style={styles.mapFrame}>
        <Map
          key={offline ? (detailedOffline ? 'offline-detailed' : 'offline-context') : 'online'}
          style={styles.map}
          mapStyle={offline ? offlineStyle : OSM_STYLE}
          attribution={!offline || detailedOffline}
          attributionPosition={{ bottom: 8, right: 8 }}
          logo={false}
          compass
          compassPosition={{ top: 8, right: 8 }}
        >
          <Camera initialViewState={{
            bounds: activeBounds,
            padding: {
              top: 44,
              right: 44,
              bottom: 44,
              left: 44,
            },
          }} />
          {hasOfflineContext ? <GeoJSONSource id="lakbaylokal-context" data={offlineContextUri}>
              <Layer
                id="lakbaylokal-context-fill"
                type="fill"
                source="lakbaylokal-context"
                paint={{
                  'fill-color': colors.primarySofter,
                  'fill-opacity': detailedOffline ? 0.12 : 0.78,
                }}
              />
              <Layer
                id="lakbaylokal-context-boundary"
                type="line"
                source="lakbaylokal-context"
                paint={{
                  'line-color': colors.primary,
                  'line-opacity': detailedOffline ? 0.45 : 0.72,
                  'line-width': 1.6,
                }}
              />
            </GeoJSONSource> : null}
          <GeoJSONSource id="lakbaylokal-places" data={mapData}>
            <Layer
              id="lakbaylokal-place-dots"
              type="circle"
              source="lakbaylokal-places"
              paint={{
                'circle-radius': 7,
                'circle-color': colors.primary,
                'circle-stroke-color': colors.white,
                'circle-stroke-width': 2,
              }}
            />
          </GeoJSONSource>
        </Map>
      </View>
      <Text style={styles.caption}>
        {detailedOffline
          ? 'Detailed offline map: local vector roads, water, land, buildings, municipality context, and saved places. No network tiles are requested.'
          : hasOfflineContext
          ? 'Offline regional context: the municipality boundary and saved places are loaded from local GeoJSON files. No network tiles are requested.'
          : offline
          ? 'Offline fallback: saved places are loaded from the pack without network tiles.'
          : 'Live base map: © OpenStreetMap contributors · LakbayLokal markers come from the local destination catalog.'}
      </Text>
    </View>;
};

const MapModeButton = ({ label, active, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}
  >
    <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  modeRow: {
    padding: spacing.xs,
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  modeText: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: '800',
  },
  modeTextActive: {
    color: colors.primary,
  },
  mapFrame: {
    height: 250,
    backgroundColor: colors.surfaceMuted,
  },
  map: {
    flex: 1,
  },
  caption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.78,
  },
});
