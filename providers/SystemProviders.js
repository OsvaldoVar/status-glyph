import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Provider} from './Provider.js';
import {reading, parseCpu, cpuUsage, memoryUsage, clamp} from '../utils/Values.js';

function readFile(path, cancellable) {
    return new Promise((resolve, reject) => {
        Gio.File.new_for_path(path).load_contents_async(cancellable, (file, result) => {
            try {
                const [, bytes] = file.load_contents_finish(result);
                resolve(new TextDecoder().decode(bytes));
            } catch (error) { reject(error); }
        });
    });
}

export class SystemProvider extends Provider {
    constructor(metric, scheduler) {
        super();
        this.metric = metric;
        this.scheduler = scheduler;
        this.busy = false;
        this.previousCpu = null;
    }

    start() {
        super.start();
        this.cancellable = new Gio.Cancellable();
        this.removeJob = this.scheduler.add(this.metric === 'cpu' ? 1 : this.metric === 'ram' ? 2 : 5,
            () => this.update());
    }

    async update() {
        if (!this.running || this.busy) return;
        this.busy = true;
        try {
            if (this.metric === 'cpu') {
                const counters = parseCpu(await readFile('/proc/stat', this.cancellable));
                const value = this.previousCpu ? cpuUsage(this.previousCpu, counters) : 0;
                this.previousCpu = counters;
                this.publish(reading(value, `CPU ${Math.round(value * 100)}%`));
            } else if (this.metric === 'ram') {
                const value = memoryUsage(await readFile('/proc/meminfo', this.cancellable));
                this.publish(reading(value, `RAM ${Math.round(value * 100)}%`));
            } else {
                const values = await this.temperatures();
                if (!values.length) {
                    this.publish(reading(0, 'Temperatura no disponible', false, 'unavailable'));
                } else {
                    const temperature = Math.max(...values);
                    this.publish(reading(clamp((temperature - 30) / 70), `${temperature.toFixed(0)} °C`,
                        true, temperature >= 90 ? 'warning' : 'normal'));
                }
            }
        } catch (error) {
            if (this.running) this.publish(reading(0, `${this.metric}: no disponible`, false, 'error'));
        } finally { this.busy = false; }
    }

    async temperatures() {
        // Thermal zones are preferred over invoking sensors or external processes.
        const values = [];
        for (let index = 0; index < 64 && this.running; index++) {
            const base = `/sys/class/thermal/thermal_zone${index}`;
            if (!GLib.file_test(base, GLib.FileTest.IS_DIR)) continue;
            try {
                const type = (await readFile(`${base}/type`, this.cancellable)).trim();
                if (!/(x86_pkg_temp|cpu|soc|k10temp)/i.test(type)) continue;
                const temperature = Number(await readFile(`${base}/temp`, this.cancellable)) / 1000;
                if (temperature > 0 && temperature < 150) values.push(temperature);
            } catch { /* A disappearing or inaccessible zone is expected. */ }
        }
        return values;
    }

    stop() {
        super.stop();
        this.removeJob?.();
        this.removeJob = null;
        this.cancellable?.cancel();
    }
}
