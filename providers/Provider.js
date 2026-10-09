import {reading} from '../utils/Values.js';

export class Provider {
    constructor() {
        this.current = reading(0, 'No disponible', false, 'unavailable');
        this.listeners = new Set();
        this.running = false;
    }

    subscribe(callback) {
        this.listeners.add(callback);
        callback(this.current);
        return () => this.listeners.delete(callback);
    }

    publish(result) {
        if (!this.running) return;
        if (JSON.stringify(this.current) === JSON.stringify(result)) return;
        this.current = result;
        for (const callback of this.listeners) callback(result);
    }

    start() { this.running = true; }
    stop() { this.running = false; this.listeners.clear(); }
}
