import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import osmium
import importlib.util
spec = importlib.util.spec_from_file_location('import_osm_roads', Path(__file__).with_name('import-osm-roads.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
main, digest = module.main, module.digest


class ImportTest(unittest.TestCase):
    def test_pbf_preserves_topology_tags_and_restrictions(self):
        with tempfile.TemporaryDirectory(prefix='lakbai-osm-test-') as directory:
            folder = Path(directory)
            xml = folder / 'source.osm'
            xml.write_text('''<osm version="0.6">
<node id="1" lat="7.30" lon="125.68"/>
<node id="2" lat="7.31" lon="125.69"><tag k="barrier" v="gate"/></node>
<node id="3" lat="7.30" lon="125.68"/>
<node id="4" lat="7.31" lon="125.69"/>
<node id="5" lat="14" lon="120"/><node id="6" lat="14.01" lon="120.01"/>
<way id="11"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/><tag k="access" v="private"/><tag k="foot" v="yes"/></way>
<way id="12"><nd ref="3"/><nd ref="4"/><tag k="highway" v="residential"/><tag k="bridge" v="yes"/></way>
<way id="13"><nd ref="5"/><nd ref="6"/><tag k="highway" v="residential"/></way>
<relation id="99"><member type="way" ref="11" role="from"/><member type="node" ref="2" role="via"/><member type="way" ref="12" role="to"/><tag k="type" v="restriction"/><tag k="restriction" v="no_left_turn"/></relation>
<relation id="100"><member type="way" ref="11" role="from"/><member type="node" ref="2" role="via"/><member type="way" ref="12" role="to"/><tag k="type" v="restriction:foot"/><tag k="restriction" v="no_right_turn"/></relation>
</osm>''', encoding='utf-8')
            pbf = folder / 'source.osm.pbf'
            with osmium.SimpleWriter(str(pbf)) as writer:
                for item in osmium.FileProcessor(str(xml)):
                    writer.add(item)
            output = folder / 'roads.geojsonl'
            arguments = ['import-osm-roads.py', '--source=' + str(pbf), '--output=' + str(output),
                         '--source-url=https://example.test/source.osm.pbf', '--source-exported-at=2026-09-27T20:23:36Z']
            with patch.object(sys, 'argv', arguments), contextlib.redirect_stdout(io.StringIO()):
                main()
            features = [json.loads(line) for line in output.read_text().splitlines()]
            self.assertEqual(len(features), 2)
            self.assertEqual(features[0]['properties']['osm_node_ids'], ['1', '2'])
            self.assertEqual(features[1]['properties']['osm_node_ids'], ['3', '4'])
            self.assertEqual(features[0]['properties']['foot'], 'yes')
            metadata = json.loads(output.with_suffix('.metadata.json').read_text())
            self.assertEqual(metadata['nodeTags']['2']['barrier'], 'gate')
            self.assertEqual(metadata['restrictions'][0]['id'], '99')
            self.assertEqual(metadata['restrictions'][0]['members'][1]['role'], 'via')
            self.assertEqual(metadata['restrictions'][1]['tags']['type'], 'restriction:foot')
            self.assertEqual(metadata['sourceSha256'], digest(pbf))
            self.assertEqual(metadata['roadsSha256'], digest(output))


if __name__ == '__main__':
    unittest.main()
