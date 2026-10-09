import Cairo from 'cairo';
import {activeDots, clamp} from '../utils/Values.js';

function color(cr, rgb, alpha) { cr.setSourceRGBA(...rgb, alpha); }

export function bar(cr, geometry, value, active, inactive, available, reverse) {
    const {x, y, radius, start, end} = geometry;
    cr.setLineWidth(0.055);
    cr.setLineCap(Cairo.LineCap.ROUND);
    color(cr, inactive, available ? 0.25 : 0.12);
    if (!start && !end) {
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
    const {x, y, radius, start, end, count} = geometry;
    const enabled = available ? activeDots(value, count) : 0;
    for (let i = 0; i < count; i++) {
        let dx, dy;
        if (count === 4 && start === undefined) {
            dx = x + (i % 2 ? 1 : -1) * 0.047;
            dy = y + (i < 2 ? -1 : 1) * 0.047;
        } else {
            const angle = start + (end - start) * i / (count - 1);
            dx = x + Math.cos(angle) * radius;
            dy = y + Math.sin(angle) * radius;
        }
        const on = (reverse ? count - 1 - i : i) < enabled;
        color(cr, on ? active : inactive, on ? 1 : available ? 0.25 : 0.12);
        cr.arc(dx, dy, count === 4 ? 0.033 : 0.029, 0, Math.PI * 2);
        cr.fill();
    }
}
