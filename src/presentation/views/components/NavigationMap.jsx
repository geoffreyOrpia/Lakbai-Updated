import { Camera, GeoJSONSource, Layer, Map, UserLocation } from '@maplibre/maplibre-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createOfflineBasemapStyle } from "../../../core/maps/offlineBasemapStyle.jsx";
import { routeBounds } from "../../../core/routing/graph.jsx";
import { colors, radius, shadows, spacing } from "../../../theme.jsx";

const pointFeature = (id, coordinates, role) => ({
  type: 'Feature',
  id,
  properties: { role },
  geometry: {
    type: 'Point',
    coordinates,
  },
});

export const NavigationMap = ({
  route,
  target,
  offlineBasemapUri,
  liveGps = false,
}) => {
  const [following, setFollowing] = useState(liveGps);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const detailedOffline = Boolean(offlineBasemapUri) && !basemapFailed;
  const geometry = route.geometry;
  const bounds = routeBounds(geometry);
  const routeData = useMemo(() => ({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: 'route',
      properties: {},
      geometry,
    }],
  }), [geometry]);
  const markers = useMemo(() => ({
    type: 'FeatureCollection',
    features: [
      pointFeature('route-start', geometry.coordinates[0], 'start'),
      pointFeature('route-destination', [target.lng, target.lat], 'destination'),
    ],
  }), [geometry.coordinates, target.lat, target.lng]);

  return <View style={[styles.card, shadows.card]}>
      <View style={styles.mapFrame}>
        <Map
          key={detailedOffline ? 'nav-local-map' : 'nav-route-only'}
          style={styles.map}
          mapStyle={detailedOffline ? createOfflineBasemapStyle(offlineBasemapUri) : FALLBACK_STYLE}
          attribution={detailedOffline}
          attributionPosition={{ bottom: 8, right: 8 }}
          logo={false}
          compass
          compassPosition={{ top: 8, right: 8 }}
          onDidFailLoadingMap={() => setBasemapFailed(true)}
        >
          <Camera
            initialViewState={{
              bounds,
              padding: { top: 64, right: 48, bottom: 64, left: 48 },
            }}
            trackUserLocation={liveGps && following ? 'course' : undefined}
            zoom={16}
            pitch={liveGps && following ? 34 : 0}
            onTrackUserLocationChange={event => {
              if (!event.nativeEvent?.trackUserLocation) setFollowing(false);
            }}
          />

          <GeoJSONSource id="lakbai-navigation-route" data={routeData}>
            <Layer
              id="lakbai-navigation-route-casing"
              type="line"
              source="lakbai-navigation-route"
              paint={{
                'line-color': colors.white,
                'line-width': 9,
                'line-opacity': 0.95,
              }}
            />
            <Layer
              id="lakbai-navigation-route-line"
              type="line"
              source="lakbai-navigation-route"
              paint={{
                'line-color': colors.primary,
                'line-width': 5.5,
                'line-opacity': 0.98,
              }}
            />
          </GeoJSONSource>

          <GeoJSONSource id="lakbai-navigation-markers" data={markers}>
            <Layer
              id="lakbai-navigation-marker-dots"
              type="circle"
              source="lakbai-navigation-markers"
              paint={{
                'circle-radius': 7,
                'circle-color': [
                  'match',
                  ['get', 'role'],
                  'destination', colors.accent,
                  colors.primary,
                ],
                'circle-stroke-color': colors.white,
                'circle-stroke-width': 2.5,
              }}
            />
          </GeoJSONSource>

          {liveGps ? <UserLocation animated accuracy heading minDisplacement={3} /> : null}
        </Map>

        <View pointerEvents="none" style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{detailedOffline ? 'OFFLINE ROUTE · LOCAL MAP' : 'OFFLINE ROUTE · LINE ONLY'}</Text>
        </View>

        {liveGps ? <Pressable
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
          ? 'Route geometry and the Davao del Norte basemap are both local. No Google Maps or network tiles are used.'
          : 'The route remains visible, but the detailed local basemap could not be loaded.'}
      </Text>
    </View>;
};

const FALLBACK_STYLE = {
  version: 8,
  sources: {},
  layers: [{
    id: 'navigation-background',
    type: 'background',
    paint: { 'background-color': colors.surfaceSunken },
  }],
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
    height: 390,
    position: 'relative',
    backgroundColor: colors.surfaceMuted,
  },
  map: { flex: 1 },
  statusBadge: {
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
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
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
  followTextActive: { color: colors.onPrimary },
  caption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 14,
  },
  pressed: { opacity: 0.8 },
});
