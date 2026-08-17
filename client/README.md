# Remindly — client

React + Vite frontend for Remindly. See the [repo root README](../README.md) for
what the app does and how the whole system fits together; this file just covers
running and building this package.

## Commands

```bash
npm run dev       # Start the Vite dev server at localhost:5173
npm run build      # Production build (outputs to dist/)
npm run lint       # ESLint
npm run preview    # Preview the production build locally
npm test            # Run the Vitest unit test suite
```

## Environment variables

Create `client/.env` (gitignored) with:

```
VITE_SCRIPT_ENDPOINT=<generateScript Cloud Function URL>
VITE_SCRIPT_MODEL=gemini-flash-lite-latest
VITE_TTS_ENDPOINT=<tts Cloud Function URL>
VITE_TTS_MODEL=<gemini TTS model name>
```

None of these are secrets — the actual Gemini API key lives server-side only, in
`functions/index.js` via Firebase Secrets Manager. Firebase project config (API
key, project ID, etc.) is in `firebase.js` and is the standard public Firebase Web
config, not a bearer secret — real access control is enforced by
`firestore.rules` / `storage.rules`.

## Structure

See [`CLAUDE.md`](CLAUDE.md) for the full file-by-file breakdown, Firestore/Storage
schema, and the conventions this codebase follows.
