import { CloseIcon } from '../../../core/ui/icons.jsx'
import { DataTable } from '../../../core/ui/data-table.jsx'

export function ImportPreviewDialog({
  cities,
  importErrors,
  importFileName,
  importedItems,
  isTariffPerKgItem,
  isAdmin,
  isSubmitting,
  onClose,
  onConfirm,
  onUpdateItem,
  partners,
}) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section
        className="dialog-panel panel delivery-items-page__create-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="delivery-items-page__legend-head">
          <h3>Import preview</h3>
          <button
            type="button"
            className="button-secondary icon-button"
            aria-label="Close import preview"
            title="Close"
            onClick={onClose}
          >
            <CloseIcon className="action-icon" />
          </button>
        </div>

        <div className="delivery-items-page__import-summary">
          <strong>{importFileName}</strong>
          <span>{importedItems.length} rows ready for preview</span>
        </div>

        {importErrors.length ? (
          <div className="delivery-items-page__import-errors">
            {importErrors.map((importError) => (
              <p key={importError}>{importError}</p>
            ))}
          </div>
        ) : null}

        <DataTable
          wrapperClassName="delivery-items-page__import-table-wrap"
          tableClassName="delivery-items-page__import-table"
          headers={[
            ...(isAdmin ? ['Partner'] : []),
            'Product',
            'Customer',
            'Phone',
            'City',
            'Address',
            'Price',
            'Comment',
            'Delivery date',
          ]}
          emptyMessage="No import rows."
          rows={importedItems.map((item, index) => (
            <tr key={index}>
              {isAdmin ? (
                <td>
                  <select
                    value={item.partner_id ?? ''}
                    onChange={(event) => onUpdateItem(index, 'partner_id', event.target.value)}
                  >
                    <option value="">Partner</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </td>
              ) : null}
              <td>
                <input
                  type={isTariffPerKgItem(item) ? 'number' : 'text'}
                  min={isTariffPerKgItem(item) ? '0' : undefined}
                  step={isTariffPerKgItem(item) ? '0.01' : undefined}
                  inputMode={isTariffPerKgItem(item) ? 'decimal' : undefined}
                  value={item.product ?? ''}
                  onChange={(event) => onUpdateItem(index, 'product', event.target.value)}
                />
              </td>
              <td>
                <input
                  value={item.person_name ?? ''}
                  onChange={(event) => onUpdateItem(index, 'person_name', event.target.value)}
                />
              </td>
              <td>
                <input
                  value={item.phone ?? ''}
                  onChange={(event) => onUpdateItem(index, 'phone', event.target.value)}
                />
              </td>
              <td>
                <select
                  value={item.city ?? ''}
                  onChange={(event) => onUpdateItem(index, 'city', event.target.value)}
                >
                  <option value="">Choose city</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  value={item.address ?? ''}
                  onChange={(event) => onUpdateItem(index, 'address', event.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price ?? ''}
                  onChange={(event) => onUpdateItem(index, 'price', event.target.value)}
                />
              </td>
              <td>
                <input
                  value={item.comment ?? ''}
                  onChange={(event) => onUpdateItem(index, 'comment', event.target.value)}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={item.delivery_date ?? ''}
                  onChange={(event) => onUpdateItem(index, 'delivery_date', event.target.value)}
                />
              </td>
            </tr>
          ))}
        />

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
            type="button"
            className="button-primary"
            onClick={onConfirm}
            disabled={isSubmitting || !importedItems.length || Boolean(importErrors.length)}
          >
            Confirm import
          </button>
        </div>
      </section>
    </div>
  )
}
