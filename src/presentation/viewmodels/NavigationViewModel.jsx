import { AppState } from 'react-native';
import { haversineKm } from "../../core/utils/geo.jsx";
import { placesAlongRoute } from "../../core/routing/routeProgress.jsx";
import { normalizeRoutePreference } from "../../core/routing/routingProfiles.jsx";
import {
  calculateOfflineRoute,
  prepareOfflineRoutingGraph,
  turnStateBeforeRoutePosition,
} from "../../domain/usecases/offlineNavigation.jsx";
import {
  calculateOfflineFerryJourney,
  remainingFerryJourneyDurationMin,
} from "../../domain/usecases/ferryJourney.jsx";
import {
  calculateOfflineRoadTrailJourney,
  remainingRoadTrailDurationMin,
} from "../../domain/usecases/roadTrailJourney.jsx";
import { calculateOfflineRouteAlternatives } from "../../domain/usecases/routeAlternatives.jsx";
import {
  calculateOfflineMultiStopJourney,
  remainingMultiStopDurationMin,
} from "../../domain/usecases/multiStopJourney.jsx";
import {
  advanceNavigationProgress,
  BASE_OFF_ROUTE_M,
  createNavigationEvidence,
  MAX_NAVIGATION_ACCURACY_M,
} from "../../domain/navigation/navigationEngine.jsx";
import { guidanceAnnouncement } from "../../domain/navigation/navigationGuidance.jsx";
import {
  createActiveNavigationSession,
  createNavigationSessionId,
} from "../../domain/navigation/navigationSession.jsx";
import { routingRegionFor } from "../../data/assets/routingRegionAssets.jsx";
import { subscribeNavigationRuntime } from "../../data/services/navigationRuntime.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

const MAX_ROUTE_START_ACCURACY_M = 250;
const REROUTE_COOLDOWN_MS = 12_000;

const SCENIC_POI_CATEGORIES = new Set([
  'attraction',
  'beach',
  'island',
  'landmark',
  'museum',
  'park',
  'viewpoint',
]);

export class NavigationViewModel extends ViewModel {
  unwatch = null;
  runtimeUnsubscribe = null;
  locationWatchRequest = 0;
  offRouteSamples = 0;
  wrongWaySamples = 0;
  wrongWayDistanceM = 0;
  spokenManeuverId = null;
  spokenStage = null;
  speedSamples = [];
  lastAcceptedFix = null;
  lastFixTimestamp = null;
  lastRerouteAtMs = null;
  gpsLost = false;
  lastConfirmedRouteDistanceKm = 0;
  activeSessionId = null;
  activeSessionStartedAt = null;
  backgroundNavigationActive = false;

  constructor(routingDeps, destinationDeps, locationService, route, nav) {
    const resumeSession = route.resumeNavigationSession?.status === 'active'
      ? route.resumeNavigationSession
      : null;
    const resumeProgress = resumeSession?.progress ?? {};
    const multiStops = Array.isArray(route.multiStops) ? route.multiStops : [];
    const completedStopCount = resumeSession
      ? resumeProgress.completedStopCount ?? 0
      : Math.max(
        0,
        Math.min(
          multiStops.length,
          Number.isFinite(route.resumeCompletedStopCount) ? route.resumeCompletedStopCount : 0,
        ),
      );
    super({
      loading: true,
      calculating: false,
      rerouting: false,
      tracking: Boolean(resumeSession),
      graph: null,
      graphMeta: null,
      destinationId: route.destinationId,
      destinationName: route.destinationName,
      target: route.target,
      multiStops,
      tripId: route.tripId ?? null,
      tripTitle: route.tripTitle ?? null,
      completedStopCount,
      resumedSession: route.resumedSession === true,
      trailId: route.trailId ?? null,
      trailPreview: null,
      offlinePois: [],
      scenicPois: [],
      routePois: [],
      mode: route.mode ?? 'walk',
      preference: normalizeRoutePreference(route.preference),
      coverage: route.coverage ?? null,
      discoveryTarget: route.discoveryTarget === true,
      coordinateStatus: route.coordinateStatus ?? null,
      previewStart: route.previewStart ?? null,
      offlineBasemapUri: null,
      fix: resumeProgress.fix ?? null,
      accuracyM: resumeProgress.accuracyM ?? null,
      route: resumeSession?.navigationRoute ?? null,
      preview: false,
      permission: resumeSession ? 'granted' : 'unknown',
      backgroundPermission: resumeSession?.backgroundEnabled ? 'granted' : 'unknown',
      notificationPermission: 'unknown',
      backgroundNavigation: resumeSession?.backgroundEnabled === true,
      backgroundWarning: null,
      progressPct: resumeProgress.progressPct ?? 0,
      distanceAlongKm: resumeProgress.distanceAlongKm ?? 0,
      remainingKm: resumeProgress.remainingKm ?? resumeSession?.navigationRoute?.distanceKm ?? null,
      remainingMin: resumeProgress.remainingMin ?? resumeSession?.navigationRoute?.durationMin ?? null,
      usingLiveEta: resumeProgress.usingLiveEta === true,
      offRouteM: resumeProgress.offRouteM ?? null,
      nextManeuver: resumeProgress.nextManeuver
        ?? resumeSession?.navigationRoute?.maneuvers?.[1]
        ?? resumeSession?.navigationRoute?.maneuvers?.[0]
        ?? null,
      distanceToNextManeuverKm: resumeProgress.distanceToNextManeuverKm ?? null,
      voiceGuidance: resumeSession?.voiceGuidance !== false,
      rerouteCount: resumeProgress.rerouteCount ?? 0,
      alternativeRoutes: [],
      alternativeBaseRoute: null,
      alternativesLoading: false,
      selectedAlternativeId: null,
      switchTargets: [],
      switchingDestination: false,
      journeyPhase: resumeProgress.journeyPhase ?? null,
      wrongWay: resumeProgress.wrongWay === true,
      arrived: resumeProgress.arrived === true,
      gpsError: null,
      error: null,
    });
    this.routingDeps = routingDeps;
    this.destinationDeps = destinationDeps;
    this.locationService = locationService;
    this.nav = nav;
    this.activeSessionId = resumeSession?.sessionId ?? null;
    this.activeSessionStartedAt = resumeSession?.startedAt ?? null;
    this.backgroundNavigationActive = resumeSession?.backgroundEnabled === true;
    if (resumeSession?.evidence) this.applyNavigationEvidence(resumeSession.evidence);
    this.spokenManeuverId = resumeSession?.guidanceState?.maneuverId ?? null;
    this.spokenStage = resumeSession?.guidanceState?.stage ?? null;
  }

