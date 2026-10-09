import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clamp, reading, parseCpu, cpuUsage, memoryUsage, activeDots, parseHex} from '../utils/Values.js';
import {CHANNELS, GEOMETRY} from '../widget/Geometry.js';
import {Provider} from '../providers/Provider.js';

test('invalid and out-of-range metrics remain bounded', () => {
    assert.equal(clamp(NaN), 0);
    assert.equal(clamp(-4), 0);
    assert.equal(clamp(9), 1);
    assert.deepEqual(reading(2, 'full'), {value: 1, label: 'full', available: true, state: 'normal'});
});
test('CPU calculation excludes guest counters and includes iowait in idle', () => {
    const previous = parseCpu('cpu 100 10 20 300 50 0 0 0 80 10\ncpu0 1 2 3 4');
    const next = parseCpu('cpu 140 10 30 340 60 0 0 0 90 10');
    assert.equal(previous.total, 480);
    assert.equal(previous.idle, 350);
    assert.equal(cpuUsage(previous, next), 0.5);
    assert.equal(cpuUsage(next, previous), 0);
    assert.throws(() => parseCpu('cpu0 1 2 3 4'));
});
test('memory uses MemAvailable rather than MemFree', () => {
    assert.equal(memoryUsage('MemTotal: 1000 kB\nMemFree: 10 kB\nMemAvailable: 400 kB'), 0.6);
    assert.throws(() => memoryUsage('MemTotal: 0 kB'));
});
test('dot thresholds preserve exact empty/full states', () => {
    assert.deepEqual([0, 0.25, 0.5, 0.75, 1].map(n => activeDots(n, 4)), [0, 1, 2, 3, 4]);
    assert.equal(activeDots(0.01, 4), 1);
    assert.equal(activeDots(-1, 4), 0);
});
test('custom colors accept only complete hex triplets', () => {
    assert.deepEqual(parseHex('#ff0080'), [1, 0, 128 / 255]);
    for (const value of ['#abc', 'red', '#ffffff00', '#xyzxyz']) assert.equal(parseHex(value), null);
});
test('all dot centers and strokes stay within the drawing surface', () => {
    for (const channel of CHANNELS) {
        const g = GEOMETRY[channel];
        if (channel === 'center') continue;
        for (let i = 0; i <= 100; i++) {
            const angle = g.start + (g.end - g.start) * i / 100;
            const x = g.x + Math.cos(angle) * g.radius;
            const y = g.y + Math.sin(angle) * g.radius;
            assert.ok(x >= 0.033 && x <= 0.967 && y >= 0.033 && y <= 0.967);
        }
    }
    assert.ok(GEOMETRY.secondary.radius < GEOMETRY.primary.radius);
    assert.equal(GEOMETRY.center.count, 4);
});
test('provider deduplicates updates, unsubscribes and ignores late completion', () => {
    const provider = new Provider();
    let updates = 0;
    provider.start();
    const unsubscribe = provider.subscribe(() => updates++);
    provider.publish(reading(0.5, 'half'));
    provider.publish(reading(0.5, 'half'));
    assert.equal(updates, 2);
    unsubscribe();
    provider.publish(reading(1, 'full'));
    assert.equal(updates, 2);
    provider.stop();
    provider.publish(reading(0, 'late'));
    assert.equal(provider.current.label, 'full');
    assert.equal(provider.listeners.size, 0);
});
