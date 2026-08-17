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
        <div className="h-screen flex items-center justify-center bg-blue-100">
            <div className="bg-gray-50 opacity-95 w-[500px] h-[600px] rounded-2xl shadow-[0_0_70px_10px_rgba(56,189,248,0.4)] text-center items-baseline">
                <img src="/remindly-logo.png" alt="Remindly Logo" className="w-auto h-80 mx-auto mt-5 transform hover:-translate-y-1 transition-all duration-300 ease-linear" />

                <button
                    onClick={handleLogin}
                    className="bg-gray-50 opacity-95 text-gray-700 hover:bg-sky-50 hover:border-2 hover:border-sky-300 border-2 border-blue-100 hover:shadow-2xl shadow-md transform hover:-translate-y-1 transition-all duration-300 ease-linear text-xl rounded-xl font-semibold py-4 px-4 w-3/4 mx-auto mt-6"
                >
                    <div className="flex flex-row items-center justify-center">
                        <img src="/google-logo.png" alt="Google Logo" className="w-auto h-9 mr-1" />
                        <span>Sign in with Google</span>
                    </div>
                </button>
            </div>
        </div>
    );
}
