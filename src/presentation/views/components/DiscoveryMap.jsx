import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { OFFLINE_BASEMAP_META } from "../../../data/assets/offlineBasemapAsset.jsx";
import { createOfflineBasemapStyle } from "../../../core/maps/offlineBasemapStyle.jsx";
import { colors, radius, spacing } from "../../../theme.jsx";

const pointCollection = (fix, pins) => ({
  type: 'FeatureCollection',
  features: [
    ...(fix ? [{
      type: 'Feature',
      id: 'current-fix',
      properties: { kind: 'gps' },
      geometry: { type: 'Point', coordinates: [fix.lng, fix.lat] },
    }] : []),
    ...(pins ?? []).map(pin => ({
      type: 'Feature',
      id: pin.id,
      properties: { kind: 'pin' },
      geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
    })),
  ],
});

export const DiscoveryMap = ({ basemapUri, fix, pins, onDropPin }) => {
  if (!basemapUri) return <View style={styles.unavailable}>
      <Text style={styles.unavailableTitle}>Offline map unavailable</Text>
      <Text style={styles.unavailableText}>
        The map could not open. You can still search for places and streets.
      </Text>
    </View>;

  const points = pointCollection(fix, pins);
  return <View style={styles.card}>
      <View style={styles.mapFrame}>
        <Map
          style={styles.map}
          mapStyle={createOfflineBasemapStyle(basemapUri)}
          attribution
          attributionPosition={{ bottom: 8, right: 8 }}
          logo={false}
          compass
          compassPosition={{ top: 8, right: 8 }}
          onLongPress={event => {
            const [lng, lat] = event.nativeEvent?.lngLat ?? [];
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              void onDropPin?.({ lat, lng });
            }
          }}
        >
          <Camera initialViewState={{
            bounds: OFFLINE_BASEMAP_META.bounds,
            padding: { top: 28, right: 28, bottom: 28, left: 28 },
          }} />
          <GeoJSONSource id="lakbai-discovery-points" data={points}>
            <Layer
              id="lakbai-discovery-pins"
              type="circle"
              source="lakbai-discovery-points"
              filter={['==', ['get', 'kind'], 'pin']}
              paint={{
                'circle-radius': 7,
                'circle-color': colors.accent,
                'circle-stroke-color': colors.white,
                'circle-stroke-width': 2,
              }}
            />
            <Layer
              id="lakbai-discovery-gps"
              type="circle"
              source="lakbai-discovery-points"
              filter={['==', ['get', 'kind'], 'gps']}
              paint={{
                'circle-radius': 6,
                'circle-color': colors.primary,
                'circle-stroke-color': colors.white,
                'circle-stroke-width': 2,
              }}
            />
          </GeoJSONSource>
        </Map>
      </View>
      <Text style={styles.caption}>
        Long-press the offline provincial map to save a device-local pin. A dropped pin is your selected coordinate, not a verified entrance or access point.
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
    height: 260,
    backgroundColor: colors.surfaceMuted,
  },
  map: {
    flex: 1,
  },
  caption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.muted,
    fontSize: 9.8,
    lineHeight: 14,
  },
  unavailable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  unavailableTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  unavailableText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
  },
});
