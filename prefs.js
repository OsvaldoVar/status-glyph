import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {CHANNELS} from './widget/Geometry.js';

const METRICS = ['battery', 'wifi', 'bluetooth', 'cpu', 'ram', 'temperature'];
const LABELS = ['Batería', 'Wi-Fi', 'Bluetooth', 'Uso de CPU', 'Uso de RAM', 'Temperatura de CPU'];

export default class StatusGlyphPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(600, 720);
        const signals = [];
        const page = new Adw.PreferencesPage({title: 'Status Glyph', icon_name: 'preferences-system-symbolic'});
        window.add(page);

        const combo = (group, title, key, values, labels) => {
            const row = new Adw.ComboRow({title, model: Gtk.StringList.new(labels)});
            row.selected = Math.max(0, values.indexOf(settings.get_string(key)));
            row.connect('notify::selected', () => {
                if (values[row.selected] !== undefined) settings.set_string(key, values[row.selected]);
            });
            signals.push(settings.connect(`changed::${key}`, () => {
                row.selected = Math.max(0, values.indexOf(settings.get_string(key)));
            }));
            group.add(row);
        };

        const toggle = (group, title, key) => {
            const row = new Adw.SwitchRow({title});
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            group.add(row);
        };

        const number = (group, title, key, lower, upper, step, integer = false) => {
            const row = new Adw.SpinRow({title, digits: integer ? 0 : 2,
                adjustment: new Gtk.Adjustment({lower, upper, step_increment: step, page_increment: step * 5})});
            row.value = integer ? settings.get_int(key) : settings.get_double(key);
            row.connect('notify::value', () => {
                if (integer) settings.set_int(key, Math.round(row.value));
                else settings.set_double(key, row.value);
            });
            signals.push(settings.connect(`changed::${key}`, () => {
                row.value = integer ? settings.get_int(key) : settings.get_double(key);
            }));
            group.add(row);
        };

        for (const [index, channel] of CHANNELS.entries()) {
            const group = new Adw.PreferencesGroup({title: ['Parte principal', 'Centro', 'Parte secundaria'][index]});
            page.add(group);
            combo(group, 'Métrica', `${channel}-metric`, METRICS, LABELS);
            combo(group, 'Representación', `${channel}-style`, ['bar', 'dots'],
                channel === 'center' ? ['Círculo', 'Cuatro puntos'] : ['Arco', 'Puntos']);
            toggle(group, 'Invertir nivel', `${channel}-invert`);
            toggle(group, 'Invertir dirección', `${channel}-reverse`);
        }

        const appearance = new Adw.PreferencesGroup({title: 'Apariencia'});
        page.add(appearance);
        number(appearance, 'Tamaño (px)', 'size', 48, 256, 8, true);
        number(appearance, 'Opacidad', 'opacity', 0.1, 1, 0.05);
        toggle(appearance, 'Colores personalizados', 'custom-colors');
        for (const [key, title] of [['active-color', 'Color activo'], ['inactive-color', 'Color inactivo']]) {
            const row = new Adw.EntryRow({title, text: settings.get_string(key), show_apply_button: true});
            row.connect('apply', () => {
                if (/^#[0-9a-f]{6}$/i.test(row.text)) {
                    settings.set_string(key, row.text);
                    row.remove_css_class('error');
                } else row.add_css_class('error');
            });
            signals.push(settings.connect(`changed::${key}`, () => { row.text = settings.get_string(key); }));
            appearance.add(row);
        }
        const location = new Adw.PreferencesGroup({title: 'Ubicación',
            description: 'Monitor -1: principal. Posición entre 0 y 1 dentro del área de trabajo.'});
        page.add(location);
        number(location, 'Monitor', 'monitor', -1, 15, 1, true);
        number(location, 'Posición horizontal', 'position-x', 0, 1, 0.05);
        number(location, 'Posición vertical', 'position-y', 0, 1, 0.05);
        window.connect('close-request', () => {
            for (const id of signals) settings.disconnect(id);
            return false;
        });
    }
}
