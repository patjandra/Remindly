import { useState, useRef, useEffect } from 'react';

// A text-input dropdown that filters a fixed list of options as you type — used
// wherever a plain <select> would otherwise force scrolling through a long list
// (assistant role/emotion/voice). Selecting only happens by clicking (or Enter
// on the top match); typing never commits a value on its own.
export default function SearchableSelect({ value, onChange, options, placeholder = 'Search…', className = '' }) {
    const selected = options.find((o) => o.value === value) || null;
    // `query` only holds what's being typed while the dropdown is open — the
    // input's displayed value falls back to the selected label whenever it's
    // closed, so there's no need to sync state off `value` via an effect.
    const [query, setQuery] = useState('');
    const [open,  setOpen]  = useState(false);
    const wrapRef = useRef(null);
    const listRef = useRef(null);
    const displayed = open ? query : (selected?.label ?? '');

    // Close the dropdown on outside click.
    useEffect(() => {
        function onDown(e) {
            if (!wrapRef.current?.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    // Scroll the selected option into view when the dropdown opens.
    useEffect(() => {
        if (open && listRef.current) {
            listRef.current.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
        }
    }, [open]);

    const filtered = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));

    function select(opt) {
        onChange(opt.value);
        setOpen(false);
    }

    return (
        <div ref={wrapRef} className={`relative ${className}`}>
            <input
                type="text"
                value={displayed}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => { setQuery(''); setOpen(true); }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && filtered.length) { select(filtered[0]); e.currentTarget.blur(); }
                    if (e.key === 'Escape') setOpen(false);
                }}
                placeholder={placeholder}
                // Solid white regardless of theme — set via style, not just the
                // Tailwind class, so nothing scrolling behind it can ever show
                // through.
                style={{ backgroundColor: '#fff' }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition-colors cursor-pointer"
            />
            {open && (
                <div
                    ref={listRef}
                    onMouseDown={(e) => e.preventDefault()}
                    // `contain: paint` clips painting to this box and stops the browser
                    // from ever compositing it together with what's behind — without it,
                    // a fast scroll on the list can briefly flash the page underneath
                    // before the repaint catches up. `willChange` promotes it to its own
                    // GPU layer so that repaint keeps up during a fast scroll.
                    style={{ backgroundColor: '#fff', contain: 'paint', willChange: 'transform' }}
                    className="absolute top-full left-0 mt-1 w-full border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
                >
                    {filtered.length === 0
                        ? <p className="px-3 py-2 text-xs text-gray-400">No match</p>
                        : filtered.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                data-active={opt.value === value}
                                onClick={() => select(opt)}
                                style={{ backgroundColor: opt.value === value ? undefined : '#fff' }}
                                className={`w-full text-left px-3 py-1.5 text-sm cursor-pointer transition-colors
                                    ${opt.value === value
                                        ? 'bg-blue-50 text-blue-600 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                {opt.label}
                            </button>
                        ))
                    }
                </div>
            )}
        </div>
    );
}
