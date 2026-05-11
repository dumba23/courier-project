import { CloseIcon } from '../../../core/ui/icons.jsx'
import {
  BULK_ACTION_ACTUAL_DELIVERY_DATE,
  BULK_ACTION_COURIER,
  BULK_ACTION_DELIVERY_DATE,
  BULK_ACTION_STATUS,
  STATUS_OPTIONS,
} from '../delivery-items.constants.js'

export function BulkUpdateDialog({
  bulkDialogType,
  bulkValue,
  couriers,
  isSubmitting,
  metaTotal,
  onClose,
  onSubmit,
  statusOptions,
  onValueChange,
}) {
  const bulkDialogTitle = bulkDialogType === BULK_ACTION_STATUS
    ? 'Update filtered statuses'
    : bulkDialogType === BULK_ACTION_COURIER
      ? 'Update filtered courier'
    : bulkDialogType === BULK_ACTION_DELIVERY_DATE
      ? 'Update filtered delivery date'
      : bulkDialogType === BULK_ACTION_ACTUAL_DELIVERY_DATE
        ? 'Update filtered completion date'
      : 'Update filtered return date'

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section
        className="dialog-panel panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="delivery-items-page__legend-head">
          <h3>{bulkDialogTitle}</h3>
          <button
            type="button"
            className="button-secondary icon-button"
            aria-label="Close bulk update"
            title="Close"
            onClick={onClose}
          >
            <CloseIcon className="action-icon" />
          </button>
        </div>

        <form className="delivery-items-page__bulk-form" onSubmit={onSubmit}>
          <p className="delivery-items-page__bulk-copy">
            {metaTotal
              ? `This will update ${metaTotal} filtered delivery items.`
              : 'No filtered delivery items are currently available.'}
          </p>

          {bulkDialogType === BULK_ACTION_STATUS ? (
            <label className="form-field">
              Status
              <select value={bulkValue} onChange={(event) => onValueChange(event.target.value)} required>
                {statusOptions.map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : bulkDialogType === BULK_ACTION_COURIER ? (
            <label className="form-field">
              Courier
              <select value={bulkValue} onChange={(event) => onValueChange(event.target.value)}>
                <option value="">Unassigned</option>
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.first_name} {courier.last_name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="form-field">
              Date
              <input
                type="date"
                value={bulkValue}
                onChange={(event) => onValueChange(event.target.value)}
                required
              />
            </label>
          )}

          <div className="delivery-items-page__bulk-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={isSubmitting || !metaTotal}
            >
              Confirm
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
