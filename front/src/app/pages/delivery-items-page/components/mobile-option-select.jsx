import { useEffect, useState } from 'react'

export function useIsMobile(breakpoint = 768) {
  const getMatches = () => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  }

  const [isMobile, setIsMobile] = useState(getMatches)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handleChange = (event) => setIsMobile(event.matches)

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [breakpoint])

  return isMobile
}

export function MobileOptionSelect({
  disabled,
  label,
  options,
  placeholder = 'Choose',
  value,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((option) => String(option.value) === String(value ?? ''))
  const selectedLabel = selectedOption?.label ?? placeholder

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        className="delivery-items-table__mobile-select-trigger"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        {selectedLabel}
      </button>

      {isOpen ? (
        <div className="dialog-backdrop" onClick={() => setIsOpen(false)}>
          <section
            className="dialog-panel panel delivery-items-page__mobile-select-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delivery-items-page__legend-head">
              <h3>{label}</h3>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="delivery-items-page__mobile-select-list" role="listbox" aria-label={label}>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`delivery-items-page__mobile-select-option${
                    String(option.value) === String(value ?? '') ? ' is-selected' : ''
                  }`}
                  onClick={() => {
                    onChange(String(option.value))
                    setIsOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
