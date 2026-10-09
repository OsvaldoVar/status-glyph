#!/usr/bin/env python3
"""Build source and extension archives. Compilation requires GLib tools."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'
OUT.mkdir(exist_ok=True)
FILES = ['extension.js', 'prefs.js', 'metadata.json', 'stylesheet.css', 'widget', 'providers', 'utils', 'schemas', 'LICENSE']
with tempfile.TemporaryDirectory() as temp:
    staged = Path(temp)
    for name in FILES:
        source = ROOT / name
        if source.is_dir(): shutil.copytree(source, staged / name)
        else: shutil.copy2(source, staged / name)
    if shutil.which('glib-compile-schemas'):
        subprocess.run(['glib-compile-schemas', '--strict', str(staged / 'schemas')], check=True)
        with zipfile.ZipFile(OUT / 'status-glyph@osvaldovar.github.io.shell-extension.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(staged.rglob('*')):
                if path.is_file(): archive.write(path, path.relative_to(staged))
    else:
        print('Installable ZIP skipped: glib-compile-schemas is required. Source ZIP remains available.')
with zipfile.ZipFile(OUT / 'status-glyph-source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(ROOT.rglob('*')):
        if path.is_file() and not any(part in {'dist', '.git', '__pycache__'} for part in path.relative_to(ROOT).parts):
            archive.write(path, Path('status-glyph') / path.relative_to(ROOT))
print(OUT / 'status-glyph-source.zip')
