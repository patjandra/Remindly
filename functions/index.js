/**
 * Remindly Cloud Functions.
 *
 * tts — Gemini text-to-speech for assistant reminders.
 *   The frontend (src/services/tts.js) POSTs { text, voiceName, stylePrompt,
 *   model, assistantId, eventId } here. This function calls Gemini server-side
 *   (the key is a server secret, never shipped to the browser), wraps the
 *   returned PCM as a WAV file, uploads it to Firebase Storage, and responds
 *   with a durable { audioUrl } that survives reloads.
 *
 * generateScript — Gemini text generation for the reminder script itself.
 *   The frontend (src/generateScript.js) POSTs { system, prompt, model } here.
 *   Both models now run through the same server-secreted Gemini key, so the
 *   whole reminder pipeline (script + voice) is one provider, one secret.
 *
 * Both endpoints are gated by a per-user rate limit (see checkRateLimit) before
 * any Gemini call is made, tracked in Firestore at rateLimits/{uid}.
 *
 * cleanupEventAudio — Firestore trigger. Whenever an event doc is deleted (from
 *   any client, any path — not just the EventModal delete button), removes that
 *   event's generated audio from Storage so it doesn't get orphaned.
 *
 * See client/TTS_BACKEND.md for the request/response contract.
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { randomUUID } = require("crypto");

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

// Gemini API key — a server secret. Set it once with:
//   firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Default TTS model. The frontend sends its own `model`; this is only a fallback.
const DEFAULT_MODEL = "gemini-2.5-flash-preview-tts";

// Default script-generation model. The frontend sends its own `model`; fallback only.
// gemini-flash-lite-latest, not gemini-flash-latest: this task (a 1-3 sentence
// persona script) doesn't need reasoning, and the "-latest" (non-lite) model spends
// 350-450+ tokens on invisible thinking before writing anything, tripling cost and
// latency for no quality gain — verified head-to-head, same prompts, same or better
// in-character output from the lite model, zero thinking tokens, ~3x faster.
const DEFAULT_SCRIPT_MODEL = "gemini-flash-lite-latest";

// Per-user Gemini rate limit — shared across tts + generateScript (both spend the
// same API key's quota). Generous for real usage (a handful of events, occasional
// edits) but bounds worst-case cost from a client bug, a stolen token, or scripted
// abuse. Fixed-window counter in Firestore, checked in a transaction so concurrent
// requests can't race past the limit.
const RATE_LIMIT_MAX    = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Allowed browser origins — restricts which sites' JS can call these endpoints at
// all (defense in depth; the real gate is still the Firebase auth token, since
// bearer tokens aren't auto-attached cross-origin the way cookies would be).
const ALLOWED_ORIGINS = [
    "https://remindly-web.web.app",
    "https://remindly-b4445.web.app",
    "https://remindly-b4445.firebaseapp.com",
    /^http:\/\/localhost:\d+$/,
];

// Real reminder scripts are a sentence or two (the prompt asks for "under 45
// words"). These caps are generous headroom, not a tight fit — they exist to stop
// someone using an authenticated session to run arbitrary-length text through your
// Gemini key rather than to constrain legitimate use.
const MAX_TEXT_LEN   = 1000; // tts: the text to speak
const MAX_STYLE_LEN  = 500;  // tts: stylePrompt
const MAX_VOICE_LEN  = 50;   // tts: voiceName
const MAX_PROMPT_LEN = 2000; // generateScript: event-details prompt
const MAX_SYSTEM_LEN = 1000; // generateScript: persona/system instruction

// Returns true if the request should proceed, false if the caller is over budget.
async function checkRateLimit(uid) {
    const ref = admin.firestore().collection("rateLimits").doc(uid);
    const now = Date.now();

    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? snap.data() : null;

        const windowStart   = data?.windowStart?.toMillis ? data.windowStart.toMillis() : 0;
        const windowExpired = now - windowStart > RATE_LIMIT_WINDOW_MS;
        const count          = windowExpired ? 1 : (data?.count || 0) + 1;

        if (!windowExpired && count > RATE_LIMIT_MAX) {
            return false;
        }

        tx.set(ref, {
            windowStart: windowExpired ? admin.firestore.Timestamp.fromMillis(now) : data.windowStart,
            count,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
    });
}

exports.tts = onRequest(
    // `invoker: "public"` allows unauthenticated calls from the browser. Without
    // it, gen-2 functions require auth and the CORS preflight is rejected by
    // Cloud Run before our handler (and `cors`) ever runs.
    { cors: ALLOWED_ORIGINS, invoker: "public", secrets: [GEMINI_API_KEY] },
    async (req, res) => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        // Require a valid Firebase Auth ID token. The function is publicly
        // invokable (so the CORS preflight reaches us), so we do app-level auth
        // here: only signed-in users may spend Gemini quota.
        const match = /^Bearer (.+)$/.exec(req.get("Authorization") || "");
        if (!match) {
            res.status(401).json({ error: "Missing auth token" });
            return;
        }
        let uid;
        try {
            uid = (await admin.auth().verifyIdToken(match[1])).uid;
        } catch (err) {
            logger.warn("Invalid auth token", err);
            res.status(401).json({ error: "Invalid auth token" });
            return;
        }

        if (!(await checkRateLimit(uid))) {
            res.status(429).json({ error: "Rate limit exceeded — try again later" });
            return;
        }

        const { text, voiceName, stylePrompt, model, eventId } = req.body || {};
        if (!text || typeof text !== "string") {
            res.status(400).json({ error: "Missing 'text'" });
            return;
        }
        if (text.length > MAX_TEXT_LEN
            || (stylePrompt && stylePrompt.length > MAX_STYLE_LEN)
            || (voiceName && voiceName.length > MAX_VOICE_LEN)) {
            res.status(400).json({ error: "Input too long" });
            return;
        }

        try {
            // 1) Ask Gemini to speak the reminder. Returns base64 PCM (s16le).
            const { pcmBase64, sampleRate } = await synthesizeSpeech({
                text,
                voiceName,
                stylePrompt,
                model: model || DEFAULT_MODEL,
                apiKey: GEMINI_API_KEY.value().trim(),
            });

            // 2) Wrap raw PCM in a WAV header so browsers can play it.
            const pcm = Buffer.from(pcmBase64, "base64");
            const wav = pcmToWav(pcm, sampleRate);

            // 3) Upload to Storage with a download token → durable, playable URL.
            //    The token grants read access on its own, so this works even with
            //    deny-all storage.rules (no rules change needed).
            const audioUrl = await uploadAudio(wav, eventId);

            res.json({ audioUrl });
        } catch (err) {
            logger.error("TTS failed", err);
            res.status(500).json({ error: "TTS failed" });
        }
    },
);

exports.generateScript = onRequest(
    // Same public-invoker + app-level auth pattern as `tts` above.
    { cors: ALLOWED_ORIGINS, invoker: "public", secrets: [GEMINI_API_KEY] },
    async (req, res) => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        const match = /^Bearer (.+)$/.exec(req.get("Authorization") || "");
        if (!match) {
            res.status(401).json({ error: "Missing auth token" });
            return;
        }
        let uid;
        try {
            uid = (await admin.auth().verifyIdToken(match[1])).uid;
        } catch (err) {
            logger.warn("Invalid auth token", err);
            res.status(401).json({ error: "Invalid auth token" });
            return;
        }

        if (!(await checkRateLimit(uid))) {
            res.status(429).json({ error: "Rate limit exceeded — try again later" });
            return;
        }

        const { system, prompt, model } = req.body || {};
        if (!prompt || typeof prompt !== "string") {
            res.status(400).json({ error: "Missing 'prompt'" });
            return;
        }
        if (prompt.length > MAX_PROMPT_LEN || (system && system.length > MAX_SYSTEM_LEN)) {
            res.status(400).json({ error: "Input too long" });
            return;
        }

        try {
            const script = await synthesizeScript({
                system,
                prompt,
                model: model || DEFAULT_SCRIPT_MODEL,
                apiKey: GEMINI_API_KEY.value().trim(),
            });

            res.json({ script });
        } catch (err) {
            logger.error("Script generation failed", err);
            res.status(500).json({ error: "Script generation failed" });
        }
    },
);

// Calls Gemini generateContent in plain text mode and returns the trimmed script.
// `system` is optional and sent as a systemInstruction; `prompt` carries the event
// details (see client/src/generateScript.js for how these are built).
async function synthesizeScript({ system, prompt, model, apiKey }) {
    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        // gemini-flash-lite-latest doesn't do the invisible-thinking-token thing the
        // non-lite "-latest" model does (verified: 0 thought tokens across test
        // runs), so a real reminder script (observed 28-47 output tokens) fits well
        // inside this with room to spare — no need for the 1024 headroom the
        // thinking model required.
        generationConfig: { maxOutputTokens: 300 },
    };
    if (system) {
        body.systemInstruction = { parts: [{ text: system }] };
    }

    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const detail = await resp.text().catch(() => "");
        throw new Error(`Gemini API ${resp.status}: ${detail}`);
    }

    const data = await resp.json();
    const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text || "")
        .join("")
        .trim();
    if (!text) {
        throw new Error("Gemini returned no text");
    }

    return text;
}

// Calls Gemini generateContent in AUDIO mode and returns the base64 PCM + its
// sample rate (parsed from the response mimeType, e.g. "audio/L16;rate=24000").
async function synthesizeSpeech({ text, voiceName, stylePrompt, model, apiKey }) {
    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const prompt = stylePrompt ? `${stylePrompt}\n${text}` : text;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: voiceName
                ? { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
                : undefined,
        },
    };

    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const detail = await resp.text().catch(() => "");
        throw new Error(`Gemini API ${resp.status}: ${detail}`);
    }

    const data = await resp.json();
    const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    const inline = part?.inlineData;
    if (!inline?.data) {
        throw new Error("Gemini returned no audio");
    }

    const rateMatch = /rate=(\d+)/.exec(inline.mimeType || "");
    const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;

    return { pcmBase64: inline.data, sampleRate };
}

// Uploads a WAV buffer to the default Storage bucket and returns a durable
// Firebase download URL (token-based, bypasses Security Rules).
async function uploadAudio(wavBuffer, eventId) {
    const bucket = admin.storage().bucket();

    // Clear any previous audio for this event before uploading the new one — audio is
    // regenerated whenever an event's script-relevant fields change (see EventModal),
    // and the old file would otherwise sit in Storage forever, orphaned and unbilled-
    // for-cleanup. Not fatal if this fails; a stale file left behind is better than
    // blocking the reminder over it.
    if (eventId) {
        await bucket.deleteFiles({ prefix: `tts/${eventId}/` }).catch((err) => {
            logger.warn("Could not clear old TTS audio for event", eventId, err);
        });
    }

    const filePath = `tts/${eventId || "adhoc"}/${Date.now()}.wav`;
    const token = randomUUID();

    await bucket.file(filePath).save(wavBuffer, {
        resumable: false,
        metadata: {
            contentType: "audio/wav",
            metadata: { firebaseStorageDownloadTokens: token },
        },
    });

    return (
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
        `/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`
    );
}

// Wraps raw little-endian 16-bit PCM in a minimal WAV container (mono).
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
    const blockAlign = (channels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const header = Buffer.alloc(44);

    header.write("RIFF", 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);              // fmt chunk size
    header.writeUInt16LE(1, 20);               // audio format = PCM
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36);
    header.writeUInt32LE(pcm.length, 40);

    return Buffer.concat([header, pcm]);
}

// Fires on any deletion of users/{userId}/events/{eventId} — regardless of which
// client or code path deleted it — and clears that event's generated audio from
// Storage so deleting an event doesn't leave its .wav file behind forever.
exports.cleanupEventAudio = onDocumentDeleted(
    "users/{userId}/events/{eventId}",
    async (event) => {
        const { eventId } = event.params;
        try {
            await admin.storage().bucket().deleteFiles({ prefix: `tts/${eventId}/` });
        } catch (err) {
            logger.warn("Could not clean up audio for deleted event", eventId, err);
        }
    },
);

// Fires on any deletion of users/{userId}/assistants/{assistantId} and clears
// that assistant's uploaded profile photo (client/src/AssistantModal.jsx uploads
// to this exact single-object path — see storage.rules) so deleting an assistant
// doesn't leave its photo behind forever.
exports.cleanupAssistantPhoto = onDocumentDeleted(
    "users/{userId}/assistants/{assistantId}",
    async (event) => {
        const { userId, assistantId } = event.params;
        try {
            await admin.storage().bucket().file(`assistantPhotos/${userId}/${assistantId}`).delete({ ignoreNotFound: true });
        } catch (err) {
            logger.warn("Could not clean up photo for deleted assistant", assistantId, err);
        }
    },
);
