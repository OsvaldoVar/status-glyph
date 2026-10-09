import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Provider} from './Provider.js';
import {reading} from '../utils/Values.js';

function unpack(value) {
    if (value instanceof GLib.Variant) return unpack(value.deep_unpack());
    if (Array.isArray(value)) return value.map(unpack);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, unpack(item)]));
    return value;
}

export class DBusProvider extends Provider {
    constructor(metric) { super(); this.metric = metric; this.signals = []; this.busy = false; }

    start() {
        super.start();
        this.cancellable = new Gio.Cancellable();
        this.name = {battery: 'org.freedesktop.UPower', wifi: 'org.freedesktop.NetworkManager',
            bluetooth: 'org.bluez'}[this.metric];
        this.watch = Gio.bus_watch_name(Gio.BusType.SYSTEM, this.name, Gio.BusNameWatcherFlags.NONE,
            connection => this.appeared(connection), () => this.vanished());
    }

    appeared(connection) {
        if (!this.running) return;
        this.disconnectSignals();
        this.connection = connection;
        this.dirty = true;
        for (const iface of ['org.freedesktop.DBus.Properties', 'org.freedesktop.DBus.ObjectManager']) {
            this.signals.push(connection.signal_subscribe(this.name, iface, null, null, null,
                Gio.DBusSignalFlags.NONE, () => {
                    this.dirty = true;
                    this.update();
                }));
        }
        this.update();
    }

    vanished() {
        this.disconnectSignals();
        this.connection = null;
        this.publish(reading(0, `${this.metric}: servicio no disponible`, false, 'unavailable'));
    }

    call(path, iface, method, parameters = null) {
        const connection = this.connection;
        return new Promise((resolve, reject) => {
            connection.call(this.name, path, iface, method, parameters, null,
                Gio.DBusCallFlags.NONE, 3000, this.cancellable, (source, result) => {
                    try { resolve(unpack(source.call_finish(result))); }
                    catch (error) { reject(error); }
                });
        });
    }

    async properties(path, iface) {
        const [properties] = await this.call(path, 'org.freedesktop.DBus.Properties', 'GetAll',
            new GLib.Variant('(s)', [iface]));
        return properties;
    }

    async update() {
        if (!this.running || !this.connection || this.busy) return;
        this.busy = true;
        this.dirty = false;
        const connection = this.connection;
        try {
            let result;
            if (this.metric === 'battery') {
                const props = await this.properties('/org/freedesktop/UPower/devices/DisplayDevice',
                    'org.freedesktop.UPower.Device');
                result = reading(props.Percentage / 100, `Batería ${Math.round(props.Percentage ?? 0)}%`,
                    Boolean(props.IsPresent), props.State === 1 ? 'charging' : 'normal');
            } else if (this.metric === 'wifi') {
                result = await this.wifi();
            } else {
                result = await this.bluetooth();
            }
            if (this.connection === connection) this.publish(result);
        } catch {
            if (this.connection === connection)
                this.publish(reading(0, `${this.metric}: no disponible`, false, 'error'));
        } finally {
            this.busy = false;
            if (this.dirty && this.running && this.connection) this.update();
        }
    }

    async wifi() {
        const root = await this.properties('/org/freedesktop/NetworkManager', 'org.freedesktop.NetworkManager');
        if (!root.WirelessEnabled) return reading(0, 'Wi-Fi desactivado', true, 'disabled');
        const [paths] = await this.call('/org/freedesktop/NetworkManager',
            'org.freedesktop.NetworkManager', 'GetDevices');
        for (const path of paths) {
            const device = await this.properties(path, 'org.freedesktop.NetworkManager.Device');
            if (device.DeviceType !== 2) continue;
            const wireless = await this.properties(path, 'org.freedesktop.NetworkManager.Device.Wireless');
            if (!wireless.ActiveAccessPoint || wireless.ActiveAccessPoint === '/') continue;
            const ap = await this.properties(wireless.ActiveAccessPoint,
                'org.freedesktop.NetworkManager.AccessPoint');
            return reading(ap.Strength / 100, `Wi-Fi ${ap.Strength}%`);
        }
        return reading(0, 'Wi-Fi sin conexión');
    }

    async bluetooth() {
        const [objects] = await this.call('/', 'org.freedesktop.DBus.ObjectManager', 'GetManagedObjects');
        const adapters = Object.values(objects).map(item => item['org.bluez.Adapter1']).filter(Boolean);
        if (!adapters.length) return reading(0, 'Bluetooth no disponible', false, 'unavailable');
        const enabled = adapters.some(adapter => adapter.Powered);
        const connected = Object.values(objects).some(item => item['org.bluez.Device1']?.Connected);
        return reading(enabled ? connected ? 1 : 0.5 : 0,
            enabled ? connected ? 'Bluetooth conectado' : 'Bluetooth encendido' : 'Bluetooth desactivado',
            true, enabled ? 'normal' : 'disabled');
    }

    disconnectSignals() {
        for (const id of this.signals) this.connection?.signal_unsubscribe(id);
        this.signals = [];
    }

    stop() {
        super.stop();
        if (this.watch) Gio.bus_unwatch_name(this.watch);
        this.watch = 0;
        this.disconnectSignals();
        this.cancellable?.cancel();
        this.connection = null;
    }
}
