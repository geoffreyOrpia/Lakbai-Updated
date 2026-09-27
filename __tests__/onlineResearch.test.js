import {
  buildTourismSearchQuery,
  searchTourismWeb,
} from '../src/domain/usecases/onlineResearch.jsx';

describe('optional tourism web search', () => {
  test('normalizes a user query and scopes it to Davao del Norte', () => {
    expect(buildTourismSearchQuery('  beach   resort  ')).toBe(
      'beach resort tourism "Davao del Norte" Philippines',
    );
  });

  test('uses a province-wide tourism query when no term is entered', () => {
    expect(buildTourismSearchQuery('   ')).toBe(
      'tourist attractions "Davao del Norte" Philippines',
    );
  });

  test('opens the generated query through the external search service', async () => {
    const onlineResearchService = {
      openSearch: jest.fn().mockResolvedValue(undefined),
    };

    await searchTourismWeb({ onlineResearchService }, 'mangrove');

    expect(onlineResearchService.openSearch).toHaveBeenCalledWith(
      'mangrove tourism "Davao del Norte" Philippines',
    );
  });
});
