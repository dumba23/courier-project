import { useEffect, useState } from 'react'
import { CheckIcon, CloseIcon, EditIcon, PlusIcon } from '../../core/ui/icons.jsx'
import { DataTable } from '../../core/ui/data-table.jsx'
import { apiRequest } from '../../core/http/api.js'
import './districts-page.scss'

const initialForm = {
  name: '',
  courier_ids: [],
  is_active: true,
}

export function DistrictsPage({ auth }) {
  const [districts, setDistricts] = useState([])
  const [couriers, setCouriers] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingDistrictId, setEditingDistrictId] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    async function loadDistricts() {
      try {
        const [districtsPayload, couriersPayload] = await Promise.all([
          apiRequest('/api/districts', { token: auth?.token }),
          apiRequest('/api/couriers', { token: auth?.token }),
        ])

        setDistricts(districtsPayload.districts ?? [])
        setCouriers(couriersPayload.couriers ?? [])
      } catch (requestError) {
        setStatus({
          type: 'error',
          message: requestError.message,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadDistricts()
  }, [auth?.token])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleCourierToggle(courierId) {
    setForm((current) => {
      const stringId = String(courierId)
      const exists = current.courier_ids.includes(stringId)

      return {
        ...current,
        courier_ids: exists
          ? current.courier_ids.filter((id) => id !== stringId)
          : [...current.courier_ids, stringId],
      }
    })
  }

  function openCreateDialog() {
    setEditingDistrictId(null)
    setForm(initialForm)
    setStatus({ type: '', message: '' })
    setIsDialogOpen(true)
  }

  function openEditDialog(district) {
    setEditingDistrictId(district.id)
    setForm({
      name: district.name,
      courier_ids: (district.courier_ids ?? []).map(String),
      is_active: district.is_active ?? true,
    })
    setStatus({ type: '', message: '' })
    setIsDialogOpen(true)
  }

  function closeDialog() {
    if (isSubmitting) {
      return
    }

    setIsDialogOpen(false)
    setEditingDistrictId(null)
    setForm(initialForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const payload = await apiRequest(
        editingDistrictId ? `/api/districts/${editingDistrictId}` : '/api/districts',
        {
          method: editingDistrictId ? 'PUT' : 'POST',
          token: auth?.token,
          body: JSON.stringify(form),
        },
      )

      setDistricts((current) => {
        if (!editingDistrictId) {
          return [payload.district, ...current]
        }

        return current.map((district) => (
          district.id === editingDistrictId ? payload.district : district
        ))
      })

      setIsDialogOpen(false)
      setEditingDistrictId(null)
      setForm(initialForm)
      setStatus({
        type: 'success',
        message: editingDistrictId ? 'District updated.' : 'District created.',
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
    <section className="districts-page">
      <header className="districts-page__header">
        <h2 className="page-title">Districts</h2>
        <button
          type="button"
          className="button-primary icon-button"
          onClick={openCreateDialog}
          aria-label="Add district"
          title="Add district"
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
          tableClassName="districts-table"
          headers={['Name', 'Couriers', 'Status', '']}
          emptyMessage="No districts."
          rows={districts.map((district) => (
            <tr key={district.id}>
              <td>{district.name}</td>
              <td>{district.couriers?.length ? district.couriers.map((courier) => courier.name).join(', ') : '-'}</td>
              <td>{district.is_active ? 'Active' : 'Inactive'}</td>
              <td className="districts-table__actions">
                <button
                  type="button"
                  className="button-secondary icon-button"
                  onClick={() => openEditDialog(district)}
                  aria-label="Edit district"
                  title="Edit district"
                >
                  <EditIcon className="action-icon" />
                </button>
              </td>
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
            <div className="districts-page__dialog-head">
              <h3>{editingDistrictId ? 'Edit district' : 'Add district'}</h3>
            </div>

            <form className="districts-page__form" onSubmit={handleSubmit}>
              <div className="field-grid districts-page__form-grid">
                <label className="form-field">
                  Name
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field districts-page__toggle">
                  <span>Active</span>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                </label>

                <div className="form-field districts-page__full">
                  Couriers
                  <div className="districts-page__courier-list">
                    {couriers.map((courier) => {
                      const courierName = `${courier.first_name} ${courier.last_name}`
                      const courierId = String(courier.id)

                      return (
                        <label key={courier.id} className="districts-page__courier-option">
                          <input
                            type="checkbox"
                            checked={form.courier_ids.includes(courierId)}
                            onChange={() => handleCourierToggle(courierId)}
                          />
                          <span>{courierName}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              {status.type === 'error' && status.message ? (
                <p className="status-message is-error">{status.message}</p>
              ) : null}

              <div className="districts-page__actions">
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
                  aria-label="Save district"
                  title="Save district"
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
