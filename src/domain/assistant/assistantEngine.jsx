import { buildSmartTripDraft, recommendTourismPlaces } from "../usecases/smartExplore.jsx";
import { parseAssistantRequest } from "./intentParser.jsx";
import { destinationEntityFor, resolveAssistantEntity } from "./assistantKnowledge.jsx";

const sentenceList = values => values.filter(Boolean).map(value => String(value).trim()).filter(Boolean);
const firstSentence = value => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match?.[0] ?? text).trim();
};

const SAVED_INTEREST_MAP = Object.freeze({
  Beaches: ['beach'],
  Waterfalls: ['nature'],
  Hiking: ['adventure', 'nature'],
  Wildlife: ['wildlife'],
  Culture: ['culture'],
  'Food trips': ['food'],
  'City strolls': ['culture'],
  Photography: ['photography'],
});

const savedInterestKeys = preferences => [...new Set(
  (preferences?.interests ?? []).flatMap(interest => SAVED_INTEREST_MAP[interest] ?? []),
)];

const applySavedPreferenceDefaults = (request, preferences) => {
  if (!['recommend', 'trip'].includes(request.intent)) return request;
  if (request.constraints.interests.length) return request;
  const interests = savedInterestKeys(preferences);
  if (!interests.length) return request;
  return {
    ...request,
    usedSavedInterests: true,
    constraints: {
      ...request.constraints,
      interests,
    },
  };
};

const tripStopCountFor = preferences => {
  if (preferences?.pace === 'chill') return 2;
  if (preferences?.pace === 'packed') return 4;
  return 3;
};

const previewList = (values, limit = 3) => {
  const list = sentenceList(values).slice(0, limit);
  return list.length ? list.map(value => `• ${value}`).join('\n') : '';
};

const contextFor = entity => entity
  ? { activeEntityId: entity.id, activeDestinationId: entity.destinationId }
  : {};

const openDestinationAction = entity => ({
  type: 'open-destination',
  label: `Open ${entity.destination.name}`,
  destinationId: entity.destinationId,
});

const navigationTargetFor = entity => {
  if (entity?.kind === 'spot' && Number.isFinite(entity.data?.lat) && Number.isFinite(entity.data?.lng)) {
    return { label: entity.data.name, lat: entity.data.lat, lng: entity.data.lng };
  }
  return entity?.destination?.offlineNavigation?.target ?? null;
};

const directionsResponse = entity => {
  if (!entity) {
    return {
      text: 'Tell me which LakBai destination or place you want directions to.',
      suggestions: ['Directions to Hagimit Falls', 'Take me to Monfort Bat Sanctuary', 'Directions to Tagum'],
    };
  }

  const navigation = entity.destination?.offlineNavigation;
  const target = navigationTargetFor(entity);
  if (!navigation || !target) {
    return {
      text: `In-app navigation is not available for ${entity.name} yet.`,
      actions: [openDestinationAction(entity)],
      suggestions: ['What can I do there?', 'What should I prepare?'],
    };
  }

  if (!entity.item?.saved) {
    return {
      text: `Open ${entity.destination.name} and tap Get directions. LakBai will prepare the offline guide automatically.`,
      actions: [openDestinationAction(entity)],
      suggestions: ['Does it work offline?', 'What should I prepare?'],
    };
  }

  return {
    text: `Ready to navigate to ${target.label} offline. Current road or ferry conditions may still change.`,
    actions: [{
      type: 'navigate',
      label: `Navigate to ${target.label}`,
      navigation: {
        destinationId: entity.destination.id,
        destinationName: entity.destination.name,
        target,
        mode: navigation.mode ?? 'walk',
        coverage: navigation.coverage ?? null,
        previewStart: navigation.previewStart ?? null,
        trailId: null,
      },
    }],
    suggestions: ['What should I prepare?', 'What can I do there?'],
  };
};

