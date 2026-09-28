const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const babel=require('@babel/core');
require.extensions['.jsx']=(module,filename)=>module._compile(babel.transformFileSync(filename,{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code,filename);
const {calculateOfflineRoute}=require('../src/domain/usecases/offlineNavigation.jsx');
const {validateCompactRoutingGraph}=require('../src/core/routing/compactGraph.jsx');
const {seedPacks}=require('../src/data/local/seed/catalog.jsx');
const manifest=JSON.parse(fs.readFileSync('src/data/assets/routing/manifest.json'));
const anchors=JSON.parse(fs.readFileSync('docs/data/davao-del-norte-routing-audit.json')).modeConnectivity;
const output={datasetVersion:manifest.version,status:'enabled-device-verification-pending',source:manifest.source,
 sourceExportedAt:manifest.sourceExportedAt,excludedDrivingWays:manifest.excludedDrivingWays,regions:{},routes:[],catalogRoutes:[]};
const crossPairs=[['City of Panabo','City of Tagum'],['City of Tagum','Talaingod'],['Asuncion','New Corella'],['Santo Tomas','Kapalong'],['Carmen','Braulio E. Dujali'],['San Isidro','City of Tagum']];
for(const region of ['mainland','samal']) {
 const entry=manifest.regions[region];const raw=fs.readFileSync(path.join('src/data/assets/routing',entry.filename));
 const sha=crypto.createHash('sha256').update(raw).digest('hex');const md5=crypto.createHash('md5').update(raw).digest('hex');
 if(sha!==entry.sha256||md5!==entry.md5||raw.length!==entry.bytes)throw new Error('Asset checksum mismatch');
 const graph=JSON.parse(raw);validateCompactRoutingGraph(graph);
 if(graph.edges.some(e=>manifest.excludedDrivingWays.includes(String(graph.roads[e[2]].osmId))&&(e[4]&2)))throw new Error('Quarantined approach has driving access');
 let policy;
 for(const mode of ['walk','drive']) {
  const areas=anchors[mode].areas;
  const local=areas.filter(a=>a.name.includes('Samal')===(region==='samal'));
  const samples=local.map(a=>({from:a.name,to:a.name,start:a.anchor,end:a.sampleDestination}));
  if(region==='mainland')for(const [from,to]of crossPairs)samples.push({from,to,start:areas.find(a=>a.name===from).anchor,end:areas.find(a=>a.name===to).anchor});
  for(const s of samples) {
   const started=performance.now();const r=calculateOfflineRoute({graph,from:s.start,to:s.end,mode,maxSnapDistanceKm:.05});
   if(!r.ok)throw new Error('Expected connected sample failed: '+JSON.stringify({region,mode,...s,reason:r.reason}));
   policy=r.routingPolicy;if(policy.unresolved.length)throw new Error('Unresolved restriction in shipped region');
   output.routes.push({region,mode,from:s.from,to:s.to,ok:r.ok,distanceKm:r.distanceKm,desktopMs:Math.round(performance.now()-started)});
  }
  const from=areas.find(a=>a.name===(region==='samal'?'City of Panabo':'Island Garden City of Samal')).anchor;
  const to=local[0].anchor;const result=calculateOfflineRoute({graph,from,to,mode});
  if(result.reason!=='ferry-required')throw new Error('Cross-channel route was not rejected');
 }
 for(const pack of seedPacks.filter(p=>p.destination.offlineNavigation?.regionId===region)) {
  for(const mode of ['walk','drive']) {
   const nav=pack.destination.offlineNavigation;
   const result=calculateOfflineRoute({graph,from:nav.previewStart,to:nav.target,mode,maxSnapDistanceKm:1});
   output.catalogRoutes.push({pack:pack.id,mode,ok:result.ok,reason:result.reason??null,target:nav.target,previewStart:nav.previewStart,distanceKm:result.distanceKm??null});
  }
 }
 output.regions[region]={...entry,routingPolicy:policy};
}
output.crossChannelSamplesRejected=4;
fs.writeFileSync('docs/data/davao-del-norte-pack-audit.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({samples:output.routes.length,crossChannelRejected:4,regions:manifest.regions,catalogRoutes:output.catalogRoutes},null,2));
