export const CHANNELS = ['primary', 'center', 'secondary'];

export const STROKE_WIDTH = 0.065;
export const RING = {x: 0.5, y: 0.5, radius: 0.36};
// Two visible gaps. Divide the remaining circumference in an exact 2:1 ratio.
// Angles follow Cairo: zero points right, and PI/2 points down.
export const ARC_GAP = 22 * Math.PI / 180;
const visibleSweep = 2 * Math.PI - 2 * ARC_GAP;
const lowerSweep = visibleSweep / 3;
const lowerStart = Math.PI / 2 - lowerSweep / 2;
const lowerEnd = Math.PI / 2 + lowerSweep / 2;

export const GEOMETRY = {
    primary: {...RING, start: lowerEnd + ARC_GAP, end: lowerEnd + ARC_GAP + 2 * lowerSweep,
        count: 8, dotRadius: 0.047},
    center: {x: RING.x, y: RING.y, radius: RING.radius * 0.3, count: 4,
        dotRadius: 0.043, dotOffset: RING.radius * 0.3 - 0.043},
    secondary: {...RING, start: lowerStart, end: lowerEnd, count: 4, dotRadius: 0.047},
};

export function dotPositions(geometry) {
    const {x, y, radius, start, end, count, dotRadius, dotOffset} = geometry;
    return Array.from({length: count}, (_, index) => {
        if (start === undefined) {
            return {x: x + (index % 2 ? 1 : -1) * dotOffset,
                y: y + (index < 2 ? -1 : 1) * dotOffset, radius: dotRadius};
        }
        const angle = start + (end - start) * index / (count - 1);
        return {x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius, radius: dotRadius};
    });
}
