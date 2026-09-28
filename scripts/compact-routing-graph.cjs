const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const babel = require('@babel/core');
require.extensions['.jsx'] = (module, filename) => {
  const transformed = babel.transformFileSync(filename, { babelrc: false, configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] });
  module._compile(transformed.code, filename);
};
const { compactRoutingGraph } = require('../src/core/routing/compactGraph.jsx');
const arg = name => process.argv.find(value => value.startsWith('--' + name + '='))?.slice(name.length + 3);
const input = arg('source');
const output = arg('output');
if (!input || !output || path.resolve(input) === path.resolve(output)) throw new Error('Provide distinct --source and --output paths');
const source = fs.readFileSync(input);
const graph = compactRoutingGraph(JSON.parse(source));
graph.sourceGraphSha256 = createHash('sha256').update(source).digest('hex');
const content = JSON.stringify(graph);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output + '.partial', content);
fs.renameSync(output + '.partial', output);
console.log(JSON.stringify({ sourceBytes: source.length, compactBytes: Buffer.byteLength(content), nodes: graph.nodes.length,
  edges: graph.edges.length, roads: graph.roads.length, physicalSegments: graph.segments.length }, null, 2));
