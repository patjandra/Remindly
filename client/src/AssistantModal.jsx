import { useState, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { GEMINI_VOICES } from './geminiVoices';
import SearchableSelect from './SearchableSelect';

// Every role here should have a matching ROLE_HINT entry in generateScript.js —
// otherwise it falls back to a generic "stay in character" instruction instead of
// actually behaving like the role.
const ROLES = [
    'Accountability Coach', 'Motivational Speaker', 'Friendly Reminder', 'Strict Manager', 'Casual Friend',
    'Drill Sergeant', 'Wise Mentor', 'Comedian', 'Therapist', 'Butler',
    'Personal Trainer', 'Pirate Captain', 'News Anchor', 'Fortune Teller', 'Secret Agent',
    'Personal Assistant', 'Best Friend', 'Hype Man', 'Sports Commentator', 'Movie Trailer Narrator',
    'Medieval Herald', 'Dungeon Master', 'Mission Control', 'F1 Race Engineer', 'Gym Bro',
    'Royal Butler', 'Cowboy', 'Wizard', 'Supervillain', 'Game Show Host',
    'Morning Radio DJ', 'Sarcastic Assistant', 'Chaotic Roommate', 'Video Game NPC', 'SF Tech Bro',
];
// Every entry here needs a matching tone + voice in EMOTION_STYLE / EMOTION_VOICE
// (client/src/services/tts.js) and an EMOTION_HINT in generateScript.js — otherwise
// it silently falls back to the generic default instead of sounding distinct.
const EMOTIONS = [
    'Calm', 'Energetic', 'Encouraging', 'Serious', 'Playful', 'Urgent', 'Sarcastic', 'Cheerful', 'Gentle',
    'Anxious', 'Dramatic', 'Confident', 'Deadpan', 'Whimsical',
    'Neutral', 'Motivational', 'Epic', 'Sassy', 'Chaotic', 'Unhinged', 'Panicked',
    'Smug', 'Grumpy', 'Sleepy', 'Mysterious', 'Villainous', 'Judgmental', 'Passive-Aggressive',
];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // must match storage.rules

const textInput = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 mb-3 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-400 transition-colors';
const label  = 'block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1';

const ROLE_OPTIONS    = ROLES.map((r) => ({ value: r, label: r }));
const EMOTION_OPTIONS = EMOTIONS.map((em) => ({ value: em, label: em }));
const VOICE_OPTIONS   = GEMINI_VOICES.map((v) => ({ value: v.name, label: `${v.name} — ${v.desc}` }));

function CameraIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
}

// Every object here uses the assistant's own doc id (no filename in the path), so
// re-uploading a photo just overwrites the same Storage object instead of
// accumulating orphans — see storage.rules and functions/index.js's
// cleanupAssistantPhoto trigger.
function photoRef(uid, assistantId) {
    return ref(storage, `assistantPhotos/${uid}/${assistantId}`);
}

