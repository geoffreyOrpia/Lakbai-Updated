import { seedPacks } from '../src/data/local/seed/catalog.jsx';
import { createAssistantKnowledge } from '../src/domain/assistant/assistantKnowledge.jsx';
import { respondToAssistant } from '../src/domain/assistant/assistantEngine.jsx';

const knowledgeFixture = ({ savedIds = [] } = {}) => {
  const items = seedPacks.map(pack => ({
    destination: pack.destination,
    saved: savedIds.includes(pack.id),
    savedVersion: savedIds.includes(pack.id) ? pack.version : null,
    updateAvailable: false,
  }));
  const packsById = new Map(seedPacks.map(pack => [pack.id, pack]));
  return createAssistantKnowledge(items, packsById);
};

describe('Ask LakBai grounded assistant engine', () => {
  test('answers from destination data and keeps place context for a follow-up direction request', () => {
    const knowledge = knowledgeFixture({ savedIds: ['hagimit-falls'] });
    const first = respondToAssistant({
      message: 'Tell me about Hagimit Falls',
      knowledge,
    });

    expect(first.text).toContain('Hagimit');
    expect(first.context.activeDestinationId).toBe('hagimit-falls');

    const second = respondToAssistant({
      message: 'How do I get there?',
      knowledge,
      context: first.context,
    });

    expect(second.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'navigate',
        navigation: expect.objectContaining({
          destinationId: 'hagimit-falls',
          target: expect.objectContaining({
            lat: expect.any(Number),
            lng: expect.any(Number),
          }),
        }),
      }),
    ]));
  });

  test('keeps destination context for "what can I do there?" instead of replacing it with saved interests', () => {
    const knowledge = knowledgeFixture();
    const first = respondToAssistant({
      message: 'Tell me about Samal',
      knowledge,
    });
    const response = respondToAssistant({
      message: 'What can I do there?',
      knowledge,
      context: first.context,
      preferences: {
        interests: ['Wildlife'],
        pace: 'balanced',
      },
    });

    expect(response.text).toContain('Kaputian Beach Park');
    expect(response.text).not.toContain('Based on your saved interests');
    expect(response.recommendationIds).toBeUndefined();
    expect(response.context.activeDestinationId).toBe('samal');
  });

  test('does not bypass the existing save-before-offline-navigation flow', () => {
    const knowledge = knowledgeFixture();
    const response = respondToAssistant({
      message: 'Take me to Monfort Bat Sanctuary',
      knowledge,
    });

    expect(response.text).toContain('prepare the offline guide automatically');
    expect(response.actions).toEqual([
      expect.objectContaining({
        type: 'open-destination',
        destinationId: 'monfort-bat-sanctuary',
      }),
    ]);
    expect(response.actions.some(action => action.type === 'navigate')).toBe(false);
  });

  test('refuses to fabricate current fees and other live values', () => {
    const knowledge = knowledgeFixture();
    const response = respondToAssistant({
      message: 'What is the entrance fee for Hagimit Falls today?',
      knowledge,
    });

    expect(response.text).toContain('do not have a verified live value');
    expect(response.text).toContain('current details');
    expect(response.text).not.toMatch(/₱\s?\d|PHP\s?\d/i);
  });

  test('turns natural-language interests into source-reviewed place recommendations', () => {
    const knowledge = knowledgeFixture();
    const response = respondToAssistant({
      message: 'Recommend a wildlife place',
      knowledge,
    });

    expect(response.text).toContain('I found');
    expect(response.recommendationIds.length).toBeGreaterThan(0);
    expect(response.recommendationIds.some(id => id.startsWith('monfort-bat-sanctuary:'))).toBe(true);
  });

  test('uses saved interests only when a recommendation request is broad', () => {
    const knowledge = knowledgeFixture();
    const response = respondToAssistant({
      message: 'Recommend something',
      knowledge,
      preferences: {
        interests: ['Wildlife'],
        pace: 'balanced',
      },
    });

    expect(response.text).toContain('Based on your saved interests');
    expect(response.recommendationIds.length).toBeGreaterThan(0);
    expect(response.recommendationIds.some(id => id.startsWith('monfort-bat-sanctuary:'))).toBe(true);
  });

  test('explicit interests override saved recommendation interests', () => {
    const knowledge = knowledgeFixture();
    const response = respondToAssistant({
      message: 'Recommend a beach',
      knowledge,
      preferences: {
        interests: ['Wildlife'],
        pace: 'balanced',
      },
    });

    expect(response.text).not.toContain('Based on your saved interests');
    expect(response.recommendationIds.some(id => id.startsWith('monfort-bat-sanctuary:'))).toBe(false);
  });

  test('builds an editable trip draft instead of inventing a new trip system', () => {
    const knowledge = knowledgeFixture();
    const response = respondToAssistant({
      message: 'Plan a trip in Tagum',
      knowledge,
    });

    expect(response.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'plan-trip',
        draft: expect.objectContaining({
          kind: 'smart-explore',
          stops: expect.any(Array),
        }),
      }),
    ]));
    expect(response.actions[0].draft.stops.length).toBeGreaterThanOrEqual(2);
  });

  test('uses saved trip pace for generic assisted trip drafts', () => {
    const knowledge = knowledgeFixture();
    const response = respondToAssistant({
      message: 'Plan a trip',
      knowledge,
      preferences: {
        interests: [],
        pace: 'chill',
      },
    });

    const draft = response.actions.find(action => action.type === 'plan-trip')?.draft;
    expect(draft).toBeTruthy();
    expect(draft.stops).toHaveLength(2);
  });

  test('plans from the exact previous recommendations when the user says "with these"', () => {
    const knowledge = knowledgeFixture();
    const recommendations = respondToAssistant({
      message: 'Recommend nature places',
      knowledge,
    });
    const response = respondToAssistant({
      message: 'Plan a trip with these',
      knowledge,
      context: recommendations.context,
    });

    const recommendedPlaceIds = new Set(recommendations.recommendationIds.map(id => id.split(':').slice(0, 2).join(':')));
    const draft = response.actions.find(action => action.type === 'plan-trip')?.draft;
    expect(draft).toBeTruthy();
    expect(draft.stops).toHaveLength(recommendations.recommendationIds.length);
    expect(draft.stops.every(stop => recommendedPlaceIds.has(`${stop.destinationId}:${stop.placeId}`))).toBe(true);
  });

  test('uses the verified national emergency number without inventing local contacts', () => {
    const response = respondToAssistant({
      message: 'Emergency help',
      knowledge: knowledgeFixture(),
    });

    expect(response.text).toContain('911');
    expect(response.text).toContain('dial 911');
  });

  test('requests location before claiming a nearby or ferry-avoid recommendation', () => {
    const response = respondToAssistant({
      message: 'Find nature near me without ferry',
      knowledge: knowledgeFixture(),
    });

    expect(response.needsLocation).toBe(true);
    expect(response.text).toContain('current location');
  });
});
