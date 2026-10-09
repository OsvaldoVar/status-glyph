import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {StatusGlyph} from './widget/StatusGlyph.js';
import {Registry} from './providers/Registry.js';
import {Scheduler} from './utils/Scheduler.js';

export default class StatusGlyphExtension extends Extension {
    enable() {
        this.settings = this.getSettings();
        this.scheduler = new Scheduler();
        this.registry = new Registry(this.scheduler);
        this.glyph = new StatusGlyph(this.settings, this.registry);
        // Desktop chrome stays below windows and disappears in the overview.
        global.window_group.add_child(this.glyph.actor);
        const background = global.window_group.get_children().find(actor => actor instanceof Meta.BackgroundGroup);
        if (background) global.window_group.set_child_above_sibling(this.glyph.actor, background);
        this.monitorsId = Main.layoutManager.connect('monitors-changed', () => this.position());
        this.workareasId = global.display.connect('workareas-changed', () => this.position());
        this.settingsId = this.settings.connect('changed', () => this.position());
        this.position();
    }

    position() {
        const index = this.settings.get_int('monitor');
        const monitor = Main.layoutManager.monitors[index] ?? Main.layoutManager.primaryMonitor;
        if (!monitor) return;
        const size = this.settings.get_int('size');
        const area = Main.layoutManager.getWorkAreaForMonitor(monitor.index);
        const x = area.x + Math.round(Math.max(0, area.width - size) * this.settings.get_double('position-x'));
        const y = area.y + Math.round(Math.max(0, area.height - size) * this.settings.get_double('position-y'));
        this.glyph.actor.set_position(x, y);
    }

    disable() {
        if (this.monitorsId) Main.layoutManager.disconnect(this.monitorsId);
        if (this.workareasId) global.display.disconnect(this.workareasId);
        if (this.settingsId) this.settings.disconnect(this.settingsId);
        this.glyph?.destroy();
        this.registry?.stop();
        this.scheduler?.stop();
        this.monitorsId = this.settingsId = this.workareasId = 0;
        this.glyph = this.registry = this.scheduler = this.settings = null;
    }
}
