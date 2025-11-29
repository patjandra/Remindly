import { useState } from 'react'
import LoginPage from './LoginPage'

function App() {
    const [user, setUser] = useState(null);

    return (
        <>
            {/* If no user, LoginPage --> Else, CalendarPage */}
            {!user ? (<LoginPage onLogin={setUser}/>) : (<CalendarPage user={user}/>)}
        </>
    )
}

export default App
