import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import LandingPage from './LandingPage'
import LoginPage from './LoginPage'
import CalendarPage from './CalendarPage'

function App() {
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    // Signed-out visitors land on the marketing page first, not the sign-in
    // screen — showLogin flips to true once they click a "Get started"/"Sign in"
    // CTA. This is deliberately local state, not a route: the app has no router
    // (see CLAUDE.md), and the marketing page is also the OAuth-review "homepage"
    // that needs to explain the app's purpose in real, crawlable text.
    const [showLogin, setShowLogin] = useState(false);

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
        setShowLogin(false); // back to the marketing page, not straight to sign-in
    }

    // Wait until Firebase reports the auth state to avoid flashing the login page.
    if (!authReady) {
        return (
            <div className="h-screen flex items-center justify-center bg-blue-100">
                <div className="w-10 h-10 border-4 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (user) return <CalendarPage user={user} onLogout={handleLogout} />;
    return showLogin
        ? <LoginPage onLogin={setUser} />
        : <LandingPage onGetStarted={() => setShowLogin(true)} />;
}

export default App
