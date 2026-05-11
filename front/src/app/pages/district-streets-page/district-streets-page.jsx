import { useEffect, useState } from 'react'
import { apiRequest } from '../../core/http/api.js'
import { DataTable } from '../../core/ui/data-table.jsx'
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
} from '../../core/ui/icons.jsx'
import './district-streets-page.scss'

const initialForm = {
  city: 'Tbilisi',
  district_name: '',
  street_name: '',
  aliases: '',
  is_active: true,
}

export function DistrictStreetsPage({ auth }) {
  const [districtStreets, setDistrictStreets] = useState([])
  const [districts, setDistricts] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingDistrictStreetId, setEditingDistrictStreetId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [streetsPayload, districtsPayload] = await Promise.all([
          apiRequest('/api/district-streets', {
            token: auth?.token,
          }),
          apiRequest('/api/districts', {
            token: auth?.token,
          }),
        ])

        setDistrictStreets(streetsPayload.district_streets ?? [])
        setDistricts(districtsPayload.districts ?? [])
      } catch (requestError) {
        setStatus({
          type: 'error',
          message: requestError.message,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [auth?.token])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function openCreateDialog() {
    setStatus({ type: '', message: '' })
    setEditingDistrictStreetId(null)
    setForm({
      ...initialForm,
      district_name: districts[0]?.name ?? '',
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(districtStreet) {
    setStatus({ type: '', message: '' })
    setEditingDistrictStreetId(districtStreet.id)
    setForm({
      city: districtStreet.city ?? 'Tbilisi',
      district_name: districtStreet.district_name ?? '',
      street_name: districtStreet.street_name ?? '',
      aliases: Array.isArray(districtStreet.aliases) ? districtStreet.aliases.join(', ') : '',
      is_active: districtStreet.is_active ?? true,
    })
    setIsDialogOpen(true)
  }

  function closeDialog() {
    if (isSubmitting) {
      return
    }

    setIsDialogOpen(false)
    setEditingDistrictStreetId(null)
    setForm(initialForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    const aliases = form.aliases
      .split(',')
      .map((alias) => alias.trim())
      .filter(Boolean)

    try {
      const payload = await apiRequest(
        editingDistrictStreetId ? `/api/district-streets/${editingDistrictStreetId}` : '/api/district-streets',
        {
          method: editingDistrictStreetId ? 'PUT' : 'POST',
          token: auth?.token,
          body: JSON.stringify({
            city: form.city,
            district_name: form.district_name,
            street_name: form.street_name,
            aliases,
            is_active: form.is_active,
          }),
        },
      )

      if (editingDistrictStreetId) {
        setDistrictStreets((current) =>
          current.map((districtStreet) =>
            districtStreet.id === payload.district_street.id ? payload.district_street : districtStreet,
          ),
        )
      } else {
        setDistrictStreets((current) => [payload.district_street, ...current])
      }

      setForm(initialForm)
      setEditingDistrictStreetId(null)
      setIsDialogOpen(false)
      setStatus({
        type: 'success',
        message: editingDistrictStreetId ? 'Street updated.' : 'Street added.',
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
    <section className="district-streets-page">
      <header className="district-streets-page__header">
        <h2 className="page-title">District Streets</h2>
        <button
          type="button"
          className="button-primary icon-button"
          onClick={openCreateDialog}
          aria-label="Add street"
          title="Add street"
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
          tableClassName="district-streets-table"
          headers={['District', 'Street', 'Aliases', 'City', 'Status', '']}
          emptyMessage="No district streets."
          rows={districtStreets.map((districtStreet) => (
            <tr key={districtStreet.id}>
              <td>{districtStreet.district_name}</td>
              <td>{districtStreet.street_name}</td>
              <td>{districtStreet.aliases?.length ? districtStreet.aliases.join(', ') : '-'}</td>
              <td>{districtStreet.city}</td>
              <td>{districtStreet.is_active ? 'Active' : 'Inactive'}</td>
              <td className="district-streets-table__actions">
                <button
                  type="button"
                  className="button-secondary icon-button"
                  onClick={() => openEditDialog(districtStreet)}
                  aria-label={`Edit ${districtStreet.street_name}`}
                  title={`Edit ${districtStreet.street_name}`}
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
            <div className="district-streets-page__dialog-head">
              <h3>{editingDistrictStreetId ? 'Edit street' : 'Add street'}</h3>
            </div>

            <form className="district-streets-page__form" onSubmit={handleSubmit}>
              <div className="field-grid district-streets-page__form-grid">
                <label className="form-field">
                  District
                  <select
                    name="district_name"
                    value={form.district_name}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>Select district</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.name}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  Street
                  <input
                    name="street_name"
                    value={form.street_name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  City
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field district-streets-page__toggle">
                  <span>Active</span>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                </label>

                <label className="form-field district-streets-page__full">
                  Aliases
                  <input
                    name="aliases"
                    value={form.aliases}
                    onChange={handleChange}
                    placeholder="Comma separated aliases"
                  />
                </label>
              </div>

              {status.type === 'error' && status.message ? (
                <p className="status-message is-error">{status.message}</p>
              ) : null}

              <div className="district-streets-page__actions">
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
                  aria-label={editingDistrictStreetId ? 'Update street' : 'Save street'}
                  title={editingDistrictStreetId ? 'Update street' : 'Save street'}
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
