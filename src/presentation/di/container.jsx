import { createDestinationCacheDao } from "../../data/local/sqlite/destinationCacheDao.jsx";
import { createFavoriteDao } from "../../data/local/sqlite/favoriteDao.jsx";
import { createItineraryDao } from "../../data/local/sqlite/itineraryDao.jsx";
import { createPackContentDao } from "../../data/local/sqlite/packContentDao.jsx";
import { createPackMetaDao } from "../../data/local/sqlite/packMetaDao.jsx";
import { createPreferencesDao } from "../../data/local/sqlite/preferencesDao.jsx";
import { createSafetyDao } from "../../data/local/sqlite/safetyDao.jsx";
import { LocalDestinationRepository } from "../../data/repositories/destinationRepository.jsx";
import { LocalFavoriteRepository } from "../../data/repositories/favoriteRepository.jsx";
import { LocalItineraryRepository } from "../../data/repositories/itineraryRepository.jsx";
import { PackRepositoryImpl } from "../../data/repositories/packRepository.jsx";
import { LocalPreferencesRepository } from "../../data/repositories/preferencesRepository.jsx";
import { LocalSafetyRepository } from "../../data/repositories/safetyRepository.jsx";
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
  const favoriteDao = createFavoriteDao();
  const packContentDao = createPackContentDao();
  const packMetaDao = createPackMetaDao();
  const preferencesDao = createPreferencesDao();
  const itineraryDao = createItineraryDao();
  const safetyDao = createSafetyDao();
  const offlinePackStorage = createOfflinePackStorage();

  // Repositories
  const destinationRepository = new LocalDestinationRepository(destinationCacheDao);
  const favoriteRepository = new LocalFavoriteRepository(favoriteDao);
  const packRepository = new PackRepositoryImpl(packContentDao, packMetaDao, offlinePackStorage);
  const preferencesRepository = new LocalPreferencesRepository(preferencesDao);
  const itineraryRepository = new LocalItineraryRepository(itineraryDao);
  const safetyRepository = new LocalSafetyRepository(safetyDao);
  const routingGraphRepository = new BundledRoutingGraphRepository();

  // Platform services
  const locationService = new ExpoLocationService();
  const onlineResearchService = createOnlineResearchService();
  const phoneService = createPhoneService();
  const speechService = createSpeechService();

  // Use case dependency bundles
  const destinationDeps = {
    destinationRepository,
    packRepository,
    favoriteRepository
  };
  const preferencesDeps = {
    preferencesRepository
  };
  const tripsDeps = {
    itineraryRepository
  };
  const safetyDeps = {
    safetyRepository,
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
