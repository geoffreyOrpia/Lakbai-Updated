import { Ionicons } from '@expo/vector-icons';
import { Camera, GeoJSONSource, Images, Layer, Map } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createOfflineBasemapStyle } from "../../../core/maps/offlineBasemapStyle.jsx";
import { routeBounds } from "../../../core/routing/graph.jsx";
import { formatDurationMinutes, formatKm } from "../../../core/utils/format.jsx";
import { colors, radius, shadows, spacing } from "../../../theme.jsx";

const POI_ICON_IMAGES = {
  'poi-restaurant': require('../../../../assets/map-icons/poi-restaurant.png'),
  'poi-cafe': require('../../../../assets/map-icons/poi-cafe.png'),
  'poi-hotel': require('../../../../assets/map-icons/poi-hotel.png'),
  'poi-police': require('../../../../assets/map-icons/poi-police.png'),
  'poi-medical': require('../../../../assets/map-icons/poi-medical.png'),
  'poi-fuel': require('../../../../assets/map-icons/poi-fuel.png'),
  'poi-transit': require('../../../../assets/map-icons/poi-transit.png'),
  'poi-parking': require('../../../../assets/map-icons/poi-parking.png'),
  'poi-information': require('../../../../assets/map-icons/poi-information.png'),
  'poi-attraction': require('../../../../assets/map-icons/poi-attraction.png'),
  'nav-walk': require('../../../../assets/map-icons/nav-walk.png'),
  'nav-car': require('../../../../assets/map-icons/nav-car.png'),
  'nav-destination': require('../../../../assets/map-icons/nav-destination.png'),
};

const POI_ICON_KINDS = [
  'restaurant', 'cafe', 'fast_food', 'food_court', 'bakery', 'bbq',
  'hotel', 'hostel', 'guest_house', 'bed_and_breakfast', 'chalet', 'camp_site',
  'police', 'fire_station', 'ranger_station',
  'hospital', 'clinic', 'doctors', 'pharmacy', 'emergency_phone',
  'fuel', 'charging_station',
  'bus_stop', 'station', 'taxi', 'car_rental',
  'parking',
  'information', 'toilets', 'drinking_water', 'atm', 'post_office',
  'attraction', 'viewpoint', 'museum', 'artwork', 'memorial', 'beach', 'park',
  'picnic_site', 'marina', 'zoo', 'library', 'national_park', 'nature_reserve',
];

const POI_ICON_IMAGE = [
  'match',
  ['get', 'kind'],
  ['cafe'], 'poi-cafe',
  ['hotel', 'hostel', 'guest_house', 'bed_and_breakfast', 'chalet', 'camp_site'], 'poi-hotel',
  ['police', 'fire_station', 'ranger_station'], 'poi-police',
  ['hospital', 'clinic', 'doctors', 'pharmacy', 'emergency_phone'], 'poi-medical',
  ['fuel', 'charging_station'], 'poi-fuel',
  ['bus_stop', 'station', 'taxi', 'car_rental'], 'poi-transit',
  ['parking'], 'poi-parking',
  ['information', 'toilets', 'drinking_water', 'atm', 'post_office'], 'poi-information',
  ['attraction', 'viewpoint', 'museum', 'artwork', 'memorial', 'beach', 'park',
    'picnic_site', 'marina', 'zoo', 'library', 'national_park', 'nature_reserve'], 'poi-attraction',
  'poi-restaurant',
];

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

export const NavigationMap = props => {
  const [expanded, setExpanded] = useState(false);
  return <>
      {expanded ? <View style={styles.mapFrame} /> : <NavigationMapContent {...props} onExpand={() => setExpanded(true)} />}
      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <SafeAreaView style={styles.fullScreen}>
          {expanded ? <NavigationMapContent {...props} expanded onExpand={() => setExpanded(false)} /> : null}
        </SafeAreaView>
      </Modal>
    </>;
};

