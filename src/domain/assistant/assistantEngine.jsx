import { buildSmartTripDraft, recommendTourismPlaces } from "../usecases/smartExplore.jsx";
import { parseAssistantRequest } from "./intentParser.jsx";
import { destinationEntityFor, resolveAssistantEntity } from "./assistantKnowledge.jsx";

const sentenceList = values => values.filter(Boolean).map(value => String(value).trim()).filter(Boolean);

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
      text: `LakBai has guide information for ${entity.name}, but in-app offline routing is not available for that target yet.`,
      actions: [openDestinationAction(entity)],
      suggestions: ['What can I do there?', 'What should I know before I go?'],
    };
  }

  if (!entity.item?.saved) {
    return {
      text: `${entity.destination.name} supports LakBai offline routing, but its guide needs to be saved on this device first. Open the guide, save it, then choose directions.`,
      actions: [openDestinationAction(entity)],
      suggestions: ['Does it work offline?', 'What should I know before I go?'],
    };
  }

  return {
    text: `I can open LakBai navigation to ${target.label}. The route uses LakBai's offline routing data; current road, ferry, and access conditions can still change.`,
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
    suggestions: ['What should I prepare?', 'What is there to see?'],
  };
};

const infoResponse = entity => {
  if (!entity) {
    return {
      text: 'I can answer questions using LakBai’s local Davao del Norte guides. Ask about a destination, nearby places, directions, transport, safety, offline use, or trip planning.',
      suggestions: ['What can I do in Samal?', 'Recommend a nature place', 'What can I visit in Tagum?', 'Plan a trip'],
    };
  }

  if (entity.kind === 'spot') {
    const details = [entity.data?.description, entity.data?.tip ? `Tip: ${entity.data.tip}` : null];
    return {
      text: `${entity.name} is in ${entity.destination.name}.\n\n${sentenceList(details).join('\n\n')}`,
      actions: [openDestinationAction(entity)],
      suggestions: ['How do I get there?', 'What should I prepare?', 'What else can I visit nearby?'],
    };
  }

  if (entity.kind === 'route') {
    const route = entity.data;
    const stops = (route?.stops ?? []).map(stop => stop.name);
    return {
      text: `${route.name} is a planning route in the ${entity.destination.name} guide. ${route.description ?? ''}${stops.length ? `\n\nPlanned stops:\n${previewList(stops, 4)}` : ''}\n\nLakBai treats this as planning guidance unless the route is explicitly marked verified.`,
      actions: [openDestinationAction(entity)],
      suggestions: ['Plan this trip', 'What should I prepare?'],
    };
  }

  const highlights = previewList(entity.destination.highlights ?? [], 4);
  return {
    text: `${entity.destination.description ?? entity.destination.summary}${highlights ? `\n\nHighlights:\n${highlights}` : ''}`,
    actions: [openDestinationAction(entity)],
    suggestions: ['What can I do there?', 'How do I get there?', 'What should I prepare?'],
  };
};

const transportResponse = entity => {
  if (!entity) {
    return {
      text: 'Tell me which destination you are traveling to, and I can use its saved LakBai transport notes. I will not guess current fares, schedules, or operator availability.',
      suggestions: ['Transport to Samal', 'How do I get around Tagum?', 'Ferry information for Samal'],
    };
  }
  const transport = entity.pack?.transport;
  if (!transport) {
    return {
      text: `LakBai does not have structured transport notes for ${entity.destination.name} yet.`,
      actions: [openDestinationAction(entity)],
    };
  }
  const gettingThere = previewList(transport.gettingThere ?? [], 3);
  const around = previewList(transport.gettingAround ?? [], 2);
  return {
    text: `Transport notes for ${entity.destination.name}:\n\n${gettingThere}${around ? `\n\nGetting around:\n${around}` : ''}\n\nSchedules, fares, queues, and same-day availability are time-sensitive, so LakBai does not assume they are current.`,
    actions: [openDestinationAction(entity)],
    suggestions: ['How do I get there?', 'Does this work offline?', 'What should I prepare?'],
  };
};

