import { CalendarIcon, CheckIcon } from '../../core/ui/icons.jsx'
import {
  BULK_ACTION_ACTUAL_DELIVERY_DATE,
  BULK_ACTION_COURIER,
  BULK_ACTION_DELIVERY_DATE,
  BULK_ACTION_STATUS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from './delivery-items.constants.js'
import { formatDate, getCourierName, getSortIndicator } from './delivery-items.utils.js'

function renderColumnHeader(label, sortKey, sort, onSort, actionButton = null) {
  return (
    <div className="delivery-items-table__head-content">
      <button type="button" className="table-sort" onClick={() => onSort(sortKey)}>
        {label} {getSortIndicator(sort, sortKey)}
      </button>
      {actionButton}
    </div>
  )
}

export function buildDeliveryItemColumns({
  activeFilterMenu,
  couriers,
  courierFilterLabel,
  courierUpdateId,
  filters,
  getFilterTriggerRef,
  handleCourierUpdate,
  handleFilterChange,
  handleStatusUpdate,
  isAdmin,
  metaTotal,
  onOpenBulkDialog,
  onSort,
  onToggleFilterMenu,
  partnerFilterLabel,
  sort,
  statusFilterLabel,
  statusUpdateId,
}) {
  return [
    {
      key: 'product',
      header: renderColumnHeader('Product', 'product', sort, onSort),
      filter: <input name="product" value={filters.product} onChange={handleFilterChange} placeholder="Filter" />,
      cell: (item) => item.product,
      label: 'Product',
    },
    {
      key: 'person_name',
      header: renderColumnHeader('Customer', 'person_name', sort, onSort),
      filter: <input name="person_name" value={filters.person_name} onChange={handleFilterChange} placeholder="Filter" />,
      cell: (item) => item.person_name,
      label: 'Customer',
    },
    {
      key: 'partner',
      header: renderColumnHeader('Partner', 'partner', sort, onSort),
      filter: isAdmin ? (
        <div className="delivery-items-table__multi-filter">
          <button
            type="button"
            className="delivery-items-table__multi-filter-button"
            onClick={() => onToggleFilterMenu('partner_ids')}
            aria-haspopup="dialog"
            aria-expanded={activeFilterMenu === 'partner_ids'}
            title="Filter partners"
            ref={getFilterTriggerRef('partner_ids')}
          >
            {partnerFilterLabel}
          </button>
        </div>
      ) : (
        <input name="partner" value={filters.partner ?? ''} onChange={handleFilterChange} placeholder="Filter" />
      ),
      cell: (item) => item.partner?.name,
      label: 'Partner',
    },
    {
      key: 'courier',
      header: renderColumnHeader(
        'Courier',
        'courier',
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
            onClick={() => onToggleFilterMenu('courier_ids')}
            aria-haspopup="dialog"
            aria-expanded={activeFilterMenu === 'courier_ids'}
            title="Filter couriers"
            ref={getFilterTriggerRef('courier_ids')}
          >
            {courierFilterLabel}
          </button>
        </div>
      ) : (
        <input name="courier" value={filters.courier ?? ''} onChange={handleFilterChange} placeholder="Filter" />
      ),
      cell: (item) => (
        isAdmin ? (
          <select
            className="delivery-items-table__status-select"
            value={item.assigned_courier_id ?? ''}
            onChange={(event) => handleCourierUpdate(item.id, event.target.value)}
            disabled={courierUpdateId === item.id}
          >
            <option value="">Unassigned</option>
            {couriers.map((courier) => (
              <option key={courier.id} value={courier.id}>
                {courier.first_name} {courier.last_name}
              </option>
            ))}
          </select>
        ) : (
          getCourierName(item)
        )
      ),
      label: 'Courier',
    },
    {
      key: 'district',
      header: renderColumnHeader('District', 'district', sort, onSort),
      filter: <input name="district" value={filters.district} onChange={handleFilterChange} placeholder="Filter" />,
      cell: (item) => item.district,
      label: 'District',
    },
    {
      key: 'address',
      header: renderColumnHeader('Address', 'address', sort, onSort),
      filter: <input name="address" value={filters.address} onChange={handleFilterChange} placeholder="Filter" />,
      cell: (item) => item.address,
      label: 'Address',
    },
    {
      key: 'price',
      header: renderColumnHeader('Price', 'price', sort, onSort),
      filter: <input name="price" value={filters.price} onChange={handleFilterChange} placeholder="Filter" />,
      cell: (item) => item.price,
      label: 'Price',
    },
    {
      key: 'status',
      header: renderColumnHeader(
        'Status',
        'status',
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
        <div className="delivery-items-table__multi-filter">
          <button
            type="button"
            className="delivery-items-table__multi-filter-button"
            onClick={() => onToggleFilterMenu('status')}
            aria-haspopup="dialog"
            aria-expanded={activeFilterMenu === 'status'}
            title="Filter statuses"
            ref={getFilterTriggerRef('status')}
          >
            {statusFilterLabel}
          </button>
        </div>
      ),
      cell: (item) => (
        item.can_edit_status ? (
          <select
            className="delivery-items-table__status-select"
            value={item.delivery_status}
            onChange={(event) => handleStatusUpdate(item.id, event.target.value)}
            disabled={statusUpdateId === item.id}
          >
            {STATUS_OPTIONS.map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <span className="delivery-items-table__status">
            {STATUS_LABELS[item.delivery_status] ?? item.delivery_status}
          </span>
        )
      ),
      label: 'Status',
    },
    {
      key: 'delivery_date',
      header: renderColumnHeader(
        'Delivery date',
        'delivery_date',
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
      filter: <input name="delivery_date" type="date" value={filters.delivery_date} onChange={handleFilterChange} />,
      cell: (item) => formatDate(item.delivery_date),
      label: 'Delivery date',
    },
    {
      key: 'actual_delivery_date',
      header: renderColumnHeader(
        'Actual',
        'actual_delivery_date',
        sort,
        onSort,
        isAdmin ? (
          <button
            type="button"
            className="button-secondary icon-button delivery-items-table__head-action"
            onClick={() => onOpenBulkDialog(BULK_ACTION_ACTUAL_DELIVERY_DATE)}
            aria-label="Update filtered actual date"
            title="Update filtered actual date"
            disabled={!metaTotal}
          >
            <CalendarIcon className="action-icon" />
          </button>
        ) : null,
      ),
      filter: <input name="actual_delivery_date" type="date" value={filters.actual_delivery_date} onChange={handleFilterChange} />,
      cell: (item) => formatDate(item.actual_delivery_date),
      label: 'Actual date',
    },
  ]
}
