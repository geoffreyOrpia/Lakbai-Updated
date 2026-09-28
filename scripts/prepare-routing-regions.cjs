const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const babel = require('@babel/core');
require.extensions['.jsx'] = (module, filename) => module._compile(babel.transformFileSync(filename, {
  babelrc:false, configFile:false, plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code,filename);
const {pointInBoundary}=require('../src/core/routing/regionCoverage.jsx');
const {buildRoutingIndex}=require('../src/core/routing/graph.jsx');
const {validateCompactRoutingGraph}=require('../src/core/routing/compactGraph.jsx');
const arg=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
if(!arg('source')||!arg('output')) throw new Error('Provide --source and --output directory');
const bytes=fs.readFileSync(arg('source'));
const graph=JSON.parse(bytes); validateCompactRoutingGraph(graph);
const boundaries=JSON.parse(fs.readFileSync('src/data/assets/davaoDelNorteMunicipalities.json'));
const samal=boundaries.features.find(f=>f.properties.adm3_en.includes('Samal')).geometry;
const excludedIds=new Set(['15471384','15471385','15471386','15471387','15471388','15574199']);
const excluded=graph.turnRestrictions.filter(r=>excludedIds.has(r.id));
if(excluded.length!==6) throw new Error('Review changed restriction records before regenerating regions');
const excludedWays=new Set(excluded.flatMap(r=>r.members.filter(m=>m.type==='w'&&m.role==='from').map(m=>m.ref)));
for(const edge of graph.edges) if(excludedWays.has(String(graph.roads[edge[2]].osmId))) edge[4]&=1;
// The records remain in provenance, while their known approach roads have no
// driving permission. Do not invent missing members or silently drop the risk.
graph.turnRestrictions=graph.turnRestrictions.filter(r=>!excludedIds.has(r.id));
const parent=graph.nodes.map((_,i)=>i);
const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
for(const e of graph.edges) parent[find(e[0])]=find(e[1]);
const islandComponents=new Set();
for(let i=0;i<graph.nodes.length;i++) {
 const n=graph.nodes[i]; if(pointInBoundary({lng:n[1]/1e7,lat:n[2]/1e7},samal)) islandComponents.add(find(i));
}
// A component may not connect land on both sides of the channel.
const mainlandPolygons=boundaries.features.filter(f=>!f.properties.adm3_en.includes('Samal'));
for(let i=0;i<graph.nodes.length;i++) if(islandComponents.has(find(i))) {
 const n=graph.nodes[i]; if(mainlandPolygons.some(f=>pointInBoundary({lng:n[1]/1e7,lat:n[2]/1e7},f.geometry))) throw new Error('Road component crosses mainland/island boundary');
}
const selectionCells=new Map();
const islandNodes=graph.nodes.filter((_,i)=>islandComponents.has(find(i)));
const islandBounds=[Math.min(...islandNodes.map(n=>n[1]/1e7))-.025,Math.min(...islandNodes.map(n=>n[2]/1e7))-.025,Math.max(...islandNodes.map(n=>n[1]/1e7))+.025,Math.max(...islandNodes.map(n=>n[2]/1e7))+.025];
for(let i=0;i<graph.nodes.length;i++) {
 const n=graph.nodes[i],lng=n[1]/1e7,lat=n[2]/1e7,island=Number(islandComponents.has(find(i)));
 if(lng<islandBounds[0]||lng>islandBounds[2]||lat<islandBounds[1]||lat>islandBounds[3])continue;
 const key=[Math.floor(lng*1000),Math.floor(lat*1000),island].join(':');
 if(!selectionCells.has(key))selectionCells.set(key,[lng,lat,island]);
}
const regionSelectionPoints=[...selectionCells.values()];
const hash=(content,kind='sha256')=>crypto.createHash(kind).update(content).digest('hex');
const version='osm-20260927-'+hash(bytes).slice(0,10)+'-q1';
const manifest={format:1,id:'davao-del-norte',version,source:graph.meta.source,sourceExportedAt:graph.meta.sourceExportedAt,
 sourceSha256:graph.meta.sourceSha256,license:graph.meta.license,sourceGraphSha256:hash(bytes),
 validationStatus:'automated-checked-device-pending',samalBoundary:samal,provinceBounds:graph.meta.bounds,regionSelectionPoints,
 exclusions:excluded.map(r=>({relation:r,policy:'driving-disabled-on-known-from-ways'})),
 excludedDrivingWays:[...excludedWays].sort(),regions:{}};
fs.mkdirSync(arg('output'),{recursive:true});
for(const region of ['mainland','samal']) {
 const selected=[];for(let i=0;i<graph.nodes.length;i++) if(islandComponents.has(find(i))===(region==='samal')) selected.push(i);
 const nodeMap=new Map(selected.map((n,i)=>[n,i])); const roads=[];const roadMap=new Map();const segments=[];const segmentMap=new Map();
 const edges=[];
 for(const row of graph.edges) {
  if(!nodeMap.has(row[0])||!row[4])continue;
  if(!nodeMap.has(row[1]))throw new Error('Region severs a connected road');
  if(!roadMap.has(row[2])) {roadMap.set(row[2],roads.length);roads.push(graph.roads[row[2]]);}
  const s=Math.abs(row[3])-1;
  if(!segmentMap.has(s)) {segmentMap.set(s,segments.length);segments.push(graph.segments[s]);}
  edges.push([nodeMap.get(row[0]),nodeMap.get(row[1]),roadMap.get(row[2]),(segmentMap.get(s)+1)*Math.sign(row[3]),row[4],row[5],row[6]]);
 }
 const wayIds=new Set(roads.map(r=>String(r.osmId)));
 const nodes=selected.map(i=>graph.nodes[i]);
 const bounds=[Math.min(...nodes.map(n=>n[1]/1e7)),Math.min(...nodes.map(n=>n[2]/1e7)),Math.max(...nodes.map(n=>n[1]/1e7)),Math.max(...nodes.map(n=>n[2]/1e7))];
 const name=region==='samal'?'Samal island roads':'Davao del Norte mainland roads';
 const data={format:graph.format,meta:{...graph.meta,id:'davao-del-norte-'+region,regionId:region,datasetVersion:version,name,bounds,samalBoundary:samal,provinceBounds:graph.meta.bounds,regionSelectionPoints,
  turnRestrictionsEnforced:'supported-records-with-conservative-exclusions',coverage:{...graph.meta.coverage,validationStatus:manifest.validationStatus},
  excludedDrivingWays:manifest.excludedDrivingWays,
  limitations:['Mapped roads are not field-verified; obey current signs, closures and access rules.','Conditional rules and gates use conservative permissions.','Ferry crossings are not included.','Incomplete restriction approach roads are excluded from driving.']},
  nodes,roads,segments,edges,turnRestrictions:graph.turnRestrictions.filter(r=>r.members.some(m=>m.type==='w'&&wayIds.has(m.ref)))};
 validateCompactRoutingGraph(data);
 const policy=buildRoutingIndex(data).turnPolicy.summary;
 if(policy.unresolved.length)throw new Error(JSON.stringify(policy.unresolved));
 const content=JSON.stringify(data); const filename=region+'.routing';
 fs.writeFileSync(path.join(arg('output'),filename),content);
 manifest.regions[region]={id:region,name,filename,bytes:Buffer.byteLength(content),md5:hash(content,'md5'),sha256:hash(content),bounds,nodes:nodes.length,edges:edges.length,compiledRestrictions:policy.compiled};
}
fs.writeFileSync(path.join(arg('output'),'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({version,regions:manifest.regions,excludedDrivingWays:manifest.excludedDrivingWays},null,2));
