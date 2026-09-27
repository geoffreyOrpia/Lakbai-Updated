const DEFAULT_RESEARCH_TOPIC = 'tourist attractions "Davao del Norte" Philippines';

export const buildTourismSearchQuery = (rawQuery = '') => {
  const normalizedQuery = rawQuery.trim().replace(/\s+/g, ' ');

  if (!normalizedQuery) {
    return DEFAULT_RESEARCH_TOPIC;
  }

  return `${normalizedQuery} tourism "Davao del Norte" Philippines`;
};

export const searchTourismWeb = (deps, rawQuery) => {
  const searchQuery = buildTourismSearchQuery(rawQuery);
  return deps.onlineResearchService.openSearch(searchQuery);
};
