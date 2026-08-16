// Gemini TTS — client-side service.
//
// SECURITY: This must NOT call the Gemini API directly. A Gemini key embedded in a
// Vite frontend is exposed to every user. Instead this calls OUR backend endpoint
// (a Firebase Cloud Function / server route) which holds the Gemini key as a server
// secret. The endpoint URL and model name are NOT secrets, so they're fine to expose.
//
// Product rule: never block a reminder. If the backend is unconfigured or fails,
// this returns null and the scheduler plays the default ring.
//
// The actual endpoint is the `tts` Cloud Function in functions/index.js — see its
// docblock for the request/response contract and TTS_BACKEND.md for an overview.

import { GEMINI_VOICE_NAMES, DEFAULT_GEMINI_VOICE } from '../geminiVoices';
import { auth } from '../../firebase';

// Configuration (NOT secrets).
const TTS_ENDPOINT = import.meta.env.VITE_TTS_ENDPOINT;                       // our backend URL
const TTS_MODEL    = import.meta.env.VITE_TTS_MODEL || 'gemini-3.1-flash-tts-preview';

// Map the assistant's emotion to a spoken tone + an optional Gemini audio tag.
const EMOTION_STYLE = {
    Calm:        { tone: 'a calm, soothing',        tag: ''            },
    Energetic:   { tone: 'an excited, high-energy', tag: '[excited] '  },
    Encouraging: { tone: 'a warm, encouraging',     tag: ''            },
    Serious:     { tone: 'a serious, firm',         tag: '[serious] '  },
    Playful:     { tone: 'a playful, lighthearted', tag: ''            },
    Urgent:      { tone: 'an urgent, fast-paced',   tag: '[urgent] '   },
    Sarcastic:   { tone: 'a dry, sarcastic',        tag: ''            },
    Cheerful:    { tone: 'a bright, cheerful',      tag: ''            },
    Gentle:      { tone: 'a gentle, soft-spoken',   tag: ''            },
    Anxious:     { tone: 'a nervous, fretful',      tag: ''            },
    Dramatic:    { tone: 'an over-the-top, theatrical', tag: '[dramatic] ' },
    Confident:   { tone: 'a bold, self-assured',    tag: ''            },
    Deadpan:     { tone: 'a flat, deadpan',         tag: ''            },
    Whimsical:   { tone: 'a whimsical, quirky',     tag: ''            },
};

// Sensible default voice per emotion when the assistant has no valid voiceId.
const EMOTION_VOICE = {
    Calm:        'Achernar',
    Energetic:   'Fenrir',
    Encouraging: 'Sulafat',
    Serious:     'Alnilam',
    Playful:     'Laomedeia',
    Urgent:      'Orus',
    Sarcastic:   'Algenib',
    Anxious:     'Enceladus',
    Dramatic:    'Gacrux',
    Confident:   'Pulcherrima',
    Deadpan:     'Iapetus',
    Whimsical:   'Aoede',
    Cheerful:    'Zephyr',
    Gentle:      'Vindemiatrix',
};

// Resolves the Gemini voice name for an assistant. assistant.voiceId now stores a
// Gemini voice name; fall back by emotion, then to the global default.
export function pickVoiceName(assistant) {
    if (assistant?.voiceId && GEMINI_VOICE_NAMES.includes(assistant.voiceId)) {
        return assistant.voiceId;
    }
    return EMOTION_VOICE[assistant?.emotion] || DEFAULT_GEMINI_VOICE;
}

// Builds the natural-language style instruction prepended to the script. Gemini TTS
// supports prompt-level control over tone/pace/emotion and audio tags like [excited].
export function buildStylePrompt(assistant) {
    const style = EMOTION_STYLE[assistant?.emotion] || { tone: 'a friendly', tag: '' };
    const role  = assistant?.role ? ` as ${assistant.role}` : '';
    return `${style.tag}Read this reminder${role} in ${style.tone} tone:`;
}

// Requests TTS audio from our backend. Returns a playable audio URL, or null if the
// backend is unconfigured/failed (caller falls back to the default ring).
export async function generateGeminiTTS({ text, voiceName, stylePrompt, assistant, event }) {
    if (!text) return null;

    if (!TTS_ENDPOINT) {
        console.warn('[Gemini TTS] VITE_TTS_ENDPOINT not set — backend not wired up yet; default ring will play.');
        return null;
    }

    try {
        // The backend requires a Firebase Auth ID token. No signed-in user →
        // skip TTS and let the scheduler play the default ring.
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
            console.warn('[Gemini TTS] No signed-in user — default ring will play.');
            return null;
        }

        const res = await fetch(TTS_ENDPOINT, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                text,
                voiceName,
                stylePrompt,
                model: TTS_MODEL,
                // Non-secret context the backend may use for logging/caching.
                assistantId: assistant?.id ?? null,
                eventId:     event?.id ?? null,
            }),
        });
        if (!res.ok) throw new Error(`TTS backend ${res.status}`);

        const data = await res.json();

        // Preferred: durable URL (e.g. Firebase Storage) — survives reloads.
        if (data.audioUrl) return data.audioUrl;

        // Fallback: base64 audio → session-only blob URL (won't survive a reload).
        if (data.audioBase64) {
            const blob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
            return URL.createObjectURL(blob);
        }
        return null;
    } catch (err) {
        console.error('[Gemini TTS] request failed:', err);
        return null; // never block the reminder
    }
}

function base64ToBlob(base64, mimeType) {
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
}