  onInit = () => {
    this.runtimeUnsubscribe = subscribeNavigationRuntime(this.handleRuntimeEvent);
    void this.load().then(() => {
      if (this.activeSessionId) void this.resumeActiveNavigationSession();
    });
    if (!this.activeSessionId) {
      void this.persistMultiStopSession(this.state.completedStopCount);
    }
  };

  onDispose = () => {
    this.runtimeUnsubscribe?.();
    this.runtimeUnsubscribe = null;
    this.stopLocationWatch();
    this.stopSpeech();
  };

  captureNavigationEvidence = () => createNavigationEvidence({
    offRouteSamples: this.offRouteSamples,
    wrongWaySamples: this.wrongWaySamples,
    wrongWayDistanceM: this.wrongWayDistanceM,
    speedSamples: this.speedSamples,
    lastAcceptedFix: this.lastAcceptedFix,
    lastFixTimestamp: this.lastFixTimestamp,
    gpsLost: this.gpsLost,
    lastConfirmedRouteDistanceKm: this.lastConfirmedRouteDistanceKm,
  });

  applyNavigationEvidence = evidence => {
    const normalized = createNavigationEvidence(evidence);
    this.offRouteSamples = normalized.offRouteSamples;
    this.wrongWaySamples = normalized.wrongWaySamples;
    this.wrongWayDistanceM = normalized.wrongWayDistanceM;
    this.speedSamples = normalized.speedSamples;
    this.lastAcceptedFix = normalized.lastAcceptedFix;
    this.lastFixTimestamp = normalized.lastFixTimestamp;
    this.gpsLost = normalized.gpsLost;
    this.lastConfirmedRouteDistanceKm = normalized.lastConfirmedRouteDistanceKm;
  };

  activeNavigationRequest = () => ({
    destinationId: this.state.destinationId,
    destinationName: this.state.destinationName,
    target: this.state.target,
    multiStops: this.state.multiStops,
    tripId: this.state.tripId,
    tripTitle: this.state.tripTitle,
    trailId: this.state.trailId,
    mode: this.state.mode,
    preference: this.state.preference,
    coverage: this.state.coverage,
    discoveryTarget: this.state.discoveryTarget,
    coordinateStatus: this.state.coordinateStatus,
    previewStart: this.state.previewStart,
  });

  activeNavigationProgress = () => ({
    fix: this.state.fix,
    accuracyM: this.state.accuracyM,
    progressPct: this.state.progressPct,
    distanceAlongKm: this.state.distanceAlongKm,
    remainingKm: this.state.remainingKm,
    remainingMin: this.state.remainingMin,
    usingLiveEta: this.state.usingLiveEta,
    offRouteM: this.state.offRouteM,
    nextManeuver: this.state.nextManeuver,
    distanceToNextManeuverKm: this.state.distanceToNextManeuverKm,
    completedStopCount: this.state.completedStopCount,
    journeyPhase: this.state.journeyPhase,
    wrongWay: this.state.wrongWay,
    arrived: this.state.arrived,
    rerouteCount: this.state.rerouteCount,
  });

  persistActiveNavigationSession = async () => {
    const repository = this.routingDeps.navigationSessionRepository;
    if (!repository || !this.state.tracking || !this.state.route || this.state.preview) return;
    if (!this.activeSessionId) this.activeSessionId = createNavigationSessionId();
    if (!this.activeSessionStartedAt) this.activeSessionStartedAt = Date.now();
    try {
      await repository.saveActiveSession(createActiveNavigationSession({
        sessionId: this.activeSessionId,
        startedAt: this.activeSessionStartedAt,
        request: this.activeNavigationRequest(),
        navigationRoute: this.state.route,
        progress: this.activeNavigationProgress(),
        evidence: this.captureNavigationEvidence(),
        voiceGuidance: this.state.voiceGuidance,
        guidanceState: {
          maneuverId: this.spokenManeuverId,
          stage: this.spokenStage,
        },
        backgroundEnabled: this.backgroundNavigationActive,
      }));
    } catch {
      // Live navigation must continue if a progress checkpoint cannot be written.
    }
  };

  clearPersistedNavigationSession = async () => {
    try {
      await this.routingDeps.navigationSessionRepository?.clearActiveSession();
    } catch {
      // Navigation cleanup must not fail because local persistence is unavailable.
    }
  };

  handleRuntimeEvent = event => {
    const session = event?.session;
    if (!session || session.sessionId !== this.activeSessionId) {
      if (event?.type === 'error' && this.state.tracking) {
        this.setState({
          backgroundWarning: event.message
            || 'Background navigation is temporarily unavailable.',
        });
      }
      return;
    }

    const progress = session.progress ?? {};
    this.applyNavigationEvidence(session.evidence);
    this.spokenManeuverId = session.guidanceState?.maneuverId ?? this.spokenManeuverId;
    this.spokenStage = session.guidanceState?.stage ?? this.spokenStage;
    this.backgroundNavigationActive = event.type !== 'arrived' && session.backgroundEnabled === true;
    this.setState({
      ...progress,
      route: session.navigationRoute ?? this.state.route,
      tracking: event.type !== 'arrived',
      voiceGuidance: session.voiceGuidance !== false,
      backgroundPermission: session.backgroundEnabled ? 'granted' : this.state.backgroundPermission,
      backgroundNavigation: this.backgroundNavigationActive,
      backgroundWarning: null,
      rerouting: event.type === 'arrived' ? false : this.state.rerouting,
    });

    if (event.type === 'arrived') {
      this.stopLocationWatch();
      this.backgroundNavigationActive = false;
      this.activeSessionId = null;
      this.activeSessionStartedAt = null;
      return;
    }

    const fix = progress.fix;
    const eventTimeMs = Number.isFinite(fix?.timestamp) ? fix.timestamp : Date.now();
    const cooldownElapsed = this.lastRerouteAtMs == null
      || eventTimeMs - this.lastRerouteAtMs >= REROUTE_COOLDOWN_MS;
    if (
      session.needsReroute
      && AppState.currentState === 'active'
      && fix
      && cooldownElapsed
      && this.state.tracking
      && !this.state.rerouting
    ) {
      this.lastRerouteAtMs = eventTimeMs;
      void this.rerouteFrom(fix);
    }
  };

