import { Ionicons } from '@expo/vector-icons';
import { Camera, GeoJSONSource, Images, Layer, Map } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createOfflineBasemapStyle } from "../../../core/maps/offlineBasemapStyle.jsx";
import { NAVIGATION_PLACE_FILTERS, NAVIGATION_PLACE_ICON, navigationPlaceDetails, navigationPlaceFilter, navigationPlacesData } from "../../../core/maps/navigationPlaces.jsx";
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
  'poi-camp': require('../../../../assets/map-icons/poi-camp.png'),
  'poi-pharmacy': require('../../../../assets/map-icons/poi-pharmacy.png'),
  'poi-fire': require('../../../../assets/map-icons/poi-fire.png'),
  'poi-emergency': require('../../../../assets/map-icons/poi-emergency.png'),
  'poi-ferry': require('../../../../assets/map-icons/poi-ferry.png'),
  'poi-airport': require('../../../../assets/map-icons/poi-airport.png'),
  'poi-taxi': require('../../../../assets/map-icons/poi-taxi.png'),
  'poi-charging': require('../../../../assets/map-icons/poi-charging.png'),
  'poi-atm': require('../../../../assets/map-icons/poi-atm.png'),
  'poi-bank': require('../../../../assets/map-icons/poi-bank.png'),
  'poi-toilets': require('../../../../assets/map-icons/poi-toilets.png'),
  'poi-water': require('../../../../assets/map-icons/poi-water.png'),
  'poi-shops': require('../../../../assets/map-icons/poi-shops.png'),
  'poi-post': require('../../../../assets/map-icons/poi-post.png'),
  'poi-museum': require('../../../../assets/map-icons/poi-museum.png'),
  'poi-beach': require('../../../../assets/map-icons/poi-beach.png'),
  'poi-viewpoint': require('../../../../assets/map-icons/poi-viewpoint.png'),
  'poi-park': require('../../../../assets/map-icons/poi-park.png'),
  'poi-worship': require('../../../../assets/map-icons/poi-worship.png'),
  'poi-place': require('../../../../assets/map-icons/poi-place.png'),
  'nav-walk': require('../../../../assets/map-icons/nav-walk.png'),
  'nav-car': require('../../../../assets/map-icons/nav-car.png'),
  'nav-destination': require('../../../../assets/map-icons/nav-destination.png'),
};

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
  const [placeCategory, setPlaceCategory] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const placeProps = { placeCategory, setPlaceCategory, selectedPlace, setSelectedPlace };
  return <>
      {expanded ? <View style={styles.mapFrame} /> : <NavigationMapContent {...props} {...placeProps} onExpand={() => setExpanded(true)} />}
      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <SafeAreaView style={styles.fullScreen}>
          {expanded ? <NavigationMapContent {...props} {...placeProps} expanded onExpand={() => setExpanded(false)} /> : null}
        </SafeAreaView>
      </Modal>
    </>;
};

