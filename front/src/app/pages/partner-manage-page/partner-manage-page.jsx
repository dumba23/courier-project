import { useEffect, useState } from 'react'
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
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
  tariff_per_kg: false,
  tariff_per_kg_ranges: [
    { up_to_kg: '', price: '' },
  ],
  password: '',
  password_confirmation: '',
}

function createEmptyTariffRange() {
  return { up_to_kg: '', price: '' }
}

function formatTariffCell(partner) {
  if (!partner.tariff_per_kg) {
    return partner.tariff
  }

  const ranges = Array.isArray(partner.tariff_per_kg_ranges)
    ? partner.tariff_per_kg_ranges
    : []

  if (!ranges.length) {
    return 'Per kg'
  }

  return ranges
    .map((range) => `${range.up_to_kg} კგ - ${range.price} ₾`)
    .join(', ')
}

export function PartnerManagePage({ auth }) {
  const [partners, setPartners] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingPartnerId, setEditingPartnerId] = useState(null)
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
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      ...(name === 'tariff_per_kg'
        ? {
            tariff_per_kg: checked,
            tariff: checked ? '' : current.tariff,
            tariff_per_kg_ranges: checked
              ? (current.tariff_per_kg_ranges.length ? current.tariff_per_kg_ranges : [createEmptyTariffRange()])
              : current.tariff_per_kg_ranges,
          }
        : {
            [name]: type === 'checkbox' ? checked : value,
          }),
    }))
  }

  function handleRangeChange(index, field, value) {
    setForm((current) => ({
      ...current,
      tariff_per_kg_ranges: current.tariff_per_kg_ranges.map((range, rangeIndex) => (
        rangeIndex === index
          ? { ...range, [field]: value }
          : range
      )),
    }))
  }

  function handleAddRange() {
    setForm((current) => ({
      ...current,
      tariff_per_kg_ranges: [...current.tariff_per_kg_ranges, createEmptyTariffRange()],
    }))
  }

  function handleRemoveRange(index) {
    setForm((current) => ({
      ...current,
      tariff_per_kg_ranges: current.tariff_per_kg_ranges.length === 1
        ? current.tariff_per_kg_ranges
        : current.tariff_per_kg_ranges.filter((_, rangeIndex) => rangeIndex !== index),
    }))
  }

  function openCreateDialog() {
    setStatus({ type: '', message: '' })
    setEditingPartnerId(null)
    setForm(initialForm)
    setIsDialogOpen(true)
  }

  function openEditDialog(partner) {
    setStatus({ type: '', message: '' })
    setEditingPartnerId(partner.id)
    setForm({
      name: partner.name ?? '',
      email: partner.user?.email ?? '',
      phone_number: partner.phone_number ?? '',
      pickup_address: partner.pickup_address ?? '',
      tariff: partner.tariff ?? '',
      tariff_per_kg: Boolean(partner.tariff_per_kg),
      tariff_per_kg_ranges: Array.isArray(partner.tariff_per_kg_ranges) && partner.tariff_per_kg_ranges.length
        ? partner.tariff_per_kg_ranges.map((range) => ({
            up_to_kg: range.up_to_kg ?? '',
            price: range.price ?? '',
          }))
        : [createEmptyTariffRange()],
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
    setEditingPartnerId(null)
    setForm(initialForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })
    const isEditing = Boolean(editingPartnerId)

    try {
      const payload = await apiRequest(isEditing ? `/api/partners/${editingPartnerId}` : '/api/partners', {
        method: isEditing ? 'PUT' : 'POST',
        token: auth?.token,
        body: JSON.stringify({
          ...form,
          tariff: form.tariff_per_kg ? null : form.tariff,
          tariff_per_kg_ranges: form.tariff_per_kg
            ? form.tariff_per_kg_ranges
            : [],
          password: form.password || null,
          password_confirmation: form.password_confirmation || null,
        }),
      })

      if (isEditing) {
        setPartners((current) => current.map((partner) => (
          partner.id === payload.partner.id ? payload.partner : partner
        )))
      } else {
        setPartners((current) => [payload.partner, ...current])
      }

      setForm(initialForm)
      setEditingPartnerId(null)
      setIsDialogOpen(false)
      setStatus({
        type: 'success',
        message: isEditing ? 'Partner updated.' : 'Partner created.',
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

  const isEditing = Boolean(editingPartnerId)

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
          headers={['Name', 'Email', 'Phone', 'Pickup address', 'Tariff', '']}
          emptyMessage="No partners."
          rows={partners.map((partner) => (
            <tr key={partner.id}>
              <td>{partner.name}</td>
              <td>{partner.user?.email}</td>
              <td>{partner.phone_number}</td>
              <td>{partner.pickup_address}</td>
              <td>{formatTariffCell(partner)}</td>
              <td className="partner-table__actions">
                <button
                  type="button"
                  className="button-secondary partner-table__edit icon-button"
                  onClick={() => openEditDialog(partner)}
                  aria-label={`Edit ${partner.name}`}
                  title={`Edit ${partner.name}`}
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
            <div className="partner-manage-page__dialog-head">
              <h3>{isEditing ? 'Edit partner' : 'Add partner'}</h3>
              {isEditing ? <p>Leave password empty to keep the current password.</p> : null}
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

                <label className="form-field partner-manage-page__checkbox">
                  <span>Tariff per kg</span>
                  <input
                    name="tariff_per_kg"
                    type="checkbox"
                    checked={Boolean(form.tariff_per_kg)}
                    onChange={handleChange}
                  />
                </label>

                {form.tariff_per_kg ? (
                  <div className="form-field partner-manage-page__full">
                    <div className="partner-manage-page__tariff-ranges-head">
                      <span>Tariff ranges</span>
                      <button
                        type="button"
                        className="button-secondary icon-button"
                        onClick={handleAddRange}
                        aria-label="Add tariff range"
                        title="Add tariff range"
                      >
                        <PlusIcon className="action-icon" />
                      </button>
                    </div>

                    <div className="partner-manage-page__tariff-ranges">
                      {form.tariff_per_kg_ranges.map((range, index) => (
                        <div key={index} className="partner-manage-page__tariff-range-row">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={range.up_to_kg}
                            onChange={(event) => handleRangeChange(index, 'up_to_kg', event.target.value)}
                            placeholder="Up to kg"
                            required={form.tariff_per_kg}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={range.price}
                            onChange={(event) => handleRangeChange(index, 'price', event.target.value)}
                            placeholder="Price"
                            required={form.tariff_per_kg}
                          />
                          <button
                            type="button"
                            className="button-secondary icon-button"
                            onClick={() => handleRemoveRange(index)}
                            aria-label={`Remove tariff range ${index + 1}`}
                            title="Remove tariff range"
                            disabled={form.tariff_per_kg_ranges.length === 1}
                          >
                            <CloseIcon className="action-icon" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <label className="form-field">
                    Tariff
                    <input
                      name="tariff"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.tariff}
                      onChange={handleChange}
                      required={!form.tariff_per_kg}
                    />
                  </label>
                )}

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
                    required={!isEditing}
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
