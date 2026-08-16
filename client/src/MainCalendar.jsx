import { useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './styles/MainCalendar.css';

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales: { 'en-US': enUS },
});

export default function MainCalendar({ date, onNavigate, view, onView, events = [], onDateClick, onEventClick }) {
    const handleSelectSlot = useCallback(({ start, end }) => {
        if (onDateClick) onDateClick(start, end);
    }, [onDateClick]);

    const handleSelectEvent = useCallback((event) => {
        if (onEventClick) onEventClick(event);
    }, [onEventClick]);

    return (
        <div className="w-full h-full rbc-container">
            <Calendar
                localizer={localizer}
                events={events}
                view={view}
                onView={onView}
                date={date}
                onNavigate={onNavigate}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                step={60}
                timeslots={1}
                style={{ height: '100%' }}
                components={{ toolbar: () => null }}
                eventPropGetter={(event) => ({
                    style: {
                        backgroundColor: event.color || '#3b82f6',
                        borderColor:     event.color || '#3b82f6',
                        border:          'none',
                    },
                })}
            />
        </div>
    );
}
