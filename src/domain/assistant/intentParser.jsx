import { normalizeAssistantText } from "./assistantKnowledge.jsx";

const INTEREST_TERMS = Object.freeze({
  nature: ['nature', 'waterfall', 'falls', 'forest', 'mangrove', 'outdoor'],
  beach: ['beach', 'sandbar', 'sea', 'island', 'swim'],
  culture: ['culture', 'history', 'heritage', 'cathedral', 'museum'],
  food: ['food', 'eat', 'market', 'delicacy'],
  wildlife: ['wildlife', 'bat', 'animal', 'sanctuary'],
  photography: ['photo', 'photography', 'view', 'scenic', 'sunset'],
  family: ['family', 'kids', 'children'],
  adventure: ['adventure', 'trail', 'hike', 'hiking'],
});

const includesAny = (text, terms) => terms.some(term => text.includes(term));

export const parseAssistantRequest = message => {
  const text = normalizeAssistantText(message);
  const interests = Object.entries(INTEREST_TERMS)
    .filter(([, terms]) => includesAny(text, terms))
    .map(([key]) => key);

  const constraints = {
    interests,
    walking: includesAny(text, ['easy walk', 'easy walking', 'not hard', 'easy trail']) ? 'easy' : 'any',
    travelMode: includesAny(text, ['walk', 'walking', 'on foot']) ? 'walk' : 'drive',
    ferry: includesAny(text, ['no ferry', 'avoid ferry', 'without ferry', 'dont want ferry', 'do not want ferry'])
      ? 'avoid'
      : 'allow',
    savedOnly: includesAny(text, ['saved only', 'offline only', 'downloaded only']),
  };

  let intent = 'info';
  if (includesAny(text, ['emergency', '911', 'accident', 'urgent help'])) intent = 'emergency';
  else if (includesAny(text, ['plan a trip', 'plan my trip', 'itinerary', 'day trip', 'make a trip'])) intent = 'trip';
  else if (includesAny(text, ['directions', 'navigate', 'take me', 'route to', 'how do i get there', 'how to get there', 'how do i get to', 'how to get to'])) intent = 'directions';
  else if (includesAny(text, ['near me', 'nearby', 'closest', 'around me'])) intent = 'nearby';
  else if (includesAny(text, ['entrance fee', 'fees', 'price', 'cost', 'opening hour', 'open today', 'hours today', 'schedule today', 'current schedule', 'fare today', 'current fare', 'weather today', 'current weather'])) intent = 'live-info';
  else if (includesAny(text, ['offline', 'without internet', 'no internet', 'no signal', 'download', 'saved'])) intent = 'offline';
  else if (includesAny(text, ['safe', 'safety', 'what should i bring', 'what should i prepare', 'prepare for', 'before i go'])) intent = 'safety';
  else if (includesAny(text, ['ferry', 'transport', 'getting around', 'get around', 'getting there', 'travel to'])) intent = 'transport';
  else if (
    interests.length
    || includesAny(text, ['recommend', 'suggest', 'find me', 'where should', 'what can i do', 'places to visit', 'where can i go'])
  ) intent = 'recommend';

  return { text, intent, constraints };
};
