const mockFiles=new Map();const mockDirs=new Set();let mockFailPromotion=false;
const mockGraph='routing-bytes';
let mockVersion='v1';let mockDownloadFails=false;
const mockHash=require('node:crypto').createHash('md5').update(mockGraph).digest('hex');
jest.mock('expo-file-system',()=>{
 const key=parts=>parts.map(p=>typeof p==='string'?p:p.uri).join('/').replace(/\/+$/,'');
 class File {
  constructor(...parts){this.uri=key(parts);}
  get exists(){return mockFiles.has(this.uri);}
  get size(){return Buffer.byteLength(mockFiles.get(this.uri)??'');}
  get md5(){return this.exists?require('node:crypto').createHash('md5').update(mockFiles.get(this.uri)).digest('hex'):null;}
  create(){mockFiles.set(this.uri,'');} write(s){mockFiles.set(this.uri,s);} textSync(){return mockFiles.get(this.uri);}
  delete(){mockFiles.delete(this.uri);} copy(to){mockFiles.set(to.uri,mockFiles.get(this.uri));}
  move(to){this.copy(to);this.delete();this.uri=to.uri;}
 }
 class Directory {
  constructor(...parts){this.uri=key(parts);}
  get exists(){return mockDirs.has(this.uri);}
  get size(){return [...mockFiles].filter(([p])=>p.startsWith(this.uri+'/')).reduce((s,[,v])=>s+Buffer.byteLength(v),0);}
  create(){mockDirs.add(this.uri);}
  delete(){for(const p of [...mockFiles.keys()])if(p.startsWith(this.uri+'/'))mockFiles.delete(p);for(const p of [...mockDirs])if(p===this.uri||p.startsWith(this.uri+'/'))mockDirs.delete(p);}
  move(to){
   if(mockFailPromotion&&this.uri.endsWith('.staging'))throw new Error('promotion interrupted');
   for(const [p,v]of [...mockFiles])if(p.startsWith(this.uri+'/')){mockFiles.set(to.uri+p.slice(this.uri.length),v);mockFiles.delete(p);}
   for(const p of [...mockDirs])if(p===this.uri||p.startsWith(this.uri+'/')){mockDirs.add(to.uri+p.slice(this.uri.length));mockDirs.delete(p);}
   this.uri=to.uri;
  }
 }
 return {File,Directory,Paths:{document:'/documents'}};
});
jest.mock('expo-asset',()=>({Asset:{fromModule:()=>({localUri:'/asset/routing',downloadAsync:async()=>{if(mockDownloadFails)throw new Error('offline');}})}}));
jest.mock('../src/data/assets/routingRegionAssets.jsx',()=>({
 routingRegionFor:()=> 'mainland',getRoutingRegionAsset:()=>1,
 routingReferenceFor:()=>({datasetId:'province',version:mockVersion,regionId:'mainland',bytes:13,md5:mockHash}),
}));
jest.mock('../src/data/assets/offlineBasemapAsset.jsx',()=>({getOfflineBasemapModule:()=>null}));
jest.mock('../src/data/assets/destinationPhotos.jsx',()=>({getDestinationPhotoModule:()=>null}));
import {createOfflinePackStorage} from '../src/data/services/offlinePackStorage.jsx';
const pack=id=>({id,version:1,destination:{name:id,municipality:'Tagum'},spots:[],trails:[]});
const root='/documents/lakbaylokal/packs/';
beforeEach(()=>{mockFiles.clear();mockDirs.clear();mockFiles.set('/asset/routing',mockGraph);mockFailPromotion=false;mockVersion='v1';mockDownloadFails=false;});

test('two destination packs share one checked routing file and deleting one preserves it',async()=>{
 const store=createOfflinePackStorage();
 await Promise.all([store.savePack(pack('tagum')),store.savePack(pack('panabo'))]);
 const a=await store.getStatus('tagum'),b=await store.getStatus('panabo');
 expect(a.routingGraphUri).toBe(b.routingGraphUri);
 expect([...mockFiles.keys()].filter(p=>p.endsWith('.routing'))).toHaveLength(1);
 expect(mockFiles.has(root+'tagum/routing.graph.json')).toBe(false);
 expect(JSON.parse(mockFiles.get(root+'tagum/manifest.json')).sharedRouting.regionId).toBe('mainland');
 await store.removePack('tagum');expect(mockFiles.has(a.routingGraphUri)).toBe(true);expect(await store.getStatus('panabo')).not.toBeNull();
});
test('interrupted promotion restores the existing pack',async()=>{
 const store=createOfflinePackStorage();await store.savePack(pack('tagum'));
 mockFailPromotion=true;await expect(store.savePack({...pack('tagum'),version:2})).rejects.toThrow('promotion');
 expect(JSON.parse(mockFiles.get(root+'tagum/manifest.json')).version).toBe(1);
});
test('cold status restores a pack left in backup by an interrupted process',async()=>{
 const store=createOfflinePackStorage();await store.savePack(pack('tagum'));
 const {Directory}=require('expo-file-system');new Directory(root+'tagum').move(new Directory(root+'tagum.backup'));
 expect(await createOfflinePackStorage().getStatus('tagum')).not.toBeNull();
 expect(JSON.parse(mockFiles.get(root+'tagum/manifest.json')).version).toBe(1);
});


test('a failed dataset update leaves the old pack routing usable and verifies its checksum', async () => {
  const store = createOfflinePackStorage();
  const old = await store.savePack(pack('tagum'));
  mockVersion = 'v2'; mockDownloadFails = true;
  await expect(store.savePack({...pack('tagum'), version:2})).rejects.toThrow('offline');
  const recovered = await createOfflinePackStorage().getStatus('tagum');
  expect(recovered.routingGraphUri).toBe(old.routingGraphUri);
  expect(recovered.sharedRouting.version).toBe('v1');
  mockFiles.set(old.routingGraphUri, 'damaged');
  expect((await store.getStatus('tagum')).routingGraphUri).toBeNull();
});
