import Cairo from 'cairo';
import {activeDots, clamp} from '../utils/Values.js';
import {STROKE_WIDTH, dotPositions} from './Geometry.js';

function color(cr, rgb, alpha) { cr.setSourceRGBA(...rgb, alpha); }

export function bar(cr, geometry, value, active, inactive, available, reverse) {
    const {x, y, radius, start, end} = geometry;
    cr.setLineWidth(STROKE_WIDTH);
    cr.setLineCap(Cairo.LineCap.ROUND);
    color(cr, inactive, available ? 0.25 : 0.12);
    if (start === undefined) {
        cr.arc(x, y, radius, 0, Math.PI * 2);
        cr.fill();
        if (available && value > 0) {
            color(cr, active, 1);
            cr.moveTo(x, y);
            cr.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + value * Math.PI * 2);
            cr.closePath();
            cr.fill();
        }
        return;
    }
    cr.arc(x, y, radius, start, end);
    cr.stroke();
    if (!available || value <= 0) return;
    color(cr, active, 1);
    if (reverse) cr.arc(x, y, radius, end - (end - start) * clamp(value), end);
    else cr.arc(x, y, radius, start, start + (end - start) * clamp(value));
    cr.stroke();
}

export function dots(cr, geometry, value, active, inactive, available, reverse) {
    const {count} = geometry;
    const enabled = available ? activeDots(value, count) : 0;
    for (const [i, point] of dotPositions(geometry).entries()) {
        const on = (reverse ? count - 1 - i : i) < enabled;
        color(cr, on ? active : inactive, on ? 1 : available ? 0.25 : 0.12);
        cr.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        cr.fill();
    }
}