const NavigationMapContent = ({
  expanded = false,
  placeCategory,
  setPlaceCategory,
  selectedPlace,
  setSelectedPlace,
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
  places,
  alternativeBaseRoute = null,
  alternativeRoutes = [],
  timeIsReference = false,
}) => {
  const mapRef = useRef(null);
  const tapRequest = useRef(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [placeError, setPlaceError] = useState(false);
  const placeData = useMemo(() => navigationPlacesData(places ?? routePois), [places, routePois]);
  const placeFilter = useMemo(() => navigationPlaceFilter(placeCategory), [placeCategory]);
  const selectedCategory = NAVIGATION_PLACE_FILTERS.find(category => category.id === placeCategory);
  useEffect(() => () => { tapRequest.current += 1; }, []);
  const [following, setFollowing] = useState(liveGps);
  useEffect(() => setFollowing(liveGps), [liveGps]);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    setBasemapFailed(false);
    setMapReady(false);
  }, [offlineBasemapUri]);
  const detailedOffline = Boolean(offlineBasemapUri) && !basemapFailed;
  const mapStyle = useMemo(() => detailedOffline
    ? createOfflineBasemapStyle(offlineBasemapUri, { showPlaceDots: false })
    : FALLBACK_STYLE, [detailedOffline, offlineBasemapUri]);
  const handleMapPress = async event => {
    const point = event?.nativeEvent?.point;
    if (!mapReady || !point || !mapRef.current) return;
    const request = ++tapRequest.current;
    try {
      // A finger-sized hit area makes the small symbols easier to select.
      const [x, y] = point;
      const features = await mapRef.current.queryRenderedFeatures([x - 22, y - 22, x + 22, y + 22], {
        layers: [...(detailedOffline ? ['lakbai-tourism-poi-icons'] : []), 'lakbai-guide-place-icons'],
      });
      if (request !== tapRequest.current) return;
      setPlaceError(false);
      setSelectedPlace(features?.length ? navigationPlaceDetails(features[0]) : null);
    } catch {
      if (request !== tapRequest.current) return;
      setSelectedPlace(null);
      setPlaceError(true);
    }
  };
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
    ],
  }), [
    geometry.coordinates,
    target.lat,
    target.lng,
    trailPreview,
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
      <View style={styles.placeToolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose places to show" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(value => !value)} style={styles.mapAction}>
          <Ionicons name={selectedCategory.icon} size={18} color={colors.primary} />
          <Text style={styles.actionLabel}>{selectedCategory.label}</Text>
          <Ionicons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
        </Pressable>
        <Text style={styles.placeHint}>{expanded ? 'Tap a symbol for details' : 'Expand to explore places'}</Text>
      </View>
      {filtersOpen ? <ScrollView horizontal showsHorizontalScrollIndicator style={styles.placeFilters} contentContainerStyle={styles.placeFilterContent}>
        {NAVIGATION_PLACE_FILTERS.map(category => <Pressable key={category.id}
          accessibilityRole="button" accessibilityLabel={`Show ${category.label.toLowerCase()}`}
          accessibilityState={{ selected: category.id === placeCategory }}
          onPress={() => {
            tapRequest.current += 1;
            setPlaceCategory(category.id);
            setSelectedPlace(null);
            setPlaceError(false);
            setFiltersOpen(false);
          }}
          style={[styles.placeChip, category.id === placeCategory && styles.placeChipSelected]}>
          <Ionicons name={category.icon} size={18} color={category.id === placeCategory ? colors.onPrimary : colors.primary} />
          <Text style={[styles.actionLabel, category.id === placeCategory && styles.followTextActive]}>{category.label}</Text>
        </Pressable>)}
      </ScrollView> : null}
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
          ref={mapRef}
          key={detailedOffline ? 'nav-local-map' : 'nav-route-only'}
          style={styles.map}
          dragPan
          touchZoom
          onPress={expanded ? handleMapPress : onExpand}
          mapStyle={mapStyle}
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
          {mapReady ? <Images images={POI_ICON_IMAGES} /> : null}
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

          {detailedOffline && mapReady ? <Layer
            id="lakbai-tourism-poi-icons"
            type="symbol"
            source="offline-basemap"
            source-layer="pois"
            minzoom={12}
            filter={placeFilter}
            layout={{
              'icon-image': NAVIGATION_PLACE_ICON,
              'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.48, 15, 0.62, 17, 0.72],
              'icon-allow-overlap': false,
              'icon-ignore-placement': false,
            }}
          /> : null}

          {mapReady ? <GeoJSONSource id="lakbai-guide-places" data={placeData}>
            <Layer id="lakbai-guide-place-icons" type="symbol" source="lakbai-guide-places"
              filter={placeFilter}
              layout={{
                'icon-image': NAVIGATION_PLACE_ICON,
                'icon-size': 0.62,
                'icon-allow-overlap': false,
                'icon-ignore-placement': false,
              }} />
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
      {selectedPlace ? <View style={styles.placeDetails} accessibilityLiveRegion="polite">
        <Image source={POI_ICON_IMAGES[selectedPlace.imageId]} style={styles.placeDetailIcon} />
        <View style={styles.placeDetailsCopy}>
          <Text style={styles.placeName} numberOfLines={2}>{selectedPlace.name}</Text>
          {selectedPlace.name !== selectedPlace.label ? <Text style={styles.placeHint}>{selectedPlace.label}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close place details" onPress={() => { tapRequest.current += 1; setSelectedPlace(null); }} style={styles.mapAction}>
          <Ionicons name="close" size={24} color={colors.primary} />
        </Pressable>
      </View> : null}
      {placeError ? <Text style={styles.caption} accessibilityLiveRegion="polite">Couldn’t open that place. Try tapping again.</Text> : null}
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
          : 'Map details could not load. Your route and guide places are still available.'}
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
  placeToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, paddingHorizontal: spacing.sm },
  placeHint: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  placeFilters: { flexGrow: 0, maxHeight: 62 },
  placeFilterContent: { gap: spacing.xs, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  placeChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  placeChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  placeDetails: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderTopWidth: 1, borderColor: colors.border },
  placeDetailsCopy: { flex: 1, paddingVertical: spacing.sm },
  placeDetailIcon: { width: 36, height: 36 },
  placeName: { color: colors.text, fontSize: 15, fontWeight: '800' },
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
