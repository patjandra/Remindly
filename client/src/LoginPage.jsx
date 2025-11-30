import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";

export default function LoginPage( {onLogin} ) {
    async function handleLogin() {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            {/* If a user logs in, change onLogin/setUser state --> switch to CalendarPage */}
            onLogin(result.user); 
            console.log("✅Signed in as:", user.displayName);
    }

    return (
    <div className="h-screen flex items-center justify-center bg-blue-100">
        <div className="bg-gray-50 opacity-95 w-[500px] h-[600px] rounded-2xl border-2 border-blue-100 shadow-2xl text-center items-baseline">
            <img src="/remindly-logo.png" alt="Remindly Logo" className="w-auto h-80 mx-auto mt-5 transform hover:-translate-y-1 transition-all duration-300 ease-linear"></img>
                <button 
                    onClick={handleLogin}
                    className="bg-gray-50 opacity-95 text-gray-700 hover:bg-blue-100 hover:border-2 hover:border-blue-300 border-2 border-blue-100 hover:shadow-2xl shadow-md transform hover:-translate-y-1 transition-all duration-300 ease-linear text-xl rounded-xl font-semibold py-4 px-4 w-3/4 mx-auto mt-10"
                >
                    <div className="flex flex-row items-center justify-center">
                        <img src="/google-logo.png" alt="Google Logo" className="w-auto h-9 mr-1"></img>
                        <h1>Sign in with Google</h1>
                    </div>
                </button>
        </div>
    </div>
    );
}


