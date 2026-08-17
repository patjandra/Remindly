import { useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { generateScript } from '../generateScript';
import { generateGeminiTTS, pickVoiceName, buildStylePrompt } from '../services/tts';

// Client-side reminder scheduler. Script/audio generation runs through the backend
// Cloud Functions (see functions/index.js), but the scheduler itself is client-side
// polling — there's no server-side cron, so it only runs while the app is open.
//
// Each event moves through two phases:
//   1. Audio preparation  — at generationTime, build the assistant script + audio.
//   2. Notification        — at notificationTime, play the audio (or the default ring).
//
// Product rule: the reminder must never be delayed by AI. If the assistant audio is
// not ready when notificationTime arrives, we ring immediately and never play the
// late assistant audio afterward.

const TICK_MS  = 12000;        // how often we re-check events (10–15s)
const GRACE_MS = 60 * 1000;    // play a missed reminder only if it's <= 60s late

// Statuses where the reminder is fully done — nothing left to do. Note "failed" is
// NOT here: generation may have failed, but the user must still get a ring on time.
const DONE = ['played', 'fallbackPlayed', 'skipped'];

// Default ring fallback.
function playDefaultRing() {
    try {
        const audio = new Audio('/default-notif.mp3');
        audio.play().catch((e) =>
            console.warn('Default ring could not play (is /default-notif.mp3 present?)', e));
    } catch (e) {
        console.warn('Default ring unavailable:', e);
    }
}

export function useReminderScheduler({ user, events = [], assistants = [] }) {
    const processing = useRef(new Set()); // event ids currently generating (this session)
    const played     = useRef(new Set()); // event ids already fired (this session)
    const tickRef    = useRef(() => {});

    // updateDoc helper — always stamps updatedAt.
    function updateEvent(eventId, fields) {
        return updateDoc(doc(db, 'users', user.uid, 'events', eventId), {
            ...fields,
            updatedAt: serverTimestamp(),
        }).catch((err) => console.error('Reminder status update failed:', err));
    }

    // Audio preparation phase — only when an assistant is assigned.
    async function runGeneration(ev) {
        processing.current.add(ev.id);
        try {
            await updateEvent(ev.id, { audioStatus: 'generating' });

            const assistant = assistants.find((a) => a.id === ev.assistantId) || null;

            // 1) Script — real generation (Gemini text, via our backend).
            const script = await generateScript({ event: ev, assistant, reminder: ev.reminder });

            // 2) Audio — Gemini TTS via our backend. Returns null until the backend is
            //    wired up (or on failure), in which case the default ring plays.
            const audioUrl = script
                ? await generateGeminiTTS({
                    text:        script,
                    voiceName:   pickVoiceName(assistant),
                    stylePrompt: buildStylePrompt(assistant),
                    assistant,
                    event:       ev,
                })
                : null;

            // If notificationTime slipped past while generating, don't resurrect it —
            // the playback phase has already handled the fallback ring.
            if (Date.now() >= ev.notificationTime.getTime()) return;

            await updateEvent(ev.id, {
                script:      script ?? null,
                audioUrl:    audioUrl ?? null,
                audioStatus: 'ready',
            });
        } catch (err) {
            console.error('Reminder generation failed:', err);
            await updateEvent(ev.id, { audioStatus: 'failed' });
        } finally {
            processing.current.delete(ev.id);
        }
    }

    // Notification playback — play the Gemini-generated audio file.
    function playAssistantAudio(ev) {
        const audio = new Audio(ev.audioUrl);
        audio.play()
            .then(() => updateEvent(ev.id, { audioStatus: 'played' }))
            .catch((err) => {
                console.error('Assistant audio playback failed, using default ring:', err);
                playDefaultRing();
                updateEvent(ev.id, { audioStatus: 'fallbackPlayed' });
            });
    }

    function processEvent(ev, now) {
        // Skip events with no reminder configured.
        if (!ev.reminder || !ev.notificationTime) return;

        const status = ev.audioStatus || 'pending';
        if (DONE.includes(status)) return;

        const notifMs      = ev.notificationTime.getTime();
        const genMs        = ev.generationTime ? ev.generationTime.getTime() : notifMs;
        const hasAssistant = !!ev.assistantId;

        // ── Phase 1: prepare audio (and the "late create/edit" case) ──
        // Starts when we're inside [generationTime, notificationTime). If the user
        // created/edited the event after generationTime already passed, this fires on
        // the very next tick — i.e. generation begins immediately.
        if (hasAssistant && status === 'pending'
            && now >= genMs && now < notifMs
            && !processing.current.has(ev.id)) {
            runGeneration(ev);
        }

        // ── Phases 2–4: notification time has arrived ──
        if (now >= notifMs) {
            // Missed reminder: too old → give up.
            if (now - notifMs > GRACE_MS) {
                updateEvent(ev.id, { audioStatus: 'skipped' });
                return;
            }
            // Within grace window → fire exactly once.
            if (played.current.has(ev.id)) return;
            played.current.add(ev.id);

            if (status === 'ready' && ev.audioUrl) {
                playAssistantAudio(ev);   // Gemini-generated audio
            } else {
                // Not ready (still generating, generation/TTS failed, backend endpoint
                // unconfigured, or a Default Ring event) → ring now. Never wait on AI.
                playDefaultRing();
                updateEvent(ev.id, { audioStatus: 'fallbackPlayed' });
            }
        }
    }

    // Rebuilt every render so the interval always sees the latest user/events/assistants.
    tickRef.current = () => {
        if (!user?.uid) return;
        const now = Date.now();
        events.forEach((ev) => processEvent(ev, now));
    };

    // Run on an interval while the app is open.
    useEffect(() => {
        if (!user?.uid) return;
        tickRef.current();
        const id = setInterval(() => tickRef.current(), TICK_MS);
        return () => clearInterval(id);
    }, [user?.uid]);

    // Also react immediately when events change (handles just-created late reminders).
    useEffect(() => {
        if (user?.uid) tickRef.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events]);
}
