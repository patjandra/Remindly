import { useState, useEffect, useCallback } from 'react';

// Minimal client-side "router" — just enough to give the app's few top-level
// screens real, shareable/refreshable URLs (landing "/", login "/login",
// calendar "/app") without pulling in React Router. The app has no nested
// routes and no route params, so a hand-rolled History API wrapper is simpler
// than a dependency (see CLAUDE.md: don't add React Router unless needed).
//
// Firebase Hosting's rewrite (firebase.json: "**" -> /index.html) already sends
// any path to this SPA, so a hard refresh or a shared link on /app or /login
// still loads the app correctly — this hook just reads/updates
// window.location from there.
export function useRoute() {
    const [path, setPath] = useState(() => window.location.pathname);

    useEffect(() => {
        function onPopState() { setPath(window.location.pathname); }
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const navigate = useCallback((to, { replace = false } = {}) => {
        if (to === window.location.pathname) return;
        if (replace) window.history.replaceState(null, '', to);
        else         window.history.pushState(null, '', to);
        setPath(to);
    }, []);

    return { path, navigate };
}
