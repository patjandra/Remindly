import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useRoute } from './hooks/useRoute'
import LandingPage from './LandingPage'
import LoginPage from './LoginPage'
import CalendarPage from './CalendarPage'

function App() {
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const { path, navigate } = useRoute();

    // Firebase persists the session locally, so on page load we restore the
    // logged-in user instead of dropping back to the login screen.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // Keep the URL in sync with auth state, not just what's rendered: signed-in
    // users always end up at /app (so a refresh, a bookmark, or hitting back
    // while logged in lands on the calendar, not the marketing/login screens),
    // and signed-out users can only be on "/" or "/login" — anything else
    // (including an unknown path) falls back to the marketing page.
    useEffect(() => {
        if (!authReady) return;
        if (user && path !== '/app') {
            navigate('/app', { replace: true });
        } else if (!user && path !== '/' && path !== '/login') {
            navigate('/', { replace: true });
        }
    }, [authReady, user, path, navigate]);

    async function handleLogout() {
        await signOut(auth);
        sessionStorage.removeItem('remindly-gcal-token');
        setUser(null);
        navigate('/'); // back to the marketing page, not straight to sign-in
    }

    // Wait until Firebase reports the auth state to avoid flashing the login page.
    if (!authReady) {
        return (
            <div className="h-screen flex items-center justify-center bg-blue-100">
                <div className="w-10 h-10 border-4 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Render off `user`, not `path` — the URL-sync effect above will correct
    // the address bar to /app in the background, so there's no flash of the
    // wrong screen while that happens.
    if (user) return <CalendarPage user={user} onLogout={handleLogout} />;
    return path === '/login'
        ? <LoginPage onLogin={setUser} />
        : <LandingPage onGetStarted={() => navigate('/login')} />;
}

export default App