const infoResponse = entity => {
  if (!entity) {
    return {
      text: 'Ask me about a destination, nearby places, directions, safety, offline use, or trip planning.',
      suggestions: ['What can I do in Samal?', 'Plan a trip'],
    };
  }

  if (entity.kind === 'spot') {
    const description = firstSentence(entity.data?.description);
    const tip = firstSentence(entity.data?.tip);
    return {
      text: `${entity.name}: ${description || `a place in ${entity.destination.name}`}${tip ? `\nTip: ${tip}` : ''}`,
      actions: [openDestinationAction(entity)],
      suggestions: ['How do I get there?', 'What else is nearby?'],
    };
  }

  if (entity.kind === 'route') {
    const route = entity.data;
    const stops = (route?.stops ?? []).map(stop => stop.name);
    return {
      text: `${route.name}: ${firstSentence(route.description) || 'a suggested trip route'}${stops.length ? `\nStops: ${stops.slice(0, 4).join(' → ')}` : ''}`,
      actions: [openDestinationAction(entity)],
      suggestions: ['Plan this trip', 'What should I prepare?'],
    };
  }

  const visitorSpots = (entity.pack?.spots ?? [])
    .filter(spot => !['transport', 'facility', 'town'].includes(spot.category))
    .slice(0, 3)
    .map(spot => spot.name);
  const highlights = visitorSpots.length
    ? visitorSpots
    : (entity.destination.highlights ?? []).slice(0, 3);
  const intro = firstSentence(entity.destination.description ?? entity.destination.summary)
    || entity.destination.summary
    || entity.destination.name;
  return {
    text: `${intro}${highlights.length ? `\n\nTry:\n${highlights.map(value => `• ${value}`).join('\n')}` : ''}`,
    actions: [openDestinationAction(entity)],
    suggestions: ['How do I get there?', 'What should I prepare?'],
  };
};

const transportResponse = entity => {
  if (!entity) {
    return {
      text: 'Name a destination and I can show its stored transport notes.',
      suggestions: ['Transport to Samal', 'How do I get around Tagum?'],
    };
  }
  const transport = entity.pack?.transport;
  if (!transport) {
    return {
      text: `Transport information for ${entity.destination.name} is not available yet.`,
      actions: [openDestinationAction(entity)],
    };
  }
  const gettingThere = previewList(transport.gettingThere ?? [], 2);
  const around = previewList(transport.gettingAround ?? [], 1);
  return {
    text: `${entity.destination.name}:\n${gettingThere}${around ? `\n${around}` : ''}\n\nConfirm current fares and schedules locally.`,
    actions: [openDestinationAction(entity)],
    suggestions: ['How do I get there?', 'What should I prepare?'],
  };
};

const safetyResponse = entity => {
  if (!entity) {
    return {
      text: 'For emergencies in the Philippines, dial 911. Name a destination for local preparation tips.',
      suggestions: ['Safety tips for Samal', 'What should I prepare for Hagimit Falls?'],
    };
  }
  const reminders = previewList(entity.pack?.safety?.reminders ?? [], 3);
  return {
    text: `Before visiting ${entity.destination.name}:\n${reminders || '• Follow current site rules and local guidance.'}\n\nEmergency: 911.`,
    actions: [openDestinationAction(entity)],
    suggestions: ['How do I get there?', 'Does it work offline?'],
  };
};

const offlineResponse = entity => {
  if (!entity) {
    return {
      text: 'Saved destination guides and supported routes work offline. Name a place to check its status.',
      suggestions: ['Is Samal available offline?', 'Is Tagum saved offline?'],
    };
  }
  const saved = Boolean(entity.item?.saved);
  const routing = Boolean(entity.destination?.offlineNavigation);
  return {
    text: saved
      ? `${entity.destination.name} is ready offline${routing ? ', including supported LakBai navigation' : ''}.`
      : `${entity.destination.name} is not saved offline yet. Open the guide to prepare it.`,
    actions: [openDestinationAction(entity)],
    suggestions: ['How do I get there?', 'What can I do there?'],
  };
};

const liveInfoResponse = entity => ({
  text: entity
    ? `I do not have a verified live value for that at ${entity.destination.name}. Check the destination or local tourism office for current details.`
    : 'I do not guess live fees, hours, schedules, fares, weather, or same-day access. Name a destination and I can show its stored guide information.',
  actions: entity ? [openDestinationAction(entity)] : [],
  suggestions: entity
    ? ['What can I do there?', 'What should I prepare?', 'How do I get there?']
    : ['What can I do in Samal?', 'What can I visit in Tagum?'],
});

