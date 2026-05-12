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

function createEmptyTariffRange() {
  return { up_to_kg: '', price: '' }
}

function createEmptyCityOverride(isTariffPerKg = false) {
  return {
    city_name: '',
    tariff: '',
    tariff_per_kg_ranges: isTariffPerKg ? [createEmptyTariffRange()] : [],
  }
}

function createInitialForm() {
  return {
    name: '',
    email: '',
    phone_number: '',
    pickup_address: '',
    tariff: '',
    tariff_per_kg: false,
    tariff_per_kg_ranges: [
      createEmptyTariffRange(),
    ],
    city_tariff_overrides: [],
    password: '',
    password_confirmation: '',
  }
}

function formatTariffCell(partner) {
  const cityOverrideCount = Array.isArray(partner.city_tariff_overrides)
    ? partner.city_tariff_overrides.length
    : 0

  if (!partner.tariff_per_kg) {
    return cityOverrideCount
      ? `${partner.tariff} ₾ · ${cityOverrideCount} city override${cityOverrideCount > 1 ? 's' : ''}`
      : `${partner.tariff} ₾`
  }

  const ranges = Array.isArray(partner.tariff_per_kg_ranges)
    ? partner.tariff_per_kg_ranges
    : []

  if (!ranges.length) {
    return cityOverrideCount
      ? `Per kg · ${cityOverrideCount} city override${cityOverrideCount > 1 ? 's' : ''}`
      : 'Per kg'
  }

  const baseLabel = ranges
    .map((range) => `${range.up_to_kg} კგ - ${range.price} ₾`)
    .join(', ')

  return cityOverrideCount
    ? `${baseLabel} · ${cityOverrideCount} city override${cityOverrideCount > 1 ? 's' : ''}`
    : baseLabel
}

function normalizeOverrideFormFromPartner(partner) {
  const overrides = Array.isArray(partner.city_tariff_overrides)
    ? partner.city_tariff_overrides
    : []

  if (!overrides.length) {
    return []
  }

  return overrides.map((override) => ({
    city_name: override.city_name ?? '',
    tariff: override.tariff ?? '',
    tariff_per_kg_ranges: Array.isArray(override.tariff_per_kg_ranges) && override.tariff_per_kg_ranges.length
      ? override.tariff_per_kg_ranges.map((range) => ({
          up_to_kg: range.up_to_kg ?? '',
          price: range.price ?? '',
        }))
      : [createEmptyTariffRange()],
  }))
}

