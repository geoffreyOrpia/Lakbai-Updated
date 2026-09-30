import { listDestinationsWithState, loadPackForViewing } from "../usecases/destinationPacks.jsx";
import { buildSmartExploreCatalog } from "../usecases/smartExploreKnowledge.jsx";

const normalize = value => String(value ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const aliasesFor = (...values) => [...new Set(values
  .flat()
  .filter(Boolean)
  .map(normalize)
  .filter(Boolean))];

export const createAssistantKnowledge = (items, packsById = new Map()) => {
  const entities = [];

  for (const item of items ?? []) {
    const destination = item?.destination;
    if (!destination) continue;
    const pack = packsById.get(destination.id) ?? null;

    entities.push({
      id: `destination:${destination.id}`,
      kind: 'destination',
      destinationId: destination.id,
      name: destination.name,
      aliases: aliasesFor(destination.name, destination.aliases, destination.area, destination.municipality),
      destination,
      pack,
      item,
    });

    for (const spot of pack?.spots ?? []) {
      entities.push({
        id: `spot:${destination.id}:${spot.id}`,
        kind: 'spot',
        destinationId: destination.id,
        name: spot.name,
        aliases: aliasesFor(spot.name, spot.aliases),
        destination,
        pack,
        item,
        data: spot,
      });
    }

    for (const route of pack?.routeSuggestions ?? []) {
      entities.push({
        id: `route:${destination.id}:${route.id}`,
        kind: 'route',
        destinationId: destination.id,
        name: route.name,
        aliases: aliasesFor(route.name),
        destination,
        pack,
        item,
        data: route,
      });
    }
  }

  const catalog = buildSmartExploreCatalog(items, packsById);
  return {
    items: items ?? [],
    packsById,
    catalog,
    entities,
  };
};

export const loadAssistantKnowledge = async deps => {
  const { items } = await listDestinationsWithState(deps);
  const packsById = new Map();

  await Promise.all(items.map(async item => {
    const destinationId = item?.destination?.id;
    if (!destinationId || item.destination.status !== 'available') return;
    try {
      const { pack } = await loadPackForViewing(deps, destinationId);
      if (pack) packsById.set(destinationId, pack);
    } catch {
      // The assistant remains useful with the rest of the local catalog.
    }
  }));

  return createAssistantKnowledge(items, packsById);
};

export const normalizeAssistantText = normalize;

export const resolveAssistantEntity = (knowledge, message, context = {}) => {
  const text = normalize(message);
  const matches = [];

  for (const entity of knowledge?.entities ?? []) {
    for (const alias of entity.aliases ?? []) {
      if (alias.length < 3 || !text.includes(alias)) continue;
      matches.push({ entity, aliasLength: alias.length });
    }
  }

  matches.sort((a, b) => b.aliasLength - a.aliasLength);
  if (matches.length) return matches[0].entity;

  const activeId = context.activeEntityId;
  return (knowledge?.entities ?? []).find(entity => entity.id === activeId) ?? null;
};

export const destinationEntityFor = (knowledge, destinationId) => (
  (knowledge?.entities ?? []).find(entity => (
    entity.kind === 'destination' && entity.destinationId === destinationId
  )) ?? null
);
