import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app.routes.jsx'
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from './core/auth/auth.storage.js'

function App() {
  const [auth, setAuth] = useState(() => readStoredAuth())

  useEffect(() => {
    if (auth) {
      writeStoredAuth(auth)
      return
    }

    clearStoredAuth()
  }, [auth])

  return (
    <BrowserRouter>
      <AppRoutes auth={auth} onAuthChange={setAuth} />
    </BrowserRouter>
  )
}

export default App
