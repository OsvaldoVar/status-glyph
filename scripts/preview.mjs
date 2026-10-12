// Render the production Cairo drawing commands as SVG without GNOME.
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, resolve} from 'node:path';
import {CHANNELS, GEOMETRY} from '../widget/Geometry.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rendererPath = resolve(root, 'widget/Renderers.js');
let source = await readFile(rendererPath, 'utf8');
source = source.replace("import Cairo from 'cairo';", "const Cairo = {LineCap: {ROUND: 'round'}};")
    .replace(/from '(\.[^']+)'/g, (_, relative) => `from '${pathToFileURL(resolve(dirname(rendererPath), relative)).href}'`);
const {bar, dots} = await import(`data:text/javascript,${encodeURIComponent(source)}`);

const n = value => Number(value.toFixed(6));
class SvgContext {
    constructor() { this.path = []; this.output = []; this.width = 0; this.cap = 'round'; }
    setSourceRGBA(r, g, b, a) {
        this.color = `rgb(${[r, g, b].map(value => Math.round(value * 255)).join(',')})`;
        this.opacity = a;
    }
    setLineWidth(width) { this.width = width; }
    setLineCap(cap) { this.cap = cap; }
    moveTo(x, y) { this.path.push(`M${n(x)},${n(y)}`); }
    arc(x, y, radius, start, end) {
        const point = angle => `${n(x + radius * Math.cos(angle))},${n(y + radius * Math.sin(angle))}`;
        this.path.push(`${this.path.length ? 'L' : 'M'}${point(start)}`);
        if (end - start >= 2 * Math.PI - 1e-10) {
            this.path.push(`A${n(radius)},${n(radius)} 0 1 1 ${point(start + Math.PI)}`);
            this.path.push(`A${n(radius)},${n(radius)} 0 1 1 ${point(end)}`);
        } else this.path.push(`A${n(radius)},${n(radius)} 0 ${end - start > Math.PI ? 1 : 0} 1 ${point(end)}`);
    }
    closePath() { this.path.push('Z'); }
    fill() { this.emit(false); }
    stroke() { this.emit(true); }
    emit(stroke) {
        this.output.push(`<path d="${this.path.join(' ')}" opacity="${this.opacity}" ` +
            (stroke ? `fill="none" stroke="${this.color}" stroke-width="${this.width}" stroke-linecap="${this.cap}"` : `fill="${this.color}"`) + '/>');
        this.path = [];
    }
}

const cells = [];
for (let index = 0; index < 8; index++) {
    const cr = new SvgContext();
    const styles = CHANNELS.map((_, channel) => index & (1 << channel) ? 'dots' : 'bar');
    CHANNELS.forEach((channel, channelIndex) => {
        const render = styles[channelIndex] === 'dots' ? dots : bar;
        render(cr, GEOMETRY[channel], 1, [0.965, 0.961, 0.957], [0.965, 0.961, 0.957], true, false);
    });
    const x = 20 + (index % 4) * 190;
    const y = 90 + Math.floor(index / 4) * 218;
    const label = styles.map(style => style === 'dots' ? 'Puntos' : 'Barra').join(' · ');
    cells.push(`<g transform="translate(${x},${y})"><rect width="180" height="198" rx="16" fill="#303030"/>` +
        `<g transform="translate(10,10) scale(160)">${cr.output.join('')}</g>` +
        `<text x="90" y="184" text-anchor="middle" fill="#deddda" font-size="11">${label}</text></g>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="540" viewBox="0 0 800 540">` +
    '<rect width="800" height="540" rx="20" fill="#242424"/>' +
    '<g font-family="sans-serif"><text x="24" y="38" fill="#f6f5f4" font-size="25">Status Glyph</text>' +
    '<text x="24" y="64" fill="#c0bfbc" font-size="14">14 posiciones · 8 arriba · 4 abajo · dos intermedios invisibles</text>' +
    cells.join('') + '</g></svg>\n';
const destination = resolve(root, 'docs/GEOMETRY_PREVIEW.svg');
await writeFile(destination, svg);
console.log(destination);
