import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDocs, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, provider } from '../firebase';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, addHours, addMinutes } from 'date-fns';
import MainCalendar from './MainCalendar';
import AgendaView from './AgendaView';
import MiniCalendar from './MiniCalendar';
import AssistantModal from './AssistantModal';
import EventModal from './EventModal';
import { useReminderScheduler } from './hooks/useReminderScheduler';
import { colorForKey } from './eventColors';

const VIEWS = [
    { key: 'month',  label: 'Month'  },
    { key: 'week',   label: 'Week'   },
    { key: 'day',    label: 'Day'    },
    { key: 'agenda', label: 'Agenda' },
];
const VIEW_KEYS = VIEWS.map((v) => v.key);

const AVATAR_COLORS = [
    'bg-orange-500', 'bg-blue-400', 'bg-green-500',
    'bg-purple-500', 'bg-rose-500', 'bg-amber-500',
    'bg-teal-500',   'bg-pink-500',
];

/* ── Icons ── */
const I = (d) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;

function IconMenu()         { return <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>; }
function IconLogout()       { return <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function IconChevronLeft()  { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>; }
function IconChevronRight() { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }
function IconTrash()        { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function IconSun()          { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; }
function IconMoon()         { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>; }
function IconGoogle()       { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75z"/></svg>; }

export default function CalendarPage({ user, onLogout }) {
    const [sideBarOpen,     setSideBarOpen]     = useState(true);
    const [modalOpen,       setModalOpen]       = useState(false);
    const [editAssistant,   setEditAssistant]   = useState(null);
    const [confirmLogout,   setConfirmLogout]   = useState(false);
    const [calDate,         setCalDate]         = useState(new Date());
    // Persist the selected view (month/week/day/agenda) across reloads — only the
    // date position resets to today, matching how most calendar apps behave.
    const [calView,         setCalView]         = useState(() => {
        const saved = localStorage.getItem('remindly-cal-view');
        return VIEW_KEYS.includes(saved) ? saved : 'month';
    });
    const [assistants,      setAssistants]      = useState([]);
    const [events,          setEvents]          = useState([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [eventSlot,       setEventSlot]       = useState(null);
    const [editEvent,       setEditEvent]       = useState(null);
    const [darkMode,        setDarkMode]        = useState(() => localStorage.getItem('remindly-dark') === 'true');
    const [importing,       setImporting]       = useState(false);
    const [importMsg,       setImportMsg]       = useState(null);
    const [showImportPrompt, setShowImportPrompt] = useState(false);

    const calWrapperRef = useRef(null);

    useEffect(() => { localStorage.setItem('remindly-dark', darkMode); }, [darkMode]);
    useEffect(() => { localStorage.setItem('remindly-cal-view', calView); }, [calView]);

    // On first login, ask whether to import their Google Calendar (only once per user).
    useEffect(() => {
        if (!user?.uid) return;
        if (!localStorage.getItem(`remindly-gcal-prompted-${user.uid}`)) {
            setShowImportPrompt(true);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) { setAssistants([]); return; }
        const q = query(collection(db, 'users', user.uid, 'assistants'), orderBy('createdAt', 'asc'));
        const u = onSnapshot(q, s => setAssistants(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => u();
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) { setEvents([]); return; }
        const q = query(collection(db, 'users', user.uid, 'events'), orderBy('start', 'asc'));
        const u = onSnapshot(q, s => setEvents(s.docs.map(d => {
            const data = d.data();
            return {
                id: d.id, ...data,
                start:            data.start?.toDate()            ?? new Date(),
                end:              data.end?.toDate()              ?? new Date(),
                notificationTime: data.notificationTime?.toDate() ?? null,
                generationTime:   data.generationTime?.toDate()   ?? null,
            };
        })));
        return () => u();
    }, [user?.uid]);

    // Client-side reminder scheduler — prepares assistant audio and fires reminders
    // while the app is open. See src/hooks/useReminderScheduler.js.
    useReminderScheduler({ user, events, assistants });

    function animateCal(cls) {
        const el = calWrapperRef.current;
        if (!el) return;
        el.classList.remove('cal-slide-from-left', 'cal-slide-from-right', 'cal-fade-in');
        void el.offsetWidth;
        el.classList.add(cls);
    }
    function navigate(dir) {
        const fns = { month: [subMonths, addMonths], week: [subWeeks, addWeeks], day: [subDays, addDays], agenda: [subMonths, addMonths] };
        const [prev, next] = fns[calView] ?? fns.month;
        setCalDate(d => dir === 'prev' ? prev(d, 1) : next(d, 1));
        animateCal(dir === 'prev' ? 'cal-slide-from-right' : 'cal-slide-from-left');
    }
    function goToday()     { setCalDate(new Date()); animateCal('cal-fade-in'); }
    function changeView(v) { setCalView(v); animateCal('cal-fade-in'); }
    function openNewEvent(){ const now = new Date(); setEventSlot({ start: now, end: addHours(now, 1) }); }

    // Opens the normal event modal pre-filled with an example event, firing in ~2
    // minutes — meant to test a specific assistant, so the assistant picker is left
    // for the user to choose rather than auto-assigned. Saving it goes through the
    // exact same path as any other event (EventModal's handleSave).
    function createExampleEvent() {
        const start = addMinutes(new Date(), 3);
        setEventSlot({
            start,
            end: addHours(start, 1),
            prefill: {
                title:       'Tennis Match [Example]',
                location:    'Riverside Tennis Courts',
                description: 'Friendly singles match — bring a racket, water, and your A-game.',
                reminderAmount: 1,
                reminderUnit:   'minutes',
            },
        });
    }

    /* ── Google Calendar import ──
       The OAuth access token is captured at login (LoginPage). If it's missing or
       expired, we re-run the popup to get a fresh one — Google won't re-prompt for
       consent since the calendar scope was already granted. */
    async function getAccessToken() {
        let token = sessionStorage.getItem('remindly-gcal-token');
        if (token) return token;
        const result = await signInWithPopup(auth, provider);
        token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
        if (token) sessionStorage.setItem('remindly-gcal-token', token);
        return token;
    }

    async function importGoogleEvents() {
        if (importing) return;
        setImporting(true);
        setImportMsg(null);
        try {
            const fetchEvents = (tok) => {
                const timeMin = subMonths(new Date(), 1).toISOString();
                const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`
                    + `?timeMin=${encodeURIComponent(timeMin)}&maxResults=250&singleEvents=true&orderBy=startTime`;
                return fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
            };

            let token = await getAccessToken();
            let res   = await fetchEvents(token);

            // Token expired — clear it, get a fresh one via popup, and retry once.
            if (res.status === 401) {
                sessionStorage.removeItem('remindly-gcal-token');
                token = await getAccessToken();
                res   = await fetchEvents(token);
            }
            if (!res.ok) throw new Error(`Google Calendar API returned ${res.status}`);

            const items = (await res.json()).items || [];

            // Skip events we've already imported (matched on googleId).
            const existing = await getDocs(collection(db, 'users', user.uid, 'events'));
            const seen     = new Set(existing.docs.map(d => d.data().googleId).filter(Boolean));

            let added = 0;
            for (const ev of items) {
                if (ev.status === 'cancelled' || seen.has(ev.id)) continue;

                // All-day events use start.date; timed events use start.dateTime.
                const startStr = ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T00:00:00` : null);
                const endStr   = ev.end?.dateTime   || (ev.end?.date   ? `${ev.end.date}T00:00:00`   : null);
                if (!startStr) continue;

                const start = new Date(startStr);
                const end   = endStr ? new Date(endStr) : addHours(start, 1);

                await addDoc(collection(db, 'users', user.uid, 'events'), {
                    title:       ev.summary || '(no title)',
                    start:       Timestamp.fromDate(start),
                    end:         Timestamp.fromDate(end),
                    location:    ev.location || '',
                    description: ev.description || '',
                    assistantId: null,
                    reminder:    null,
                    // Colored by title, not a flat default — so a busy imported month
                    // reads as organized (recurring events share a color) instead of a
                    // wall of identical blue pills.
                    color:       colorForKey(ev.summary || ev.id),
                    googleId:    ev.id,
                    createdAt:   serverTimestamp(),
                });
                added++;
            }

            setImportMsg(added > 0
                ? `Imported ${added} event${added === 1 ? '' : 's'} from Google Calendar.`
                : 'You\'re all caught up — no new events to import.');
        } catch (err) {
            console.error('Google Calendar import failed:', err);
            setImportMsg('Could not import. Please try signing in again.');
        } finally {
            setImporting(false);
        }
    }

    // Mark this user as prompted so we don't ask again on future logins.
    function markImportPrompted() {
        if (user?.uid) localStorage.setItem(`remindly-gcal-prompted-${user.uid}`, 'true');
    }
    function declineImport() {
        markImportPrompted();
        setShowImportPrompt(false);
    }
    async function acceptImport() {
        markImportPrompted();
        await importGoogleEvents();
        // Keep the dialog open to show the result; the user closes it with "Done".
    }

    const iconBtn = 'p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer transition-colors';

    /* ── Sidebar content (shared between full and mini) ── */
    const assistantList = assistants.map((a, i) => (
        <li key={a.id} className="rounded-xl overflow-hidden">
            {confirmDeleteId === a.id ? (
                <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">Delete "{a.name}"?</span>
                    <div className="flex gap-1.5">
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">No</button>
                        <button onClick={() => { deleteDoc(doc(db, 'users', user.uid, 'assistants', a.id)); setConfirmDeleteId(null); }} className="text-xs px-2 py-0.5 rounded-md bg-red-500 text-white hover:bg-red-600 cursor-pointer transition-colors">Yes</button>
                    </div>
                </div>
            ) : (
                <div className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer" onClick={() => setEditAssistant(a)}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{a.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-400 truncate">{a.role} · {a.emotion}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(a.id); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all duration-150 cursor-pointer pointer-events-none group-hover:pointer-events-auto shrink-0">
                        <IconTrash />
                    </button>
                </div>
            )}
        </li>
    ));

    /* ── Full sidebar ── */
    const FullSidebar = (
        <div className="w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full bg-white dark:bg-gray-900 shrink-0">
            {/* Brand + collapse */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                    <img src={darkMode ? '/remindly-icon-dark.png' : '/remindly-icon.png'} alt="" className="w-9 h-9 rounded-xl object-contain pointer-events-none shrink-0" />
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Remindly</span>
                </div>
                <button onClick={() => setSideBarOpen(false)} className={`${iconBtn} shrink-0`} title="Collapse sidebar">
                    <IconMenu />
                </button>
            </div>

            {/* Mini calendar */}
            <div className="px-2 shrink-0">
                <MiniCalendar selectedDate={calDate} onDateSelect={setCalDate} />
            </div>

            {/* Create Assistant */}
            <div className="px-3 pb-4 shrink-0">
                <button onClick={() => setModalOpen(true)}
                    className="w-full bg-blue-500 hover:bg-blue-600 shadow-sm hover:shadow-md text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all text-sm">
                    <span className="text-lg leading-none">+</span> Create Assistant
                </button>
                <button onClick={createExampleEvent}
                    className="w-full mt-2 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium py-2 rounded-2xl cursor-pointer transition-colors text-xs">
                    🎾 Create example event
                </button>
            </div>

            {/* Assistant list */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
                {assistants.length > 0 && (
                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-2 px-2">
                        My Assistants
                    </p>
                )}
                <ul className="space-y-0.5">{assistantList}</ul>
            </div>
        </div>
    );

    /* ── Mini strip (collapsed) ── */
    const MiniStrip = (
        <div className="w-16 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center pt-3 gap-3 bg-white dark:bg-gray-900 shrink-0 overflow-y-auto pb-4 h-full">
            <button onClick={() => setSideBarOpen(true)} className={`w-9 h-9 flex items-center justify-center rounded-lg ${iconBtn}`} title="Expand sidebar">
                <IconMenu />
            </button>
            {/* Icon, same size as avatar circles */}
            <img src={darkMode ? '/remindly-icon-dark.png' : '/remindly-icon.png'} alt="Remindly" className="w-10 h-10 object-contain pointer-events-none shrink-0 rounded-xl" />
            <button onClick={() => setModalOpen(true)} title="Create Assistant"
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 shadow-sm hover:shadow-md rounded-xl flex items-center justify-center text-white text-2xl font-light cursor-pointer transition-all shrink-0">
                +
            </button>
            {assistants.map((a, i) => (
                <button key={a.id} onClick={() => setEditAssistant(a)} title={a.name}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {a.name.charAt(0).toUpperCase()}
                </button>
            ))}
        </div>
    );

    return (
        /* Outer: horizontal — sidebar left, right column fills the rest */
        <div className={`flex w-screen h-screen ${darkMode ? 'dark' : ''}`}>

            {sideBarOpen ? FullSidebar : MiniStrip}

            {/* ── Right column: top nav + calendar ── */}
            <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-gray-900">

                {/* Top nav (sits only above the calendar) */}
                <div className="flex items-center h-14 px-5 border-b border-gray-200 dark:border-gray-700 gap-2 shrink-0">
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100 mr-1">
                        {format(calDate, 'MMMM yyyy')}
                    </span>

                    <button onClick={() => navigate('prev')} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer transition-colors">
                        <IconChevronLeft />
                    </button>
                    <button onClick={goToday} className="px-3.5 py-1 border border-gray-300 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                        Today
                    </button>
                    <button onClick={() => navigate('next')} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer transition-colors">
                        <IconChevronRight />
                    </button>

                    <div className="flex-1" />

                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden text-sm">
                        {VIEWS.map(({ key, label }, i) => (
                            <button key={key} onClick={() => changeView(key)}
                                className={`px-4 py-1.5 font-medium transition-colors cursor-pointer ${i > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''} ${calView === key ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <button onClick={openNewEvent} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 shadow-sm hover:shadow-md text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer transition-all">
                        <span className="text-base leading-none">+</span> New event
                    </button>

                    <button onClick={() => setDarkMode(d => !d)} className={iconBtn} title={darkMode ? 'Light mode' : 'Dark mode'}>
                        {darkMode ? <IconSun /> : <IconMoon />}
                    </button>

                    <button onClick={() => setConfirmLogout(true)} className={`${iconBtn} ml-3`} title="Log out">
                        <IconLogout />
                    </button>
                </div>

                {/* Calendar */}
                <div ref={calWrapperRef} className="flex-1 overflow-hidden p-4">
                    {calView === 'agenda' ? (
                        <AgendaView events={events} date={calDate} onEventClick={setEditEvent} />
                    ) : (
                        <MainCalendar
                            date={calDate}
                            onNavigate={setCalDate}
                            view={calView}
                            onView={setCalView}
                            events={events}
                            onDateClick={(start, end) => setEventSlot({ start, end })}
                            onEventClick={(event) => setEditEvent(event)}
                        />
                    )}
                </div>
            </div>

            {/* ── Modals ── */}
            {modalOpen     && <AssistantModal user={user} onClose={() => setModalOpen(false)} />}
            {editAssistant && <AssistantModal user={user} assistant={editAssistant} onClose={() => setEditAssistant(null)} />}
            {eventSlot     && <EventModal user={user} assistants={assistants} start={eventSlot.start} end={eventSlot.end} prefill={eventSlot.prefill} onClose={() => setEventSlot(null)} />}
            {editEvent     && <EventModal user={user} assistants={assistants} event={editEvent} start={editEvent.start} end={editEvent.end} onClose={() => setEditEvent(null)} />}

            {/* ── First-login Google Calendar import prompt ── */}
            {showImportPrompt && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-96">
                        <div className="flex items-center gap-2.5 mb-2">
                            <IconGoogle />
                            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Import your Google Calendar?</h3>
                        </div>
                        {!importMsg ? (
                            <>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                    We can bring in your existing Google Calendar events so everything lives in one place.
                                </p>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={declineImport} disabled={importing}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors disabled:opacity-60">
                                        Not now
                                    </button>
                                    <button onClick={acceptImport} disabled={importing}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-sm hover:shadow-md rounded-xl cursor-pointer transition-all disabled:opacity-60">
                                        {importing ? 'Importing…' : 'Import'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{importMsg}</p>
                                <div className="flex justify-end">
                                    <button onClick={() => { setShowImportPrompt(false); setImportMsg(null); }}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-sm hover:shadow-md rounded-xl cursor-pointer transition-all">
                                        Done
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Logout confirmation ── */}
            {confirmLogout && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]" onClick={() => setConfirmLogout(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-80" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Log out of Remindly?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">You'll be signed out of your account.</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setConfirmLogout(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">Cancel</button>
                            <button onClick={onLogout} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer transition-colors">Log out</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
