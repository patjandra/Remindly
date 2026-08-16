import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import LoginPage from './LoginPage'
import CalendarPage from './CalendarPage'

function App() {
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);

    // Firebase persists the session locally, so on page load we restore the
    // logged-in user instead of dropping back to the login screen.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    async function handleLogout() {
        await signOut(auth);
        sessionStorage.removeItem('remindly-gcal-token');
        setUser(null);
    }

    // Wait until Firebase reports the auth state to avoid flashing the login page.
    if (!authReady) {
        return (
            <div className="h-screen flex items-center justify-center bg-blue-100">
                <div className="w-10 h-10 border-4 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            {/* If no user, LoginPage --> Else, CalendarPage */}
            {!user ? (<LoginPage onLogin={setUser}/>) : (<CalendarPage user={user} onLogout={handleLogout} />)}
        </>
    )
}

export default App
