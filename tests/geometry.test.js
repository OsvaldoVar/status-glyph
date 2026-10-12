import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHANNELS, GEOMETRY, STROKE_WIDTH, TOTAL_SLOTS, SLOT_ANGLE, dotPositions} from '../widget/Geometry.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12,
    `${actual} differs from ${expected}`);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('one circle has 18 equal slots: 12 upper, 4 lower and one blank on each side', () => {
    const {primary: upper, secondary: lower} = GEOMETRY;
    assert.equal(upper.x, lower.x);
    assert.equal(upper.y, lower.y);
    assert.equal(upper.radius, lower.radius);
    assert.equal(TOTAL_SLOTS, 18);
    close(SLOT_ANGLE, Math.PI / 9);
    const topSweep = upper.sectorEnd - upper.sectorStart;
    const bottomSweep = lower.sectorEnd - lower.sectorStart;
    close(topSweep / (2 * Math.PI), 2 / 3);
    close(bottomSweep / SLOT_ANGLE, 4);
    close(upper.sectorStart - lower.sectorEnd, SLOT_ANGLE);
    close(lower.sectorStart + 2 * Math.PI - upper.sectorEnd, SLOT_ANGLE);
    close(topSweep + bottomSweep + 2 * SLOT_ANGLE, 2 * Math.PI);
    close((lower.start + lower.end) / 2, Math.PI / 2);
    close((upper.start + upper.end) / 2, 3 * Math.PI / 2);
});

test('two blank slots remain visibly clear for every arc/dot combination at 48px', () => {
    const {primary: upper, secondary: lower} = GEOMETRY;
    close(upper.start - lower.end, lower.start + 2 * Math.PI - upper.end);
    const endpoints = (geometry, style) => {
        if (style === 'dots') {
            const points = dotPositions(geometry);
            return [points[0], points.at(-1)];
        }
        return [geometry.start, geometry.end].map(angle => ({
            x: geometry.x + Math.cos(angle) * geometry.radius,
            y: geometry.y + Math.sin(angle) * geometry.radius,
            radius: STROKE_WIDTH / 2,
        }));
    };
    for (const topStyle of ['bar', 'dots']) {
        for (const lowerStyle of ['bar', 'dots']) {
            const [topFirst, topLast] = endpoints(upper, topStyle);
            const [lowFirst, lowLast] = endpoints(lower, lowerStyle);
            for (const [a, b] of [[topFirst, lowLast], [topLast, lowFirst]])
                assert.ok((distance(a, b) - a.radius - b.radius) * 48 >= 2);
        }
    }
});

test('lower channel has four distinct enlarged points on the bottom of the circle', () => {
    const points = dotPositions(GEOMETRY.secondary);
    assert.equal(points.length, 4);
    const upper = dotPositions(GEOMETRY.primary);
    assert.equal(upper.length, 12);
    for (const point of points) {
        assert.ok(point.y > GEOMETRY.secondary.y);
        assert.ok(point.radius > 0.029);
    }
    for (const group of [upper, points]) {
        for (let i = 1; i < group.length; i++) {
            close(distance(group[i - 1], group[i]), 2 * GEOMETRY.primary.radius * Math.sin(SLOT_ANGLE / 2));
            assert.ok(distance(group[i - 1], group[i]) > group[i - 1].radius + group[i].radius);
        }
    }
});

test('center circle and 2x2 points share a centered footprint of 30% of ring diameter', () => {
    const {primary: upper, center} = GEOMETRY;
    assert.equal(center.x, upper.x);
    assert.equal(center.y, upper.y);
    close(center.radius / upper.radius, 0.3);
    assert.ok(center.radius > 0.075);
    const points = dotPositions(center);
    assert.equal(points.length, 4);
    assert.equal(new Set(points.map(p => p.x)).size, 2);
    assert.equal(new Set(points.map(p => p.y)).size, 2);
    const left = Math.min(...points.map(p => p.x - p.radius));
    const right = Math.max(...points.map(p => p.x + p.radius));
    close(right - left, center.radius * 2);
    for (const outer of [...dotPositions(upper), ...dotPositions(GEOMETRY.secondary)]) {
        assert.ok(distance(outer, center) > center.radius + outer.radius);
        for (const inner of points) assert.ok(distance(outer, inner) > outer.radius + inner.radius);
    }
});

test('full dot footprints and thicker arc strokes stay within the drawing surface', () => {
    assert.ok(STROKE_WIDTH > 0.055 && STROKE_WIDTH <= 0.07);
    for (const channel of CHANNELS) {
        const geometry = GEOMETRY[channel];
        for (const point of dotPositions(geometry)) {
            assert.ok(point.x - point.radius >= 0 && point.x + point.radius <= 1);
            assert.ok(point.y - point.radius >= 0 && point.y + point.radius <= 1);
        }
        if (geometry.start === undefined) continue;
        for (let i = 0; i <= 360; i++) {
            const angle = geometry.start + (geometry.end - geometry.start) * i / 360;
            const x = geometry.x + Math.cos(angle) * geometry.radius;
            const y = geometry.y + Math.sin(angle) * geometry.radius;
            const half = STROKE_WIDTH / 2;
            assert.ok(x - half >= 0 && x + half <= 1 && y - half >= 0 && y + half <= 1);
        }
    }
});
