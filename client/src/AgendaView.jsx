import { format, isSameDay, addDays, startOfDay } from 'date-fns';

function formatRange(start, end) {
    const sa = format(start, 'a');
    const ea = format(end, 'a');
    if (sa === ea) return `${format(start, 'h:mm')} – ${format(end, 'h:mm a')}`;
    return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
}

function EmptyIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
    );
}

export default function AgendaView({ events, date, onEventClick }) {
    const from = startOfDay(date);
    const to   = addDays(from, 30);

    const upcoming = [...events]
        .filter(e => e.start >= from && e.start < to)
        .sort((a, b) => a.start - b.start);

    // Group by yyyy-MM-dd key
    const grouped = upcoming.reduce((acc, e) => {
        const k = format(e.start, 'yyyy-MM-dd');
        (acc[k] = acc[k] || []).push(e);
        return acc;
    }, {});

    const dateKeys = Object.keys(grouped).sort();

    if (dateKeys.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center select-none">
                <EmptyIcon />
                <p className="text-base font-semibold text-gray-400 dark:text-gray-600">No upcoming events</p>
                <p className="text-sm text-gray-300 dark:text-gray-700 mt-1">Click a time slot on any view to add one</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-[90px_1fr] border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
                <div className="px-4 py-2.5 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Date</div>
                <div className="px-4 py-2.5 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest border-l border-gray-100 dark:border-gray-700">Event</div>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
                {dateKeys.map(key => {
                    const day   = new Date(`${key}T12:00:00`);
                    const today = isSameDay(day, new Date());

                    return (
                        <div key={key} className="grid grid-cols-[90px_1fr]">
                            {/* Date column */}
                            <div className="px-4 py-4 flex flex-col items-center justify-start gap-0.5 border-r border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${today ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {format(day, 'EEE')}
                                </span>
                                <span className={`text-xl font-bold leading-none flex items-center justify-center ${today ? 'w-9 h-9 bg-blue-500 text-white rounded-full mt-0.5' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            {/* Events column */}
                            <div className="py-2.5 px-3 space-y-1">
                                {grouped[key].map(event => (
                                    <button
                                        key={event.id}
                                        onClick={() => onEventClick?.(event)}
                                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 cursor-pointer transition-colors group"
                                    >
                                        {/* Color bar */}
                                        <div className="w-1 h-9 rounded-full shrink-0" style={{ backgroundColor: event.color || '#3b82f6' }} />

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {event.title}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                                                {formatRange(event.start, event.end)}
                                                {event.location ? ` · ${event.location.split(',')[0]}` : ''}
                                            </p>
                                        </div>

                                        {/* Color dot (right side) */}
                                        <div className="w-2 h-2 rounded-full shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: event.color || '#3b82f6' }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