export function PartnerManagePage({ auth }) {
  const [partners, setPartners] = useState([])
  const [cities, setCities] = useState([])
  const [form, setForm] = useState(createInitialForm)
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

  useEffect(() => {
    async function loadCities() {
      try {
        const payload = await apiRequest('/api/cities', {
          token: auth?.token,
        })

        setCities(payload.cities ?? [])
      } catch (requestError) {
        setStatus((current) => ({
          type: 'error',
          message: current.message || requestError.message,
        }))
      }
    }

    loadCities()
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
            city_tariff_overrides: current.city_tariff_overrides.map((override) => (
              checked
                ? {
                    city_name: override.city_name,
                    tariff: '',
                    tariff_per_kg_ranges: Array.isArray(override.tariff_per_kg_ranges) && override.tariff_per_kg_ranges.length
                      ? override.tariff_per_kg_ranges
                      : [createEmptyTariffRange()],
                  }
                : {
                    city_name: override.city_name,
                    tariff: override.tariff,
                    tariff_per_kg_ranges: [],
                  }
            )),
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

  function handleCityOverrideChange(index, field, value) {
    setForm((current) => ({
      ...current,
      city_tariff_overrides: current.city_tariff_overrides.map((override, overrideIndex) => (
        overrideIndex === index
          ? { ...override, [field]: value }
          : override
      )),
    }))
  }

  function handleAddCityOverride() {
    setForm((current) => ({
      ...current,
      city_tariff_overrides: [
        ...current.city_tariff_overrides,
        createEmptyCityOverride(Boolean(current.tariff_per_kg)),
      ],
    }))
  }

  function handleRemoveCityOverride(index) {
    setForm((current) => ({
      ...current,
      city_tariff_overrides: current.city_tariff_overrides.filter((_, overrideIndex) => overrideIndex !== index),
    }))
  }

  function handleCityOverrideRangeChange(overrideIndex, rangeIndex, field, value) {
    setForm((current) => ({
      ...current,
      city_tariff_overrides: current.city_tariff_overrides.map((override, currentOverrideIndex) => {
        if (currentOverrideIndex !== overrideIndex) {
          return override
        }

        return {
          ...override,
          tariff_per_kg_ranges: override.tariff_per_kg_ranges.map((range, currentRangeIndex) => (
            currentRangeIndex === rangeIndex
              ? { ...range, [field]: value }
              : range
          )),
        }
      }),
    }))
  }

  function handleAddCityOverrideRange(overrideIndex) {
    setForm((current) => ({
      ...current,
      city_tariff_overrides: current.city_tariff_overrides.map((override, currentOverrideIndex) => {
        if (currentOverrideIndex !== overrideIndex) {
          return override
        }

        return {
          ...override,
          tariff_per_kg_ranges: [...override.tariff_per_kg_ranges, createEmptyTariffRange()],
        }
      }),
    }))
  }

  function handleRemoveCityOverrideRange(overrideIndex, rangeIndex) {
    setForm((current) => ({
      ...current,
      city_tariff_overrides: current.city_tariff_overrides.map((override, currentOverrideIndex) => {
        if (currentOverrideIndex !== overrideIndex) {
          return override
        }

        return {
          ...override,
          tariff_per_kg_ranges: override.tariff_per_kg_ranges.length === 1
            ? override.tariff_per_kg_ranges
            : override.tariff_per_kg_ranges.filter((_, currentRangeIndex) => currentRangeIndex !== rangeIndex),
        }
      }),
    }))
  }

  function openCreateDialog() {
    setStatus({ type: '', message: '' })
    setEditingPartnerId(null)
    setForm(createInitialForm())
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
      city_tariff_overrides: normalizeOverrideFormFromPartner(partner),
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
    setForm(createInitialForm())
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
          city_tariff_overrides: form.city_tariff_overrides.map((override) => ({
            city_name: override.city_name,
            tariff: form.tariff_per_kg ? null : override.tariff,
            tariff_per_kg_ranges: form.tariff_per_kg
              ? override.tariff_per_kg_ranges
              : [],
          })),
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

      setForm(createInitialForm())
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
                      <span>Default tariff ranges</span>
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
                    Default tariff
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

                <div className="form-field partner-manage-page__full">
                  <div className="partner-manage-page__tariff-ranges-head">
                    <span>City overrides</span>
                    <button
                      type="button"
                      className="button-secondary icon-button"
                      onClick={handleAddCityOverride}
                      aria-label="Add city override"
                      title="Add city override"
                    >
                      <PlusIcon className="action-icon" />
                    </button>
                  </div>

                  {form.city_tariff_overrides.length ? (
                    <div className="partner-manage-page__city-overrides">
                      {form.city_tariff_overrides.map((override, overrideIndex) => (
                        <div key={overrideIndex} className="partner-manage-page__city-override-card">
                          <div className="partner-manage-page__city-override-head">
                            <label className="form-field">
                              City
                              <select
                                value={override.city_name}
                                onChange={(event) => handleCityOverrideChange(overrideIndex, 'city_name', event.target.value)}
                                required
                              >
                                <option value="">Select city</option>
                                {cities.map((city) => (
                                  <option key={city.id} value={city.name}>
                                    {city.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <button
                              type="button"
                              className="button-secondary icon-button"
                              onClick={() => handleRemoveCityOverride(overrideIndex)}
                              aria-label={`Remove city override ${overrideIndex + 1}`}
                              title="Remove city override"
                            >
                              <CloseIcon className="action-icon" />
                            </button>
                          </div>

                          {form.tariff_per_kg ? (
                            <div className="partner-manage-page__city-override-ranges">
                              <div className="partner-manage-page__tariff-ranges-head">
                                <span>Override ranges</span>
                                <button
                                  type="button"
                                  className="button-secondary icon-button"
                                  onClick={() => handleAddCityOverrideRange(overrideIndex)}
                                  aria-label={`Add range for ${override.city_name || 'city override'}`}
                                  title="Add range"
                                >
                                  <PlusIcon className="action-icon" />
                                </button>
                              </div>

                              <div className="partner-manage-page__tariff-ranges">
                                {override.tariff_per_kg_ranges.map((range, rangeIndex) => (
                                  <div key={rangeIndex} className="partner-manage-page__tariff-range-row">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={range.up_to_kg}
                                      onChange={(event) => handleCityOverrideRangeChange(overrideIndex, rangeIndex, 'up_to_kg', event.target.value)}
                                      placeholder="Up to kg"
                                      required={form.tariff_per_kg}
                                    />
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={range.price}
                                      onChange={(event) => handleCityOverrideRangeChange(overrideIndex, rangeIndex, 'price', event.target.value)}
                                      placeholder="Price"
                                      required={form.tariff_per_kg}
                                    />
                                    <button
                                      type="button"
                                      className="button-secondary icon-button"
                                      onClick={() => handleRemoveCityOverrideRange(overrideIndex, rangeIndex)}
                                      aria-label={`Remove range ${rangeIndex + 1}`}
                                      title="Remove range"
                                      disabled={override.tariff_per_kg_ranges.length === 1}
                                    >
                                      <CloseIcon className="action-icon" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <label className="form-field">
                              Override tariff
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={override.tariff}
                                onChange={(event) => handleCityOverrideChange(overrideIndex, 'tariff', event.target.value)}
                                required
                              />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="partner-manage-page__hint">
                      Default tariff will be used for all cities until you add an override.
                    </p>
                  )}
                </div>

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
