// Shared event-color palette. Used both as the manual picker in EventModal and as
// the source of deterministic colors for events that don't have a user-chosen one
// (Google Calendar imports) — see colorForKey below.
export const EVENT_COLORS = [
    '#3b82f6', '#ef4444', '#22c55e', '#f97316',
    '#a855f7', '#ec4899', '#14b8a6', '#f59e0b',
];

// Deterministic hash → the same key always maps to the same color. Keyed by title
// (not the Google event id) so recurring events like "Exec Meeting" stay one
// consistent color across every occurrence instead of reshuffling per instance,
// and so re-importing doesn't repaint anything.
export function colorForKey(key) {
    let hash = 0;
    const str = String(key || '');
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}
