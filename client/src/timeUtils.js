// Pure time-parsing/formatting helpers used by TimePicker.jsx. Kept in their own
// module (not exported from TimePicker.jsx itself) so that file only exports the
// component — mixing component and non-component exports in one file breaks Fast
// Refresh (react-refresh/only-export-components).

export function to12h(val) {
    if (!val) return '';
    const [hStr, mStr] = val.split(':');
    const h    = parseInt(hStr, 10);
    const m    = parseInt(mStr, 10);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function parseTimeText(raw) {
    if (!raw) return null;
    let t = raw.trim().toLowerCase().replace(/\s+/g, '');
    if (!t) return null;

    // Pull off a trailing am/pm marker first, accepting the full word or just its
    // first letter (so "438p" and "438pm" both work, not just "4:38 pm").
    let ampm = null;
    const ampmMatch = t.match(/(am|pm|a|p)$/);
    if (ampmMatch) {
        ampm = ampmMatch[1][0];
        t = t.slice(0, -ampmMatch[1].length);
    }

    let h, m = 0, match;

    match = t.match(/^(\d{1,2}):(\d{1,2})$/);
    if (match) { h = +match[1]; m = +match[2]; }

    if (h === undefined) {
        // Shorthand digits with no colon — "438" → 4:38, "1630" → 16:30. With an
        // am/pm marker attached this is what makes "438p" resolve to 4:38 PM.
        match = t.match(/^(\d{3,4})$/);
        if (match) {
            const digits = match[1];
            m = +digits.slice(-2);
            h = +digits.slice(0, -2);
        }
    }
    if (h === undefined) {
        match = t.match(/^(\d{1,2})$/);
        if (match) { h = +match[1]; }
    }

    if (h === undefined || isNaN(h)) return null;
    if (ampm === 'p' && h !== 12) h += 12;
    if (ampm === 'a' && h === 12) h = 0;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
