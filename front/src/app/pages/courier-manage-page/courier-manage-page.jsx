import { useEffect, useState } from 'react'
import { apiRequest } from '../../core/http/api.js'
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
} from '../../core/ui/icons.jsx'
import './courier-manage-page.scss'

const initialForm = {
  first_name: '',
  last_name: '',
  phone_number: '',
  car_plate_number: '',
  email: '',
  password: '',
  password_confirmation: '',
}

export function CourierManagePage({ auth }) {
  const [couriers, setCouriers] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingCourierId, setEditingCourierId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    async function loadCouriers() {
      try {
        const payload = await apiRequest('/api/couriers', {
          token: auth?.token,
        })

        setCouriers(payload.couriers ?? [])
      } catch (requestError) {
        setStatus({
          type: 'error',
          message: requestError.message,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadCouriers()
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
    setEditingCourierId(null)
    setForm(initialForm)
    setIsDialogOpen(true)
  }

  function openEditDialog(courier) {
    setStatus({ type: '', message: '' })
    setEditingCourierId(courier.id)
    setForm({
      first_name: courier.first_name ?? '',
      last_name: courier.last_name ?? '',
      phone_number: courier.phone_number ?? '',
      car_plate_number: courier.car_plate_number ?? '',
      email: courier.user?.email ?? '',
      password: '',
      password_confirmation: '',
    })
    setIsDialogOpen(true)
  }

  function closeDialog() {
    if (isSubmitting) {
      return
    }

    setIsDialogOpen(false)
    setEditingCourierId(null)
    setForm(initialForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    const isEditing = Boolean(editingCourierId)

    try {
      const payload = await apiRequest(
        isEditing ? `/api/couriers/${editingCourierId}` : '/api/couriers',
        {
          method: isEditing ? 'PUT' : 'POST',
          token: auth?.token,
          body: JSON.stringify({
            ...form,
            password: form.password || null,
            password_confirmation: form.password_confirmation || null,
          }),
        },
      )

      if (isEditing) {
        setCouriers((current) =>
          current.map((courier) =>
            courier.id === payload.courier.id ? payload.courier : courier,
          ),
        )
      } else {
        setCouriers((current) => [payload.courier, ...current])
      }

      setForm(initialForm)
      setEditingCourierId(null)
      setIsDialogOpen(false)
      setStatus({
        type: 'success',
        message: isEditing ? 'Courier updated.' : 'Courier created.',
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

  const isEditing = Boolean(editingCourierId)

  return (
    <section className="courier-manage-page">
      <header className="courier-manage-page__header">
        <h2 className="page-title">Couriers</h2>
        <button
          type="button"
          className="button-primary icon-button"
          onClick={openCreateDialog}
          aria-label="Add courier"
          title="Add courier"
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
        <div className="courier-manage-page__table-wrap">
          {couriers.length ? (
            <table className="courier-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Plate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((courier) => (
                  <tr key={courier.id}>
                    <td>{courier.first_name} {courier.last_name}</td>
                    <td>{courier.user?.email}</td>
                    <td>{courier.phone_number}</td>
                    <td>{courier.car_plate_number || '-'}</td>
                    <td className="courier-table__actions">
                      <button
                        type="button"
                        className="button-secondary courier-table__edit icon-button"
                        onClick={() => openEditDialog(courier)}
                        aria-label={`Edit ${courier.first_name} ${courier.last_name}`}
                        title={`Edit ${courier.first_name} ${courier.last_name}`}
                      >
                        <EditIcon className="action-icon" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="status-message">No couriers.</p>
          )}
        </div>
      )}

      {isDialogOpen ? (
        <div className="dialog-backdrop" onClick={closeDialog}>
          <section
            className="dialog-panel panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="courier-manage-page__dialog-head">
              <h3>{isEditing ? 'Edit courier' : 'Add courier'}</h3>
              <p>
                {isEditing
                  ? 'Leave password empty to keep the current password.'
                  : 'Set the password for this courier account.'}
              </p>
            </div>

            <form className="courier-manage-page__form" onSubmit={handleSubmit}>
              <div className="field-grid courier-manage-page__form-grid">
                <label className="form-field">
                  First name
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Last name
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Phone number
                  <input
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Car plate number
                  <input
                    name="car_plate_number"
                    value={form.car_plate_number}
                    onChange={handleChange}
                  />
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
                  Password
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required={!isEditing}
                  />
                </label>

                <label className="form-field">
                  Confirm password
                  <input
                    name="password_confirmation"
                    type="password"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    required={!isEditing && Boolean(form.password)}
                  />
                </label>
              </div>

              {status.type === 'error' && status.message ? (
                <p className="status-message is-error">{status.message}</p>
              ) : null}

              <div className="courier-manage-page__actions">
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
                  aria-label={isEditing ? 'Update courier' : 'Save courier'}
                  title={isEditing ? 'Update courier' : 'Save courier'}
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
