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
        <div className="h-screen flex items-center justify-center bg-blue-100 px-4">
            <div className="bg-gray-50 opacity-95 w-full max-w-md rounded-2xl shadow-[0_0_70px_10px_rgba(56,189,248,0.4)] text-center px-8 py-10">
                {/* The logo image already renders "Remindly" as its wordmark, and the
                    marketing LandingPage (App.jsx renders it before this screen) is now
                    the real, crawlable homepage that explains the app's purpose for
                    Google's OAuth review — this screen just needs to get someone signed
                    in, so it stays minimal: logo + button. */}
                <img src="/remindly-logo.png" alt="Remindly" className="w-auto h-80 mx-auto transform hover:-translate-y-1 transition-all duration-300 ease-linear" />

                <button
                    onClick={handleLogin}
                    className="bg-gray-50 opacity-95 text-gray-700 hover:bg-sky-50 hover:border-2 hover:border-sky-300 border-2 border-blue-100 hover:shadow-2xl shadow-md transform hover:-translate-y-1 transition-all duration-300 ease-linear text-xl rounded-xl font-semibold py-4 px-4 w-full mx-auto mt-2"
                >
                    <div className="flex flex-row items-center justify-center">
                        <img src="/google-logo.png" alt="Google Logo" className="w-auto h-9 mr-1" />
                        <span>Sign in with Google</span>
                    </div>
                </button>

                {/* Google's OAuth verification review checks that these are actually
                    linked from the app, not just hosted somewhere. */}
                <p className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400">
                    <a href="/privacy.html" className="hover:text-gray-600 hover:underline">Privacy Policy</a>
                    <span className="mx-2">·</span>
                    <a href="/terms.html" className="hover:text-gray-600 hover:underline">Terms of Service</a>
                </p>
            </div>
        </div>
    );
}
