import { CloseIcon } from "../../../core/ui/icons.jsx";

export function ColumnsDialog({
  columns,
  onClose,
  onToggleColumn,
  visibleColumnCount,
  visibleColumns,
}) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section
        className="dialog-panel panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="delivery-items-page__legend-head">
          <h3>სვეტები</h3>
          <button
            type="button"
            className="button-secondary icon-button"
            aria-label="Close column settings"
            title="Close"
            onClick={onClose}
          >
            <CloseIcon className="action-icon" />
          </button>
        </div>

        <div className="delivery-items-page__column-list">
          {columns.map((column) => (
            <label
              key={column.key}
              className="delivery-items-page__column-option"
            >
              <input
                type="checkbox"
                checked={visibleColumns[column.key]}
                onChange={() => onToggleColumn(column.key)}
                disabled={
                  visibleColumns[column.key] && visibleColumnCount === 1
                }
              />
              <span>{column.label}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
