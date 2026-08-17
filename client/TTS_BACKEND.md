# Gemini Backend (functions/index.js)

The frontend never calls Gemini directly — a key embedded in a Vite build is exposed
to every user. Both AI-generation steps go through Cloud Functions instead, which
hold the Gemini key as a server secret (`firebase functions:secrets:set GEMINI_API_KEY`)
and call the REST API directly (`fetch`, no SDK dependency).

Both endpoints require a valid Firebase Auth ID token (`Authorization: Bearer <token>`)
and are rate-limited per user (30 combined calls/hour, see `checkRateLimit` in
`functions/index.js`) before any Gemini call is made. CORS is restricted to the
app's actual origins (see `ALLOWED_ORIGINS`) — not a real access-control boundary on
its own (a non-browser client can ignore it), but the auth check is.

## `generateScript` — the spoken reminder text

`src/generateScript.js` builds the system/user prompt client-side (role/emotion
character direction — see `ROLE_HINT`/`EMOTION_HINT`) and POSTs:

```json
{ "system": "...", "prompt": "...", "model": "gemini-flash-lite-latest" }
```
→ `{ "script": "..." }`

Uses `gemini-flash-lite-latest`, not the "-latest" reasoning model — the reasoning
model burns 350+ invisible "thinking" tokens on a one-sentence task for no quality
gain (verified head-to-head); the lite model is ~3x cheaper and faster with the same
or better in-character output.

## `tts` — turning that text into audio

`src/services/tts.js` POSTs:

```json
{
  "text": "the script from generateScript",
  "voiceName": "Kore",
  "stylePrompt": "Read this reminder as a Friendly Reminder in a warm tone:",
  "model": "gemini-3.1-flash-tts-preview",
  "assistantId": "abc123",
  "eventId": "evt456"
}
```

The function calls Gemini in `AUDIO` response-modality mode, wraps the returned PCM
in a WAV header, clears any previous audio for that event (`tts/{eventId}/*`) so
regeneration doesn't leave old files orphaned, uploads the new one to Firebase
Storage with a download token, and responds:

```json
{ "audioUrl": "https://firebasestorage.googleapis.com/v0/b/.../evt456.wav?..." }
```

That token grants read access on its own, so this works even with deny-all
`storage.rules`.

## Failure handling

Product rule: a reminder must never be blocked by AI. If either endpoint is
unreachable, misconfigured, or fails, the client falls back to the default ring —
see `useReminderScheduler.js`.

## Cleanup

`cleanupEventAudio` (a Firestore `onDocumentDeleted` trigger, also in
`functions/index.js`) clears an event's Storage audio automatically whenever its
Firestore document is deleted, regardless of what deleted it.

## Deploy notes
- `firebase functions:secrets:set GEMINI_API_KEY` (requires the Blaze plan)
- `firebase deploy --only functions`
- Set `VITE_TTS_ENDPOINT` / `VITE_SCRIPT_ENDPOINT` in `client/.env` to the deployed function URLs
