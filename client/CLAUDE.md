# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Project Overview

Remindly is a React + Vite single-page calendar app with Firebase Auth, Firestore,
Google OAuth (including Google Calendar import), and an AI reminder layer: Gemini
generates a persona-driven spoken script for each reminder and voices it, via
Cloud Functions in `functions/index.js` (see `../TTS_BACKEND.md` for that backend's
contract).

The app currently uses simple state-based page switching, not React Router.

user === null      → <LoginPage />
user !== null      → <CalendarPage user={user} />
Commands
npm run dev       # Start Vite dev server at localhost:5173
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build

No automated test suite is currently configured.

Tech Stack
React
Vite
Tailwind CSS v4
Firebase Auth, Firestore, Storage, Cloud Functions (v2)
Google OAuth + Google Calendar API (import)
Gemini API (script generation + TTS), called server-side only
react-big-calendar
JavaScript / JSX

Important Files
src/
├── App.jsx
├── LoginPage.jsx
├── CalendarPage.jsx        — owns most app state; sidebar + calendar shell
├── MainCalendar.jsx        — wraps react-big-calendar
├── AgendaView.jsx
├── MiniCalendar.jsx
├── AssistantModal.jsx
├── EventModal.jsx          — create/edit event, incl. the delete button
├── TimePicker.jsx / LocationInput.jsx
├── generateScript.js       — builds the script prompt, calls the backend
├── geminiVoices.js         — the 30 prebuilt Gemini TTS voices
├── eventColors.js          — shared color palette + deterministic color-by-title
├── services/tts.js         — calls the backend, plays/falls back to default ring
├── hooks/useReminderScheduler.js
└── styles/
    ├── index.css            — Tailwind entry + theme tokens (font, accent color)
    └── MainCalendar.css

../functions/index.js        — tts, generateScript, cleanupEventAudio

If the actual file paths differ, inspect the repository before making changes.

Firebase Setup

firebase.js exports:

auth      // Firebase Auth instance
provider  // GoogleAuthProvider
db        // Firestore instance

The app uses Firebase modular API syntax, not namespace API.

Use this style:

import { collection, addDoc, onSnapshot } from "firebase/firestore";

Do not use:

firebase.firestore()
Firestore Data Model

Use this structure for user-specific data:

users
└── {uid}
    ├── assistants
    │   └── {assistantId}
    │       ├── name
    │       ├── role
    │       ├── emotion
    │       ├── voiceId
    │       ├── photoUrl (nullable — Storage download URL, see below)
    │       └── createdAt
    └── events
        └── {eventId}
            ├── title, start, end, location, description, color
            ├── assistantId, reminder { amount, unit }
            ├── notificationTime, generationTime
            └── audioStatus, script, audioUrl

Each assistant/event is its own Firestore document, not an object inside an array.

Assistant creation path:

collection(db, "users", user.uid, "assistants")

Assistant object shape:

{
  name: string,
  role: string,
  emotion: string,
  voiceId: string,
  photoUrl: string | null,
  createdAt: serverTimestamp()
}

