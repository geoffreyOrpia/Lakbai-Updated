import { buildRoutingIndex } from '../src/core/routing/graph.jsx';
import { aStarRoute } from '../src/core/routing/aStar.jsx';
import {
  calculateOfflineRoute,
  turnStateBeforeRoutePosition,
} from '../src/domain/usecases/offlineNavigation.jsx';
import { compactRoutingGraph } from '../src/core/routing/compactGraph.jsx';
import { nodePassageAllowed } from '../src/core/routing/accessRules.jsx';

const node = (id, x, y, osmTags) => ({ id, lng: 125 + x / 100, lat: 7 + y / 100, ...(osmTags ? { osmTags } : {}) });
const graph = () => ({ nodes: [node('a', 0, 0), node('v', 1, 0), node('b', 2, 0), node('c', 1, 1), node('d', 2, 1)],
  edges: [], turnRestrictions: [], meta: {} });
const road = (g, from, to, osmId, extras = {}, reverse = false) => {
  const a = g.nodes.find(n => n.id === from);
  const b = g.nodes.find(n => n.id === to);
  const e = { id: String(g.edges.length), from, to, osmId, segmentId: [osmId, from, to].join(':'),
    distanceKm: Math.hypot(a.lng-b.lng, a.lat-b.lat)*111, highway: 'residential', walk: true, drive: true,
    geometry: { type: 'LineString', coordinates: [[a.lng,a.lat],[b.lng,b.lat]] }, ...extras };
  g.edges.push(e);
  if (reverse) g.edges.push({ ...e, id: e.id+'r', from: to, to: from, geometry: { type: 'LineString', coordinates: [...e.geometry.coordinates].reverse() } });
};
const restriction = (value, from = 'in', to = 'out', via = [{ type: 'n', ref: 'v', role: 'via' }], tags = {}) => ({
  id: 'rule', tags: { type: 'restriction', restriction: value, ...tags },
  members: [{ type: 'w', ref: from, role: 'from' }, ...via, { type: 'w', ref: to, role: 'to' }],
});
const route = (g, from, to, mode='drive') => aStarRoute(buildRoutingIndex(g), from, to, mode);
const junction = () => {
  const g = graph();
  road(g,'a','v','in'); road(g,'v','b','out'); road(g,'v','c','side');
  road(g,'c','d','detour'); road(g,'d','b','return');
  return g;
};

