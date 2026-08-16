import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, provider } from "../firebase";

export default function LoginPage({ onLogin }) {
    async function handleLogin() {
        const result = await signInWithPopup(auth, provider);

        // Capture the Google OAuth access token so we can call the Google Calendar API later.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
            sessionStorage.setItem("remindly-gcal-token", credential.accessToken);
        }

        // Switch to CalendarPage.
        onLogin(result.user);
    }

    return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="w-[420px] bg-white rounded-2xl border border-gray-200 shadow-xl px-8 py-10 text-center">
                <img src="/remindly-logo.png" alt="Remindly" className="w-auto h-24 mx-auto" />

                <h1 className="mt-6 text-xl font-semibold text-gray-900">Welcome to Remindly</h1>
                <p className="mt-1.5 text-sm text-gray-500">
                    A voice-assisted calendar assistant.
                </p>

                <button
                    onClick={handleLogin}
                    className="mt-8 w-full flex items-center justify-center gap-2.5 border border-gray-300 rounded-xl py-3 px-4 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow transition-all cursor-pointer"
                >
                    <img src="/google-logo.png" alt="" className="w-5 h-5" />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
