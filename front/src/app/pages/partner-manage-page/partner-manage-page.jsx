import { useEffect, useState } from 'react'
import {
  CheckIcon,
  CloseIcon,
  PlusIcon,
} from '../../core/ui/icons.jsx'
import { DataTable } from '../../core/ui/data-table.jsx'
import { apiRequest } from '../../core/http/api.js'
import './partner-manage-page.scss'

const initialForm = {
  name: '',
  email: '',
  phone_number: '',
  pickup_address: '',
  tariff: '',
  password: '',
  password_confirmation: '',
}

export function PartnerManagePage({ auth }) {
  const [partners, setPartners] = useState([])
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    async function loadPartners() {
      try {
        const payload = await apiRequest('/api/partners', {
          token: auth?.token,
        })

        setPartners(payload.partners ?? [])
      } catch (requestError) {
        setStatus({
          type: 'error',
          message: requestError.message,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadPartners()
  }, [auth?.token])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function openCreateDialog() {
    setStatus({ type: '', message: '' })
    setForm(initialForm)
    setIsDialogOpen(true)
  }

  function closeDialog() {
    if (isSubmitting) {
      return
    }

    setIsDialogOpen(false)
    setForm(initialForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const payload = await apiRequest('/api/partners', {
        method: 'POST',
        token: auth?.token,
        body: JSON.stringify(form),
      })

      setPartners((current) => [payload.partner, ...current])
      setForm(initialForm)
      setIsDialogOpen(false)
      setStatus({
        type: 'success',
        message: 'Partner created.',
      })
    } catch (requestError) {
      setStatus({
        type: 'error',
        message: requestError.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="partner-manage-page">
      <header className="partner-manage-page__header">
        <h2 className="page-title">Partners</h2>
        <button
          type="button"
          className="button-primary icon-button"
          onClick={openCreateDialog}
          aria-label="Add partner"
          title="Add partner"
        >
          <PlusIcon className="action-icon" />
        </button>
      </header>

      {status.message ? (
        <p className={`status-message${status.type === 'error' ? ' is-error' : ''}`}>
          {status.message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="status-message">Loading...</p>
      ) : (
        <DataTable
          tableClassName="partner-table"
          headers={['Name', 'Email', 'Phone', 'Pickup address', 'Tariff']}
          emptyMessage="No partners."
          rows={partners.map((partner) => (
            <tr key={partner.id}>
              <td>{partner.name}</td>
              <td>{partner.user?.email}</td>
              <td>{partner.phone_number}</td>
              <td>{partner.pickup_address}</td>
              <td>{partner.tariff}</td>
            </tr>
          ))}
        />
      )}

      {isDialogOpen ? (
        <div className="dialog-backdrop" onClick={closeDialog}>
          <section
            className="dialog-panel panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="partner-manage-page__dialog-head">
              <h3>Add partner</h3>
            </div>

            <form className="partner-manage-page__form" onSubmit={handleSubmit}>
              <div className="field-grid partner-manage-page__form-grid">
                <label className="form-field">
                  Name
                  <input name="name" value={form.name} onChange={handleChange} required />
                </label>

                <label className="form-field">
                  Email
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Phone
                  <input
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Tariff
                  <input
                    name="tariff"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.tariff}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field partner-manage-page__full">
                  Pickup address
                  <input
                    name="pickup_address"
                    value={form.pickup_address}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Password
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Confirm password
                  <input
                    name="password_confirmation"
                    type="password"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>

              {status.type === 'error' && status.message ? (
                <p className="status-message is-error">{status.message}</p>
              ) : null}

              <div className="partner-manage-page__actions">
                <button
                  type="button"
                  className="button-secondary icon-button"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                  aria-label="Cancel"
                  title="Cancel"
                >
                  <CloseIcon className="action-icon" />
                </button>
                <button
                  type="submit"
                  className="button-primary icon-button"
                  disabled={isSubmitting}
                  aria-label="Save partner"
                  title="Save partner"
                >
                  {!isSubmitting ? <CheckIcon className="action-icon" /> : null}
                  {isSubmitting ? <span className="icon-button__status" /> : null}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}
