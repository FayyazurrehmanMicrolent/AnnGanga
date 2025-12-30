import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    return twMerge(clsx(inputs));
}
// Parse a nutrition info string (e.g. "Energy: 265 kcal, Protein: 12g")
// into a key/value object: { Energy: '265 kcal', Protein: '12g' }
export function parseNutritionInfo(info) {
    var out = {};
    if (!info || typeof info !== 'string')
        return out;
    // split by newline, semicolon or comma
    var parts = info.split(/\r?\n|;|,/).map(function (p) { return p.trim(); }).filter(Boolean);
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        if (!part)
            continue;
        if (part.includes(':')) {
            var _a = part.split(':'), k = _a[0], rest = _a.slice(1);
            out[k.trim()] = rest.join(':').trim();
        }
        else {
            // Try split by last space before numeric value
            var m = part.match(/^(.*\D)\s+([0-9].*)$/);
            if (m) {
                out[m[1].trim()] = m[2].trim();
            }
            else {
                out[part.trim()] = '';
            }
        }
    }
    return out;
}
