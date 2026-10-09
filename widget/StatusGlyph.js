import St from 'gi://St';
import {CHANNELS, GEOMETRY} from './Geometry.js';
import {bar, dots} from './Renderers.js';
import {parseHex} from '../utils/Values.js';

export class StatusGlyph {
    constructor(settings, registry) {
        this.settings = settings;
        this.registry = registry;
        this.values = {};
        this.release = [];
        this.actor = new St.DrawingArea({style_class: 'status-glyph', reactive: false});
        this.actor.connect('repaint', () => this.paint());
        this.actor.connect('style-changed', () => this.actor.queue_repaint());
        this.changed = settings.connect('changed', (_settings, key) => {
            if (key.endsWith('-metric')) this.bind();
            this.refresh();
        });
        this.bind();
        this.refresh();
    }

    bind() {
        for (const release of this.release) release();
        this.release = [];
        for (const channel of CHANNELS) {
            this.release.push(this.registry.acquire(this.settings.get_string(`${channel}-metric`), result => {
                this.values[channel] = result;
                this.actor.accessible_name = CHANNELS.map(name => this.values[name]?.label).filter(Boolean).join(', ');
                this.actor.queue_repaint();
            }));
        }
    }

    refresh() {
        const size = this.settings.get_int('size');
        this.actor.set_size(size, size);
        this.actor.opacity = Math.round(this.settings.get_double('opacity') * 255);
        this.actor.queue_repaint();
    }

    paint() {
        const cr = this.actor.get_context();
        try {
            const [width, height] = this.actor.get_surface_size();
            const scale = Math.min(width, height);
            cr.translate((width - scale) / 2, (height - scale) / 2);
            cr.scale(scale, scale);
            const color = this.actor.get_theme_node().get_foreground_color();
            const foreground = [color.red, color.green, color.blue].map(n => n / 255);
            const custom = this.settings.get_boolean('custom-colors');
            const active = custom ? parseHex(this.settings.get_string('active-color')) ?? foreground : foreground;
            const inactive = custom ? parseHex(this.settings.get_string('inactive-color')) ?? foreground : foreground;
            for (const channel of CHANNELS) {
                const data = this.values[channel] ?? {value: 0, available: false};
                const reverse = this.settings.get_boolean(`${channel}-reverse`);
                const value = this.settings.get_boolean(`${channel}-invert`) ? 1 - data.value : data.value;
                const render = this.settings.get_string(`${channel}-style`) === 'dots' ? dots : bar;
                render(cr, GEOMETRY[channel], value, active, inactive, data.available, reverse);
            }
        } finally { cr.$dispose(); }
    }

    destroy() {
        this.settings.disconnect(this.changed);
        for (const release of this.release) release();
        this.release = [];
        this.actor.destroy();
    }
}
