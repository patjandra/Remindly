import { useState, useEffect } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths,
} from 'date-fns';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function MiniCalendar({ selectedDate, onDateSelect }) {
    const [viewMonth, setViewMonth] = useState(selectedDate || new Date());

    useEffect(() => {
        if (selectedDate) setViewMonth(selectedDate);
    }, [selectedDate]);

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
        end:   endOfWeek(endOfMonth(viewMonth),     { weekStartsOn: 1 }),
    });

    return (
        <div className="px-2 py-1 select-none">
            {/* Month header */}
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer transition-colors duration-150 text-base leading-none"
                >
                    ‹
                </button>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {format(viewMonth, 'MMMM yyyy')}
                </span>
                <button
                    onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer transition-colors duration-150 text-base leading-none"
                >
                    ›
                </button>
            </div>

            {/* Day-of-week labels */}
            <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS.map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase">
                        {d}
                    </div>
                ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((day) => {
                    const selected  = selectedDate && isSameDay(day, selectedDate);
                    const inMonth   = isSameMonth(day, viewMonth);
                    const todayFlag = isToday(day);

                    let cellClass = 'w-7 h-7 mx-auto flex items-center justify-center rounded-full text-[11px] cursor-pointer transition-colors duration-100 ';

                    if (selected) {
                        cellClass += 'bg-blue-500 text-white font-semibold';
                    } else if (todayFlag && inMonth) {
                        cellClass += 'text-blue-500 dark:text-blue-400 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30';
                    } else if (inMonth) {
                        cellClass += 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400';
                    } else {
                        cellClass += 'text-gray-300 dark:text-gray-700 cursor-default';
                    }

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => inMonth && onDateSelect(day)}
                            className={cellClass}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