const NavigationMapContent = ({
  expanded = false,
  onExpand,
  onStop,
  onToggleVoice,
  route,
  target,
  offlineBasemapUri,
  liveGps = false,
  mode = 'walk',
  currentPosition = null,
  nextManeuver = null,
  distanceToNextManeuverKm = null,
  remainingKm = null,
  remainingMin = null,
  rerouting = false,
  voiceGuidance = true,
  trailPreview = null,
  routePois = [],
  alternativeBaseRoute = null,
  alternativeRoutes = [],
  timeIsReference = false,
}) => {
  const [following, setFollowing] = useState(liveGps);
  useEffect(() => setFollowing(liveGps), [liveGps]);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    setBasemapFailed(false);
    setMapReady(false);
  }, [offlineBasemapUri]);
  const detailedOffline = Boolean(offlineBasemapUri) && !basemapFailed;
  const geometry = route.geometry;
  const bounds = routeBounds(geometry);
  const currentUserData = useMemo(() => ({
    type: 'FeatureCollection',
    features: currentPosition
      ? [pointFeature('current-user', [currentPosition.lng, currentPosition.lat], 'user')]
      : [],
  }), [currentPosition]);
  const routeData = useMemo(() => ({
    type: 'FeatureCollection',
    features: route.type === 'multi-stop-journey'
      ? (route.roadLegs ?? []).map((leg, index) => ({
        type: 'Feature',
        id: `road-leg-${index}`,
        properties: { kind: 'road' },
        geometry: leg.route.geometry,
      }))
      : (
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
  }), [geometry, route.type, route.legs, route.roadLegs]);
  const alternativeData = useMemo(() => {
    const candidates = [alternativeBaseRoute, ...(alternativeRoutes ?? [])]
      .filter(candidate => candidate?.ok && candidate !== route)
      .map((candidate, index) => {
        const roadLeg = candidate.type === 'road-trail-journey'
          ? candidate.legs?.find(leg => leg.kind === 'road')?.route
          : candidate;
        if (!roadLeg?.geometry?.coordinates?.length) return null;
        return {
          type: 'Feature',
          id: `alternative-route-${candidate.alternativeId ?? index}`,
          properties: {},
          geometry: roadLeg.geometry,
        };
      })
      .filter(Boolean);
    if (!candidates.length) return null;
    return { type: 'FeatureCollection', features: candidates };
  }, [alternativeBaseRoute, alternativeRoutes, route]);
  const ferryData = useMemo(() => {
    const ferryLegs = route.type === 'multi-stop-journey'
      ? route.ferryLegs ?? []
      : route.ferryLeg?.geometry?.coordinates?.length ? [route.ferryLeg] : [];
    if (!ferryLegs.length) return null;
    return {
      type: 'FeatureCollection',
      features: ferryLegs.map((leg, index) => ({
        type: 'Feature',
        id: `ferry-leg-${index}`,
        properties: {},
        geometry: leg.geometry,
      })),
    };
  }, [route.ferryLeg, route.ferryLegs, route.type]);
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
      ...((route.type === 'multi-stop-journey' ? route.ferryLegs ?? [] : route.ferryLeg ? [route.ferryLeg] : [])
        .flatMap((leg, index) => [
          pointFeature(
            `ferry-origin-terminal-${index}`,
            [leg.originTerminal.lng, leg.originTerminal.lat],
            'ferry-terminal',
          ),
          pointFeature(
            `ferry-target-terminal-${index}`,
            [leg.targetTerminal.lng, leg.targetTerminal.lat],
            'ferry-terminal',
          ),
        ])),
      ...(route.stopOffsets ?? []).slice(0, -1).map(marker => pointFeature(
        `multi-stop-${marker.stopIndex}`,
        [marker.stop.target.lng, marker.stop.target.lat],
        'stop',
      )),
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
  }), [
    geometry.coordinates,
    target.lat,
    target.lng,
    trailPreview,
    routePois,
    route.ferryLeg,
    route.ferryLegs,
    route.stopOffsets,
    route.type,
  ]);

  return <View style={[styles.card, shadows.card, expanded && styles.expandedCard]}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Your route</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Close full-screen map' : 'Expand map'} onPress={onExpand} style={styles.mapAction}>
          <Ionicons name={expanded ? 'contract-outline' : 'expand-outline'} size={20} color={colors.primary} />
          <Text style={styles.actionLabel}>{expanded ? 'Done' : 'Expand map'}</Text>
        </Pressable>
      </View>
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
                  ? 'Finding another route'
                  : nextManeuver?.instruction ?? 'Follow the mapped route'}
              </Text>
              <Text style={styles.navigationHudMeta}>
                {remainingKm != null ? formatKm(remainingKm) : '—'} remaining
                {' · '}
                {remainingMin != null
                  ? `${formatDurationMinutes(remainingMin)}${timeIsReference ? ' + ferry wait' : ''}`
                  : '—'}
              </Text>
            </View>
          </View> : null}


      <View style={[styles.mapFrame, liveGps && styles.mapFrameLive, expanded && styles.expandedFrame]}>
        <Map
          key={detailedOffline ? 'nav-local-map' : 'nav-route-only'}
          style={styles.map}
          dragPan
          touchZoom
          onPress={expanded ? undefined : onExpand}
          mapStyle={detailedOffline ? createOfflineBasemapStyle(offlineBasemapUri) : FALLBACK_STYLE}
          attribution={detailedOffline}
          attributionPosition={{ bottom: 8, right: 8 }}
          logo={false}
          compass
          compassPosition={{ top: 8, right: 8 }}
          touchPitch
          onWillStartLoadingMap={() => setMapReady(false)}
          onDidFinishLoadingMap={() => setMapReady(true)}
          onDidFailLoadingMap={() => {
            setMapReady(true);
            setBasemapFailed(true);
          }}
        >
          {detailedOffline && mapReady ? <Images images={POI_ICON_IMAGES} /> : null}
          <Camera
            initialViewState={{
              bounds,
              padding: { top: 64, right: 48, bottom: 64, left: 48 },
            }}
            trackUserLocation={liveGps && following ? 'course' : undefined}
            zoom={liveGps && following ? 16 : undefined}
            pitch={liveGps && following ? 52 : 36}
            onTrackUserLocationChange={event => {
              if (!event.nativeEvent?.trackUserLocation) setFollowing(false);
            }}
          />

          {detailedOffline && mapReady ? <Layer
            id="lakbai-tourism-poi-icons"
            type="symbol"
            source="offline-basemap"
            source-layer="pois"
            minzoom={12}
            filter={['match', ['get', 'kind'], POI_ICON_KINDS, true, false]}
            layout={{
              'icon-image': POI_ICON_IMAGE,
              'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.42, 15, 0.62, 17, 0.72],
              'icon-allow-overlap': false,
              'icon-ignore-placement': false,
            }}
          /> : null}

          {alternativeData ? <GeoJSONSource id="lakbai-navigation-alternatives" data={alternativeData}>
              <Layer
                id="lakbai-navigation-alternatives-line"
                type="line"
                source="lakbai-navigation-alternatives"
                paint={{
                  'line-color': colors.muted,
                  'line-width': 4,
                  'line-opacity': 0.72,
                  'line-dasharray': [1.4, 1.2],
                }}
              />
            </GeoJSONSource> : null}

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
              filter={['!=', ['get', 'role'], 'destination']}
              paint={{
                'circle-radius': 7,
                'circle-color': [
                  'match',
                  ['get', 'role'],
                  'destination', colors.accent,
                  'trail-end', colors.accentDark,
                  'ferry-terminal', colors.accentDark,
                  'stop', colors.primary,
                  'poi', colors.accentDark,
                  colors.primary,
                ],
                'circle-stroke-color': colors.white,
                'circle-stroke-width': 2.5,
              }}
            />
            {mapReady ? <Layer
              id="lakbai-navigation-destination-symbol"
              type="symbol"
              source="lakbai-navigation-markers"
              filter={['==', ['get', 'role'], 'destination']}
              layout={{
                'icon-image': 'nav-destination',
                'icon-size': 0.72,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              }}
            /> : null}
          </GeoJSONSource>

          {liveGps && currentPosition && mapReady ? <GeoJSONSource
            id="lakbai-navigation-user"
            data={currentUserData}
          >
            <Layer
              id="lakbai-navigation-user-symbol"
              type="symbol"
              source="lakbai-navigation-user"
              layout={{
                'icon-image': mode === 'drive' ? 'nav-car' : 'nav-walk',
                'icon-size': 0.7,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              }}
            />
          </GeoJSONSource> : null}
        </Map>

        {!mapReady ? <View pointerEvents="none" style={styles.mapLoading}>
            <View style={[styles.mapLoadingCard, shadows.card]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <View style={styles.mapLoadingCopy}>
                <Text style={styles.mapLoadingTitle}>Opening offline map</Text>
                <Text style={styles.mapLoadingText}>Loading roads, places and navigation details…</Text>
              </View>
            </View>
          </View> : null}

        {detailedOffline && mapReady ? <View pointerEvents="none" style={styles.poiLegend}>
            <LegendItem icon="restaurant" color="#D96A2B" label="Food" />
            <LegendItem icon="bed" color="#6B67C8" label="Stay" />
            <LegendItem icon="shield-checkmark" color={colors.danger} label="Safety" />
            <LegendItem icon="information-circle" color={colors.brandSea} label="Useful" />
            <LegendItem icon="camera" color={colors.accent} label="Sights" />
          </View> : null}

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
      {expanded && liveGps ? <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel={voiceGuidance ? 'Mute directions' : 'Unmute directions'} onPress={onToggleVoice} style={styles.mapAction}>
            <Ionicons name={voiceGuidance ? 'volume-high-outline' : 'volume-mute-outline'} size={20} color={colors.primary} />
            <Text style={styles.actionLabel}>{voiceGuidance ? 'Mute' : 'Unmute'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Stop directions" onPress={onStop} style={styles.mapAction}>
            <Ionicons name="stop-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.actionLabel}>Stop directions</Text>
          </Pressable>
        </View> : null}
      <Text style={styles.caption}>
        {detailedOffline
          ? ferryData ? 'Works offline · Dashed line: ferry crossing'
            : trailData ? 'Works offline · Dashed line: walking trail'
            : 'Works offline · Drag to move, pinch to zoom'
          : 'Map details could not load. Only your route is shown.'}
      </Text>
    </View>;
};

const LegendItem = ({ icon, color, label }) => <View style={styles.legendItem}>
    <Ionicons name={icon} size={11} color={color} />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>;

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
  fullScreen: { flex: 1, backgroundColor: colors.background },
  expandedCard: { flex: 1, borderRadius: 0, borderWidth: 0 },
  expandedFrame: { flex: 1, height: undefined, minHeight: 120 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  toolbarTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  mapAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xs },
  actionLabel: { color: colors.primary, fontSize: 13, fontWeight: '700' },
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
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246,242,234,0.72)',
    paddingHorizontal: spacing.md,
  },
  mapLoadingCard: {
    width: '100%',
    maxWidth: 320,
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapLoadingCopy: { flex: 1 },
  mapLoadingTitle: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '900',
  },
  mapLoadingText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 14,
  },
  poiLegend: {
    position: 'absolute',
    left: spacing.sm,
    bottom: 10,
    maxWidth: '72%',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendLabel: {
    color: colors.textSecondary,
    fontSize: 8.5,
    fontWeight: '800',
  },
  navigationHud: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
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
  followButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: 42,
    minHeight: 44,
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
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: { opacity: 0.8 },
});
