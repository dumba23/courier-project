import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app.routes.jsx'
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from './core/auth/auth.storage.js'
import { I18nProvider } from './core/i18n/i18n.context.jsx'

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
    <I18nProvider>
      <BrowserRouter>
        <AppRoutes auth={auth} onAuthChange={setAuth} />
      </BrowserRouter>
    </I18nProvider>
  )
}

export default App
