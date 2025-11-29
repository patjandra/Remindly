import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";

export default function LoginPage( {onLogin} ) {
    async function handleLogin() {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            {/* If a user logs in, change onLogin/setUser state --> switch to CalendarPage */}
            onLogin(result.user); 
            console.log("✅Signed in as: ", user.displayName);
    }

    return (
    <div className="h-screen flex items-center justify-center bg-gray-400">
        <div className="bg-gray-500 w-[500px] h-[650px] rounded-2xl shadow-xl text-center items-baseline">
            <img src="/remindly-logo.png" alt="Remindly Logo" className="h-80 w-auto mx-auto"></img>

            <button 
                onClick={handleLogin}
                className="bg-blue-600 text-white hover:bg-blue-500 text-xl rounded-xl font-bold py-4 px-4 w-3/4 mx-auto"
            >
                Sign in with Google
            </button>

        </div>
    </div>
    );
}


