import { Circle, Polyline, Rect, Svg } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows } from "../../../theme.jsx";
import { boundsOf, trailCoordinates } from "../../../core/utils/geo.jsx";
const CANVAS_WIDTH = 340;
const PADDING = 22;

/**
 * Lightweight offline trail renderer: draws the GeoJSON trail as a fitted
 * vector path with start/end markers, waypoint dots, and the live GPS fix.
 */
export const TrailMiniMap = ({
  trail,
  fix,
  height = 200
}) => {
  const points = trailCoordinates(trail);
  const extra = fix ? [{
    lat: fix.lat,
    lng: fix.lng
  }] : [];
  const bounds = boundsOf([...points, ...extra]);
  const spanLat = Math.max(bounds.maxLat - bounds.minLat, 0.0008);
  const spanLng = Math.max(bounds.maxLng - bounds.minLng, 0.0008);
  const scale = Math.min((CANVAS_WIDTH - PADDING * 2) / spanLng, (height - PADDING * 2) / spanLat);
  const offsetX = (CANVAS_WIDTH - spanLng * scale) / 2;
  const offsetY = (height - spanLat * scale) / 2;
  const project = point => ({
    x: offsetX + (point.lng - bounds.minLng) * scale,
    y: offsetY + (bounds.maxLat - point.lat) * scale
  });
  const linePoints = points.map(point => {
    const projected = project(point);
    return `${projected.x.toFixed(1)},${projected.y.toFixed(1)}`;
  });
  const start = project(points[0] ?? {
    lat: 0,
    lng: 0
  });
  const end = project(points[points.length - 1] ?? {
    lat: 0,
    lng: 0
  });
  const fixProjected = fix ? project(fix) : null;
  return <View style={[styles.card, shadows.soft]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${CANVAS_WIDTH} ${height}`}>
        <Rect x={0} y={0} width={CANVAS_WIDTH} height={height} rx={radius.md - 2} fill={colors.surfaceMuted} />
        <Polyline points={linePoints.join(' ')} fill="none" stroke={colors.primary} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        {trail.waypoints.slice(1, -1).map(waypoint => {
        const projected = project({
          lat: waypoint.lat,
          lng: waypoint.lng
        });
        return <Circle key={waypoint.id} cx={projected.x} cy={projected.y} r={3.2} fill={colors.white} stroke={colors.borderStrong} strokeWidth={1.5} />;
      })}
        <Circle cx={start.x} cy={start.y} r={6} fill={colors.white} stroke={colors.primary} strokeWidth={2.5} />
        <Circle cx={end.x} cy={end.y} r={5} fill={colors.accent} stroke={colors.white} strokeWidth={2} />
        {fixProjected ? <>
            <Circle cx={fixProjected.x} cy={fixProjected.y} r={9} fill="rgba(236,118,49,0.25)" />
            <Circle cx={fixProjected.x} cy={fixProjected.y} r={5.5} fill={colors.accent} stroke={colors.white} strokeWidth={2} />
          </> : null}
      </Svg>
    </View>;
};
const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white
  }
});
