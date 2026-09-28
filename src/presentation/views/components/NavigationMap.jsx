import { Ionicons } from '@expo/vector-icons';
import { Camera, GeoJSONSource, Layer, Map, UserLocation } from '@maplibre/maplibre-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createOfflineBasemapStyle } from "../../../core/maps/offlineBasemapStyle.jsx";
import { routeBounds } from "../../../core/routing/graph.jsx";
import { formatDurationMinutes, formatKm } from "../../../core/utils/format.jsx";
import { colors, radius, shadows, spacing } from "../../../theme.jsx";

const maneuverIcon = kind => {
  if (kind === 'left' || kind === 'sharp-left' || kind === 'slight-left') return 'return-up-back-outline';
  if (kind === 'right' || kind === 'sharp-right' || kind === 'slight-right') return 'return-up-forward-outline';
  if (kind === 'uturn') return 'refresh-outline';
  if (kind === 'ferry-board' || kind === 'ferry-arrive') return 'boat-outline';
  if (kind === 'arrive') return 'flag-outline';
  return 'arrow-up-outline';
};

const formatAhead = distanceKm => {
  if (distanceKm == null) return 'Follow route';
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  return formatKm(distanceKm);
};

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
  nextManeuver = null,
  distanceToNextManeuverKm = null,
  remainingKm = null,
  remainingMin = null,
  rerouting = false,
  voiceGuidance = true,
  trailPreview = null,
  routePois = [],
  timeIsReference = false,
}) => {
  const [following, setFollowing] = useState(liveGps);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const detailedOffline = Boolean(offlineBasemapUri) && !basemapFailed;
  const geometry = route.geometry;
  const bounds = routeBounds(geometry);
  const routeData = useMemo(() => ({
    type: 'FeatureCollection',
    features: (
      route.type === 'ferry-journey'
      || route.type === 'road-trail-journey'
    )
      ? (route.legs ?? [])
        .filter(leg => leg.kind === 'road' && leg.route?.geometry)
        .map((leg, index) => ({
          type: 'Feature',
          id: `road-leg-${index}`,
          properties: { kind: 'road' },
          geometry: leg.route.geometry,
        }))
      : [{
        type: 'Feature',
        id: 'route',
        properties: { kind: 'road' },
        geometry,
      }],
  }), [geometry, route.type, route.legs]);
  const ferryData = useMemo(() => {
    if (!route.ferryLeg?.geometry?.coordinates?.length) return null;
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'ferry-leg',
        properties: {},
        geometry: route.ferryLeg.geometry,
      }],
    };
  }, [route.ferryLeg]);
  const trailData = useMemo(() => {
    const trailGeometry = route.trailLeg?.geometry ?? trailPreview?.geometry;
    if (!trailGeometry?.coordinates?.length) return null;
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'verified-trail-continuation',
        properties: {},
        geometry: trailGeometry,
      }],
    };
  }, [route.trailLeg, trailPreview]);
  const markers = useMemo(() => ({
    type: 'FeatureCollection',
    features: [
      pointFeature('route-start', geometry.coordinates[0], 'start'),
      pointFeature('route-destination', [target.lng, target.lat], 'destination'),
      ...(route.ferryLeg ? [
        pointFeature(
          'ferry-origin-terminal',
          [route.ferryLeg.originTerminal.lng, route.ferryLeg.originTerminal.lat],
          'ferry-terminal',
        ),
        pointFeature(
          'ferry-target-terminal',
          [route.ferryLeg.targetTerminal.lng, route.ferryLeg.targetTerminal.lat],
          'ferry-terminal',
        ),
      ] : []),
      ...(trailPreview?.geometry?.coordinates?.length
        ? [pointFeature(
          'verified-trail-end',
          trailPreview.geometry.coordinates.at(-1),
          'trail-end',
        )]
        : []),
      ...routePois.map(place => pointFeature(
        'route-poi-' + place.id,
        [place.lng, place.lat],
        'poi',
      )),
    ],
  }), [geometry.coordinates, target.lat, target.lng, trailPreview, routePois, route.ferryLeg]);

  return <View style={[styles.card, shadows.card]}>
      <View style={[styles.mapFrame, liveGps && styles.mapFrameLive]}>
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

          {ferryData ? <GeoJSONSource id="lakbai-navigation-ferry" data={ferryData}>
              <Layer
                id="lakbai-navigation-ferry-casing"
                type="line"
                source="lakbai-navigation-ferry"
                paint={{
                  'line-color': colors.white,
                  'line-width': 9,
                  'line-opacity': 0.92,
                }}
              />
              <Layer
                id="lakbai-navigation-ferry-line"
                type="line"
                source="lakbai-navigation-ferry"
                paint={{
                  'line-color': colors.accentDark,
                  'line-width': 5,
                  'line-opacity': 0.96,
                  'line-dasharray': [2, 1.2],
                }}
              />
            </GeoJSONSource> : null}

          {trailData ? <GeoJSONSource id="lakbai-navigation-trail" data={trailData}>
              <Layer
                id="lakbai-navigation-trail-casing"
                type="line"
                source="lakbai-navigation-trail"
                paint={{
                  'line-color': colors.white,
                  'line-width': 8,
                  'line-opacity': 0.9,
                }}
              />
              <Layer
                id="lakbai-navigation-trail-line"
                type="line"
                source="lakbai-navigation-trail"
                paint={{
                  'line-color': colors.accentDark,
                  'line-width': 4.5,
                  'line-opacity': 0.95,
                  'line-dasharray': [1.5, 1.15],
                }}
              />
            </GeoJSONSource> : null}

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
                  'trail-end', colors.accentDark,
                  'ferry-terminal', colors.accentDark,
                  'poi', colors.accentDark,
                  colors.primary,
                ],
                'circle-stroke-color': colors.white,
                'circle-stroke-width': 2.5,
              }}
            />
          </GeoJSONSource>

          {liveGps ? <UserLocation animated accuracy heading minDisplacement={3} /> : null}
        </Map>

        {liveGps ? <View pointerEvents="none" style={[styles.navigationHud, shadows.card]}>
            <View style={styles.navigationHudIcon}>
              <Ionicons
                name={rerouting ? 'sync-outline' : maneuverIcon(nextManeuver?.kind)}
                size={27}
                color={colors.onPrimary}
              />
            </View>
            <View style={styles.navigationHudCopy}>
              <View style={styles.navigationHudTopline}>
                <Text style={styles.navigationHudDistance}>
                  {rerouting ? 'Rerouting…' : formatAhead(distanceToNextManeuverKm)}
                </Text>
                <Ionicons
                  name={voiceGuidance ? 'volume-high-outline' : 'volume-mute-outline'}
                  size={16}
                  color={voiceGuidance ? colors.primary : colors.muted}
                />
              </View>
              <Text style={styles.navigationHudInstruction} numberOfLines={2}>
                {rerouting
                  ? 'Finding another offline route'
                  : nextManeuver?.instruction ?? 'Follow the mapped route'}
              </Text>
              <Text style={styles.navigationHudMeta}>
                {remainingKm != null ? formatKm(remainingKm) : '—'} remaining
                {' · '}
                {remainingMin != null
                  ? `${formatDurationMinutes(remainingMin)}${timeIsReference ? ' travel ref.' : ''}`
                  : '—'}
              </Text>
            </View>
          </View> : null}

        <View pointerEvents="none" style={[styles.statusBadge, liveGps && styles.statusBadgeLive]}>
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
          ? ferryData
            ? 'Road legs and the local basemap stay offline. The dashed ferry segment is an explicit source-reviewed transport leg, not a road across the channel.'
            : trailData
            ? 'Road route and saved map data are local. The dashed line shows the source-verified trail continuation after the entrance.'
            : 'Route geometry and the Davao del Norte basemap are both local. No Google Maps or network tiles are used.'
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
  mapFrameLive: {
    height: 500,
  },
  map: { flex: 1 },
  navigationHud: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.97)',
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navigationHudIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationHudCopy: {
    flex: 1,
    minWidth: 0,
  },
  navigationHudTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  navigationHudDistance: {
    color: colors.accentDark,
    fontSize: 17,
    fontWeight: '900',
  },
  navigationHudInstruction: {
    marginTop: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  navigationHudMeta: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
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
  statusBadgeLive: {
    top: undefined,
    bottom: spacing.sm,
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
