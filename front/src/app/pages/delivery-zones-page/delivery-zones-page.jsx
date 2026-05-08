import { useEffect, useState } from 'react'
import { CheckIcon, CloseIcon, EditIcon, PlusIcon } from '../../core/ui/icons.jsx'
import { DataTable } from '../../core/ui/data-table.jsx'
import { apiRequest } from '../../core/http/api.js'
import './delivery-zones-page.scss'

const initialForm = {
  name: '',
  coordinates: '',
  courier_ids: [],
}

export function DeliveryZonesPage({ auth }) {
  const [zones, setZones] = useState([])
  const [couriers, setCouriers] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingZoneId, setEditingZoneId] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    async function loadZones() {
      try {
        const [zonesPayload, couriersPayload] = await Promise.all([
          apiRequest('/api/delivery-zones', {
            token: auth?.token,
          }),
          apiRequest('/api/couriers', {
            token: auth?.token,
          }),
        ])

        setZones(zonesPayload.delivery_zones ?? [])
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

    loadZones()
  }, [auth?.token])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
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
    setEditingZoneId(null)
    setForm(initialForm)
    setStatus({ type: '', message: '' })
    setIsDialogOpen(true)
  }

  function openEditDialog(zone) {
    setEditingZoneId(zone.id)
    setForm({
      name: zone.name,
      coordinates: zone.coordinates,
      courier_ids: (zone.courier_ids ?? []).map(String),
    })
    setStatus({ type: '', message: '' })
    setIsDialogOpen(true)
  }

  function closeDialog() {
    if (isSubmitting) {
      return
    }

    setIsDialogOpen(false)
    setEditingZoneId(null)
    setForm(initialForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const payload = await apiRequest(
        editingZoneId ? `/api/delivery-zones/${editingZoneId}` : '/api/delivery-zones',
        {
          method: editingZoneId ? 'PUT' : 'POST',
          token: auth?.token,
          body: JSON.stringify(form),
        },
      )

      setZones((current) => {
        if (!editingZoneId) {
          return [payload.delivery_zone, ...current]
        }

        return current.map((zone) => (
          zone.id === editingZoneId ? payload.delivery_zone : zone
        ))
      })

      setIsDialogOpen(false)
      setEditingZoneId(null)
      setForm(initialForm)
      setStatus({
        type: 'success',
        message: editingZoneId ? 'Delivery zone updated.' : 'Delivery zone created.',
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
    <section className="delivery-zones-page">
      <header className="delivery-zones-page__header">
        <h2 className="page-title">Delivery zones</h2>
        <button
          type="button"
          className="button-primary icon-button"
          onClick={openCreateDialog}
          aria-label="Add delivery zone"
          title="Add delivery zone"
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
          tableClassName="delivery-zones-table"
          headers={['Name', 'Coordinates', 'Couriers', '']}
          emptyMessage="No delivery zones."
          rows={zones.map((zone) => (
            <tr key={zone.id}>
              <td>{zone.name}</td>
              <td className="delivery-zones-table__coordinates">{zone.coordinates}</td>
              <td>{zone.couriers?.length ? zone.couriers.map((courier) => courier.name).join(', ') : '-'}</td>
              <td className="delivery-zones-table__actions">
                <button
                  type="button"
                  className="button-secondary icon-button"
                  onClick={() => openEditDialog(zone)}
                  aria-label="Edit delivery zone"
                  title="Edit delivery zone"
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
            <div className="delivery-zones-page__dialog-head">
              <h3>{editingZoneId ? 'Edit delivery zone' : 'Add delivery zone'}</h3>
            </div>

            <form className="delivery-zones-page__form" onSubmit={handleSubmit}>
              <div className="field-grid delivery-zones-page__form-grid">
                <label className="form-field">
                  Name
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field delivery-zones-page__full">
                  Coordinates
                  <textarea
                    name="coordinates"
                    value={form.coordinates}
                    onChange={handleChange}
                    rows="7"
                    placeholder="44.7161736,41.7262716; 44.7173753,41.716534; 44.7587456,41.7175591"
                    required
                  />
                </label>

                <div className="form-field delivery-zones-page__full">
                  Couriers
                  <div className="delivery-zones-page__courier-list">
                    {couriers.map((courier) => {
                      const courierName = `${courier.first_name} ${courier.last_name}`
                      const courierId = String(courier.id)

                      return (
                        <label key={courier.id} className="delivery-zones-page__courier-option">
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

              <p className="delivery-zones-page__hint">
                Use `lng,lat` pairs separated by semicolons or new lines. The polygon will be closed automatically.
              </p>

              {status.type === 'error' && status.message ? (
                <p className="status-message is-error">{status.message}</p>
              ) : null}

              <div className="delivery-zones-page__actions">
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
                  aria-label="Save delivery zone"
                  title="Save delivery zone"
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
