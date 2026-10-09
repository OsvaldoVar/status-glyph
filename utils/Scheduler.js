import GLib from 'gi://GLib';

// One source for all selected polling providers. No source exists without jobs.
export class Scheduler {
    constructor() { this.jobs = new Set(); this.source = 0; }

    add(seconds, callback) {
        const job = {seconds, callback, remaining: seconds};
        this.jobs.add(job);
        callback();
        if (!this.source) {
            this.source = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                for (const item of this.jobs) {
                    if (--item.remaining <= 0) {
                        item.remaining = item.seconds;
                        item.callback();
                    }
                }
                return GLib.SOURCE_CONTINUE;
            });
        }
        return () => {
            this.jobs.delete(job);
            if (!this.jobs.size) this.stop();
        };
    }

    stop() {
        if (this.source) GLib.Source.remove(this.source);
        this.source = 0;
        this.jobs.clear();
    }
}
