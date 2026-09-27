import { routingProfile } from "./routingProfiles.jsx";

export const routeGeometryFromPath = (index, path) => ({
  type: 'LineString',
  coordinates: path.nodeIds.map(id => {
    const node = index.nodesById.get(String(id));
    return [node.lng, node.lat];
  }),
});

export const summarizeRoutePath = (path, mode = 'walk') => {
  const profile = routingProfile(mode);
  const distanceKm = path.edges.reduce((sum, edge) => sum + edge.distanceKm, 0);
  const durationHours = path.edges.reduce((sum, edge) => sum + profile.durationHours(edge), 0);
  return {
    distanceKm,
    durationMin: Math.max(1, Math.round(durationHours * 60)),
  };
};
