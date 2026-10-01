import { createDestinationCacheDao } from "../../data/local/sqlite/destinationCacheDao.jsx";
import { createDiscoveryStateDao } from "../../data/local/sqlite/discoveryStateDao.jsx";
import { createFavoriteDao } from "../../data/local/sqlite/favoriteDao.jsx";
import { createItineraryDao } from "../../data/local/sqlite/itineraryDao.jsx";
import { createLocationSnapshotDao } from "../../data/local/sqlite/locationSnapshotDao.jsx";
import { createNavigationSessionDao } from "../../data/local/sqlite/navigationSessionDao.jsx";
import { createPackContentDao } from "../../data/local/sqlite/packContentDao.jsx";
import { createPackMetaDao } from "../../data/local/sqlite/packMetaDao.jsx";
import { createPreferencesDao } from "../../data/local/sqlite/preferencesDao.jsx";
import { LocalDestinationRepository } from "../../data/repositories/destinationRepository.jsx";
import { LocalDiscoveryRepository } from "../../data/repositories/discoveryRepository.jsx";
import { LocalFavoriteRepository } from "../../data/repositories/favoriteRepository.jsx";
import { LocalItineraryRepository } from "../../data/repositories/itineraryRepository.jsx";
import { LocalNavigationSessionRepository } from "../../data/repositories/navigationSessionRepository.jsx";
import { PackRepositoryImpl } from "../../data/repositories/packRepository.jsx";
import { LocalPreferencesRepository } from "../../data/repositories/preferencesRepository.jsx";
import { BundledRoutingGraphRepository } from "../../data/repositories/routingGraphRepository.jsx";
import { ExpoLocationService } from "../../data/services/locationService.jsx";
import { createOnlineResearchService } from "../../data/services/onlineResearchService.jsx";
import { createPhoneService } from "../../data/services/phoneService.jsx";
import { createOfflinePackStorage } from "../../data/services/offlinePackStorage.jsx";
import { createSpeechService } from "../../data/services/speechService.jsx";
/**
 * Composition root (poor-man's DI). Singletons are created once at first use;
 * view model factories receive everything they need through their deps.
 */
const buildContainer = () => {
  // Local storage
  const destinationCacheDao = createDestinationCacheDao();
  const discoveryStateDao = createDiscoveryStateDao();
  const favoriteDao = createFavoriteDao();
  const packContentDao = createPackContentDao();
  const packMetaDao = createPackMetaDao();
  const preferencesDao = createPreferencesDao();
  const itineraryDao = createItineraryDao();
  const locationSnapshotDao = createLocationSnapshotDao();
  const navigationSessionDao = createNavigationSessionDao();
  const offlinePackStorage = createOfflinePackStorage();

  // Repositories
  const destinationRepository = new LocalDestinationRepository(destinationCacheDao);
  const discoveryRepository = new LocalDiscoveryRepository(discoveryStateDao);
  const favoriteRepository = new LocalFavoriteRepository(favoriteDao);
  const packRepository = new PackRepositoryImpl(packContentDao, packMetaDao, offlinePackStorage);
  const preferencesRepository = new LocalPreferencesRepository(preferencesDao);
  const itineraryRepository = new LocalItineraryRepository(itineraryDao);
  const navigationSessionRepository = new LocalNavigationSessionRepository(navigationSessionDao);
  const routingGraphRepository = new BundledRoutingGraphRepository();

  // Platform services
  const locationService = new ExpoLocationService({ snapshotStore: locationSnapshotDao });
  const onlineResearchService = createOnlineResearchService();
  const phoneService = createPhoneService();
  const speechService = createSpeechService();

  // Use case dependency bundles
  const destinationDeps = {
    destinationRepository,
    packRepository,
    favoriteRepository,
    discoveryRepository
  };
  const preferencesDeps = {
    preferencesRepository
  };
  const tripsDeps = {
    itineraryRepository
  };
  const safetyDeps = {
    phoneService
  };
  const onlineResearchDeps = {
    onlineResearchService
  };
  const directionsDeps = {
    onlineResearchService
  };
  const routingDeps = {
    routingGraphRepository,
    navigationSessionRepository,
    speechService
  };
  return {
    destinationDeps,
    preferencesDeps,
    tripsDeps,
    safetyDeps,
    onlineResearchDeps,
    directionsDeps,
    routingDeps,
    locationService
  };
};
let instance = null;
export const getContainer = () => {
  if (!instance) {
    instance = buildContainer();
  }
  return instance;
};