const safetyResponse = entity => {
  if (!entity) {
    return {
      text: 'For emergencies in the Philippines, LakBai stores the verified National Emergency Hotline: 911. For destination-specific preparation, tell me the place you plan to visit.',
      suggestions: ['What should I prepare for Hagimit Falls?', 'Safety tips for Samal', 'Emergency help'],
    };
  }
  const reminders = previewList(entity.pack?.safety?.reminders ?? [], 4);
  const tips = previewList(entity.pack?.transport?.localTips ?? [], 3);
  return {
    text: `Before visiting ${entity.destination.name}:\n\n${reminders || 'Follow current site rules and local authority guidance.'}${tips ? `\n\nLocal planning tips:\n${tips}` : ''}\n\nFor an emergency, the verified national hotline stored by LakBai is 911.`,
    actions: [openDestinationAction(entity)],
    suggestions: ['How do I get there?', 'Does it work offline?', 'What can I do there?'],
  };
};

const offlineResponse = entity => {
  if (!entity) {
    return {
      text: 'LakBai’s destination guides and supported routing can work offline after the relevant guide is saved. Ask about a specific destination and I can tell you whether its guide is already saved on this device.',
      suggestions: ['Is Samal available offline?', 'Is Tagum saved offline?', 'Directions to Panabo'],
    };
  }
  const saved = Boolean(entity.item?.saved);
  const routing = Boolean(entity.destination?.offlineNavigation);
  return {
    text: saved
      ? `${entity.destination.name} is saved on this device. Its guide is available offline${routing ? ', and LakBai has an offline routing target for it' : ''}.`
      : `${entity.destination.name} is available in LakBai but is not currently saved on this device. Save the guide before relying on it without internet${routing ? '; offline routing is supported for this destination once its guide is prepared' : ''}.`,
    actions: [openDestinationAction(entity)],
    suggestions: ['How do I get there?', 'What can I do there?'],
  };
};

const liveInfoResponse = entity => ({
  text: entity
    ? `LakBai does not currently have a source-reviewed live value for that detail at ${entity.destination.name}. Fees, opening hours, schedules, fares, weather, and same-day access can change, so I will not guess them. Check the destination or local tourism authority before relying on a current value.`
    : 'LakBai does not guess live fees, opening hours, schedules, fares, weather, or same-day access. Name the destination and I can still show the local planning information stored in its guide.',
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
      text: 'I could not find a source-reviewed LakBai place matching those constraints. Try a broader interest or name a destination directly.',
      suggestions: ['Recommend nature places', 'What can I do in Samal?', 'What can I visit in Tagum?'],
    };
  }

  const lines = selected.map(place => {
    const distance = Number.isFinite(place.distanceKm)
      ? ` · ${place.distanceKm.toFixed(place.distanceKm < 10 ? 1 : 0)} km away`
      : '';
    return `• ${place.name} — ${place.description}${distance}`;
  });
  return {
    text: `Here are ${selected.length} matches from LakBai’s source-reviewed local guides:\n\n${lines.join('\n\n')}`,
    actions: selected.map(place => ({
      type: 'open-destination',
      label: `Open ${place.name}`,
      destinationId: place.destinationId,
    })),
    suggestions: ['Plan a trip with these', 'Which works offline?', 'What should I prepare?'],
    recommendationIds: selected.map(place => place.id),
  };
};

const tripResponse = ({ request, knowledge, entity, origin, context }) => {
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
  const selected = recommendations.slice(0, 3);
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
    text: `I prepared an editable ${selected.length}-stop trip using LakBai’s local knowledge: ${selected.map(place => place.name).join(', ')}. You can review and reorder it in Trips before saving.`,
    actions: draft ? [{ type: 'plan-trip', label: 'Open trip draft', draft }] : [],
    suggestions: ['What should I prepare?', 'Which places work offline?'],
  };
};

export const respondToAssistant = ({
  message,
  knowledge,
  context = {},
  origin = null,
}) => {
  const request = parseAssistantRequest(message);
  const entity = resolveAssistantEntity(knowledge, message, context);
  const baseContext = {
    ...context,
    ...contextFor(entity),
  };

  let response;
  switch (request.intent) {
    case 'emergency':
      response = {
        text: 'For an emergency in the Philippines, LakBai stores the verified National Emergency Hotline: 911. Use it for urgent police, fire, medical, or rescue assistance.',
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
      response = tripResponse({ request, knowledge, entity, origin, context });
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
