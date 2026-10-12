import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHANNELS, GEOMETRY, STROKE_WIDTH, dotPositions} from '../widget/Geometry.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12,
    `${actual} differs from ${expected}`);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('upper and lower arcs share one circle with 2/3 and 1/3 of visible sweep', () => {
    const {primary: upper, secondary: lower} = GEOMETRY;
    assert.equal(upper.x, lower.x);
    assert.equal(upper.y, lower.y);
    assert.equal(upper.radius, lower.radius);
    const topSweep = upper.end - upper.start;
    const bottomSweep = lower.end - lower.start;
    close(topSweep / (topSweep + bottomSweep), 2 / 3);
    close(bottomSweep / (topSweep + bottomSweep), 1 / 3);
    close((lower.start + lower.end) / 2, Math.PI / 2);
    close((upper.start + upper.end) / 2, 3 * Math.PI / 2);
});

test('two balanced gaps remain visible with round caps and enlarged dots at 48px', () => {
    const {primary: upper, secondary: lower} = GEOMETRY;
    close(upper.start - lower.end, lower.start + 2 * Math.PI - upper.end);
    const topDots = dotPositions(upper);
    const lowerDots = dotPositions(lower);
    for (const [a, b] of [[topDots[0], lowerDots.at(-1)], [topDots.at(-1), lowerDots[0]]]) {
        const gap = distance(a, b);
        for (const radiusA of [STROKE_WIDTH / 2, a.radius]) {
            for (const radiusB of [STROKE_WIDTH / 2, b.radius])
                assert.ok((gap - radiusA - radiusB) * 48 >= 2);
        }
    }
});

test('lower channel has four distinct enlarged points on the bottom of the circle', () => {
    const points = dotPositions(GEOMETRY.secondary);
    assert.equal(points.length, 4);
    assert.equal(dotPositions(GEOMETRY.primary).length, 8);
    for (const point of points) {
        assert.ok(point.y > GEOMETRY.secondary.y);
        assert.ok(point.radius > 0.029);
    }
    for (let i = 1; i < points.length; i++)
        assert.ok(distance(points[i - 1], points[i]) > points[i - 1].radius + points[i].radius);
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
