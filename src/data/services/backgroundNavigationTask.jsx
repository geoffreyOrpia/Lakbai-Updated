import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { advanceNavigationProgress } from "../../domain/navigation/navigationEngine.jsx";
import { guidanceAnnouncement } from "../../domain/navigation/navigationGuidance.jsx";
import { isLiveNavigationSession } from "../repositories/navigationSessionRepository.jsx";
import { getContainer } from "../../presentation/di/container.jsx";
import { BACKGROUND_NAVIGATION_TASK } from "./backgroundNavigationConstants.jsx";
import { locationObjectToFix } from "./locationService.jsx";
import { emitNavigationRuntime } from "./navigationRuntime.jsx";

const stopOrphanedTask = async () => {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_NAVIGATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_NAVIGATION_TASK);
    }
  } catch {
    // Android may already be tearing down the foreground service.
  }
};

export const processBackgroundNavigationLocations = async (
  locations,
  {
    navigationSessionRepository,
    speechService,
  },
) => {
  let session = await navigationSessionRepository.getActiveSession();
  if (!isLiveNavigationSession(session)) {
    await stopOrphanedTask();
    return { active: false, session: null };
  }

  let lastAnnouncement = null;
  for (const location of locations ?? []) {
    const fix = locationObjectToFix(location, 'background');
    if (!fix) continue;

    const result = advanceNavigationProgress({
      route: session.navigationRoute,
      target: session.request.target,
      mode: session.request.mode,
      tracking: true,
      distanceAlongKm: session.progress.distanceAlongKm,
      completedStopCount: session.progress.completedStopCount,
      evidence: session.evidence,
      fix,
    });
    if (result.ignored) continue;

    const progress = {
      ...session.progress,
      ...result.patch,
      completedStopCount: result.patch.completedStopCount
        ?? session.progress.completedStopCount,
    };
    session = {
      ...session,
      savedAt: Date.now(),
      progress,
      evidence: result.evidence,
      needsReroute: result.rerouteRecommended,
    };

    if (session.voiceGuidance && result.guidance) {
      const announcement = guidanceAnnouncement({
        maneuver: result.guidance.maneuver,
        distanceKm: result.guidance.distanceKm,
        previousManeuverId: session.guidanceState?.maneuverId ?? null,
        previousStage: session.guidanceState?.stage ?? null,
      });
      if (announcement) {
        session = {
          ...session,
          guidanceState: {
            maneuverId: announcement.maneuverId,
            stage: announcement.stage,
          },
        };
        lastAnnouncement = announcement;
      }
    }

    if (
      result.rerouteRecommended
      && session.voiceGuidance
      && session.offRouteWarningSpoken !== true
    ) {
      session = {
        ...session,
        offRouteWarningSpoken: true,
      };
      lastAnnouncement = {
        text: 'You may be off your route. Open LakBai to update directions.',
      };
    } else if (!result.rerouteRecommended && session.offRouteWarningSpoken) {
      session = {
        ...session,
        offRouteWarningSpoken: false,
      };
    }

    if (result.arrived) {
      const arrivedSession = {
        ...session,
        status: 'arrived',
        savedAt: Date.now(),
      };
      emitNavigationRuntime({
        type: 'arrived',
        session: arrivedSession,
        result,
      });
      try {
        if (lastAnnouncement?.text && speechService?.speak) {
          await speechService.speak(lastAnnouncement.text);
        }
      } finally {
        await navigationSessionRepository.clearActiveSession();
        await stopOrphanedTask();
      }
      return { active: false, arrived: true, session: arrivedSession };
    }

    emitNavigationRuntime({
      type: 'progress',
      session,
      result,
    });
  }

  if (lastAnnouncement?.text && speechService?.speak) {
    await speechService.speak(lastAnnouncement.text);
  }
  await navigationSessionRepository.saveActiveSession(session);
  emitNavigationRuntime({ type: 'progress', session });
  return { active: true, session };
};

const backgroundNavigationTask = async ({ data, error }) => {
  if (error) {
    emitNavigationRuntime({
      type: 'error',
      message: error.message || 'Background location updates are temporarily unavailable.',
    });
    return;
  }

  const container = getContainer();
  try {
    await processBackgroundNavigationLocations(data?.locations ?? [], {
      navigationSessionRepository: container.routingDeps.navigationSessionRepository,
      speechService: container.routingDeps.speechService,
    });
  } catch {
    emitNavigationRuntime({
      type: 'error',
      message: 'LakBai could not process a background navigation update.',
    });
  }
};

if (
  Platform.OS === 'android'
  && (
    typeof TaskManager.isTaskDefined !== 'function'
    || !TaskManager.isTaskDefined(BACKGROUND_NAVIGATION_TASK)
  )
) {
  TaskManager.defineTask(BACKGROUND_NAVIGATION_TASK, backgroundNavigationTask);
}
