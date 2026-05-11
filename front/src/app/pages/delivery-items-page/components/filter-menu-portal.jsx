import { createPortal } from 'react-dom'

export function FilterMenuPortal({
  filterKey,
  getOptionLabel,
  headerActions = null,
  menuRef,
  openFilterMenu,
  options,
  selectedValues,
  style,
  onToggleValue,
}) {
  if (openFilterMenu !== filterKey || !style) {
    return null
  }

  return createPortal(
    <div
      ref={menuRef}
      className="delivery-items-table__multi-filter-menu delivery-items-table__multi-filter-menu--floating"
      style={style}
    >
      {headerActions ? (
        <div className="delivery-items-table__multi-filter-actions">
          {headerActions}
        </div>
      ) : null}
      {options.map((option) => (
        <label key={option.id ?? option[0]} className="delivery-items-table__multi-filter-option">
          <input
            type="checkbox"
            checked={selectedValues.includes(option.id ?? option[0])}
            onChange={() => onToggleValue(filterKey, option.id ?? option[0])}
          />
          <span>{getOptionLabel(option)}</span>
        </label>
      ))}
    </div>,
    document.body,
  )
}