describe('turn and passage enforcement', () => {
  test.each(['no_left_turn','no_right_turn','no_straight_on'])('%s follows relation identity and takes a legal alternative', value => {
    const g = junction(); g.turnRestrictions = [restriction(value)];
    expect(route(g,'a','b').nodeIds).toEqual(['a','v','c','d','b']);
    expect(route(g,'a','b','walk').nodeIds).toEqual(['a','v','b']);
    expect(route(g,'v','b').nodeIds).toEqual(['v','b']);
  });

  test.each(['only_left_turn','only_right_turn','only_straight_on'])('%s preserves its permitted turn', value => {
    const g = junction(); g.turnRestrictions = [restriction(value)];
    expect(route(g,'a','b').nodeIds).toEqual(['a','v','b']);
    expect(route(g,'a','c')).toBeNull();
  });

  test('approach-dependent search revisits a junction reached legally by a longer path', () => {
    const g = junction(); road(g,'a','c','other'); road(g,'c','v','approach');
    g.edges = g.edges.filter(e => !['detour','return'].includes(e.osmId));
    g.turnRestrictions = [restriction('no_left_turn')];
    expect(route(g,'a','b').nodeIds).toEqual(['a','c','v','b']);
  });

  test('same-way no-U-turn permits straight travel but forbids reversing the incoming physical segment', () => {
    const g = graph(); road(g,'a','v','same',{},true); road(g,'v','b','same',{},true);
    g.turnRestrictions = [restriction('no_u_turn','same','same')];
    expect(route(g,'a','b').nodeIds).toEqual(['a','v','b']);
    // Force a journey requiring reversal at v; there is no legal way to the target spur.
    g.nodes.push(node('target',0,-1)); road(g,'a','target','spur');
    const policy = buildRoutingIndex(g).turnPolicy.drive;
    const { advanceTurnState } = require('../src/core/routing/turnRestrictions.jsx');
    const index = buildRoutingIndex(g);
    const forward = index.adjacency.get('a').find(e => e.to==='v');
    const reverse = index.adjacency.get('v').find(e => e.to==='a');
    expect(advanceTurnState(policy, advanceTurnState(policy, [], forward._turnKey), reverse._turnKey)).toBeNull();
  });

  test.each([false,true])('multi-way restrictions survive graph splitting and compact encoding (%s)', compact => {
    const g = junction();
    g.nodes.push(node('x',1.3,0),node('y',1.6,0));
    g.edges = [];
    road(g,'a','v','in'); road(g,'v','x','via1'); road(g,'x','y','via1'); road(g,'y','b','via2');
    road(g,'b','d','out'); road(g,'b','c','escape'); road(g,'c','d','detour');
    g.turnRestrictions = [restriction('no_u_turn','in','out',[
      {type:'w',ref:'via1',role:'via'},{type:'w',ref:'via2',role:'via'}])];
    const data = compact ? compactRoutingGraph(g) : g;
    expect(route(data,'a','d').nodeIds).toEqual(['a','v','x','y','b','c','d']);
    expect(route(data,'v','d').nodeIds).toEqual(['v','x','y','b','d']);
    expect(buildRoutingIndex(data).turnPolicy.summary.unresolved).toEqual([]);
  });

  test.each([false,true])('reroutes preserve confirmed approach state inside multi-way restrictions (%s)', compact => {
    const g = junction();
    g.nodes.push(node('x',1.3,0),node('y',1.6,0));
    g.edges = [];
    road(g,'a','v','in'); road(g,'v','x','via1'); road(g,'x','y','via1'); road(g,'y','b','via2');
    road(g,'b','d','out'); road(g,'b','c','escape'); road(g,'c','d','detour');
    g.turnRestrictions = [restriction('no_left_turn','in','out',[
      {type:'w',ref:'via1',role:'via'},{type:'w',ref:'via2',role:'via'}])];
    const data = compact ? compactRoutingGraph(g) : g;
    const original = calculateOfflineRoute({
      graph:data,
      from:{lng:125,lat:7},
      to:{lng:125.01,lat:7.01},
      mode:'drive',
      maxSnapDistanceKm:0.001,
    });
    expect(original.ok).toBe(true);
    const confirmedProgressKm = original.edges[0].distanceKm + original.edges[1].distanceKm * 0.5;
    const initialTurnState = turnStateBeforeRoutePosition({
      graph:data,
      route:original,
      distanceAlongKm:confirmedProgressKm,
      mode:'drive',
    });
    expect(initialTurnState.length).toBeGreaterThan(0);

    const midway = { lng:125.0115, lat:7 };
    const unseeded = calculateOfflineRoute({
      graph:data,
      from:midway,
      to:{lng:125.02,lat:7.01},
      mode:'drive',
      maxSnapDistanceKm:0.001,
    });
    const seeded = calculateOfflineRoute({
      graph:data,
      from:midway,
      to:{lng:125.02,lat:7.01},
      mode:'drive',
      maxSnapDistanceKm:0.001,
      initialTurnState,
    });

    expect(unseeded.ok).toBe(true);
    expect(unseeded.edges.some(edge => edge.osmId === 'out')).toBe(true);
    expect(seeded.ok).toBe(true);
    expect(seeded.initialTurnState).toEqual(initialTurnState);
    expect(seeded.edges.some(edge => edge.osmId === 'out')).toBe(false);
    expect(seeded.edges.some(edge => edge.osmId === 'escape')).toBe(true);
    expect(seeded.edges.some(edge => edge.osmId === 'detour')).toBe(true);
  });

  test('only-via-way restrictions reject early exits but allow stopping along the required road', () => {
    const g = junction();
    g.turnRestrictions = [restriction('only_straight_on','in','detour',[{type:'w',ref:'side',role:'via'}])];
    expect(route(g,'a','b').nodeIds).toEqual(['a','v','c','d','b']);
    expect(route(g,'a','c').nodeIds).toEqual(['a','v','c']);
  });

  test('respects mode-specific overrides and semicolon exceptions', () => {
    const g = junction();
    g.turnRestrictions = [restriction('no_left_turn','in','out',undefined,{except:'bicycle; motorcar', 'restriction:foot':'no_left_turn'})];
    expect(route(g,'a','b').nodeIds).toEqual(['a','v','b']);
    expect(route(g,'a','b','walk').nodeIds).toEqual(['a','v','c','d','b']);
    g.turnRestrictions[0].tags = { type:'restriction:foot', restriction:'no_right_turn' };
    expect(route(g,'a','b').nodeIds).toEqual(['a','v','b']);
    expect(route(g,'a','b','walk').nodeIds).toEqual(['a','v','c','d','b']);
  });

  test('supports multiple from members for no-entry and multiple to members for no-exit', () => {
    const g=junction(); road(g,'c','v','other-in');
    const noEntry=restriction('no_entry');
    noEntry.members.push({type:'w',ref:'other-in',role:'from'});
    g.turnRestrictions=[noEntry];
    expect(route(g,'c','b').nodeIds).toEqual(['c','d','b']);
    const noExit=restriction('no_exit');
    noExit.members.push({type:'w',ref:'side',role:'to'});
    g.turnRestrictions=[noExit];
    expect(route(g,'a','b')).toBeNull();
  });

  test('retains concurrent restrictions rather than overwriting one', () => {
    const g=junction();
    g.turnRestrictions=[restriction('no_left_turn'), {...restriction('no_right_turn','in','side'),id:'other'}];
    expect(route(g,'a','b')).toBeNull();
  });

  test('conditional restrictions stay restrictive and malformed records are reported', () => {
    const g=junction();
    g.turnRestrictions=[restriction(undefined,'in','out',undefined,{'restriction:conditional':'no_left_turn @ (08:00-10:00)'}),
      {id:'bad',tags:{restriction:'no_left_turn'},members:[]}];
    expect(route(g,'a','b').nodeIds).toEqual(['a','v','c','d','b']);
    const summary=buildRoutingIndex(g).turnPolicy.summary;
    expect(summary.conservativeConditional).toHaveLength(1);
    expect(summary.unresolved[0]).toMatchObject({id:'bad',mode:'drive'});
  });

  test.each([false,true])('partial-edge starts/targets cannot bypass junction rules (%s)', compact => {
    const g=junction(); g.turnRestrictions=[restriction('no_left_turn')];
    const data=compact ? compactRoutingGraph(g) : g;
    const result=calculateOfflineRoute({graph:data,from:{lng:125.005,lat:7},to:{lng:125.015,lat:7},mode:'drive',maxSnapDistanceKm:0.001});
    // The one-way destination edge is inaccessible without the prohibited turn.
    expect(result.reason).toBe('no-route');
    const walking=calculateOfflineRoute({graph:data,from:{lng:125.005,lat:7},to:{lng:125.015,lat:7},mode:'walk',maxSnapDistanceKm:0.001});
    expect(walking.ok).toBe(true);
  });

  test.each([
    [{barrier:'bollard'},true,false],
    [{barrier:'bollard',access:'yes'},true,false],
    [{barrier:'bollard',motorcar:'yes'},true,true],
    [{barrier:'gate'},false,false],
    [{barrier:'gate',access:'yes'},true,true],
    [{barrier:'gate',access:'private',foot:'yes'},true,false],
    [{barrier:'gate',access:'yes',locked:'yes'},false,false],
    [{barrier:'fence'},false,false],
    [{barrier:'entrance'},true,true],
    [{access:'private',motor_vehicle:'yes'},false,true],
    [{'access:conditional':'yes @ (08:00-10:00)'},false,false],
  ])('node access %j separates walking/driving', (tags,walk,drive) => {
    expect(nodePassageAllowed({osmTags:tags},'walk')).toBe(walk);
    expect(nodePassageAllowed({osmTags:tags},'drive')).toBe(drive);
  });

  test.each([false,true])('barriers block through-routing while allowing arrival on the approach side (%s)', compact => {
    const g=junction(); g.nodes.find(n=>n.id==='v').osmTags={barrier:'bollard'};
    const data=compact ? compactRoutingGraph(g) : g;
    expect(route(data,'a','b')).toBeNull();
    expect(route(data,'a','v').nodeIds).toEqual(['a','v']);
    expect(route(data,'v','b')).toBeNull();
    expect(route(data,'a','b','walk').nodeIds).toEqual(['a','v','b']);
    const result=calculateOfflineRoute({graph:data,from:{lng:125.005,lat:7},to:{lng:125.015,lat:7},mode:'drive',maxSnapDistanceKm:0.001});
    expect(result.reason).toBe('no-route');
  });

  test('runtime rejects restricted road access even if stale edge flags allow it', () => {
    const g=junction(); g.edges.find(e=>e.osmId==='out').osmTags={access:'private',foot:'yes'};
    expect(route(g,'a','b').nodeIds).toEqual(['a','v','c','d','b']);
    expect(route(g,'a','b','walk').nodeIds).toEqual(['a','v','b']);
  });
});
