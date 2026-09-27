import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { createDestinationMapData, destinationMapBounds } from "../../../core/maps/destinationMapData.jsx";
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

export const DestinationMap = ({ pack }) => {
  const geojson = createDestinationMapData(pack);
  const bounds = destinationMapBounds(geojson);
  if (!bounds) return null;
  return <View style={styles.card}>
      <View style={styles.mapFrame}>
        <Map
          style={styles.map}
          mapStyle={OSM_STYLE}
          attribution
          attributionPosition={{ bottom: 8, right: 8 }}
          logo={false}
          compass
          compassPosition={{ top: 8, right: 8 }}
        >
          <Camera initialViewState={{
            bounds,
            padding: {
              top: 44,
              right: 44,
              bottom: 44,
              left: 44,
            },
          }} />
          <GeoJSONSource id="lakbaylokal-places" data={geojson}>
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
      <Text style={styles.caption}>Live base map: © OpenStreetMap contributors · LakbayLokal markers come from the bundled destination catalog.</Text>
    </View>;
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
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
});
