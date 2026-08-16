// Generates a short, spoken reminder script for an event based on the assigned
// assistant's persona (name / role / emotion) and the event details.
//
// The returned string is saved on the event document and later handed to Gemini
// TTS (see services/tts.js) to produce the audio that plays at notification time.
//
// Returns null when there is no assistant (Default Ring) — in that case the app
// should fall back to the default ring sound instead of speaking a script.
//
// SECURITY: This must NOT call Gemini directly — a key embedded in a Vite frontend
// is exposed to every user. Instead this calls OUR backend endpoint (the
// `generateScript` Cloud Function), which holds the Gemini key as a server secret —
// the same pattern and the same secret already used for TTS.

import { format } from 'date-fns';
import { auth } from '../firebase';

// Configuration (NOT secrets).
const SCRIPT_ENDPOINT = import.meta.env.VITE_SCRIPT_ENDPOINT;                 // our backend URL
const SCRIPT_MODEL    = import.meta.env.VITE_SCRIPT_MODEL || 'gemini-flash-lite-latest';

// How each role should actually behave, not just be labeled — without this, the
// model tends to just recite the event details in a neutral voice and call the
// role/emotion words decorative rather than something to act on.
const ROLE_HINT = {
    'Accountability Coach': 'push them to follow through, like a coach checking in on a commitment they made',
    'Motivational Speaker':  'hype them up like you are addressing a crowd — big energy, make the event sound worth showing up for',
    'Friendly Reminder':     'keep it warm and low-key, like a friend giving a quick heads-up',
    'Strict Manager':        'be no-nonsense and direct, like a boss who expects this handled, no excuses',
    'Casual Friend':         'keep it loose and conversational, like texting a buddy, not reading an announcement',
    'Drill Sergeant':        'bark it like a command — sharp, clipped, zero patience for lateness',
    'Wise Mentor':           'frame it with a small piece of perspective or wisdom, not just a fact',
    'Comedian':              'work in a light joke or playful line about the event, don’t just state it straight',
    'Therapist':             'gently check in on how they might be feeling about it, don’t just announce it',
    'Butler':                'be formal and impeccably polite, as if announcing it to someone you serve',
    'Personal Trainer':      'push them physically and mentally, like a trainer counting down to a set',
    'Pirate Captain':        'talk like a swashbuckling pirate captain — treat the event as part of the voyage',
    'News Anchor':           'deliver it like breaking news — formal, composed, matter-of-fact',
    'Fortune Teller':        'frame it like a mystical vision or prophecy of what is to come',
    'Secret Agent':          'treat it like a covert mission briefing — hushed, urgent, need-to-know',
};

// How each emotion should shape word choice and delivery, not just be a label.
const EMOTION_HINT = {
    Calm:        'unhurried and steady',
    Energetic:   'high-energy and enthusiastic',
    Encouraging: 'warm and supportive',
    Serious:     'grave and matter-of-fact',
    Playful:     'lighthearted and teasing',
    Urgent:      'fast-paced, like there is no time to waste',
    Sarcastic:   'dry and a little sardonic',
    Cheerful:    'bright and upbeat',
    Gentle:      'soft-spoken and reassuring',
    Anxious:     'a little nervous and fretting, like time is running out',
    Dramatic:    'over-the-top and theatrical, like this is a huge deal',
    Confident:   'bold and self-assured, no hesitation',
    Deadpan:     'flat and deadpan, delivered completely straight-faced',
    Whimsical:   'quirky and playful with the phrasing',
};

function buildSystemPrompt(assistant) {
    const roleHint    = ROLE_HINT[assistant.role]       || 'stay fully in character for this role';
    const emotionHint = EMOTION_HINT[assistant.emotion] || 'match this tone throughout';

    return [
        `You are ${assistant.name}, a personal reminder assistant playing the character of a "${assistant.role}" with a "${assistant.emotion}" tone.`,
        `Character direction: ${roleHint}. Deliver it in a way that is ${emotionHint}.`,
        `Do not just flatly state the event — react to it the way this specific character actually would. The event details below are what to react to, not a script to recite verbatim.`,
        `Write a short spoken reminder (1–3 sentences, under 45 words) that will be read aloud by a text-to-speech voice at notification time.`,
        `Speak directly to the user, in character, the whole way through.`,
        `Output ONLY the words to be spoken — no quotes, no stage directions, no labels, no emojis.`,
    ].join(' ');
}

function buildUserPrompt(event, reminder) {
    const lines = [
        `Event: ${event.title}`,
        `When: ${format(event.start, "EEEE, MMMM d, yyyy 'at' h:mm a")}`,
    ];
    if (event.location)    lines.push(`Location: ${event.location}`);
    if (event.description) lines.push(`Details: ${event.description}`);
    if (reminder)          lines.push(`This reminder is heard ${reminder.amount} ${reminder.unit} before the event starts.`);
    return lines.join('\n');
}

export async function generateScript({ event, assistant, reminder }) {
    // Default Ring → no script.
    if (!assistant) return null;

    if (!SCRIPT_ENDPOINT) {
        throw new Error('Missing VITE_SCRIPT_ENDPOINT — add it to your .env file.');
    }

    // The backend requires a Firebase Auth ID token, same as the TTS endpoint.
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
        throw new Error('No signed-in user — cannot request a script.');
    }

    const res = await fetch(SCRIPT_ENDPOINT, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            system: buildSystemPrompt(assistant),
            prompt: buildUserPrompt(event, reminder),
            model:  SCRIPT_MODEL,
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Script backend ${res.status}: ${detail}`);
    }

    const data = await res.json();
    return data.script || null;
}
