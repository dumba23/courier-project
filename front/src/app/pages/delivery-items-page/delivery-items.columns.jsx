import { CalendarIcon, CheckIcon } from "../../core/ui/icons.jsx";
import { CourierCommentField } from "./components/courier-comment-field.jsx";
import { CourierAssignField } from "./components/courier-assign-field.jsx";
import { InlineTextField } from "./components/inline-text-field.jsx";
import { MobileOptionSelect } from "./components/mobile-option-select.jsx";
import { ProductField } from "./components/product-field.jsx";
import {
  ADDITIONAL_STATUS_LABELS,
  ADDITIONAL_STATUS_OPTIONS,
  BULK_ACTION_ACTUAL_DELIVERY_DATE,
  BULK_ACTION_COURIER,
  BULK_ACTION_DELIVERY_DATE,
  BULK_ACTION_RETURN_DATE,
  BULK_ACTION_STATUS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  WAREHOUSE_STATE_LABELS,
  WAREHOUSE_STATE_OPTIONS,
} from "./delivery-items.constants.js";
import {
  formatDate,
  getCourierName,
  getSortIndicator,
} from "./delivery-items.utils.js";

function renderColumnHeader(label, sortKey, sort, onSort, actionButton = null) {
  return (
    <div className="delivery-items-table__head-content">
      <button
        type="button"
        className="table-sort"
        onClick={() => onSort(sortKey)}
      >
        {label} {getSortIndicator(sort, sortKey)}
      </button>
      {actionButton}
    </div>
  );
}

