import { ACTIVE_NAVIGATION_SESSION_VERSION } from "../../data/repositories/navigationSessionRepository.jsx";
import { createNavigationEvidence } from "./navigationEngine.jsx";

export const createNavigationSessionId = (now = Date.now()) => (
  `nav-${now}-${Math.random().toString(36).slice(2, 9)}`
);

export const createActiveNavigationSession = ({
  sessionId,
  startedAt,
  savedAt = Date.now(),
  request,
  navigationRoute,
  progress,
  evidence,
  voiceGuidance = true,
  guidanceState,
  backgroundEnabled = false,
  needsReroute = false,
}) => ({
  version: ACTIVE_NAVIGATION_SESSION_VERSION,
  sessionId: sessionId || createNavigationSessionId(savedAt),
  status: 'active',
  startedAt: Number.isFinite(startedAt) ? startedAt : savedAt,
  savedAt,
  request: {
    ...request,
    multiStops: Array.isArray(request?.multiStops) ? request.multiStops : [],
  },
  navigationRoute,
  progress: {
    fix: progress?.fix ?? null,
    accuracyM: progress?.accuracyM ?? null,
    progressPct: Number.isFinite(progress?.progressPct) ? progress.progressPct : 0,
    distanceAlongKm: Number.isFinite(progress?.distanceAlongKm)
      ? Math.max(0, progress.distanceAlongKm)
      : 0,
    remainingKm: progress?.remainingKm ?? navigationRoute?.distanceKm ?? null,
    remainingMin: progress?.remainingMin ?? navigationRoute?.durationMin ?? null,
    usingLiveEta: progress?.usingLiveEta === true,
    offRouteM: progress?.offRouteM ?? null,
    nextManeuver: progress?.nextManeuver ?? navigationRoute?.maneuvers?.[1]
      ?? navigationRoute?.maneuvers?.[0]
      ?? null,
    distanceToNextManeuverKm: progress?.distanceToNextManeuverKm ?? null,
    completedStopCount: Number.isInteger(progress?.completedStopCount)
      ? Math.max(0, progress.completedStopCount)
      : 0,
    journeyPhase: progress?.journeyPhase ?? null,
    wrongWay: progress?.wrongWay === true,
    arrived: progress?.arrived === true,
    rerouteCount: Number.isFinite(progress?.rerouteCount)
      ? Math.max(0, progress.rerouteCount)
      : 0,
  },
  evidence: createNavigationEvidence(evidence),
  voiceGuidance: voiceGuidance !== false,
  guidanceState: {
    maneuverId: guidanceState?.maneuverId ?? null,
    stage: guidanceState?.stage ?? null,
  },
  backgroundEnabled: backgroundEnabled === true,
  needsReroute: needsReroute === true,
  offRouteWarningSpoken: false,
});
