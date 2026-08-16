import { useState } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { GEMINI_VOICES } from './geminiVoices';

// Every role here should have a matching ROLE_HINT entry in generateScript.js —
// otherwise it falls back to a generic "stay in character" instruction instead of
// actually behaving like the role.
const ROLES = [
    'Accountability Coach', 'Motivational Speaker', 'Friendly Reminder', 'Strict Manager', 'Casual Friend',
    'Drill Sergeant', 'Wise Mentor', 'Comedian', 'Therapist', 'Butler',
    'Personal Trainer', 'Pirate Captain', 'News Anchor', 'Fortune Teller', 'Secret Agent',
];
// Every entry here needs a matching tone + voice in EMOTION_STYLE / EMOTION_VOICE
// (client/src/services/tts.js) and an EMOTION_HINT in generateScript.js — otherwise
// it silently falls back to the generic default instead of sounding distinct.
const EMOTIONS = [
    'Calm', 'Energetic', 'Encouraging', 'Serious', 'Playful', 'Urgent', 'Sarcastic', 'Cheerful', 'Gentle',
    'Anxious', 'Dramatic', 'Confident', 'Deadpan', 'Whimsical',
];

const select = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 mb-3 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-400 transition-colors';
const label  = 'block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1';

export default function AssistantModal({ user, assistant = null, onClose }) {
    const isEdit = assistant !== null;

    const [name,    setName]    = useState(assistant?.name    ?? '');
    const [role,    setRole]    = useState(assistant?.role    ?? '');
    const [emotion, setEmotion] = useState(assistant?.emotion ?? '');
    const [voiceId, setVoiceId] = useState(assistant?.voiceId ?? '');
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSave() {
        const trimmedName = name.trim();
        if (!trimmedName || !role || !emotion || !voiceId) {
            setError('Please fill out all fields.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (isEdit) {
                await updateDoc(doc(db, 'users', user.uid, 'assistants', assistant.id), {
                    name: trimmedName, role, emotion, voiceId,
                });
            } else {
                await addDoc(collection(db, 'users', user.uid, 'assistants'), {
                    name: trimmedName, role, emotion, voiceId, createdAt: serverTimestamp(),
                });
            }
            onClose();
        } catch (err) {
            console.error('Failed to save assistant:', err);
            setError('Failed to save. Please try again.');
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[420px] p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {isEdit ? 'Edit Assistant' : 'New Assistant'}
                </h2>

                <label className={label}>Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex"
                    autoFocus={!isEdit}
                    className={`${select} mb-3`}
                />

                <label className={label}>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className={select}>
                    <option value="">Select a role</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>

                <label className={label}>Emotion</label>
                <select value={emotion} onChange={(e) => setEmotion(e.target.value)} className={select}>
                    <option value="">Select an emotion</option>
                    {EMOTIONS.map((em) => <option key={em} value={em}>{em}</option>)}
                </select>

                <label className={label}>Voice</label>
                <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className={`${select} mb-1`}>
                    <option value="">Select a voice</option>
                    {GEMINI_VOICES.map((v) => <option key={v.name} value={v.name}>{v.name} — {v.desc}</option>)}
                </select>

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