  resumeActiveNavigationSession = async () => {
    if (!this.activeSessionId || !this.state.route || !this.state.tracking) return;
    let backgroundActive = false;
    try {
      const active = await this.locationService.isBackgroundNavigationActive?.();
      if (active) {
        backgroundActive = true;
      } else if (this.state.backgroundNavigation) {
        backgroundActive = await this.locationService.startBackgroundNavigation?.({
          destinationName: this.state.target?.label ?? this.state.destinationName,
        }) === true;
      }
    } catch {
      backgroundActive = false;
    }

    this.backgroundNavigationActive = backgroundActive;
    this.setState({
      backgroundPermission: backgroundActive ? 'granted' : this.state.backgroundPermission,
      backgroundNavigation: backgroundActive,
      backgroundWarning: backgroundActive
        ? null
        : 'Background navigation stopped. LakBai will keep live GPS active while the app is open.',
    });
    if (backgroundActive) await this.persistActiveNavigationSession();

    const request = ++this.locationWatchRequest;
    try {
      await this.startForegroundLocationWatch(request);
    } catch {
      this.setState({
        tracking: backgroundActive,
        gpsError: backgroundActive
          ? 'Foreground GPS is reconnecting. Background navigation is still active.'
          : 'Live navigation could not resume.',
      });
    }
  };

  persistMultiStopSession = async completedStopCount => {
    const repository = this.routingDeps.navigationSessionRepository;
    if (!repository || !this.state.tripId || !this.state.multiStops.length) return;
    try {
      await repository.saveActiveSession({
        version: 1,
        savedAt: Date.now(),
        completedStopCount,
        route: {
          destinationId: this.state.destinationId,
          destinationName: this.state.destinationName,
          target: this.state.target,
          multiStops: this.state.multiStops,
          tripId: this.state.tripId,
          tripTitle: this.state.tripTitle,
          mode: this.state.mode,
          preference: this.state.preference,
          coverage: this.state.coverage,
        },
      });
    } catch {
      // Navigation continues even if the resume checkpoint cannot be persisted.
    }
  };

  clearPersistedMultiStopSession = async () => {
    if (!this.state.tripId) return;
    try {
      await this.routingDeps.navigationSessionRepository?.clearActiveSession();
    } catch {
      // Route cleanup should not block the live navigation flow.
    }
  };

