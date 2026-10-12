export const CHANNELS = ['primary', 'center', 'secondary'];

export const STROKE_WIDTH = 0.065;
export const RING = {x: 0.5, y: 0.5, radius: 0.36};
// Eighteen equally spaced positions: 12 upper, 4 lower, 1 empty on each side.
// The two empty positions belong to the remaining third of the circumference.
export const TOTAL_SLOTS = 18;
export const SLOT_ANGLE = 2 * Math.PI / TOTAL_SLOTS;
const lowerStart = Math.PI / 2 - 2 * SLOT_ANGLE;
const lowerEnd = Math.PI / 2 + 2 * SLOT_ANGLE;
const upperStart = lowerEnd + SLOT_ANGLE;
const upperEnd = upperStart + 12 * SLOT_ANGLE;
// Inset centerlines so rounded caps stay inside their allocated sectors.
const capInset = Math.asin(STROKE_WIDTH / (2 * RING.radius));

export const GEOMETRY = {
    primary: {...RING, sectorStart: upperStart, sectorEnd: upperEnd,
        start: upperStart + capInset, end: upperEnd - capInset,
        dotStart: upperStart + SLOT_ANGLE / 2, dotStep: SLOT_ANGLE, count: 12, dotRadius: 0.047},
    center: {x: RING.x, y: RING.y, radius: RING.radius * 0.3, count: 4,
        dotRadius: 0.043, dotOffset: RING.radius * 0.3 - 0.043},
    secondary: {...RING, sectorStart: lowerStart, sectorEnd: lowerEnd,
        start: lowerStart + capInset, end: lowerEnd - capInset,
        dotStart: lowerStart + SLOT_ANGLE / 2, dotStep: SLOT_ANGLE, count: 4, dotRadius: 0.047},
};

export function dotPositions(geometry) {
    const {x, y, radius, start, count, dotRadius, dotOffset, dotStart, dotStep} = geometry;
    return Array.from({length: count}, (_, index) => {
        if (start === undefined) {
            return {x: x + (index % 2 ? 1 : -1) * dotOffset,
                y: y + (index < 2 ? -1 : 1) * dotOffset, radius: dotRadius};
        }
        const angle = dotStart + dotStep * index;
        return {x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius, radius: dotRadius};
    });
}
