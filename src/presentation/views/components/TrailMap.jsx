import { Camera, GeoJSONSource, Layer, Map, UserLocation } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { boundsOf, trailCoordinates } from "../../../core/utils/geo.jsx";
import { createOfflineBasemapStyle } from "../../../core/maps/offlineBasemapStyle.jsx";
import { colors, radius, shadows, spacing } from "../../../theme.jsx";

const FALLBACK_STYLE = {
  version: 8,
  sources: {},
  layers: [{
    id: 'trail-fallback-background',
    type: 'background',
    paint: {
      'background-color': colors.surfaceSunken,
    },
  }],
};

const toTrailData = trail => ({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    id: trail.id,
    properties: {
      name: trail.name,
    },
    geometry: trail.geometry,
  }],
});

const toWaypointData = trail => ({
  type: 'FeatureCollection',
  features: (trail.waypoints ?? []).map(waypoint => ({
    type: 'Feature',
    id: waypoint.id,
    properties: {
      name: waypoint.name,
      type: waypoint.type,
    },
    geometry: {
      type: 'Point',
      coordinates: [waypoint.lng, waypoint.lat],
    },
  })),
});

export const TrailMap = ({
  trail,
  tracking,
  offlineBasemapUri,
  height = 320,
}) => {
  const [following, setFollowing] = useState(false);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const trailData = useMemo(() => toTrailData(trail), [trail]);
  const waypointData = useMemo(() => toWaypointData(trail), [trail]);
  const points = trailCoordinates(trail);
  const bounds = boundsOf(points);
  const detailedOffline = Boolean(offlineBasemapUri) && !basemapFailed;
  const style = detailedOffline
    ? createOfflineBasemapStyle(offlineBasemapUri)
    : FALLBACK_STYLE;

  useEffect(() => {
    if (tracking) setFollowing(true);
    else setFollowing(false);
  }, [tracking]);

  const trackMode = tracking && following ? 'course' : undefined;

  return <View style={[styles.card, shadows.card]}>
      <View style={[styles.mapFrame, { height }]}>
        <Map
          key={basemapFailed ? 'trail-fallback' : 'trail-offline'}
          style={styles.map}
          mapStyle={style}
          attribution={detailedOffline}
          attributionPosition={{ bottom: 8, right: 8 }}
          logo={false}
          compass
          compassPosition={{ top: 8, right: 8 }}
          onDidFailLoadingMap={() => setBasemapFailed(true)}
        >
          <Camera
            initialViewState={{
              bounds: [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat],
              padding: {
                top: 56,
                right: 48,
                bottom: 56,
                left: 48,
              },
            }}
            trackUserLocation={trackMode}
            zoom={17}
            pitch={trackMode ? 36 : 0}
            onTrackUserLocationChange={event => {
              if (!event.nativeEvent?.trackUserLocation) {
                setFollowing(false);
              }
            }}
          />

          <GeoJSONSource id="trail-route" data={trailData}>
            <Layer
              id="trail-route-casing"
              type="line"
              source="trail-route"
              paint={{
                'line-color': colors.white,
                'line-width': 8,
                'line-opacity': 0.95,
              }}
            />
            <Layer
              id="trail-route-line"
              type="line"
              source="trail-route"
              paint={{
                'line-color': colors.primary,
                'line-width': 5,
                'line-opacity': 0.96,
              }}
            />
          </GeoJSONSource>

          <GeoJSONSource id="trail-waypoints" data={waypointData}>
            <Layer
              id="trail-waypoints-dots"
              type="circle"
              source="trail-waypoints"
              paint={{
                'circle-radius': 6,
                'circle-color': [
                  'match',
                  ['get', 'type'],
                  'start', colors.primary,
                  'end', colors.accent,
                  colors.white,
                ],
                'circle-stroke-color': [
                  'match',
                  ['get', 'type'],
                  'end', colors.accentDark,
                  colors.primaryDark,
                ],
                'circle-stroke-width': 2,
              }}
            />
          </GeoJSONSource>

          {tracking ? <UserLocation animated accuracy heading minDisplacement={2} /> : null}
        </Map>

        <View pointerEvents="none" style={styles.offlineBadge}>
          <View style={styles.offlineDot} />
          <Text style={styles.offlineText}>{detailedOffline ? 'OFFLINE · LOCAL MAP' : 'OFFLINE · TRAIL ONLY'}</Text>
        </View>

        {tracking ? <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: following }}
            accessibilityLabel={following ? 'Stop following my location' : 'Recenter and follow my location'}
            onPress={() => setFollowing(value => !value)}
            style={({ pressed }) => [styles.followButton, following && styles.followButtonActive, pressed && styles.pressed]}
          >
            <Text style={[styles.followText, following && styles.followTextActive]}>
              {following ? 'Following' : 'Recenter'}
            </Text>
          </Pressable> : null}
      </View>

      <Text style={styles.caption}>
        {detailedOffline
          ? 'MapLibre uses the saved Davao del Norte vector basemap and verified trail geometry. No Google Maps or network tiles are used.'
          : 'The verified trail line and GPS tracking remain available even without the detailed local basemap.'}
      </Text>
    </View>;
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  mapFrame: {
    position: 'relative',
    backgroundColor: colors.surfaceMuted,
  },
  map: {
    flex: 1,
  },
  offlineBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  offlineText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.35,
  },
  followButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  followText: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: '900',
  },
  followTextActive: {
    color: colors.onPrimary,
  },
  caption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.8,
  },
});
