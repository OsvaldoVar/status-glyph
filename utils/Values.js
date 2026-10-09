export function clamp(value, min = 0, max = 1) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

export function reading(value, label, available = true, state = 'normal') {
    return {value: clamp(value), label, available, state};
}

export function parseCpu(text) {
    const line = text.split('\n').find(row => /^cpu\s/.test(row));
    if (!line) throw new Error('Missing aggregate CPU counters');
    const fields = line.trim().split(/\s+/).slice(1).map(Number);
    if (fields.length < 4 || fields.some(n => !Number.isFinite(n) || n < 0))
        throw new Error('Invalid CPU counters');
    // guest/guest_nice are already counted in user/nice.
    return {total: fields.slice(0, 8).reduce((a, b) => a + b, 0), idle: fields[3] + (fields[4] ?? 0)};
}

export function cpuUsage(previous, next) {
    const total = next.total - previous.total;
    const idle = next.idle - previous.idle;
    return total > 0 && idle >= 0 ? clamp(1 - idle / total) : 0;
}

export function memoryUsage(text) {
    const values = Object.fromEntries(text.split('\n').map(row => row.match(/^(\w+):\s+(\d+)/))
        .filter(Boolean).map(match => [match[1], Number(match[2])]));
    if (!(values.MemTotal > 0) || !Number.isFinite(values.MemAvailable))
        throw new Error('Missing memory counters');
    return clamp(1 - values.MemAvailable / values.MemTotal);
}

export function activeDots(value, count) {
    return Math.min(count, Math.ceil(clamp(value) * count));
}

export function parseHex(value) {
    const match = /^#([0-9a-f]{6})$/i.exec(value);
    if (!match) return null;
    return [0, 2, 4].map(offset => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
}
