import { useEffect, useState } from 'react'

export function InlineTextField({
  className = '',
  disabled,
  itemId,
  value,
  onSave,
  placeholder = '',
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
      className={className}
      type="text"
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
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}
