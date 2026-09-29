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
  const [mapFailed, setMapFailed] = useState(false);
  const [basemapFailed, setBasemapFailed] = useState(false);

  useEffect(() => {
    if (!canUseOffline && mode === 'offline') {
      setMode('online');
    }
  }, [canUseOffline, mode]);
  if (!bounds) return null;

  const offline = mode === 'offline' && canUseOffline;
  const detailedOffline = offline && Boolean(offlineBasemapUri) && !basemapFailed;
  const hasContext = Boolean(contextGeojson.features?.length);
  const hasSavedContext = offline && Boolean(offlineContextUri);
  const offlineStyle = detailedOffline
    ? createOfflineBasemapStyle(offlineBasemapUri)
    : OFFLINE_STYLE;
  const mapData = offline ? offlineMapUri : geojson;
  const contextData = hasSavedContext ? offlineContextUri : contextGeojson;
  const activeBounds = hasSavedContext ? (contextBounds ?? bounds) : bounds;

  const chooseOffline = () => {
    setMapFailed(false);
    setBasemapFailed(false);
    setMode('offline');
  };
  const chooseOnline = () => {
    setMapFailed(false);
    setMode('online');
  };
  const handleMapFailure = () => {
    if (detailedOffline) {
      setBasemapFailed(true);
      setMapFailed(false);
      return;
    }
    if (!offline && canUseOffline) {
      setMapFailed(false);
      setMode('offline');
      return;
    }
    setMapFailed(true);
  };

  const statusLabel = offline
    ? detailedOffline
      ? 'SAVED MAP'
      : 'SAVED PLACES'
    : 'ONLINE MAP';

  return <View style={styles.card}>
      {canUseOffline ? <View style={styles.modeRow}>
          <MapModeButton label="Saved map" active={offline} onPress={chooseOffline} />
          <MapModeButton label="Online map" active={!offline} onPress={chooseOnline} />
        </View> : null}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, offline ? styles.statusDotOffline : styles.statusDotOnline]} />
        <Text style={styles.statusText}>{statusLabel}</Text>
        {basemapFailed ? <Text style={styles.statusHint}>Some map details are unavailable</Text> : null}
      </View>
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
          onDidFinishLoadingMap={() => setMapFailed(false)}
          onDidFailLoadingMap={handleMapFailure}
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
          {hasContext ? <GeoJSONSource id="lakbaylokal-context" data={contextData}>
              <Layer
                id="lakbaylokal-context-fill"
                type="fill"
                source="lakbaylokal-context"
                paint={{
                  'fill-color': colors.primarySofter,
                  'fill-opacity': offline ? (detailedOffline ? 0.12 : 0.78) : 0.08,
                }}
              />
              <Layer
                id="lakbaylokal-context-boundary"
                type="line"
                source="lakbaylokal-context"
                paint={{
                  'line-color': colors.primary,
                  'line-opacity': offline ? (detailedOffline ? 0.45 : 0.72) : 0.28,
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
        {mapFailed ? <View style={styles.failureOverlay} pointerEvents="none">
            <Text style={styles.failureTitle}>Map details unavailable</Text>
            <Text style={styles.failureText}>
              {canUseOffline
                ? 'Your saved places are still shown. Some map details could not load.'
                : 'Your places are still shown. Save this guide before traveling to use the map offline.'}
            </Text>
          </View> : null}
      </View>
      <Text style={styles.caption}>
        {detailedOffline
          ? 'This saved map works without internet.'
          : offline
          ? 'Showing your saved places. Some map details are unavailable.'
          : 'Online map · © OpenStreetMap contributors'}
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
  statusRow: {
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotOffline: {
    backgroundColor: colors.primary,
  },
  statusDotOnline: {
    backgroundColor: colors.accent,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  statusHint: {
    marginLeft: 'auto',
    color: colors.muted,
    fontSize: 8.8,
    fontWeight: '700',
  },
  mapFrame: {
    height: 250,
    backgroundColor: colors.surfaceMuted,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  failureOverlay: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.94)',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  failureTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  failureText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 14,
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
