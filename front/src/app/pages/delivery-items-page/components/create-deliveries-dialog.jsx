import { CloseIcon, PlusIcon, TrashIcon } from "../../../core/ui/icons.jsx";

export function CreateDeliveriesDialog({
  cities,
  draftItems,
  isTariffPerKgItem,
  isAdmin,
  isSubmitting,
  onAddRow,
  onClose,
  onRemoveRow,
  onSubmit,
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
          <h3>Add deliveries</h3>
          <button
            type="button"
            className="button-secondary icon-button"
            aria-label="Close add deliveries"
            title="Close"
            onClick={onClose}
          >
            <CloseIcon className="action-icon" />
          </button>
        </div>

        <form className="delivery-items-page__create-form" onSubmit={onSubmit}>
          <div className="delivery-items-page__create-toolbar">
            <button
              type="button"
              className="button-secondary icon-button"
              aria-label="Add row"
              title="Add row"
              onClick={onAddRow}
            >
              <PlusIcon className="action-icon" />
            </button>
          </div>

          <div className="delivery-items-page__create-table-wrap">
            <table className="delivery-items-page__create-table">
              <thead>
                <tr>
                  <th>#</th>
                  {isAdmin ? <th>Partner</th> : null}
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Address</th>
                  <th>Price</th>
                  <th>Comment</th>
                  <th>Delivery date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {draftItems.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    {isAdmin ? (
                      <td>
                        <select
                          value={item.partner_id}
                          onChange={(event) =>
                            onUpdateItem(
                              index,
                              "partner_id",
                              event.target.value,
                            )
                          }
                          required
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
                        type={isTariffPerKgItem(item) ? "number" : "text"}
                        min={isTariffPerKgItem(item) ? "0" : undefined}
                        step={isTariffPerKgItem(item) ? "0.01" : undefined}
                        inputMode={isTariffPerKgItem(item) ? "decimal" : undefined}
                        value={item.product}
                        onChange={(event) =>
                          onUpdateItem(index, "product", event.target.value)
                        }
                        placeholder={isTariffPerKgItem(item) ? "Weight / decimal" : "Product"}
                        required
                      />
                    </td>
                    <td>
                      <input
                        value={item.person_name}
                        onChange={(event) =>
                          onUpdateItem(index, "person_name", event.target.value)
                        }
                        placeholder="Customer"
                        required
                      />
                    </td>
                    <td>
                      <input
                        value={item.phone}
                        onChange={(event) =>
                          onUpdateItem(index, "phone", event.target.value)
                        }
                        placeholder="Phone"
                        required
                      />
                    </td>
                    <td>
                      <select
                        value={item.city}
                        onChange={(event) =>
                          onUpdateItem(index, "city", event.target.value)
                        }
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
                        value={item.address}
                        onChange={(event) =>
                          onUpdateItem(index, "address", event.target.value)
                        }
                        placeholder="Address"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(event) =>
                          onUpdateItem(index, "price", event.target.value)
                        }
                        placeholder="Price"
                        required
                      />
                    </td>
                    <td>
                      <input
                        value={item.comment}
                        onChange={(event) =>
                          onUpdateItem(index, "comment", event.target.value)
                        }
                        placeholder="Comment"
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={item.delivery_date}
                        onChange={(event) =>
                          onUpdateItem(
                            index,
                            "delivery_date",
                            event.target.value,
                          )
                        }
                        required
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button-secondary icon-button"
                        aria-label="Remove row"
                        title="Remove row"
                        onClick={() => onRemoveRow(index)}
                        disabled={draftItems.length === 1}
                      >
                        <TrashIcon className="action-icon" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
              disabled={isSubmitting}
            >
              Create
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
