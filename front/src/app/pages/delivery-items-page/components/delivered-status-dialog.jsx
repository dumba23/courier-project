export function DeliveredStatusDialog({
  isSubmitting,
  onClose,
  onCollectedAmountChange,
  onConfirm,
  onTransferredAmountChange,
  collectedAmount,
  transferredAmount,
}) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section
        className="dialog-panel panel delivery-items-page__delivered-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="delivery-items-page__legend-head">
          <h3>დელივერდის დეტალები</h3>
          <button
            type="button"
            className="button-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            დახურვა
          </button>
        </div>

        <form className="delivery-items-page__bulk-form" onSubmit={onConfirm}>
          <label className="form-field">
            მაღაზიასთან გადარიცხული თანხა
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={transferredAmount}
              onChange={(event) => onTransferredAmountChange(event.target.value)}
            />
          </label>

          <label className="form-field">
            მე ავიღე თანხა
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={collectedAmount}
              onChange={(event) => onCollectedAmountChange(event.target.value)}
            />
          </label>

          <div className="delivery-items-page__bulk-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              გაუქმება
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'ინახება...' : 'დადასტურება'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
