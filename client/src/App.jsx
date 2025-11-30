import { useState } from 'react'
import LoginPage from './LoginPage'
import CalendarPage from './CalendarPage'

function App() {
    const [user, setUser] = useState(null);

    return (
        <>
            {/* If no user, LoginPage --> Else, CalendarPage */}
            {!user ? (<LoginPage onLogin={setUser}/>) : (<CalendarPage user={user} onLogout={() => setUser(null)} />)}
        </>
    )
}

export default App
