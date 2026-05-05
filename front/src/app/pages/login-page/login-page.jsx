import { startTransition, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../core/http/api.js'
import './login-page.scss'

export function LoginPage({ auth, onAuthChange }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({
    email: 'admin@courier.test',
    password: 'password',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (auth?.token) {
      navigate('/couriers', { replace: true })
    }
  }, [auth, navigate])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const payload = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          device_name: 'mobile-app',
        }),
      })

      startTransition(() => {
        onAuthChange({
          token: payload.token,
          user: payload.user,
        })
      })

      navigate(location.state?.from ?? '/couriers', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-page__panel panel">
        <h1 className="page-title">Login</h1>

        <form className="login-page__form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="form-field">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          {error ? <p className="status-message is-error">{error}</p> : null}

          <button type="submit" className="button-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Log in'}
          </button>
        </form>
      </section>
    </main>
  )
}
