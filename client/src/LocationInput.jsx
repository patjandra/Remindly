import { useState, useRef, useEffect } from 'react';

function haversine(lat1, lon1, lat2, lon2) {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2
               + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
               * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatResult(item) {
    const parts  = item.display_name.split(', ');
    const name   = parts[0];
    const detail = parts.slice(1, 5).join(', ');
    return {
        name,
        detail,
        full: item.display_name,
        lat:  parseFloat(item.lat),
        lon:  parseFloat(item.lon),
    };
}

export default function LocationInput({ value, onChange, placeholder = 'Add location' }) {
    const [suggestions, setSuggestions] = useState([]);
    const [open,        setOpen]        = useState(false);
    const [loading,     setLoading]     = useState(false);

    // Use a ref so fetchSuggestions always has the latest location without re-closing
    const userLocRef = useRef(null);
    const timerRef   = useRef(null);
    const wrapRef    = useRef(null);

    // Request geolocation once on mount
    useEffect(() => {
        navigator.geolocation?.getCurrentPosition(
            (pos) => {
                userLocRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            },
            () => {} // fail silently if denied
        );
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function onDown(e) { if (!wrapRef.current?.contains(e.target)) setOpen(false); }
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    async function fetchSuggestions(q) {
        setLoading(true);
        try {
            const loc = userLocRef.current;
            // Pass a viewbox centered on the user (±0.5° ≈ ±55 km) to bias Nominatim results
            const viewbox = loc
                ? `&viewbox=${loc.lon - 0.5},${loc.lat + 0.5},${loc.lon + 0.5},${loc.lat - 0.5}`
                : '';

            const res  = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=0${viewbox}`,
                { headers: { 'Accept-Language': 'en-US,en' } }
            );
            const data = await res.json();
            let results = data.map(formatResult);

            // Sort by distance from user when location is available
            if (loc) {
                results.sort((a, b) =>
                    haversine(loc.lat, loc.lon, a.lat, a.lon) -
                    haversine(loc.lat, loc.lon, b.lat, b.lon)
                );
            }

            setSuggestions(results);
            setOpen(true);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }

    function handleChange(e) {
        const val = e.target.value;
        onChange(val);
        clearTimeout(timerRef.current);
        if (val.length >= 2) {
            timerRef.current = setTimeout(() => fetchSuggestions(val), 450);
        } else {
            setSuggestions([]);
            setOpen(false);
        }
    }

    return (
        <div ref={wrapRef} className="relative w-full">
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onFocus={() => suggestions.length > 0 && setOpen(true)}
                placeholder={placeholder}
                className="w-full text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none bg-transparent"
            />
            {open && (loading || suggestions.length > 0) && (
                <div
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 w-[min(420px,85vw)] max-h-64 overflow-y-auto"
                >
                    {loading && <p className="px-3 py-2 text-xs text-gray-400">Searching…</p>}
                    {!loading && suggestions.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => { onChange(s.full); setSuggestions([]); setOpen(false); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                        >
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{s.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{s.detail}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
