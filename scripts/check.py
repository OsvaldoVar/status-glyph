#!/usr/bin/env python3
"""Validate module syntax, schema shape, imports and manifest without GNOME."""
import json
from pathlib import Path
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'metadata.json').read_text())
assert manifest['uuid'] == 'status-glyph@osvaldovar.github.io'
tree = ET.parse(ROOT / 'schemas/org.gnome.shell.extensions.status-glyph.gschema.xml')
assert tree.getroot().find('schema').attrib['id'] == manifest['settings-schema']
keys = {key.attrib['name'] for key in tree.findall('.//key')}
for path in sorted(ROOT.rglob('*.js')):
    subprocess.run(['node', '--check', str(path)], check=True)
    text = path.read_text()
    for relative in re.findall(r"from ['\"](\.[^'\"]+)['\"]", text):
        assert (path.parent / relative).is_file(), (path, relative)
    for key in re.findall(r"(?:get_(?:string|int|double|boolean)|set_(?:string|int|double|boolean))\('([^']+)'", text):
        assert key in keys, (path, key)
if shutil.which('glib-compile-schemas'):
    subprocess.run(['glib-compile-schemas', '--strict', '--dry-run', str(ROOT / 'schemas')], check=True)
else:
    print('Schema compilation unavailable locally; CI runs the strict compiler.')
print(f'Module syntax, local imports, metadata and {len(keys)} settings validated.')
