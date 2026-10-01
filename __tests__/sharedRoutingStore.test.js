import { createSharedRoutingStore } from '../src/core/offline/sharedRoutingStore.jsx';
import { buildOfflinePackFiles } from '../src/core/offline/offlinePackFiles.jsx';

const fixture = () => {
  const files = new Map(); let version='v1'; let fail=false; let bad=false;
  const referenceFor=region=>({datasetId:'province',version,regionId:region,md5:version+'hash',bytes:10});
  const uriFor=(ref,staging)=>`${ref.version}/${ref.regionId}${staging?'.staging':''}`;
  const fileFor=(ref,staging)=>{
    const file={uri:uriFor(ref,staging), get exists(){return files.has(this.uri);},get size(){return files.get(this.uri)?.size;},get md5(){return files.get(this.uri)?.md5;},
      delete(){files.delete(this.uri);},move(destination){files.set(destination.uri,files.get(this.uri));files.delete(this.uri);this.uri=destination.uri;}};
    return file;
  };
  const materialize=jest.fn(async(region,target)=>{
    files.set(target.uri,{size:10,md5:bad?'bad':version+'hash'});
    if(fail)throw new Error('copy interrupted');
  });
  const options={referenceFor,fileFor,prepareDirectory:jest.fn(),materialize};
  return {files,options,store:createSharedRoutingStore(options),materialize,
    setVersion:v=>{version=v;},setFail:v=>{fail=v;},setBad:v=>{bad=v;}};
};

describe('shared provincial routing files',()=>{
  test('concurrent pack saves install one regional file and a cold store reuses it offline',async()=>{
    const f=fixture();
    const [a,b]=await Promise.all([f.store.ensure('mainland'),f.store.ensure('mainland')]);
    expect(a.uri).toBe(b.uri);expect(f.materialize).toHaveBeenCalledTimes(1);
    expect([...f.files.keys()]).toEqual(['v1/mainland']);
    const cold=createSharedRoutingStore({...f.options,materialize:()=>{throw new Error('offline');}});
    expect(await cold.ensure('mainland')).toEqual(a);
  });
  test('an interrupted update preserves the old version and supports a clean retry',async()=>{
    const f=fixture();await f.store.ensure('mainland');f.setVersion('v2');f.setFail(true);
    await expect(f.store.ensure('mainland')).rejects.toThrow('interrupted');
    expect([...f.files.keys()]).toEqual(['v1/mainland']);
    f.setFail(false);await f.store.ensure('mainland');
    expect([...f.files.keys()]).toEqual(['v1/mainland','v2/mainland']);
  });
  test('a corrupt installation or damaged copy never becomes ready',async()=>{
    const f=fixture();f.setBad(true);
    await expect(f.store.ensure('samal')).rejects.toThrow('integrity');expect(f.files.size).toBe(0);
    f.setBad(false);await f.store.ensure('samal');
    f.files.get('v1/samal').md5='corrupt';expect(f.store.status('samal')).toBeNull();
    await f.store.ensure('samal');expect(f.store.status('samal')).not.toBeNull();
  });
  test('peek avoids checksum work while verified status still checks md5',()=>{
    let md5Reads=0;
    const reference={datasetId:'province',version:'v1',regionId:'mainland',md5:'verified',bytes:10};
    const file={
      uri:'v1/mainland',
      exists:true,
      size:10,
      get md5(){md5Reads+=1;return 'verified';},
    };
    const store=createSharedRoutingStore({
      referenceFor:()=>reference,
      fileFor:()=>file,
      prepareDirectory:jest.fn(),
      materialize:jest.fn(),
    });
    expect(store.peek('mainland')).toEqual({uri:'v1/mainland',sizeBytes:10,reference});
    expect(md5Reads).toBe(0);
    expect(store.status('mainland')).not.toBeNull();
    expect(md5Reads).toBe(1);
  });
  test('a partial staging file from a killed process is replaced on restart',async()=>{
    const f=fixture();f.files.set('v1/mainland.staging',{size:2,md5:'partial'});
    await f.store.ensure('mainland');expect([...f.files.keys()]).toEqual(['v1/mainland']);
  });
  test('destination manifests reference shared data without duplicating the graph',()=>{
    const pack={id:'tagum',version:1,destination:{name:'Tagum',municipality:'Tagum'},spots:[],trails:[]};
    const ref=fixture().options.referenceFor('mainland');
    const files=buildOfflinePackFiles(pack,1,[],null,ref);
    expect(files['routing.graph.json']).toBeUndefined();
    expect(JSON.parse(files['manifest.json'])).toMatchObject({format:4,sharedRouting:ref});
  });
});
