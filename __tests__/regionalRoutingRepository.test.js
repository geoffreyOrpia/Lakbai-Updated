import { BundledRoutingGraphRepository } from '../src/data/repositories/routingGraphRepository.jsx';
import { routingRegionFor, ROUTING_MANIFEST } from '../src/data/assets/routingRegionAssets.jsx';
import { compactRoutingGraph } from '../src/core/routing/compactGraph.jsx';
const data=region=>compactRoutingGraph({meta:{regionId:region},nodes:[{id:'a',lng:125.68,lat:7.3},{id:'b',lng:125.69,lat:7.3}],
 edges:[{from:'a',to:'b',osmId:'1',segmentId:'1',walk:true,drive:true,geometry:{type:'LineString',coordinates:[[125.68,7.3],[125.69,7.3]]}}]});

describe('regional graph repository',()=>{
 test('loads a region directly for multi-region journey composition',async()=>{
  const read=jest.fn(uri=>JSON.stringify(data(uri.split('/')[0])));
  const store={ensure:jest.fn(async region=>({uri:region+'/graph.routing'}))};
  const repo=new BundledRoutingGraphRepository(read,store);
  expect((await repo.getForRegion('mainland')).meta.regionId).toBe('mainland');
  expect((await repo.getForRegion('samal')).meta.regionId).toBe('samal');
  expect(store.ensure).toHaveBeenNthCalledWith(1,'mainland');
  expect(store.ensure).toHaveBeenNthCalledWith(2,'samal');
 });
 test('loads the selected region once and releases its cache when switching regions',async()=>{
  const read=jest.fn(uri=>JSON.stringify(data(uri.split('/')[0])));
  const store={ensure:jest.fn(async region=>({uri:region+'/graph.routing'}))};
  const repo=new BundledRoutingGraphRepository(read,store);
  const a=await repo.getForDestination('tagum');expect(await repo.getForDestination('panabo')).toBe(a);
  expect(read).toHaveBeenCalledTimes(1);
  expect((await repo.getForDestination('samal')).meta.regionId).toBe('samal');
  await repo.getForDestination('tagum');expect(read).toHaveBeenCalledTimes(3);
 });
 test('will not use an unchecked shared file after installation failure',async()=>{
  const read=jest.fn(()=>JSON.stringify(data('mainland')));
  const repo=new BundledRoutingGraphRepository(read,{ensure:async()=>{throw new Error('corrupt');}});
  expect(await repo.getForDestination('panabo','unchecked.routing')).toBeNull();expect(read).not.toHaveBeenCalled();
 });
 test('does not accept the wrong regional payload',async()=>{
  const repo=new BundledRoutingGraphRepository(()=>JSON.stringify(data('samal')),{ensure:async()=>({uri:'mainland.routing'})});
  expect(await repo.getForDestination('tagum','mainland.routing')).toBeNull();
 });
 test('selects by actual place coordinates and keeps the island separate',()=>{
  expect(routingRegionFor('tagum',{lat:7.1336203,lng:125.6847488})).toBe('samal');
  expect(routingRegionFor('samal',{lat:7.4477,lng:125.8071})).toBe('mainland');
  expect(routingRegionFor('tagum',{lat:14.6,lng:121})).toBeNull();
  expect(ROUTING_MANIFEST.exclusions).toHaveLength(6);
 });
});


test('failed dataset update can use an older copy only after store verification', async () => {
  const previous = { datasetId: 'davao-del-norte', regionId: 'mainland', version: 'old' };
  const store = {
    ensure: async () => { throw new Error('update interrupted'); },
    status: jest.fn(() => ({ uri: 'old/mainland.routing', reference: previous })),
  };
  const repo = new BundledRoutingGraphRepository(() => JSON.stringify(data('mainland')), store);
  expect((await repo.getForDestination('tagum', 'old/mainland.routing', null, previous)).meta.regionId).toBe('mainland');
  expect(store.status).toHaveBeenCalledWith('mainland', previous);
  store.status.mockReturnValue(null);
  expect(await repo.getForDestination('tagum', 'old/mainland.routing', null, previous)).toBeNull();
});

test('coastal island places are selected using road connectivity despite simplified boundaries', () => {
  for (const target of [{lat:7.1259,lng:125.6776}, {lat:7.1336203,lng:125.6847488}]) {
    expect(routingRegionFor('panabo', target)).toBe('samal');
  }
});