export default function AssistantModal({ user, assistant = null, onClose }) {
    const isEdit = assistant !== null;

    const [name,    setName]    = useState(assistant?.name    ?? '');
    const [role,    setRole]    = useState(assistant?.role    ?? '');
    const [emotion, setEmotion] = useState(assistant?.emotion ?? '');
    const [voiceId, setVoiceId] = useState(assistant?.voiceId ?? '');
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    // photoFile: a newly picked file waiting to be uploaded on save.
    // preview: what to actually show — the new file's local preview, the existing
    // photoUrl, or null (no photo / explicitly removed).
    const [photoFile, setPhotoFile] = useState(null);
    const [preview,   setPreview]   = useState(assistant?.photoUrl ?? null);
    const [removed,   setRemoved]   = useState(false);
    const fileInputRef = useRef(null);

    function handlePickPhoto(e) {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow picking the same file again later
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please choose an image file.');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            setError('Image must be under 5MB.');
            return;
        }

        setError('');
        setRemoved(false);
        setPhotoFile(file);
        setPreview(URL.createObjectURL(file));
    }

    function handleRemovePhoto() {
        setPhotoFile(null);
        setPreview(null);
        setRemoved(true);
    }

    async function handleSave() {
        const trimmedName = name.trim();
        if (!trimmedName || !role || !emotion || !voiceId) {
            setError('Please fill out all fields.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // New assistants need an id up front so the photo can be uploaded to a
            // path keyed by it, alongside the Firestore doc rather than after it.
            const assistantId = isEdit ? assistant.id : doc(collection(db, 'users', user.uid, 'assistants')).id;
            const docRef = doc(db, 'users', user.uid, 'assistants', assistantId);

            let photoUrl = assistant?.photoUrl ?? null;
            if (photoFile) {
                await uploadBytes(photoRef(user.uid, assistantId), photoFile, { contentType: photoFile.type });
                photoUrl = await getDownloadURL(photoRef(user.uid, assistantId));
            } else if (removed && assistant?.photoUrl) {
                photoUrl = null;
                deleteObject(photoRef(user.uid, assistantId)).catch(() => {}); // best-effort
            }

            const data = { name: trimmedName, role, emotion, voiceId, photoUrl };

            if (isEdit) {
                await updateDoc(docRef, data);
            } else {
                await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
            }
            onClose();
        } catch (err) {
            console.error('Failed to save assistant:', err);
            setError('Failed to save. Please try again.');
            setLoading(false);
        }
    }

    // overflow-y-auto lives on the backdrop, not the card — so on a short viewport
    // the whole card scrolls into view instead of the card clipping its own
    // overflow, which would cut off the Role/Emotion/Voice dropdowns whenever they
    // need to overlay past the card's edge. items-center is intentionally dropped
    // in favor of the card's own my-auto: with items-center, a flex container that
    // overflows clips the top of a centered child instead of letting it scroll.
    return (
        <div className="fixed inset-0 bg-black/30 flex justify-center z-[9999] overflow-y-auto py-8" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[92vw] max-w-[420px] p-6 my-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
                    {isEdit ? 'Edit Assistant' : 'New Assistant'}
                </h2>

                {/* Photo */}
                <div className="flex items-center gap-4 mb-4">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload a photo"
                        className="relative w-16 h-16 rounded-full shrink-0 cursor-pointer group"
                    >
                        {preview ? (
                            <img src={preview} alt="" className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-500">
                                <CameraIcon />
                            </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-500 group-hover:bg-blue-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-gray-800 transition-colors">
                            <CameraIcon />
                        </span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickPhoto} className="hidden" />
                    <div className="text-left">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Optional — falls back to a colored initial if skipped.</p>
                        {preview && (
                            <button type="button" onClick={handleRemovePhoto} className="mt-1 text-xs font-medium text-red-500 hover:text-red-600 cursor-pointer">
                                Remove photo
                            </button>
                        )}
                    </div>
                </div>

                <label className={label}>Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex"
                    autoFocus={!isEdit}
                    className={textInput}
                />

                <label className={label}>Role</label>
                <SearchableSelect value={role} onChange={setRole} options={ROLE_OPTIONS} placeholder="Search roles…" className="mb-3" />

                <label className={label}>Emotion</label>
                <SearchableSelect value={emotion} onChange={setEmotion} options={EMOTION_OPTIONS} placeholder="Search emotions…" className="mb-3" />

                <label className={label}>Voice</label>
                <SearchableSelect value={voiceId} onChange={setVoiceId} options={VOICE_OPTIONS} placeholder="Search voices…" className="mb-1" />

                {error && <p className="text-red-500 text-xs mt-2 mb-1">{error}</p>}

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-5 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-sm hover:shadow-md rounded-xl disabled:opacity-60 cursor-pointer transition-all"
                    >
                        {loading ? 'Saving…' : isEdit ? 'Save' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}
