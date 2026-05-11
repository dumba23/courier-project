import { useEffect, useState } from 'react'

export function ProductField({
  disabled,
  inputMode = 'text',
  itemId,
  value,
  onSave,
}) {
  const [draftValue, setDraftValue] = useState(value ?? '')

  useEffect(() => {
    setDraftValue(value ?? '')
  }, [value])

  const isDirty = draftValue !== (value ?? '')

  function saveIfNeeded() {
    if (!isDirty || disabled) {
      return
    }

    onSave(itemId, draftValue)
  }

  return (
    <input
      className="delivery-items-page__product-input"
      type={inputMode === 'decimal' ? 'number' : 'text'}
      min={inputMode === 'decimal' ? '0' : undefined}
      step={inputMode === 'decimal' ? '0.01' : undefined}
      inputMode={inputMode === 'decimal' ? 'decimal' : undefined}
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={saveIfNeeded}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          saveIfNeeded()
          event.currentTarget.blur()
        }
      }}
      disabled={disabled}
    />
  )
}
