import { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { format, addHours, subMinutes, subHours, subDays, subWeeks, subMonths } from 'date-fns';
import TimePicker from './TimePicker';
import LocationInput from './LocationInput';
import { EVENT_COLORS } from './eventColors';

const REMINDER_UNITS = ['minutes', 'hours', 'days', 'weeks', 'months'];

// Subtracts a reminder offset (amount + unit) from the event start to find when the
// notification should fire.
const SUB_BY_UNIT = { minutes: subMinutes, hours: subHours, days: subDays, weeks: subWeeks, months: subMonths };
function computeNotificationTime(start, reminder) {
    if (!reminder) return null;
    const sub = SUB_BY_UNIT[reminder.unit] || subMinutes;
    return sub(start, Number(reminder.amount));
}

function toDateInput(d) { return format(d, 'yyyy-MM-dd'); }
function toTimeInput(d) { return format(d, 'HH:mm'); }
function combine(dateStr, timeStr) { return new Date(`${dateStr}T${timeStr}`); }

function FieldRow({ icon, children }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="text-gray-400 mt-0.5 shrink-0 w-4">{icon}</div>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    );
}

function ClockIcon()  { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function PinIcon()    { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function NoteIcon()   { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>; }
function UserIcon()   { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function BellIcon()   { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function XIcon()      { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }

const dateInput = 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400 transition-colors cursor-pointer';
const selectCls = 'w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400 transition-colors cursor-pointer';

// prefill optionally seeds a new (non-edit) event's fields — used by the "Create
// example event" button so it can open this same modal instead of writing directly
// to Firestore, letting the user pick the assistant themselves before saving.
export default function EventModal({ user, assistants, event: existingEvent = null, start, end, prefill = null, onClose }) {
    const isEdit     = existingEvent !== null;
    const defaultEnd = isEdit ? existingEvent.end : (end && end > start ? end : addHours(start, 1));
    const srcStart   = isEdit ? existingEvent.start : start;
    const srcEnd     = defaultEnd;

    const [title,          setTitle]          = useState(isEdit ? existingEvent.title       : (prefill?.title       ?? ''));
    const [startDate,      setStartDate]      = useState(toDateInput(srcStart));
    const [startTime,      setStartTime]      = useState(toTimeInput(srcStart));
    const [endDate,        setEndDate]        = useState(toDateInput(srcEnd));
    const [endTime,        setEndTime]        = useState(toTimeInput(srcEnd));
    const [location,       setLocation]       = useState(isEdit ? (existingEvent.location    || '') : (prefill?.location    ?? ''));
    const [description,    setDescription]    = useState(isEdit ? (existingEvent.description || '') : (prefill?.description ?? ''));
    const [assistantId,    setAssistantId]    = useState(isEdit ? (existingEvent.assistantId || '') : '');
    const [reminderAmount, setReminderAmount] = useState(isEdit ? (existingEvent.reminder?.amount ?? 15) : (prefill?.reminderAmount ?? 15));
    const [reminderUnit,   setReminderUnit]   = useState(isEdit ? (existingEvent.reminder?.unit   ?? 'minutes') : (prefill?.reminderUnit ?? 'minutes'));
    const [color,          setColor]          = useState(isEdit ? (existingEvent.color || '#3b82f6') : '#3b82f6');
    const [error,          setError]          = useState('');
    const [loading,        setLoading]        = useState(false);
    const [confirmDelete,  setConfirmDelete]  = useState(false);
    const [deleting,       setDeleting]       = useState(false);

    async function handleSave() {
        const trimmedTitle = title.trim();
        const startDT = combine(startDate, startTime);
        const endDT   = combine(endDate,   endTime);

        if (!trimmedTitle)    { setError('Title is required.');                 return; }
        if (isNaN(startDT))   { setError('Start date/time is invalid.');        return; }
        if (isNaN(endDT))     { setError('End date/time is invalid.');          return; }
        if (endDT <= startDT) { setError('End time must be after start time.'); return; }
        if (reminderAmount !== '' && Number(reminderAmount) <= 0) {
            setError('Reminder must be a positive number.'); return;
        }

        setLoading(true);
        setError('');

        const reminder = reminderAmount ? { amount: Number(reminderAmount), unit: reminderUnit } : null;

        // notificationTime = start − reminder offset; generationTime = 2 min before that.
        // The scheduler (useReminderScheduler) prepares audio at generationTime and fires
        // the reminder at notificationTime — we do NOT generate audio here.
        const notificationTime = computeNotificationTime(startDT, reminder);
        const generationTime   = notificationTime ? subMinutes(notificationTime, 2) : null;

        // Only reset the audio pipeline (burning a fresh Gemini script + TTS call) when
        // a field that actually affects the spoken reminder changed. A no-op re-save,
        // or an edit to something audio-independent (color), should keep the existing
        // script/audio instead of regenerating it for nothing.
        const audioRelevantChanged = !isEdit || (
            trimmedTitle             !== existingEvent.title ||
            startDT.getTime()        !== existingEvent.start.getTime() ||
            location.trim()          !== (existingEvent.location    || '') ||
            description.trim()       !== (existingEvent.description || '') ||
            (assistantId || null)    !== (existingEvent.assistantId || null) ||
            JSON.stringify(reminder) !== JSON.stringify(existingEvent.reminder || null)
        );

        const data = {
            title:       trimmedTitle,
            start:       Timestamp.fromDate(startDT),
            end:         Timestamp.fromDate(endDT),
            location:    location.trim(),
            description: description.trim(),
            assistantId: assistantId || null,
            reminder,
            color,

            notificationTime: notificationTime ? Timestamp.fromDate(notificationTime) : null,
            generationTime:   generationTime   ? Timestamp.fromDate(generationTime)   : null,

            updatedAt: serverTimestamp(),
        };

        if (audioRelevantChanged) {
            data.audioStatus = 'pending';
            data.script      = null;
            data.audioUrl    = null;
        }

        try {
            if (isEdit) {
                await updateDoc(doc(db, 'users', user.uid, 'events', existingEvent.id), data);
            } else {
                await addDoc(collection(db, 'users', user.uid, 'events'), { ...data, createdAt: serverTimestamp() });
            }
            onClose();
        } catch (err) {
            console.error('Failed to save event:', err);
            setError('Failed to save. Please try again.');
            setLoading(false);
        }
    }

    // Deleting the Firestore doc is enough here — a Firestore trigger
    // (cleanupEventAudio in functions/index.js) handles removing any generated
    // audio file for this event from Storage, so it doesn't get orphaned.
    async function handleDelete() {
        setDeleting(true);
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'events', existingEvent.id));
            onClose();
        } catch (err) {
            console.error('Failed to delete event:', err);
            setError('Failed to delete. Please try again.');
            setDeleting(false);
            setConfirmDelete(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[480px] p-5 relative" onClick={(e) => e.stopPropagation()}>

                {/* Close */}
                <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                    <XIcon />
                </button>

                {/* Title */}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add title"
                    autoFocus={!isEdit}
                    className="w-full pr-8 text-[22px] font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 outline-none border-b-2 border-gray-100 dark:border-gray-700 focus:border-blue-400 pb-3 mb-2 transition-colors bg-transparent"
                />

                {/* Date / time */}
                <FieldRow icon={<ClockIcon />}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={dateInput} />
                        <TimePicker value={startTime} onChange={setStartTime} />
                        <span className="text-gray-400 text-sm">→</span>
                        <TimePicker value={endTime} onChange={setEndTime} />
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={dateInput} />
                    </div>
                </FieldRow>

                {/* Location */}
                <FieldRow icon={<PinIcon />}>
                    <LocationInput value={location} onChange={setLocation} />
                </FieldRow>

                {/* Description */}
                <FieldRow icon={<NoteIcon />}>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add description"
                        rows={2}
                        className="w-full text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 outline-none bg-transparent resize-none"
                    />
                </FieldRow>

                {/* Color */}
                <FieldRow icon={<div className="w-4 h-4 rounded-full border-2 border-white ring-1 ring-gray-300 mt-0.5 shrink-0" style={{ backgroundColor: color }} />}>
                    <div className="flex gap-2 flex-wrap">
                        {EVENT_COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-gray-500 scale-110' : ''}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>
                </FieldRow>

                {/* Assistant */}
                <FieldRow icon={<UserIcon />}>
                    <select value={assistantId} onChange={(e) => setAssistantId(e.target.value)} className={selectCls}>
                        <option value="">Default Ring</option>
                        {assistants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </FieldRow>

                {/* Reminder */}
                <FieldRow icon={<BellIcon />}>
                    <div className="flex items-center gap-2">
                        <input
                            type="number" min="1"
                            value={reminderAmount}
                            onChange={(e) => setReminderAmount(e.target.value)}
                            className={`w-16 ${dateInput}`}
                        />
                        <select value={reminderUnit} onChange={(e) => setReminderUnit(e.target.value)} className={`flex-1 ${selectCls}`}>
                            {REMINDER_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <span className="text-sm text-gray-400 whitespace-nowrap">before</span>
                    </div>
                </FieldRow>

                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

                <div className="flex items-center justify-between mt-4">
                    {isEdit ? (
                        <button
                            onClick={() => (confirmDelete ? handleDelete() : setConfirmDelete(true))}
                            disabled={deleting}
                            className={`text-sm font-medium px-3 py-2 rounded-xl cursor-pointer transition-colors disabled:opacity-60 ${
                                confirmDelete
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                        >
                            {deleting ? 'Deleting…' : confirmDelete ? 'Sure?' : 'Delete'}
                        </button>
                    ) : <span />}

                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-5 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-sm hover:shadow-md rounded-xl disabled:opacity-60 cursor-pointer transition-all"
                        >
                            {loading ? 'Saving…' : isEdit ? 'Update event' : 'Save event'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
