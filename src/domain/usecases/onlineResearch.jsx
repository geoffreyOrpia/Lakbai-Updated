const DEFAULT_RESEARCH_TOPIC = 'tourist attractions "Davao del Norte" Philippines';

export const buildTourismResearchQuery = (rawQuery = '') => {
  const normalizedQuery = rawQuery.trim().replace(/\s+/g, ' ');

  if (!normalizedQuery) {
    return DEFAULT_RESEARCH_TOPIC;
  }

  return `${normalizedQuery} tourism "Davao del Norte" Philippines`;
};

export const researchTouristPlacesOnline = (deps, rawQuery) => {
  const researchQuery = buildTourismResearchQuery(rawQuery);
  return deps.onlineResearchService.openSearch(researchQuery);
};
