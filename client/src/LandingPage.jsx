// Public marketing homepage. This is what a signed-out visitor (or a crawler —
// including Google's OAuth homepage-purpose check) sees at "/"; LoginPage.jsx is
// now a lightweight second step reached via the "Get Started" CTA here, not the
// first thing anyone sees. Real, visible copy explaining the app lives here so
// LoginPage doesn't need to carry that burden anymore — see App.jsx for the
// landing/login switch.

const FEATURES = [
    {
        icon: <IconBot />,
        title: 'Custom AI assistants',
        body: "Give any event its own assistant — a name, a role (Drill Sergeant, Pirate Captain, Wise Mentor, and 30+ others), an emotion, and a voice.",
    },
    {
        icon: <IconSpeaker />,
        title: 'Real spoken reminders',
        body: "Gemini writes a short, in-character line for that specific event and speaks it out loud right before it's due — not a generic ping.",
    },
    {
        icon: <IconCalendar />,
        title: 'Google Calendar import',
        body: 'Already living in Google Calendar? Bring your existing events in automatically — read-only, one click, no manual re-entry.',
    },
];

const VOICES = [
    {
        name: 'Captain Blackwave',
        role: 'Pirate Captain',
        emotion: 'Dramatic',
        color: 'bg-purple-500',
        file: '/voice-samples/pirate-captain.wav',
        quote: '"Heed my words, matey! The hour of battle is upon us at the Riverside courts, so hoist your racket and ready your blade for a fierce singles duel! Show no mercy!"',
    },
    {
        name: 'Sergeant Rex',
        role: 'Drill Sergeant',
        emotion: 'Urgent',
        color: 'bg-red-500',
        file: '/voice-samples/drill-sergeant.wav',
        quote: '"Move, move, move! You are stepping onto the Riverside Tennis Courts in sixty seconds flat for your singles match! Grab your racket, hydrate, and bring your A-game right now, soldier!"',
    },
    {
        name: 'Merlyn',
        role: 'Wizard',
        emotion: 'Mysterious',
        color: 'bg-indigo-500',
        file: '/voice-samples/wizard.wav',
        quote: '"The stars align upon the Riverside courts. Fetch thy racket and the crystal waters, seeker; the hour of competition is now at hand."',
    },
    {
        name: 'Ace',
        role: 'Sports Commentator',
        emotion: 'Energetic',
        color: 'bg-orange-500',
        file: '/voice-samples/sports-commentator.wav',
        quote: '"We are one minute out at the Riverside Tennis Courts, folks! Grab that racket and bring the heat, because this friendly singles match is about to serve off right now!"',
    },
];

function IconBot() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="18" height="11" rx="2"/><circle cx="8.5" cy="14.5" r="1.5"/><circle cx="15.5" cy="14.5" r="1.5"/><path d="M12 9V5"/><circle cx="12" cy="3.5" r="1.5"/><path d="M3 13H1M23 13h-2"/></svg>;
}
function IconSpeaker() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>;
}
function IconCalendar() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>;
}
function IconGoogle() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75z"/></svg>;
}

export default function LandingPage({ onGetStarted }) {
    return (
        <div className="min-h-screen bg-white">
            {/* Nav */}
            <nav className="flex items-center justify-between max-w-5xl mx-auto px-6 py-5">
                <div className="flex items-center gap-2.5">
                    <img src="/remindly-icon.png" alt="" className="w-8 h-8 rounded-lg object-contain" />
                    <span className="text-lg font-bold text-gray-900">Remindly</span>
                </div>
                <button
                    onClick={onGetStarted}
                    className="text-sm font-semibold text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-xl px-4 py-2 cursor-pointer transition-colors"
                >
                    Sign in
                </button>
            </nav>

            {/* Hero */}
            <header className="max-w-3xl mx-auto px-6 pt-10 pb-16 text-center">
                <img src="/remindly-logo.png" alt="Remindly" className="w-auto h-32 mx-auto mb-6" />
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                    Reminders that actually sound like someone
                </h1>
                <p className="text-lg text-gray-500 leading-relaxed mb-8">
                    Remindly is a voice-assisted calendar app. Create events, assign each one a
                    custom AI assistant with its own personality and voice, and get spoken
                    reminders when they're due. Optionally import your existing Google Calendar
                    to bring your events in automatically.
                </p>
                <button
                    onClick={onGetStarted}
                    className="inline-flex items-center justify-center gap-2.5 bg-gray-50 hover:bg-sky-50 text-gray-700 border-2 border-blue-100 hover:border-sky-300 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 ease-linear text-lg font-semibold rounded-xl py-3.5 px-8 cursor-pointer"
                >
                    <IconGoogle />
                    Get started with Google
                </button>
            </header>

            {/* Features */}
            <section className="max-w-5xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-6">
                {FEATURES.map((f) => (
                    <div key={f.title} className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                            {f.icon}
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1.5">{f.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
                    </div>
                ))}
            </section>

            {/* See it in action */}
            <section className="max-w-5xl mx-auto px-6 py-14">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">See it in action</h2>
                    <p className="text-gray-500">Two real, unedited clips of the actual app.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-8">
                    <div>
                        <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <img src="/demos/demo-create-assistant.gif" alt="Creating a new assistant persona in Remindly" className="w-full h-auto block" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-600 text-center">Creating an assistant</p>
                    </div>
                    <div>
                        <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <img src="/demos/demo-create-event.gif" alt="Creating an event and assigning an assistant in Remindly" className="w-full h-auto block" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-600 text-center">Creating an event and assigning it a voice</p>
                    </div>
                </div>
            </section>

            {/* Meet the voices */}
            <section className="max-w-5xl mx-auto px-6 py-14">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Meet a few voices</h2>
                    <p className="text-gray-500">Real audio, generated by Remindly's own Gemini pipeline for the same sample event.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                    {VOICES.map((v) => (
                        <div key={v.name} className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${v.color}`}>
                                    {v.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
                                    <p className="text-xs text-gray-400">{v.role} · {v.emotion}</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 italic leading-relaxed mb-3">{v.quote}</p>
                            <audio controls src={v.file} className="w-full h-9" />
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-3xl mx-auto px-6 py-16 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-3">Ready to try it?</h2>
                <p className="text-gray-500 mb-7">Sign in with Google — it takes about ten seconds.</p>
                <button
                    onClick={onGetStarted}
                    className="inline-flex items-center justify-center gap-2.5 bg-gray-50 hover:bg-sky-50 text-gray-700 border-2 border-blue-100 hover:border-sky-300 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 ease-linear text-lg font-semibold rounded-xl py-3.5 px-8 cursor-pointer"
                >
                    <IconGoogle />
                    Get started with Google
                </button>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
                <a href="/privacy.html" className="hover:text-gray-600 hover:underline">Privacy Policy</a>
                <span className="mx-2">·</span>
                <a href="/terms.html" className="hover:text-gray-600 hover:underline">Terms of Service</a>
            </footer>
        </div>
    );
}
