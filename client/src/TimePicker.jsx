import { useState, useRef, useEffect } from 'react';

const SLOTS = [];
for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
        const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h < 12 ? 'AM' : 'PM';
        SLOTS.push({
            label: `${h12}:${String(m).padStart(2, '0')} ${ampm}`,
            value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        });
    }
}

export function to12h(val) {
    if (!val) return '';
    const [hStr, mStr] = val.split(':');
    const h    = parseInt(hStr, 10);
    const m    = parseInt(mStr, 10);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function parseTimeText(raw) {
    if (!raw) return null;
    const t = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    let h, m = 0, ampm = null, match;

    match = t.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/);
    if (match) { h = +match[1]; m = +match[2]; ampm = match[3] || null; }

    if (h === undefined) {
        match = t.match(/^(\d{1,2})\s*(am|pm)$/);
        if (match) { h = +match[1]; ampm = match[2]; }
    }
    if (h === undefined) {
        match = t.match(/^(\d{3,4})$/);
        if (match) { const n = +match[1]; h = Math.floor(n / 100); m = n % 100; }
    }
    if (h === undefined) {
        match = t.match(/^(\d{1,2})$/);
        if (match) { h = +match[1]; }
    }

    if (h === undefined || isNaN(h)) return null;
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function TimePicker({ value, onChange, className = '' }) {
    const [text,    setText]    = useState(() => to12h(value));
    const [open,    setOpen]    = useState(false);
    const wrapRef   = useRef(null);
    const listRef   = useRef(null);
    const commitRef = useRef(null);

    useEffect(() => { setText(to12h(value)); }, [value]);

    function commit() {
        const parsed = parseTimeText(text);
        if (parsed) { onChange(parsed); setText(to12h(parsed)); }
        else        { setText(to12h(value)); }
    }
    commitRef.current = commit;

    // Close + commit on outside mousedown
    useEffect(() => {
        function onDown(e) {
            if (!wrapRef.current?.contains(e.target)) {
                commitRef.current();
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    // Scroll selected slot into view when dropdown opens
    useEffect(() => {
        if (open && listRef.current) {
            const active = listRef.current.querySelector('[data-active="true"]');
            active?.scrollIntoView({ block: 'center' });
        }
    }, [open]);

    const filtered = SLOTS.filter(s =>
        !text || s.label.toLowerCase().includes(text.toLowerCase())
    );

    return (
        <div ref={wrapRef} className={`relative ${className}`}>
            <input
                type="text"
                value={text}
                onChange={(e) => { setText(e.target.value); setOpen(true); }}
                onFocus={() => { setText(''); setOpen(true); }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter')  { commit(); setOpen(false); e.currentTarget.blur(); }
                    if (e.key === 'Escape') { setText(to12h(value)); setOpen(false); }
                }}
                placeholder="Time"
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 outline-none focus:border-blue-400 transition-colors w-28 cursor-pointer"
            />
            {open && (
                <div
                    ref={listRef}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-32 max-h-52 overflow-y-auto"
                >
                    {filtered.length === 0
                        ? <p className="px-3 py-2 text-xs text-gray-400">No match</p>
                        : filtered.map((slot) => (
                            <button
                                key={slot.value}
                                data-active={slot.value === value}
                                onClick={() => { onChange(slot.value); setText(slot.label); setOpen(false); }}
                                className={`w-full text-left px-3 py-1.5 text-sm cursor-pointer transition-colors
                                    ${slot.value === value
                                        ? 'bg-blue-50 text-blue-600 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                {slot.label}
                            </button>
                        ))
                    }
                </div>
            )}
        </div>
    );
}