Photo upload: AssistantModal.jsx uploads directly to Firebase Storage (client SDK,
not through a Cloud Function — unlike Gemini, Storage isn't a secret-holding
service) at assistantPhotos/{uid}/{assistantId}, a single fixed object per
assistant with no filename/extension, so re-uploading just overwrites it instead
of accumulating orphans. storage.rules scopes read/write to the owning uid and
caps size (5MB) and content-type (image/*) — keep MAX_PHOTO_BYTES in
AssistantModal.jsx in sync with the rule's size check. Deleting the assistant doc
triggers cleanupAssistantPhoto (functions/index.js) to remove the Storage object.

Every role in AssistantModal's ROLES needs a matching entry in generateScript.js's
ROLE_HINT; every emotion in EMOTIONS needs matching entries in generateScript.js's
EMOTION_HINT and services/tts.js's EMOTION_STYLE/EMOTION_VOICE — otherwise it
silently falls back to a generic default instead of sounding distinct.

Auth Flow

LoginPage.jsx handles Google sign-in using:

signInWithPopup(auth, provider)

After sign-in, it passes the Firebase user object up to App.jsx.

CalendarPage.jsx receives:

{ user, onLogout }

Use user?.uid when accessing user-specific data.

Assistant Flow

AssistantModal.jsx handles assistant creation/editing.

Expected behavior:

User enters name, selects role, emotion, and voice.
Validate all fields are non-empty.
Write assistant to Firestore at users/{uid}/assistants.
Close modal only after successful write.

Creation pattern (uses setDoc with a pre-generated doc ref, not addDoc, so a new
assistant's id is known up front — needed to upload its photo to a path keyed by
that id before/alongside the Firestore write):

const handleSave = async () => {
  const trimmedName = name.trim();
  const assistantId = doc(collection(db, "users", user.uid, "assistants")).id;

  await setDoc(doc(db, "users", user.uid, "assistants", assistantId), {
    name: trimmedName,
    role,
    emotion,
    voiceId,
    photoUrl,
    createdAt: serverTimestamp(),
  });
};

Use try/catch around Firestore writes. Do not close the modal if the write fails.

Assistant List

CalendarPage.jsx owns the assistant list state because the sidebar lives there, and
reads it with Firestore onSnapshot() (real-time, ordered by createdAt).

Event / Reminder Flow

EventModal.jsx handles create/edit/delete. On save, it only resets the audio
pipeline (audioStatus/script/audioUrl) when a field that actually affects the
spoken script changed (title, start, location, description, assistantId,
reminder) — an unrelated edit (e.g. color) should not burn a fresh Gemini call.

useReminderScheduler.js polls client-side (there's no server-side cron) and, at
generationTime, calls generateScript then services/tts to prepare audio ahead of
notificationTime. The reminder must never be delayed by AI — if audio isn't ready
in time, play the default ring and never resurrect the late audio afterward.

UI Layout

CalendarPage.jsx layout:

Top navigation bar
Collapsible left sidebar
Main calendar area

Sidebar contains:

Mini calendar
Create Assistant button
Create example event button (opens EventModal pre-filled, doesn't write directly)
Assistant list

MainCalendar.jsx wraps react-big-calendar. It uses a ResizeObserver so the calendar
resizes correctly when the sidebar opens or closes.

Styling Guidelines

Use Tailwind CSS classes directly in JSX.

Current style direction:

Inter font (loaded in index.html), set globally in styles/index.css
Accent color is Tailwind's blue-* scale overridden to a richer indigo via @theme
  in styles/index.css — change the palette there, not per-component, so it stays
  consistent everywhere (including MainCalendar.css, which references the same
  var(--color-blue-*) tokens rather than hardcoded hex)
Rounded corners, soft borders, subtle shadow-sm/hover:shadow-md on primary buttons
Green success hover for create actions
Red hover for destructive or close actions

Prefer readable Tailwind classes over clever abstractions.

Use z-[9999], not z-9999, for arbitrary z-index values in Tailwind.

For buttons that contain images/text, use:

className="cursor-pointer"

and add:

className="pointer-events-none"

to child images if needed.

React Style Guidelines

Use functional components and React hooks.

Use controlled inputs for forms:

<input value={name} onChange={(e) => setName(e.target.value)} />

Use optional chaining when reading possibly-null values:

user?.uid
user?.displayName

Avoid storing derived state unless needed.

Keep form validation simple and explicit — inline error state, not alert().

Rules for Claude Code

Before editing:

Inspect the relevant files first.
Preserve the current app structure unless asked to refactor.
Use Firebase modular API only.
Do not introduce React Router unless explicitly requested.
Do not add new dependencies unless necessary.
Keep code beginner-readable and consistent with the existing style.
Prefer small, focused changes over large rewrites.
Explain any important Firestore rule or schema assumptions.
Do not hardcode user IDs.
Always use the logged-in user's uid for user-owned data.
Never call Gemini directly from the client — go through functions/index.js.

Firestore Security Rules

firestore.rules is the real, deployed rule (not a placeholder):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                          && request.auth.uid == userId;
    }
  }
}

rateLimits/{uid} (written only by the Cloud Functions' Admin SDK) has no matching
rule and is correctly denied to all clients by default — don't add one.

If Firestore returns "Missing or insufficient permissions," check rules before
changing frontend logic.

Storage Security Rules

../storage.rules is the real, deployed rule. assistantPhotos/{userId}/{assistantId}
allows read/write only when request.auth.uid == userId, plus a 5MB size cap and an
image/* content-type check on write. Everything else (tts/ audio) denies all client
access by default — that's intentional, it's written server-side only by the Cloud
Functions' Admin SDK, which bypasses these rules entirely.

Development Philosophy

Build incrementally. Avoid overengineering — this started as an MVP and still
favors small, explicit code over abstraction.