const recommendationResponse = ({ request, knowledge, entity, origin }) => {
  if ((request.intent === 'nearby' || request.constraints.ferry === 'avoid') && !origin) {
    return {
      needsLocation: true,
      text: 'I need your current location to rank nearby places or determine whether a ferry crossing is required.',
    };
  }

  let results = recommendTourismPlaces(
    knowledge.catalog,
    request.constraints,
    { origin },
  );
  if (entity?.destinationId) {
    results = results.filter(place => place.destinationId === entity.destinationId);
  }
  const selected = results.slice(0, 3);
  if (!selected.length) {
    return {
      text: 'I couldn’t find a place matching that request. Try a broader interest or name a destination.',
      suggestions: ['Recommend nature places', 'What can I do in Samal?', 'What can I visit in Tagum?'],
    };
  }

  const lines = selected.map(place => {
    const distance = Number.isFinite(place.distanceKm)
      ? ` · ${place.distanceKm.toFixed(place.distanceKm < 10 ? 1 : 0)} km away`
      : '';
    return `• ${place.name} — ${firstSentence(place.description)}${distance}`;
  });
  return {
    text: `${request.usedSavedInterests ? 'Based on your saved interests:' : `I found ${selected.length} option${selected.length === 1 ? '' : 's'}:`}\n\n${lines.join('\n\n')}`,
    actions: selected.map(place => ({
      type: 'open-destination',
      label: `Open ${place.name}`,
      destinationId: place.destinationId,
    })),
    suggestions: ['Plan a trip with these', 'Which works offline?'],
    recommendationIds: selected.map(place => place.id),
  };
};

const tripResponse = ({ request, knowledge, entity, origin, context, preferences }) => {
  let recommendations = recommendTourismPlaces(
    knowledge.catalog,
    request.constraints,
    { origin },
  );
  const refersToPrevious = /\b(these|those|them|recommendations)\b/.test(request.text);
  const previousIds = refersToPrevious ? context?.lastRecommendationIds ?? [] : [];
  if (previousIds.length >= 2) {
    const previous = new Set(previousIds);
    recommendations = recommendations.filter(place => previous.has(place.id));
  } else if (entity?.destinationId) {
    recommendations = recommendations.filter(place => place.destinationId === entity.destinationId);
  }
  const selectedLimit = previousIds.length >= 2
    ? Math.min(4, previousIds.length)
    : tripStopCountFor(preferences);
  const selected = recommendations.slice(0, selectedLimit);
  if (selected.length < 2) {
    return {
      text: 'I need at least two eligible LakBai places to build an editable trip. Try naming a broader destination or interest.',
      suggestions: ['Plan a nature trip', 'Plan a trip in Samal', 'Plan a trip in Tagum'],
    };
  }
  const draft = buildSmartTripDraft({
    recommendations,
    selectedIds: selected.map(place => place.id),
    origin,
    travelMode: request.constraints.travelMode,
  });
  return {
    text: `I made a ${selected.length}-stop draft: ${selected.map(place => place.name).join(' → ')}. Review or reorder it in Trips.`,
    actions: draft ? [{ type: 'plan-trip', label: 'Open trip draft', draft }] : [],
    suggestions: ['What should I prepare?', 'Which places work offline?'],
  };
};

export const respondToAssistant = ({
  message,
  knowledge,
  context = {},
  origin = null,
  preferences = null,
}) => {
  const request = applySavedPreferenceDefaults(
    parseAssistantRequest(message),
    preferences,
  );
  const entity = resolveAssistantEntity(knowledge, message, context);
  const baseContext = {
    ...context,
    ...contextFor(entity),
  };

  let response;
  switch (request.intent) {
    case 'emergency':
      response = {
        text: 'For emergencies in the Philippines, dial 911.',
        suggestions: ['Safety tips for my destination'],
      };
      break;
    case 'directions':
      response = directionsResponse(entity);
      break;
    case 'nearby':
    case 'recommend':
      response = recommendationResponse({ request, knowledge, entity, origin });
      break;
    case 'trip':
      response = tripResponse({
        request,
        knowledge,
        entity,
        origin,
        context,
        preferences,
      });
      break;
    case 'transport':
      response = transportResponse(entity);
      break;
    case 'safety':
      response = safetyResponse(entity);
      break;
    case 'offline':
      response = offlineResponse(entity);
      break;
    case 'live-info':
      response = liveInfoResponse(entity);
      break;
    default:
      response = infoResponse(entity);
      break;
  }

  const recommendationEntity = response?.recommendationIds?.length
    ? (knowledge?.catalog ?? []).find(place => place.id === response.recommendationIds[0])
    : null;
  const nextEntity = recommendationEntity
    ? destinationEntityFor(knowledge, recommendationEntity.destinationId)
    : entity;

  return {
    ...response,
    context: {
      ...baseContext,
      ...contextFor(nextEntity),
      lastIntent: request.intent,
      lastRecommendationIds: response?.recommendationIds ?? context.lastRecommendationIds ?? [],
    },
  };
};
