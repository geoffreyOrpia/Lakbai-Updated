import { routingProfile } from "./routingProfiles.jsx";
import { edgeCoordinates } from "./edgeGeometry.jsx";

export const routeGeometryFromPath = (index, path) => {
  if (!path.edges.length) {
    return {
      type: 'LineString',
      coordinates: path.nodeIds.map(id => {
        const node = index.nodesById.get(String(id));
        return [node.lng, node.lat];
      }),
    };
  }
  const coordinates = [];
  for (const edge of path.edges) {
    const points = edgeCoordinates(
      edge, index.nodesById.get(String(edge.from)), index.nodesById.get(String(edge.to)),
    );
    // Adjacent edges share a junction; keep its coordinate only once.
    for (const point of points.slice(coordinates.length ? 1 : 0)) coordinates.push(point);
  }
  return { type: 'LineString', coordinates };
};

export const summarizeRoutePath = (path, mode = 'walk') => {
  const profile = routingProfile(mode);
  const distanceKm = path.edges.reduce((sum, edge) => sum + edge.distanceKm, 0);
  const durationHours = path.edges.reduce((sum, edge) => sum + profile.durationHours(edge), 0);
  return {
    distanceKm,
    durationMin: Math.max(1, Math.round(durationHours * 60)),
  };
};
