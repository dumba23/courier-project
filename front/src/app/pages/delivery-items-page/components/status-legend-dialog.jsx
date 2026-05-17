import { CloseIcon } from "../../../core/ui/icons.jsx";

export function StatusLegendDialog({ descriptions, labels, onClose }) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section
        className="dialog-panel panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="delivery-items-page__legend-head">
          <h3>სტატუსების ახსნა</h3>
          <button
            type="button"
            className="button-secondary icon-button"
            aria-label="Close status colors"
            title="ჩახურვა"
            onClick={onClose}
          >
            <CloseIcon className="action-icon" />
          </button>
        </div>

        <div className="delivery-items-page__legend">
          {Object.entries(labels).map(([status, label]) => (
            <div key={status} className="delivery-items-page__legend-item">
              <span
                className={`delivery-items-page__legend-swatch delivery-items-page__legend-swatch--${status}`}
              />
              <div>
                <strong>{label}</strong>
                <p>{descriptions[status]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