export function buildDeliveryItemColumns({
  activeFilterMenu,
  couriers,
  courierFilterLabel,
  courierCommentUpdateId,
  courierCommentTemplates,
  courierUpdateId,
  districtUpdateId,
  cityUpdateId,
  priceUpdateId,
  productUpdateId,
  additionalStatusUpdateId,
  warehouseStateUpdateId,
  cities,
  filters,
  handleAdditionalStatusUpdate,
  handleCourierCommentUpdate,
  handleProductUpdate,
  handlePriceUpdate,
  handleDistrictUpdate,
  handleCityUpdate,
  handleWarehouseStateUpdate,
  getFilterTriggerRef,
  handleCourierUpdate,
  handleFilterChange,
  handleStatusUpdate,
  isAdmin,
  isMobile,
  metaTotal,
  onOpenBulkDialog,
  onSort,
  onToggleFilterMenu,
  partnerFilterLabel,
  sort,
  statusLabels,
  statusOptions,
  statusFilterLabel,
  statusUpdateId,
  warehouseStateFilterLabel,
  viewScope,
}) {
  const columns = [
    {
      key: "product",
      header: renderColumnHeader("პროდუქტი", "product", sort, onSort),
      filter: (
        <input
          name="product"
          value={filters.product}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) => (
        item.can_edit_product ? (
          <ProductField
            className="delivery-items-table__status-select delivery-items-page__product-input"
            disabled={productUpdateId === item.id}
            inputMode={item.is_tariff_per_kg_product ? "decimal" : "text"}
            itemId={item.id}
            value={item.product}
            onSave={handleProductUpdate}
          />
        ) : (
          item.product
        )
      ),
      label: "პროდუქტი",
    },
    {
      key: "person_name",
      header: renderColumnHeader("მომხმარებელი", "person_name", sort, onSort),
      filter: (
        <input
          name="person_name"
          value={filters.person_name}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) => item.person_name,
      label: "მომხმარებელი",
    },
    {
      key: "phone",
      header: renderColumnHeader("ტელეფონი", "phone", sort, onSort),
      filter: (
        <input
          name="phone"
          value={filters.phone ?? ""}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) => item.phone,
      label: "ტელეფონი",
    },
    {
      key: "partner",
      header: renderColumnHeader("პარტნიორი", "partner", sort, onSort),
      filter: isAdmin ? (
        <div className="delivery-items-table__multi-filter">
          <button
            type="button"
            className="delivery-items-table__multi-filter-button"
            onClick={() => onToggleFilterMenu("partner_ids")}
            aria-haspopup="dialog"
            aria-expanded={activeFilterMenu === "partner_ids"}
            title="Filter partners"
            ref={getFilterTriggerRef("partner_ids")}
          >
            {partnerFilterLabel}
          </button>
        </div>
      ) : (
        <input
          name="partner"
          value={filters.partner ?? ""}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) => item.partner?.name,
      label: "პარტნიორი",
    },
    {
      key: "courier",
      header: renderColumnHeader(
        "კურიერი",
        "courier",
        sort,
        onSort,
        isAdmin ? (
          <button
            type="button"
            className="button-secondary icon-button delivery-items-table__head-action"
            onClick={() => onOpenBulkDialog(BULK_ACTION_COURIER)}
            aria-label="Update filtered couriers"
            title="Update filtered couriers"
            disabled={!metaTotal}
          >
            <CheckIcon className="action-icon" />
          </button>
        ) : null,
      ),
      filter: isAdmin ? (
        <div className="delivery-items-table__multi-filter">
          <button
            type="button"
            className="delivery-items-table__multi-filter-button"
            onClick={() => onToggleFilterMenu("courier_ids")}
            aria-haspopup="dialog"
            aria-expanded={activeFilterMenu === "courier_ids"}
            title="Filter couriers"
            ref={getFilterTriggerRef("courier_ids")}
          >
            {courierFilterLabel}
          </button>
        </div>
      ) : (
        <input
          name="courier"
          value={filters.courier ?? ""}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) =>
        isAdmin ? (
          <CourierAssignField
            couriers={couriers}
            disabled={courierUpdateId === item.id}
            itemId={item.id}
            selectedCourierId={item.assigned_courier_id}
            onAssign={handleCourierUpdate}
          />
        ) : (
          getCourierName(item)
        ),
      label: "კურიერი",
    },
    {
      key: "district",
      header: renderColumnHeader("უბანი", "district", sort, onSort),
      filter: (
        <input
          name="district"
          value={filters.district}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) => (
        item.can_edit_district ? (
          <InlineTextField
            className="delivery-items-table__status-select"
            disabled={districtUpdateId === item.id}
            itemId={item.id}
            value={item.district ?? ""}
            placeholder="უბანი"
            onSave={handleDistrictUpdate}
          />
        ) : (
          item.district
        )
      ),
      label: "უბანი",
    },
    {
      key: "city",
      header: renderColumnHeader("ქალაქი", "city", sort, onSort),
      filter: (
        <input
          name="city"
          value={filters.city ?? ""}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) => (
        item.can_edit_city ? (
          <select
            className="delivery-items-table__status-select"
            value={item.city ?? ""}
            onChange={(event) => handleCityUpdate(item.id, event.target.value)}
            disabled={cityUpdateId === item.id}
          >
            <option value="">Choose city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        ) : (
          item.city
        )
      ),
      label: "ქალაქი",
    },
    {
      key: "address",
      header: renderColumnHeader("მისამართი", "address", sort, onSort),
      filter: (
        <input
          name="address"
          value={filters.address}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) => item.address,
      label: "მისამართი",
    },
    {
      key: "price",
      header: renderColumnHeader("ფასი", "price", sort, onSort),
      filter: (
        <input
          name="price"
          value={filters.price}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) => (
        item.can_edit_price ? (
          <InlineTextField
            className="delivery-items-table__status-select"
            disabled={priceUpdateId === item.id}
            itemId={item.id}
            value={item.price ?? ""}
            placeholder="ფასი"
            onSave={handlePriceUpdate}
          />
        ) : (
          item.price
        )
      ),
      label: "ფასი",
    },
    {
      key: "comment",
      header: renderColumnHeader("კომენტარი", "comment", sort, onSort),
      filter: (
        <input
          name="comment"
          value={filters.comment ?? ""}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) => item.comment,
      label: "კომენტარი",
    },
    {
      key: "courier_comment",
      header: renderColumnHeader("კურიერის კომენტარი", "courier_comment", sort, onSort),
      filter: (
        <input
          name="courier_comment"
          value={filters.courier_comment ?? ""}
          onChange={handleFilterChange}
          placeholder="Filter"
        />
      ),
      cell: (item) =>
        item.can_edit_courier_comment ? (
          <CourierCommentField
            disabled={courierCommentUpdateId === item.id}
            itemId={item.id}
            templates={courierCommentTemplates}
            value={item.courier_comment ?? ""}
            onSave={handleCourierCommentUpdate}
          />
        ) : (
          item.courier_comment || "-"
        ),
      label: "კურიერის კომენტარი",
    },
    {
      key: "warehouse_state",
      header: renderColumnHeader("საწყობის სტატუსი", "warehouse_state", sort, onSort),
      filter: (
        <div className="delivery-items-table__multi-filter">
          <button
            type="button"
            className="delivery-items-table__multi-filter-button"
            onClick={() => onToggleFilterMenu("warehouse_state")}
            aria-haspopup="dialog"
            aria-expanded={activeFilterMenu === "warehouse_state"}
            title="Filter warehouse states"
            ref={getFilterTriggerRef("warehouse_state")}
          >
            {warehouseStateFilterLabel}
          </button>
        </div>
      ),
      cell: (item) =>
        isAdmin ? (
          isMobile ? (
            <MobileOptionSelect
              disabled={warehouseStateUpdateId === item.id}
              label="Update warehouse state"
              options={[
                { value: '', label: 'არჩეული არაა' },
                ...WAREHOUSE_STATE_OPTIONS.map(([state, label]) => ({
                  value: state,
                  label,
                })),
              ]}
              value={item.warehouse_state ?? ''}
              onChange={(nextValue) => handleWarehouseStateUpdate(item.id, nextValue)}
            />
          ) : (
            <select
              className="delivery-items-table__status-select"
              value={item.warehouse_state ?? ''}
              onChange={(event) => handleWarehouseStateUpdate(item.id, event.target.value)}
              disabled={warehouseStateUpdateId === item.id}
            >
              <option value="">არჩეული არაა</option>
              {WAREHOUSE_STATE_OPTIONS.map(([state, label]) => (
                <option key={state} value={state}>
                  {label}
                </option>
              ))}
            </select>
          )
        ) : (
          WAREHOUSE_STATE_LABELS[item.warehouse_state] ?? '-'
        ),
      label: "საწყობის სტატუსი",
    },
    {
      key: "status",
      header: renderColumnHeader(
        "სტატუსი",
        "status",
        sort,
        onSort,
        isAdmin ? (
          <button
            type="button"
            className="button-secondary icon-button delivery-items-table__head-action"
            onClick={() => onOpenBulkDialog(BULK_ACTION_STATUS)}
            aria-label="Update filtered statuses"
            title="Update filtered statuses"
            disabled={!metaTotal}
          >
            <CheckIcon className="action-icon" />
          </button>
        ) : null,
      ),
      filter: (
        viewScope === 'canceled' ? null : (
          <div className="delivery-items-table__multi-filter">
            <button
              type="button"
              className="delivery-items-table__multi-filter-button"
              onClick={() => onToggleFilterMenu("status")}
              aria-haspopup="dialog"
              aria-expanded={activeFilterMenu === "status"}
              title="Filter statuses"
              ref={getFilterTriggerRef("status")}
            >
              {statusFilterLabel}
            </button>
          </div>
        )
      ),
      cell: (item) =>
        item.can_edit_status ? (
          isMobile ? (
            <MobileOptionSelect
              disabled={statusUpdateId === item.id}
              label="Update status"
              options={statusOptions.map(([status, label]) => ({
                value: status,
                label,
              }))}
              value={item.delivery_status}
              onChange={(nextValue) => handleStatusUpdate(item.id, nextValue)}
            />
          ) : (
            <select
              className="delivery-items-table__status-select"
              value={item.delivery_status}
              onChange={(event) =>
                handleStatusUpdate(item.id, event.target.value)
              }
              disabled={statusUpdateId === item.id}
            >
              {statusOptions.map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          )
        ) : (
          <span className="delivery-items-table__status">
            {statusLabels[item.delivery_status] ?? item.delivery_status}
          </span>
        ),
      label: "სტატუსი",
    },
    {
      key: "delivery_date",
      header: renderColumnHeader(
        "გატანა",
        "delivery_date",
        sort,
        onSort,
        isAdmin ? (
          <button
            type="button"
            className="button-secondary icon-button delivery-items-table__head-action"
            onClick={() => onOpenBulkDialog(BULK_ACTION_DELIVERY_DATE)}
            aria-label="Update filtered delivery date"
            title="Update filtered delivery date"
            disabled={!metaTotal}
          >
            <CalendarIcon className="action-icon" />
          </button>
        ) : null,
      ),
      filter: (
        <input
          name="delivery_date"
          type="date"
          value={filters.delivery_date}
          onChange={handleFilterChange}
        />
      ),
      cell: (item) => formatDate(item.delivery_date),
      label: "გატანა",
    },
  ]

  columns.push(
    viewScope === 'canceled'
      ? {
          key: "return_date",
          header: renderColumnHeader(
            "დაბრუნების თარიღი",
            "return_date",
            sort,
            onSort,
            isAdmin ? (
              <button
                type="button"
                className="button-secondary icon-button delivery-items-table__head-action"
                onClick={() => onOpenBulkDialog(BULK_ACTION_RETURN_DATE)}
                aria-label="Update filtered return date"
                title="Update filtered return date"
                disabled={!metaTotal}
              >
                <CalendarIcon className="action-icon" />
              </button>
            ) : null,
          ),
          filter: (
            <input
              name="return_date"
              type="date"
              value={filters.return_date}
              onChange={handleFilterChange}
            />
          ),
          cell: (item) => formatDate(item.return_date),
          label: "დაბრუნების თარიღი",
        }
      : {
          key: "actual_delivery_date",
          header: renderColumnHeader(
            "დასრულება",
            "actual_delivery_date",
            sort,
            onSort,
            isAdmin ? (
              <button
                type="button"
                className="button-secondary icon-button delivery-items-table__head-action"
                onClick={() => onOpenBulkDialog(BULK_ACTION_ACTUAL_DELIVERY_DATE)}
                aria-label="Update filtered completion date"
                title="Update filtered completion date"
                disabled={!metaTotal}
              >
                <CalendarIcon className="action-icon" />
              </button>
            ) : null,
          ),
          filter: (
            <input
              name="actual_delivery_date"
              type="date"
              value={filters.actual_delivery_date}
              onChange={handleFilterChange}
            />
          ),
          cell: (item) => formatDate(item.actual_delivery_date),
          label: "დასრულება",
        },
  )

  if (viewScope === 'canceled') {
    columns.splice(columns.findIndex((column) => column.key === 'status') + 1, 0, {
      key: "additional_status",
      header: renderColumnHeader("დამატებითი სტატუსი", "additional_status", sort, onSort),
      filter: (
        <input
          name="additional_status"
          value={filters.additional_status ?? ""}
          onChange={handleFilterChange}
          placeholder="ფილტრი"
        />
      ),
      cell: (item) =>
        item.can_edit_status ? (
          isMobile ? (
            <MobileOptionSelect
              disabled={additionalStatusUpdateId === item.id}
              label="Update additional status"
              options={[
                { value: '', label: 'არჩეული არაა' },
                ...ADDITIONAL_STATUS_OPTIONS.map(([status, label]) => ({
                  value: status,
                  label,
                })),
              ]}
              value={item.additional_status ?? ''}
              onChange={(nextValue) => handleAdditionalStatusUpdate(item.id, nextValue)}
            />
          ) : (
            <select
              className="delivery-items-table__status-select"
              value={item.additional_status ?? ''}
              onChange={(event) => handleAdditionalStatusUpdate(item.id, event.target.value)}
              disabled={additionalStatusUpdateId === item.id}
            >
              <option value="">არჩეული არაა</option>
              {ADDITIONAL_STATUS_OPTIONS.map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          )
        ) : (
          ADDITIONAL_STATUS_LABELS[item.additional_status] ?? '-'
        ),
      label: "დამატებითი სტატუსი",
    })
  }

  return columns
}