  load = async () => {
    await this.loadSwitchTargets();
    try {
      const [bundle, bundledBasemap, bundledPack] = await Promise.all([
        this.destinationDeps.packRepository.getOfflineBundleStatus?.(this.state.destinationId) ?? null,
        this.destinationDeps.packRepository.ensureOfflineBasemapReady?.()
          ?? this.destinationDeps.packRepository.getOfflineBasemapStatus?.()
          ?? null,
        this.destinationDeps.packRepository.getBundledPack?.(this.state.destinationId) ?? null,
      ]);
      const graph = await this.routingDeps.routingGraphRepository.getForDestination(
        this.state.destinationId,
        bundle?.routingGraphUri ?? null,
        this.state.target,
        bundle?.sharedRouting ?? null,
      );
      // Prime the expensive routing index while this screen is loading so
      // Find my route only has to acquire a location and run the route search.
      prepareOfflineRoutingGraph(graph);
      const navigationPack = bundledPack;
      const trailPreview = this.state.trailId
        ? navigationPack?.trails?.find(trail => (
          trail.id === this.state.trailId && trail.routeVerified === true
        )) ?? null
        : null;
      const offlinePois = (navigationPack?.spots ?? []).filter(spot => (
        haversineKm(spot, this.state.target) > 0.08
      ));
      const scenicPois = offlinePois.filter(spot => (
        SCENIC_POI_CATEGORIES.has(String(spot.category ?? '').toLowerCase())
      ));
      this.setState({
        graph,
        graphMeta: graph?.meta ?? null,
        coverage: graph?.meta?.name ?? this.state.coverage,
        trailPreview,
        offlinePois,
        scenicPois,
        routePois: this.state.route
          ? placesAlongRoute(this.state.route, offlinePois, this.state.distanceAlongKm)
          : this.state.routePois,
        offlineBasemapUri: bundle?.basemapUri ?? bundledBasemap?.uri ?? null,
        error: !graph
          ? 'Directions are not available for this destination yet.'
          : !(bundle?.basemapUri ?? bundledBasemap?.uri)
          ? 'The saved map could not open. Please try again.'
          : null,
      });
    } catch {
      this.setState({
        error: 'Directions could not load for this place. Please try again.',
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  loadSwitchTargets = async () => {
    try {
      const [result, savedMeta] = await Promise.all([
        this.destinationDeps.destinationRepository?.getDestinations?.({}),
        this.destinationDeps.packRepository.listSavedMeta?.() ?? [],
      ]);
      const destinations = result?.items ?? [];
      const savedIds = new Set((savedMeta ?? []).map(meta => meta.packId));
      const switchTargets = destinations
        .filter(destination => (
          savedIds.has(destination.id)
          && destination.status === 'available'
          && destination.offlineNavigation?.target
          && Number.isFinite(destination.offlineNavigation.target.lat)
          && Number.isFinite(destination.offlineNavigation.target.lng)
        ))
        .map(destination => ({
          destinationId: destination.id,
          destinationName: destination.name,
          area: destination.area,
          target: destination.offlineNavigation.target,
          coverage: destination.offlineNavigation.coverage ?? null,
        }));
      this.setState({ switchTargets });
    } catch {
      this.setState({ switchTargets: [] });
    }
  };

  get availableSwitchTargets() {
    return (this.state.switchTargets ?? []).filter(option => (
      option.destinationId !== this.state.destinationId
    ));
  }

  switchDestination = async option => {
    if (
      !this.state.tracking
      || this.state.switchingDestination
      || !option?.destinationId
      || !Number.isFinite(option?.target?.lat)
      || !Number.isFinite(option?.target?.lng)
    ) {
      return { ok: false, message: 'A live route is required before changing destination.' };
    }

    const origin = this.state.fix
      ?? await this.locationService.getCurrentFix({ purpose: 'navigation' });
    if (!origin) {
      const message = await this.locationService.locationFailureMessage?.(
        'LakBai needs your current location before changing destination.',
      );
      this.setState({
        gpsError: message ?? 'LakBai needs your current location before changing destination.',
      });
      return { ok: false, message };
    }

    const previous = {
      destinationId: this.state.destinationId,
      destinationName: this.state.destinationName,
      target: this.state.target,
      multiStops: this.state.multiStops,
      tripId: this.state.tripId,
      tripTitle: this.state.tripTitle,
      completedStopCount: this.state.completedStopCount,
      trailId: this.state.trailId,
      trailPreview: this.state.trailPreview,
      graph: this.state.graph,
      graphMeta: this.state.graphMeta,
      offlineBasemapUri: this.state.offlineBasemapUri,
      offlinePois: this.state.offlinePois,
      scenicPois: this.state.scenicPois,
      route: this.state.route,
      routePois: this.state.routePois,
      coverage: this.state.coverage,
      discoveryTarget: this.state.discoveryTarget,
      coordinateStatus: this.state.coordinateStatus,
      previewStart: this.state.previewStart,
      progressPct: this.state.progressPct,
      distanceAlongKm: this.state.distanceAlongKm,
      remainingKm: this.state.remainingKm,
      remainingMin: this.state.remainingMin,
      usingLiveEta: this.state.usingLiveEta,
      offRouteM: this.state.offRouteM,
      nextManeuver: this.state.nextManeuver,
      distanceToNextManeuverKm: this.state.distanceToNextManeuverKm,
      journeyPhase: this.state.journeyPhase,
      wrongWay: this.state.wrongWay,
      arrived: this.state.arrived,
    };

    this.setState({
      switchingDestination: true,
      rerouting: true,
      gpsError: null,
      error: null,
    });

    try {
      const [bundle, bundledBasemap, bundledPack] = await Promise.all([
        this.destinationDeps.packRepository.getOfflineBundleStatus?.(option.destinationId) ?? null,
        this.destinationDeps.packRepository.ensureOfflineBasemapReady?.()
          ?? this.destinationDeps.packRepository.getOfflineBasemapStatus?.()
          ?? null,
        this.destinationDeps.packRepository.getBundledPack?.(option.destinationId) ?? null,
      ]);
      const graph = await this.routingDeps.routingGraphRepository.getForDestination(
        option.destinationId,
        bundle?.routingGraphUri ?? null,
        option.target,
        bundle?.sharedRouting ?? null,
      );
      if (!graph) throw new Error('Navigation data for that destination is not available on this device.');
      prepareOfflineRoutingGraph(graph);

      const navigationPack = bundledPack;
      const offlinePois = (navigationPack?.spots ?? []).filter(spot => (
        haversineKm(spot, option.target) > 0.08
      ));
      const scenicPois = offlinePois.filter(spot => (
        SCENIC_POI_CATEGORIES.has(String(spot.category ?? '').toLowerCase())
      ));

      this.setState({
        destinationId: option.destinationId,
        destinationName: option.destinationName,
        target: option.target,
        multiStops: [],
        tripId: null,
        tripTitle: null,
        completedStopCount: 0,
        trailId: null,
        trailPreview: null,
        graph,
        graphMeta: graph?.meta ?? null,
        offlinePois,
        scenicPois,
        coverage: graph?.meta?.name ?? option.coverage ?? this.state.coverage,
        discoveryTarget: false,
        coordinateStatus: null,
        previewStart: null,
        offlineBasemapUri: bundle?.basemapUri
          ?? bundledBasemap?.uri
          ?? this.state.offlineBasemapUri,
      });

      const result = await this.calculateRouteResult(origin);
      if (!result.ok) throw new Error('No route could be found from your current location to that destination.');

      this.stopSpeech();
      this.resetSpokenGuidance();
      this.resetNavigationEvidence();
      this.setState({
        route: result,
        alternativeRoutes: [],
        alternativeBaseRoute: null,
        selectedAlternativeId: null,
        progressPct: 0,
        distanceAlongKm: 0,
        remainingKm: result.distanceKm,
        remainingMin: result.type === 'ferry-journey'
          ? remainingFerryJourneyDurationMin(result, 0)
          : result.type === 'road-trail-journey'
          ? remainingRoadTrailDurationMin(result, 0)
          : result.type === 'multi-stop-journey'
          ? remainingMultiStopDurationMin(result, 0)
          : result.durationMin,
        usingLiveEta: false,
        offRouteM: 0,
        nextManeuver: result.maneuvers?.[1] ?? result.maneuvers?.[0] ?? null,
        distanceToNextManeuverKm: result.maneuvers?.[1]?.distanceAlongKm ?? null,
        routePois: placesAlongRoute(result, offlinePois),
        journeyPhase: (
          result.type === 'ferry-journey'
          || result.type === 'road-trail-journey'
          || result.type === 'multi-stop-journey'
        ) ? 'road' : null,
        wrongWay: false,
        arrived: false,
      });
      this.applyFix(origin);

      if (this.backgroundNavigationActive && this.locationService.startBackgroundNavigation) {
        try {
          await this.locationService.stopBackgroundNavigation?.();
          const restarted = await this.locationService.startBackgroundNavigation({
            destinationName: option.target.label ?? option.destinationName,
          });
          this.backgroundNavigationActive = restarted === true;
          this.setState({ backgroundNavigation: restarted === true });
        } catch {
          this.backgroundNavigationActive = false;
          this.setState({
            backgroundNavigation: false,
            backgroundWarning: 'Background navigation stopped after changing destination. Keep LakBai open for live directions.',
          });
        }
      }

      if (this.activeSessionId) await this.persistActiveNavigationSession();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'The destination could not be changed.';
      this.setState({ ...previous, gpsError: message });
      return { ok: false, message };
    } finally {
      this.setState({ switchingDestination: false, rerouting: false });
    }
  };

  get lowAccuracy() {
    return (this.state.accuracyM ?? 0) > MAX_NAVIGATION_ACCURACY_M;
  }

  get offRouteThresholdM() {
    return Math.max(BASE_OFF_ROUTE_M, (this.state.accuracyM ?? 0) * 1.8);
  }

  get offRoute() {
    return !this.lowAccuracy
      && this.state.offRouteM != null
      && this.state.offRouteM > this.offRouteThresholdM;
  }

  startFromGps = async () => {
    if (!this.state.graph || !this.state.offlineBasemapUri) return;
    this.stopLocationWatch();
    this.setState({
      calculating: true,
      tracking: false,
      error: null,
      gpsError: null,
      preview: false,
      arrived: false,
    });

    try {
      const granted = await this.locationService.requestPermissions();
      if (!granted) {
        this.setState({
          permission: 'denied',
          error: 'Location permission is required to calculate a route from your current position.',
        });
        return;
      }
      this.setState({ permission: 'granted' });
      const fix = await this.locationService.getCurrentFix({ purpose: 'route' });
      if (!fix) {
        const message = await this.locationService.locationFailureMessage?.(
          'Your location could not be found yet. Move to an open area and try again.',
        );
        this.setState({
          error: message ?? 'Your location could not be found yet. Move to an open area and try again.',
        });
        return;
      }
      if (fix.accuracy != null && fix.accuracy > MAX_ROUTE_START_ACCURACY_M) {
        this.setState({
          fix,
          accuracyM: fix.accuracy,
          error: `Your location estimate is about ${Math.round(fix.accuracy)} m wide, which is too broad to choose a safe route start. Try again after the phone refines your position.`,
        });
        return;
      }
      await this.calculateFrom(fix, false);
    } finally {
      this.setState({ calculating: false });
    }
  };

  previewRoute = async () => {
    if (!this.state.graph || !this.state.offlineBasemapUri || !this.state.previewStart) return;
    this.stopLocationWatch();
    this.setState({ calculating: true, tracking: false, error: null, gpsError: null });
    try {
      await this.calculateFrom(this.state.previewStart, true);
    } finally {
      this.setState({ calculating: false });
    }
  };

  calculateRouteResult = async (from, initialTurnState = []) => {
    const originRegion = routingRegionFor(null, from);
    const targetRegion = routingRegionFor(this.state.destinationId, this.state.target);
    if (this.state.multiStops.length > this.state.completedStopCount) {
      return calculateOfflineMultiStopJourney({
        routingGraphRepository: this.routingDeps.routingGraphRepository,
        from,
        stops: this.state.multiStops.slice(this.state.completedStopCount),
        baseStopIndex: this.state.completedStopCount,
        mode: this.state.mode,
        preference: this.state.preference,
        routeAttractors: this.state.scenicPois,
        maxSnapDistanceKm: 1,
        initialTurnState,
      });
    }
    if (
      this.state.trailPreview?.routeVerified
      && this.state.mode === 'walk'
      && originRegion
      && targetRegion
      && originRegion === targetRegion
    ) {
      return calculateOfflineRoadTrailJourney({
        graph: this.state.graph,
        from,
        trail: this.state.trailPreview,
        mode: 'walk',
        preference: this.state.preference,
        routeAttractors: this.state.scenicPois,
        maxSnapDistanceKm: 1,
        initialTurnState,
      });
    }
    if (
      originRegion
      && targetRegion
      && originRegion !== targetRegion
      && this.routingDeps.routingGraphRepository?.getForRegion
    ) {
      return calculateOfflineFerryJourney({
        routingGraphRepository: this.routingDeps.routingGraphRepository,
        from,
        to: this.state.target,
        mode: this.state.mode,
        preference: this.state.preference,
        routeAttractors: this.state.scenicPois,
        maxSnapDistanceKm: 1,
        targetLabel: this.state.target.label ?? this.state.destinationName,
        initialTurnState,
      });
    }
    return calculateOfflineRoute({
      graph: this.state.graph,
      from,
      to: this.state.target,
      mode: this.state.mode,
      preference: this.state.preference,
      routeAttractors: this.state.scenicPois,
      maxSnapDistanceKm: 1,
      targetLabel: this.state.target.label ?? this.state.destinationName,
      initialTurnState,
    });
  };

  calculateFrom = async (from, preview) => {
    const result = await this.calculateRouteResult(from);

    if (!result.ok) {
      this.setState({
        fix: from,
        accuracyM: from.accuracy ?? null,
        route: null,
        preview,
        progressPct: 0,
        remainingKm: null,
        remainingMin: null,
        nextManeuver: null,
        distanceToNextManeuverKm: null,
        journeyPhase: null,
        error: result.reason === 'ferry-unavailable' || result.reason === 'ferry-required'
          ? 'No suitable ferry route to or from Samal was found from your location.'
          : result.reason === 'multi-stop-leg-failed' || result.reason === 'multi-stop-routing-unavailable'
          ? `No route was found to stop ${(result.stopIndex ?? 0) + 1}.`
          : result.reason === 'trail-approach-route-failed'
          ? 'No walking route to the trail entrance was found from your location.'
          : result.reason === 'trail-unverified'
          ? 'Directions are not available for this trail because its path has not been checked.'
          : result.reason === 'ferry-origin-route-failed'
          ? 'No route to the ferry terminal was found from your location.'
          : result.reason === 'ferry-destination-route-failed'
          ? 'No route was found from the ferry terminal to your destination.'
          : result.reason === 'outside-coverage'
          ? `Your position is outside the current ${this.state.coverage ?? 'map coverage'}.`
          : 'No route could be found from this position.',
      });
      return null;
    }

    this.resetNavigationEvidence();
    this.setState({
      fix: from,
      accuracyM: from.accuracy ?? null,
      route: result,
      alternativeRoutes: [],
      alternativeBaseRoute: null,
      selectedAlternativeId: null,
      coverage: result.type === 'ferry-journey'
        ? 'Davao del Norte ↔ Samal ferry route'
        : this.state.coverage,
      preview,
      progressPct: 0,
      distanceAlongKm: 0,
      remainingKm: result.distanceKm,
      remainingMin: result.type === 'ferry-journey'
        ? remainingFerryJourneyDurationMin(result, 0)
        : result.type === 'road-trail-journey'
        ? remainingRoadTrailDurationMin(result, 0)
        : result.type === 'multi-stop-journey'
        ? remainingMultiStopDurationMin(result, 0)
        : result.durationMin,
      offRouteM: null,
      nextManeuver: result.maneuvers?.[1] ?? result.maneuvers?.[0] ?? null,
      distanceToNextManeuverKm: result.maneuvers?.[1]?.distanceAlongKm ?? null,
      routePois: placesAlongRoute(result, this.state.offlinePois),
      journeyPhase: (
        result.type === 'ferry-journey'
        || result.type === 'road-trail-journey'
        || result.type === 'multi-stop-journey'
      ) ? 'road' : null,
      wrongWay: false,
      arrived: false,
      error: null,
    });
    if (!preview) this.applyFix(from);
    return result;
  };

  findAlternatives = async () => {
    const route = this.state.route;
    const from = this.state.fix;
    if (!route?.ok || !from || this.state.tracking || this.state.alternativesLoading) return;
    if (route.type === 'ferry-journey' || route.type === 'multi-stop-journey') {
      this.setState({
        alternativeRoutes: [],
        error: route.type === 'multi-stop-journey'
          ? 'Alternative previews are generated for single-destination journeys, not an ordered itinerary.'
          : 'Alternative road previews are not offered across the fixed ferry transport leg.',
      });
      return;
    }

    this.setState({ alternativesLoading: true, error: null });
    try {
      const primaryRoadRoute = route.type === 'road-trail-journey'
        ? route.legs?.find(leg => leg.kind === 'road')?.route
        : route;
      const target = route.type === 'road-trail-journey'
        ? route.trailLeg?.start
        : this.state.target;
      if (!primaryRoadRoute?.ok || !target) {
        this.setState({ alternativeRoutes: [] });
        return;
      }
      const result = calculateOfflineRouteAlternatives({
        graph: this.state.graph,
        from,
        to: target,
        mode: this.state.mode,
        preference: this.state.preference,
        routeAttractors: this.state.scenicPois,
        maxSnapDistanceKm: 1,
        targetLabel: target.name ?? target.label ?? this.state.destinationName,
        primaryRoute: primaryRoadRoute,
        limit: 2,
      });
      const alternatives = route.type === 'road-trail-journey'
        ? result.alternatives.map(candidate => ({
          ...calculateOfflineRoadTrailJourney({
            graph: this.state.graph,
            from,
            trail: this.state.trailPreview,
            mode: 'walk',
            preference: this.state.preference,
            routeAttractors: this.state.scenicPois,
            maxSnapDistanceKm: 1,
            roadRoute: candidate,
          }),
          alternativeId: candidate.alternativeId,
          distanceDeltaKm: candidate.distanceDeltaKm,
          durationDeltaMin: candidate.durationDeltaMin,
        })).filter(candidate => candidate.ok)
        : result.alternatives;
      this.setState({
        alternativeRoutes: alternatives,
        alternativeBaseRoute: route,
        selectedAlternativeId: null,
      });
    } finally {
      this.setState({ alternativesLoading: false });
    }
  };

  selectAlternative = alternativeId => {
    if (this.state.tracking) return;
    const route = alternativeId === 'primary'
      ? this.state.alternativeBaseRoute
      : this.state.alternativeRoutes.find(candidate => (
        candidate.alternativeId === alternativeId
      ));
    if (!route?.ok) return;
    this.resetSpokenGuidance();
    this.resetNavigationEvidence();
    this.setState({
      route,
      selectedAlternativeId: alternativeId === 'primary' ? null : alternativeId,
      progressPct: 0,
      distanceAlongKm: 0,
      remainingKm: route.distanceKm,
      remainingMin: route.type === 'road-trail-journey'
        ? remainingRoadTrailDurationMin(route, 0)
        : route.durationMin,
      usingLiveEta: false,
      offRouteM: null,
      nextManeuver: route.maneuvers?.[1] ?? route.maneuvers?.[0] ?? null,
      distanceToNextManeuverKm: route.maneuvers?.[1]?.distanceAlongKm ?? null,
      routePois: placesAlongRoute(route, this.state.offlinePois),
      journeyPhase: route.type === 'road-trail-journey' ? 'road' : null,
      wrongWay: false,
      arrived: false,
      error: null,
    });
  };

  startForegroundLocationWatch = async request => {
    const unwatch = await this.locationService.watchFix(
      fix => { if (request === this.locationWatchRequest) this.applyFix(fix); },
      error => { if (request === this.locationWatchRequest) this.handleLocationError(error); },
      { purpose: 'navigation' },
    );
    if (request !== this.locationWatchRequest) unwatch?.();
    else this.unwatch = unwatch;
  };

  startNavigation = async () => {
    if (!this.state.route || this.state.preview || this.state.tracking) return;
    const request = ++this.locationWatchRequest;
    const granted = this.state.permission === 'granted'
      ? true
      : await this.locationService.requestPermissions();
    if (request !== this.locationWatchRequest) return;
    if (!granted) {
      this.setState({
        permission: 'denied',
        gpsError: 'Location permission is required for live navigation.',
      });
      return;
    }

    this.activeSessionId = createNavigationSessionId();
    this.activeSessionStartedAt = Date.now();
    this.setState({
      permission: 'granted',
      tracking: true,
      gpsError: null,
      arrived: false,
      backgroundWarning: null,
    });
    this.announceGuidance(
      this.state.nextManeuver,
      this.state.distanceToNextManeuverKm,
      true,
    );

    try {
      const currentFix = await this.locationService.getCurrentFix({ purpose: 'navigation' });
      if (request !== this.locationWatchRequest) return;
      if (currentFix) this.applyFix(currentFix);
      if (request !== this.locationWatchRequest) return;

      let backgroundGranted = false;
      try {
        backgroundGranted = await this.locationService.requestBackgroundNavigationPermissions?.()
          === true;
      } catch {
        backgroundGranted = false;
      }
      if (request !== this.locationWatchRequest) return;

      let notificationGranted = true;
      if (backgroundGranted) {
        try {
          const notificationResult = await this.locationService
            .requestNavigationNotificationPermission?.();
          notificationGranted = notificationResult !== false;
        } catch {
          notificationGranted = false;
        }
      }
      if (request !== this.locationWatchRequest) return;

      this.backgroundNavigationActive = backgroundGranted;
      this.setState({
        backgroundPermission: backgroundGranted ? 'granted' : 'denied',
        notificationPermission: backgroundGranted
          ? (notificationGranted ? 'granted' : 'denied')
          : this.state.notificationPermission,
        backgroundNavigation: backgroundGranted,
        backgroundWarning: backgroundGranted
          ? notificationGranted
            ? null
            : 'Background navigation is on, but notifications are blocked. Android may hide the ongoing navigation status.'
          : 'Background location was not allowed. Navigation still works while LakBai stays open.',
      });
      await this.persistActiveNavigationSession();
      if (request !== this.locationWatchRequest) return;

      if (backgroundGranted && this.locationService.startBackgroundNavigation) {
        try {
          const started = await this.locationService.startBackgroundNavigation({
            destinationName: this.state.target?.label ?? this.state.destinationName,
          });
          if (request !== this.locationWatchRequest) {
            if (started) void this.locationService?.stopBackgroundNavigation?.();
            return;
          }
          if (started) {
            this.backgroundNavigationActive = true;
            this.setState({
              backgroundNavigation: true,
              backgroundWarning: notificationGranted
                ? null
                : 'Background navigation is on, but notifications are blocked. Android may hide the ongoing navigation status.',
            });
            await this.persistActiveNavigationSession();
          }
        } catch {
          this.backgroundNavigationActive = false;
          this.setState({
            backgroundNavigation: false,
            backgroundWarning: 'Android background navigation could not start. Keep LakBai open for live directions.',
          });
          await this.persistActiveNavigationSession();
        }
      }

      try {
        await this.startForegroundLocationWatch(request);
      } catch (error) {
        if (this.backgroundNavigationActive) {
          this.setState({
            gpsError: 'Foreground GPS is reconnecting. Background navigation remains active.',
          });
          await this.persistActiveNavigationSession();
          return;
        }
        throw error;
      }
    } catch {
      if (request !== this.locationWatchRequest) return;
      this.stopLocationWatch();
      this.backgroundNavigationActive = false;
      void this.locationService?.stopBackgroundNavigation?.();
      void this.clearPersistedNavigationSession();
      this.activeSessionId = null;
      this.activeSessionStartedAt = null;
      this.setState({
        tracking: false,
        backgroundNavigation: false,
        gpsError: 'Live navigation could not start.',
      });
    }
  };

  stopNavigation = () => {
    this.stopLocationWatch();
    this.stopSpeech();
    this.resetNavigationEvidence();
    this.backgroundNavigationActive = false;
    this.activeSessionId = null;
    this.activeSessionStartedAt = null;
    void this.locationService?.stopBackgroundNavigation?.();
    void this.clearPersistedNavigationSession();
    this.setState({
      tracking: false,
      rerouting: false,
      backgroundNavigation: false,
      backgroundWarning: null,
      usingLiveEta: false,
      wrongWay: false,
      gpsError: null,
    });
  };

  stopLocationWatch = () => {
    this.locationWatchRequest += 1;
    this.unwatch?.();
    this.unwatch = null;
  };

  setPreference = preference => {
    if (this.state.tracking || this.state.calculating) return;
    this.setState({
      preference: normalizeRoutePreference(preference),
      alternativeRoutes: [],
      selectedAlternativeId: null,
    });
    void this.persistMultiStopSession(this.state.completedStopCount);
  };

  setMode = mode => {
    if (this.state.tracking || this.state.calculating) return;
    if (mode !== 'walk' && mode !== 'drive') return;
    this.setState({
      mode,
      preference: mode === 'walk' ? this.state.preference : 'direct',
      alternativeRoutes: [],
      selectedAlternativeId: null,
    });
    void this.persistMultiStopSession(this.state.completedStopCount);
  };

  stopSpeech = () => {
    void this.routingDeps.speechService?.stop?.();
  };

  resetSpokenGuidance = () => {
    this.spokenManeuverId = null;
    this.spokenStage = null;
  };

  resetNavigationEvidence = ({ preserveRerouteCooldown = false } = {}) => {
    this.speedSamples = [];
    this.offRouteSamples = 0;
    this.wrongWaySamples = 0;
    this.wrongWayDistanceM = 0;
    this.lastAcceptedFix = null;
    this.lastFixTimestamp = null;
    this.lastConfirmedRouteDistanceKm = 0;
    this.gpsLost = false;
    if (!preserveRerouteCooldown) this.lastRerouteAtMs = null;
  };

  handleLocationError = message => {
    this.gpsLost = true;
    this.offRouteSamples = 0;
    this.wrongWaySamples = 0;
    this.wrongWayDistanceM = 0;
    this.speedSamples = [];
    this.setState({
      wrongWay: false,
      gpsError: message || 'Live GPS updates are unavailable right now. Route progress is paused until GPS recovers.',
    });
  };

  announceGuidance = (maneuver, distanceKm, force = false) => {
    if (
      !this.state.voiceGuidance
      || !this.state.tracking
      || !maneuver
      || !this.routingDeps.speechService?.speak
    ) return;

    const announcement = guidanceAnnouncement({
      maneuver,
      distanceKm,
      force,
      previousManeuverId: this.spokenManeuverId,
      previousStage: this.spokenStage,
    });
    if (!announcement) return;
    this.spokenManeuverId = announcement.maneuverId;
    this.spokenStage = announcement.stage;
    void this.routingDeps.speechService.speak(announcement.text);
    void this.persistActiveNavigationSession();
  };

  toggleVoiceGuidance = () => {
    const voiceGuidance = !this.state.voiceGuidance;
    this.setState({ voiceGuidance });
    this.resetSpokenGuidance();
    if (!voiceGuidance) {
      this.stopSpeech();
      void this.persistActiveNavigationSession();
      return;
    }
    if (this.state.tracking) {
      this.announceGuidance(
        this.state.nextManeuver,
        this.state.distanceToNextManeuverKm,
        true,
      );
    }
    void this.persistActiveNavigationSession();
  };

  applyFix = fix => {
    if (!this.state.route || this.state.preview) {
      this.setState({
        fix,
        accuracyM: fix?.accuracy ?? null,
      });
      return;
    }

    const result = advanceNavigationProgress({
      route: this.state.route,
      target: this.state.target,
      mode: this.state.mode,
      tracking: this.state.tracking,
      distanceAlongKm: this.state.distanceAlongKm,
      completedStopCount: this.state.completedStopCount,
      evidence: this.captureNavigationEvidence(),
      fix,
    });
    if (result.ignored) return;

    this.applyNavigationEvidence(result.evidence);
    this.setState({
      ...result.patch,
      routePois: Number.isFinite(result.patch.distanceAlongKm)
        ? placesAlongRoute(
          this.state.route,
          this.state.offlinePois,
          result.patch.distanceAlongKm,
        )
        : this.state.routePois,
    });

    if (result.completedStopChanged) {
      if (this.state.tracking) void this.persistActiveNavigationSession();
      else void this.persistMultiStopSession(this.state.completedStopCount);
    }

    if (result.guidance) {
      this.announceGuidance(result.guidance.maneuver, result.guidance.distanceKm);
    } else if (this.state.tracking) {
      void this.persistActiveNavigationSession();
    }

    if (result.arrived) {
      this.stopLocationWatch();
      this.backgroundNavigationActive = false;
      void this.locationService?.stopBackgroundNavigation?.();
      void this.clearPersistedNavigationSession();
      this.activeSessionId = null;
      this.activeSessionStartedAt = null;
      this.setState({
        tracking: false,
        rerouting: false,
        backgroundNavigation: false,
      });
      return;
    }

    const eventTimeMs = Number.isFinite(fix?.timestamp) ? fix.timestamp : Date.now();
    const cooldownElapsed = this.lastRerouteAtMs == null
      || eventTimeMs - this.lastRerouteAtMs >= REROUTE_COOLDOWN_MS;
    if (
      result.rerouteRecommended
      && cooldownElapsed
      && this.state.tracking
      && !this.state.rerouting
    ) {
      this.lastRerouteAtMs = eventTimeMs;
      this.offRouteSamples = 0;
      this.wrongWaySamples = 0;
      this.wrongWayDistanceM = 0;
      void this.rerouteFrom(fix);
    }
  };

  rerouteFrom = async fix => {
    if (!this.state.graph || !this.state.route) return;
    let initialTurnState = [];
    if (this.state.route.type === 'ferry-journey') {
      const region = routingRegionFor(null, fix);
      const roadLeg = this.state.route.legs?.find(leg => (
        leg.kind === 'road'
        && leg.region === region
        && this.lastConfirmedRouteDistanceKm >= leg.startKm - 0.05
        && this.lastConfirmedRouteDistanceKm <= leg.endKm + 0.05
      ));
      if (roadLeg && region) {
        const targetRegion = routingRegionFor(this.state.destinationId, this.state.target);
        const graph = region === targetRegion
          ? this.state.graph
          : await this.routingDeps.routingGraphRepository.getForRegion(region);
        if (graph) {
          initialTurnState = turnStateBeforeRoutePosition({
            graph,
            route: roadLeg.route,
            distanceAlongKm: Math.max(0, this.lastConfirmedRouteDistanceKm - roadLeg.startKm),
            mode: this.state.mode,
          });
        }
      }
    } else if (this.state.route.type === 'multi-stop-journey') {
      const region = routingRegionFor(null, fix);
      const roadLeg = this.state.route.roadLegs?.find(leg => (
        leg.region === region
        && this.lastConfirmedRouteDistanceKm >= leg.startKm - 0.05
        && this.lastConfirmedRouteDistanceKm <= leg.endKm + 0.05
      ));
      if (roadLeg && region) {
        const graph = await this.routingDeps.routingGraphRepository.getForRegion(region);
        if (graph) {
          initialTurnState = turnStateBeforeRoutePosition({
            graph,
            route: roadLeg.route,
            distanceAlongKm: Math.max(
              0,
              (this.lastConfirmedRouteDistanceKm - roadLeg.startKm)
                / Math.max(0.001, roadLeg.progressScale ?? 1),
            ),
            mode: this.state.mode,
          });
        }
      }
    } else if (this.state.route.type === 'road-trail-journey') {
      const roadLeg = this.state.route.legs?.find(leg => leg.kind === 'road');
      if (roadLeg) {
        initialTurnState = turnStateBeforeRoutePosition({
          graph: this.state.graph,
          route: roadLeg.route,
          distanceAlongKm: Math.min(
            roadLeg.endKm,
            this.lastConfirmedRouteDistanceKm,
          ),
          mode: this.state.mode,
        });
      }
    } else {
      initialTurnState = turnStateBeforeRoutePosition({
        graph: this.state.graph,
        route: this.state.route,
        distanceAlongKm: this.lastConfirmedRouteDistanceKm,
        mode: this.state.mode,
      });
    }
    this.setState({ rerouting: true, gpsError: null });
    try {
      const result = await this.calculateRouteResult(fix, initialTurnState);
      if (!result.ok) {
        this.setState({
          gpsError: 'You may be off your route. No new route was found. Check the map when safe.',
        });
        return;
      }

      this.resetSpokenGuidance();
      this.resetNavigationEvidence({ preserveRerouteCooldown: true });
      this.setState(previous => ({
        route: result,
        alternativeRoutes: [],
        alternativeBaseRoute: null,
        selectedAlternativeId: null,
        journeyPhase: (
          result.type === 'ferry-journey'
          || result.type === 'road-trail-journey'
          || result.type === 'multi-stop-journey'
        ) ? 'road' : null,
        rerouteCount: previous.rerouteCount + 1,
        progressPct: 0,
        distanceAlongKm: 0,
        remainingKm: result.distanceKm,
        remainingMin: result.type === 'ferry-journey'
          ? remainingFerryJourneyDurationMin(result, 0)
          : result.type === 'road-trail-journey'
          ? remainingRoadTrailDurationMin(result, 0)
          : result.type === 'multi-stop-journey'
          ? remainingMultiStopDurationMin(result, 0)
          : result.durationMin,
        nextManeuver: result.maneuvers?.[1] ?? result.maneuvers?.[0] ?? null,
        distanceToNextManeuverKm: result.maneuvers?.[1]?.distanceAlongKm ?? null,
        offRouteM: 0,
        wrongWay: false,
      }));
      this.applyFix(fix);
    } finally {
      this.setState({ rerouting: false });
    }
  };

  clearRoute = () => {
    this.stopNavigation();
    this.resetSpokenGuidance();
    this.resetNavigationEvidence();
    this.setState({
      fix: null,
      accuracyM: null,
      route: null,
      alternativeRoutes: [],
      alternativeBaseRoute: null,
      alternativesLoading: false,
      selectedAlternativeId: null,
      preview: false,
      tracking: false,
      progressPct: 0,
      distanceAlongKm: 0,
      remainingKm: null,
      remainingMin: null,
      usingLiveEta: false,
      offRouteM: null,
      nextManeuver: null,
      distanceToNextManeuverKm: null,
      routePois: [],
      rerouteCount: 0,
      completedStopCount: 0,
      journeyPhase: null,
      wrongWay: false,
      arrived: false,
      backgroundPermission: 'unknown',
      notificationPermission: 'unknown',
      backgroundNavigation: false,
      backgroundWarning: null,
      gpsError: null,
      error: null,
    });
  };

  openTrail = () => {
    if (!this.state.trailId || !this.nav.onOpenTrail) return;
    this.stopNavigation();
    this.nav.onOpenTrail(this.state.trailId);
  };

  back = () => {
    this.stopNavigation();
    this.nav.onBack();
  };
}
