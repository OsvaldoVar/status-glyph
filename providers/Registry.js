import {DBusProvider} from './DBusProviders.js';
import {SystemProvider} from './SystemProviders.js';

// Shared instances when multiple channels select the same metric.
export class Registry {
    constructor(scheduler) { this.scheduler = scheduler; this.entries = new Map(); }

    acquire(metric, callback) {
        let entry = this.entries.get(metric);
        if (!entry) {
            const provider = ['battery', 'wifi', 'bluetooth'].includes(metric)
                ? new DBusProvider(metric) : new SystemProvider(metric, this.scheduler);
            entry = {provider, refs: 0};
            this.entries.set(metric, entry);
            provider.start();
        }
        entry.refs++;
        const unsubscribe = entry.provider.subscribe(callback);
        let released = false;
        return () => {
            if (released) return;
            released = true;
            unsubscribe();
            if (--entry.refs === 0) {
                entry.provider.stop();
                this.entries.delete(metric);
            }
        };
    }

    stop() {
        for (const {provider} of this.entries.values()) provider.stop();
        this.entries.clear();
    }
}
