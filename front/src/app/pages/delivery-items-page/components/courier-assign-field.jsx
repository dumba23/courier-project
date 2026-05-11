import { useEffect, useMemo, useRef, useState } from 'react'
import { MobileOptionSelect, useIsMobile } from './mobile-option-select.jsx'

function getCourierLabel(courier) {
  return `${courier.first_name} ${courier.last_name}`.trim()
}

export function CourierAssignField({
  couriers,
  disabled,
  itemId,
  selectedCourierId,
  onAssign,
}) {
  const isMobile = useIsMobile()
  const wrapperRef = useRef(null)
  const selectedCourier = useMemo(
    () => couriers.find((courier) => String(courier.id) === String(selectedCourierId ?? '')) ?? null,
    [couriers, selectedCourierId],
  )
  const selectedLabel = selectedCourier ? getCourierLabel(selectedCourier) : ''
  const [query, setQuery] = useState(selectedLabel)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setQuery(selectedLabel)
  }, [selectedLabel])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleOutsideClick(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false)
        setQuery(selectedLabel)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen, selectedLabel])

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return couriers
    }

    return couriers.filter((courier) => getCourierLabel(courier).toLowerCase().includes(normalizedQuery))
  }, [couriers, query])

  async function commitValue(nextValue) {
    setIsOpen(false)
    setQuery(nextValue ? getCourierLabel(nextValue) : '')
    await onAssign(itemId, nextValue ? String(nextValue.id) : '')
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        setIsOpen(false)
        setQuery(selectedLabel)
      }
    }, 0)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setQuery(selectedLabel)
      event.currentTarget.blur()
      return
    }

    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()

    if (!query.trim()) {
      commitValue(null)
      return
    }

    const exactMatch = couriers.find((courier) => (
      getCourierLabel(courier).toLowerCase() === query.trim().toLowerCase()
    ))

    if (exactMatch) {
      commitValue(exactMatch)
      return
    }

    if (suggestions.length === 1) {
      commitValue(suggestions[0])
      return
    }

    setQuery(selectedLabel)
    setIsOpen(false)
  }

  if (isMobile) {
    const options = [
      { value: '', label: 'Unassigned' },
      ...couriers.map((courier) => ({
        value: String(courier.id),
        label: getCourierLabel(courier),
      })),
    ]

    return (
      <MobileOptionSelect
        disabled={disabled}
        label="Select courier"
        options={options}
        placeholder="Unassigned"
        value={selectedCourierId ?? ''}
        onChange={(nextValue) => onAssign(itemId, nextValue)}
      />
    )
  }

  return (
    <div className="courier-assign-field" ref={wrapperRef} onBlur={handleBlur}>
      <input
        type="text"
        className="delivery-items-table__status-select courier-assign-field__input"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Type courier name"
        autoComplete="off"
        disabled={disabled}
      />

      {isOpen ? (
        <div className="courier-assign-field__menu" role="listbox">
          <button
            type="button"
            className="courier-assign-field__option"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => commitValue(null)}
          >
            Unassigned
          </button>
          {suggestions.length ? (
            suggestions.map((courier) => (
              <button
                key={courier.id}
                type="button"
                className={`courier-assign-field__option${
                  String(courier.id) === String(selectedCourierId ?? '') ? ' is-selected' : ''
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commitValue(courier)}
              >
                {getCourierLabel(courier)}
              </button>
            ))
          ) : (
            <div className="courier-assign-field__empty">No matching couriers</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
