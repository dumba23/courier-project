import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarIcon, CheckIcon, CloseIcon, ColumnsIcon, InfoIcon } from '../../core/ui/icons.jsx'
import { apiRequest } from '../../core/http/api.js'
import { DataTable } from '../../core/ui/data-table.jsx'
import { TablePagination } from '../../core/ui/table-pagination.jsx'
import './delivery-items-page.scss'

const STATUS_LABELS = {
  delivered: 'Delivered',
  canceled: 'Canceled',
  postponement: 'Postponement',
  cancellation_on_site: 'Cancellation on site',
  postponement_after_arrive: 'Postponement after arrive',
  redirect_address: 'Redirect address',
  future_delivery: 'Future delivery',
}

const STATUS_DESCRIPTIONS = {
  delivered: 'Green row means the product was delivered successfully.',
  canceled: 'Red row means the order was canceled.',
  postponement: 'Yellow row means the delivery was postponed.',
  cancellation_on_site: 'Blue row means it was canceled when the courier arrived.',
  postponement_after_arrive: 'Grey row means it was postponed after arrival.',
  redirect_address: 'Light purple row means the address was redirected.',
  future_delivery: 'Brown row means it is scheduled for a future delivery date.',
}

const STATUS_OPTIONS = Object.entries(STATUS_LABELS)
const DELIVERY_ITEMS_TABLE_STATE_KEY = 'delivery-items-table-state'
const BULK_ACTION_STATUS = 'status'
const BULK_ACTION_DELIVERY_DATE = 'delivery_date'
const BULK_ACTION_ACTUAL_DELIVERY_DATE = 'actual_delivery_date'

const initialFilters = {
  product: '',
  person_name: '',
  partner: '',
  partner_ids: [],
  courier: '',
  courier_ids: [],
  district: '',
  address: '',
  status: [],
  delivery_date: '',
  actual_delivery_date: '',
}

const initialSort = {
  key: 'delivery_date',
  direction: 'asc',
}

const initialPagination = {
  page: 1,
  per_page: 10,
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100, 200]
const initialVisibleColumns = {
  product: true,
  person_name: true,
  partner: true,
  courier: true,
  district: true,
  address: true,
  status: true,
  delivery_date: true,
  actual_delivery_date: true,
}

function readStoredTableState() {
  try {
    const storedValue = localStorage.getItem(DELIVERY_ITEMS_TABLE_STATE_KEY)

    if (!storedValue) {
      return null
    }

    const parsedValue = JSON.parse(storedValue)

    return {
      filters: {
        ...initialFilters,
        ...parsedValue?.filters,
      },
      sort: {
        ...initialSort,
        ...parsedValue?.sort,
      },
      pagination: {
        ...initialPagination,
        ...parsedValue?.pagination,
      },
      visibleColumns: {
        ...initialVisibleColumns,
        ...parsedValue?.visibleColumns,
      },
    }
  } catch {
    localStorage.removeItem(DELIVERY_ITEMS_TABLE_STATE_KEY)

    return null
  }
}

function writeStoredTableState(state) {
  localStorage.setItem(DELIVERY_ITEMS_TABLE_STATE_KEY, JSON.stringify(state))
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}.${month}.${year}`
}

function buildQueryString(filters, sort) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) {
          params.append(`${key}[]`, item)
        }
      })
    } else if (value) {
      params.set(key, value)
    }
  })

  params.set('sort_key', sort.key)
  params.set('sort_direction', sort.direction)

  return params.toString()
}

function getSortIndicator(sort, key) {
  if (sort.key !== key) {
    return ''
  }

  return sort.direction === 'asc' ? '↑' : '↓'
}

function getCourierName(item) {
  return item.courier
    ? `${item.courier.first_name} ${item.courier.last_name}`
    : '-'
}

export function DeliveryItemsPage({ auth }) {
  const storedTableState = useMemo(() => readStoredTableState(), [])
  const [deliveryItems, setDeliveryItems] = useState([])
  const [partners, setPartners] = useState([])
  const [couriers, setCouriers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusUpdateId, setStatusUpdateId] = useState(null)
  const [error, setError] = useState('')
  const [isLegendOpen, setIsLegendOpen] = useState(false)
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false)
  const [bulkDialogType, setBulkDialogType] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const [openFilterMenu, setOpenFilterMenu] = useState('')
  const [filterMenuStyle, setFilterMenuStyle] = useState(null)
  const [filters, setFilters] = useState(storedTableState?.filters ?? initialFilters)
  const [sort, setSort] = useState(storedTableState?.sort ?? initialSort)
  const [pagination, setPagination] = useState(storedTableState?.pagination ?? initialPagination)
  const [visibleColumns, setVisibleColumns] = useState(storedTableState?.visibleColumns ?? initialVisibleColumns)
  const [meta, setMeta] = useState(initialPagination)
  const [reloadKey, setReloadKey] = useState(0)

  const filterMenuRef = useRef(null)
  const filterTriggerRefs = useRef({})
  const isAdmin = auth?.user?.role === 'admin'

  useEffect(() => {
    writeStoredTableState({ filters, sort, pagination, visibleColumns })
  }, [filters, sort, pagination, visibleColumns])

  useEffect(() => {
    let isCancelled = false
    const isInitialLoad = !hasLoadedOnce
    const timeoutId = window.setTimeout(() => {
      loadDeliveryItems()
    }, 250)

    async function loadDeliveryItems() {
      if (isInitialLoad) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }

      setError('')

      try {
        const queryString = `${buildQueryString(filters, sort)}&page=${pagination.page}&per_page=${pagination.per_page}`
        const payload = await apiRequest(`/api/delivery-items?${queryString}`, {
          token: auth?.token,
        })

        if (!isCancelled) {
          setDeliveryItems(payload.delivery_items ?? [])
          setMeta(payload.meta ?? initialPagination)
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
          setIsRefreshing(false)
          setHasLoadedOnce(true)
        }
      }
    }

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [auth?.token, filters, sort, pagination.page, pagination.per_page, reloadKey])

  useEffect(() => {
    if (!isAdmin) {
      setPartners([])
      setCouriers([])

      return undefined
    }

    let isCancelled = false

    async function loadFilterOptions() {
      try {
        const [partnersPayload, couriersPayload] = await Promise.all([
          apiRequest('/api/partners', { token: auth?.token }),
          apiRequest('/api/couriers', { token: auth?.token }),
        ])

        if (!isCancelled) {
          setPartners(partnersPayload.partners ?? [])
          setCouriers(couriersPayload.couriers ?? [])
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(requestError.message)
        }
      }
    }

    loadFilterOptions()

    return () => {
      isCancelled = true
    }
  }, [auth?.token, isAdmin])

  useEffect(() => {
    function handleOutsideClick(event) {
      const activeTrigger = openFilterMenu
        ? filterTriggerRefs.current[openFilterMenu]
        : null

      if (
        !filterMenuRef.current?.contains(event.target)
        && !activeTrigger?.contains(event.target)
      ) {
        setOpenFilterMenu('')
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpenFilterMenu('')
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openFilterMenu])

  useEffect(() => {
    if (!openFilterMenu) {
      setFilterMenuStyle(null)

      return
    }

    function updateFilterMenuPosition() {
      const trigger = filterTriggerRefs.current[openFilterMenu]

      if (!trigger) {
        return
      }

      const rect = trigger.getBoundingClientRect()
      const menuWidth = Math.max(rect.width, 220)
      const viewportPadding = 12
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - menuWidth - viewportPadding,
      )
      const top = rect.bottom + 8
      const maxHeight = Math.max(140, window.innerHeight - top - viewportPadding)

      setFilterMenuStyle({
        top,
        left,
        width: menuWidth,
        maxHeight,
      })
    }

    updateFilterMenuPosition()

    window.addEventListener('resize', updateFilterMenuPosition)
    window.addEventListener('scroll', updateFilterMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateFilterMenuPosition)
      window.removeEventListener('scroll', updateFilterMenuPosition, true)
    }
  }, [openFilterMenu])

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
    setPagination((current) => ({
      ...current,
      page: 1,
    }))
  }

  function handleMultiSelectChange(filterKey, value) {
    setFilters((current) => {
      const exists = current[filterKey].includes(value)

      return {
        ...current,
        [filterKey]: exists
          ? current[filterKey].filter((currentValue) => currentValue !== value)
          : [...current[filterKey], value],
      }
    })
    setPagination((current) => ({
      ...current,
      page: 1,
    }))
  }

  function handleSort(key) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
    setPagination((current) => ({
      ...current,
      page: 1,
    }))
  }

  function toggleFilterMenu(key) {
    setOpenFilterMenu((current) => (current === key ? '' : key))
  }

  async function handleStatusUpdate(deliveryItemId, nextStatus) {
    setStatusUpdateId(deliveryItemId)
    setError('')

    try {
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/status`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          delivery_status: nextStatus,
        }),
      })

      setDeliveryItems((current) => current.map((item) => (
        item.id === deliveryItemId ? payload.delivery_item : item
      )))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setStatusUpdateId(null)
    }
  }

  function renderMultiSelectMenu(key, options, selectedValues, getOptionLabel) {
    if (openFilterMenu !== key || !filterMenuStyle) {
      return null
    }

    return createPortal(
      <div
        ref={filterMenuRef}
        className="delivery-items-table__multi-filter-menu delivery-items-table__multi-filter-menu--floating"
        style={filterMenuStyle}
      >
        {options.map((option) => (
          <label key={option.id ?? option[0]} className="delivery-items-table__multi-filter-option">
            <input
              type="checkbox"
              checked={selectedValues.includes(option.id ?? option[0])}
              onChange={() => handleMultiSelectChange(key, option.id ?? option[0])}
            />
            <span>{getOptionLabel(option)}</span>
          </label>
        ))}
      </div>,
      document.body,
    )
  }

  const partnerFilterLabel = filters.partner_ids.length
    ? `${filters.partner_ids.length} selected`
    : 'All'
  const courierFilterLabel = filters.courier_ids.length
    ? `${filters.courier_ids.length} selected`
    : 'All'
  const statusFilterLabel = filters.status.length
    ? `${filters.status.length} selected`
    : 'All'

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > (meta.last_page ?? 1) || nextPage === pagination.page) {
      return
    }

    setPagination((current) => ({
      ...current,
      page: nextPage,
    }))
  }

  function handlePerPageChange(nextPerPage) {
    if (!PER_PAGE_OPTIONS.includes(nextPerPage) || nextPerPage === pagination.per_page) {
      return
    }

    setPagination({
      page: 1,
      per_page: nextPerPage,
    })
  }

  function openBulkDialog(type) {
    setBulkDialogType(type)
    setBulkValue(type === BULK_ACTION_STATUS ? STATUS_OPTIONS[0][0] : '')
  }

  function closeBulkDialog(force = false) {
    if (isBulkSubmitting && !force) {
      return
    }

    setBulkDialogType('')
    setBulkValue('')
  }

  async function handleBulkSubmit(event) {
    event.preventDefault()
    setIsBulkSubmitting(true)
    setError('')

    try {
      await apiRequest('/api/delivery-items/bulk', {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          ...filters,
          bulk_action: bulkDialogType,
          ...(bulkDialogType === BULK_ACTION_STATUS
            ? { delivery_status: bulkValue }
            : { bulk_date: bulkValue }),
        }),
      })

      closeBulkDialog(true)
      setReloadKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  function renderColumnHeader(label, sortKey, actionButton = null) {
    return (
      <div className="delivery-items-table__head-content">
        <button type="button" className="table-sort" onClick={() => handleSort(sortKey)}>
          {label} {getSortIndicator(sort, sortKey)}
        </button>
        {actionButton}
      </div>
    )
  }

  const bulkDialogTitle = bulkDialogType === BULK_ACTION_STATUS
    ? 'Update filtered statuses'
    : bulkDialogType === BULK_ACTION_DELIVERY_DATE
      ? 'Update filtered delivery date'
      : 'Update filtered actual date'
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length

  function toggleColumnVisibility(columnKey) {
    setVisibleColumns((current) => {
      if (current[columnKey] && visibleColumnCount === 1) {
        return current
      }

      return {
        ...current,
        [columnKey]: !current[columnKey],
      }
    })
  }

  const columnDefinitions = [
    {
      key: 'product',
      header: renderColumnHeader('Product', 'product'),
      filter: <input name="product" value={filters.product} onChange={handleFilterChange} placeholder="Filter" />,
      cell: (item) => item.product,
      label: 'Product',
    },
    {
      key: 'person_name',
      header: renderColumnHeader('Customer', 'person_name'),
      filter: <input name="person_name" value={filters.person_name} onChange={handleFilterChange} placeholder="Filter" />,
      cell: (item) => item.person_name,
      label: 'Customer',
    },
    {
      key: 'partner',
      header: renderColumnHeader('Partner', 'partner'),
      filter: isAdmin ? (
        <div className="delivery-items-table__multi-filter">
          <button
            type="button"
            className="delivery-items-table__multi-filter-button"
            onClick={() => toggleFilterMenu('partner_ids')}
            aria-haspopup="dialog"
            aria-expanded={openFilterMenu === 'partner_ids'}
            title="Filter partners"
            ref={(element) => {
              filterTriggerRefs.current.partner_ids = element
            }}
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
      header: renderColumnHeader('Courier', 'courier'),
      filter: isAdmin ? (
        <div className="delivery-items-table__multi-filter">
          <button
            type="button"
            className="delivery-items-table__multi-filter-button"
            onClick={() => toggleFilterMenu('courier_ids')}
            aria-haspopup="dialog"
            aria-expanded={openFilterMenu === 'courier_ids'}
            title="Filter couriers"
            ref={(element) => {
              filterTriggerRefs.current.courier_ids = element
            }}
          >
            {courierFilterLabel}
          </button>
        </div>
      ) : (
        <input name="courier" value={filters.courier ?? ''} onChange={handleFilterChange} placeholder="Filter" />
      ),
      cell: (item) => getCourierName(item),
      label: 'Courier',
    },
    {
      key: 'district',
      header: renderColumnHeader('District', 'district'),
      filter: <input name="district" value={filters.district} onChange={handleFilterChange} placeholder="Filter" />,
      cell: (item) => item.district,
      label: 'District',
    },
    {
      key: 'address',
      header: renderColumnHeader('Address', 'address'),
      filter: <input name="address" value={filters.address} onChange={handleFilterChange} placeholder="Filter" />,
      cell: (item) => item.address,
      label: 'Address',
    },
    {
      key: 'status',
      header: renderColumnHeader(
        'Status',
        'status',
        isAdmin ? (
          <button
            type="button"
            className="button-secondary icon-button delivery-items-table__head-action"
            onClick={() => openBulkDialog(BULK_ACTION_STATUS)}
            aria-label="Update filtered statuses"
            title="Update filtered statuses"
            disabled={!meta.total}
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
            onClick={() => toggleFilterMenu('status')}
            aria-haspopup="dialog"
            aria-expanded={openFilterMenu === 'status'}
            title="Filter statuses"
            ref={(element) => {
              filterTriggerRefs.current.status = element
            }}
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
        isAdmin ? (
          <button
            type="button"
            className="button-secondary icon-button delivery-items-table__head-action"
            onClick={() => openBulkDialog(BULK_ACTION_DELIVERY_DATE)}
            aria-label="Update filtered delivery date"
            title="Update filtered delivery date"
            disabled={!meta.total}
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
        isAdmin ? (
          <button
            type="button"
            className="button-secondary icon-button delivery-items-table__head-action"
            onClick={() => openBulkDialog(BULK_ACTION_ACTUAL_DELIVERY_DATE)}
            aria-label="Update filtered actual date"
            title="Update filtered actual date"
            disabled={!meta.total}
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
  const activeColumns = columnDefinitions.filter((column) => visibleColumns[column.key])

  return (
    <section className="delivery-items-page">
      <header className="delivery-items-page__header">
        <h2 className="page-title">Deliveries</h2>
        <div className="delivery-items-page__header-actions">
          {isRefreshing ? <span className="delivery-items-page__refreshing">Updating...</span> : null}
          <button
            type="button"
            className="button-secondary icon-button"
            aria-label="Column settings"
            title="Column settings"
            onClick={() => setIsColumnsDialogOpen(true)}
          >
            <ColumnsIcon className="action-icon" />
          </button>
          <button
            type="button"
            className="button-secondary icon-button"
            aria-label="Status colors"
            title="Status colors"
            onClick={() => setIsLegendOpen(true)}
          >
            <InfoIcon className="action-icon" />
          </button>
        </div>
      </header>

      {error ? <p className="status-message is-error">{error}</p> : null}

      {isLoading ? (
        <p className="status-message">Loading...</p>
      ) : (
        <>
          <DataTable
            tableClassName="delivery-items-table"
            headers={activeColumns.map((column) => column.header)}
            filtersRow={(
              <tr className="delivery-items-table__filters">
                {activeColumns.map((column) => (
                  <th key={column.key}>{column.filter}</th>
                ))}
              </tr>
            )}
            emptyMessage="No delivery items."
            emptyColSpan={activeColumns.length}
            rows={deliveryItems.map((item) => (
              <tr
                key={item.id}
                className={`delivery-items-table__row delivery-items-table__row--${item.delivery_status}`}
              >
                {activeColumns.map((column) => (
                  <td key={column.key}>{column.cell(item)}</td>
                ))}
              </tr>
            ))}
          />
          <TablePagination
            currentPage={meta.current_page ?? pagination.page}
            lastPage={meta.last_page ?? 1}
            from={meta.from}
            to={meta.to}
            total={meta.total}
            perPage={pagination.per_page}
            perPageOptions={PER_PAGE_OPTIONS}
            isRefreshing={isRefreshing}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        </>
      )}

      {renderMultiSelectMenu(
        'partner_ids',
        partners,
        filters.partner_ids,
        (partner) => partner.name,
      )}
      {renderMultiSelectMenu(
        'courier_ids',
        couriers,
        filters.courier_ids,
        (courier) => `${courier.first_name} ${courier.last_name}`,
      )}
      {renderMultiSelectMenu(
        'status',
        STATUS_OPTIONS,
        filters.status,
        (statusOption) => statusOption[1],
      )}

      {isLegendOpen ? (
        <div className="dialog-backdrop" onClick={() => setIsLegendOpen(false)}>
          <section
            className="dialog-panel panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delivery-items-page__legend-head">
              <h3>Status colors</h3>
              <button
                type="button"
                className="button-secondary icon-button"
                aria-label="Close status colors"
                title="Close"
                onClick={() => setIsLegendOpen(false)}
              >
                <CloseIcon className="action-icon" />
              </button>
            </div>

            <div className="delivery-items-page__legend">
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <div key={status} className="delivery-items-page__legend-item">
                  <span
                    className={`delivery-items-page__legend-swatch delivery-items-page__legend-swatch--${status}`}
                  />
                  <div>
                    <strong>{label}</strong>
                    <p>{STATUS_DESCRIPTIONS[status]}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {isColumnsDialogOpen ? (
        <div className="dialog-backdrop" onClick={() => setIsColumnsDialogOpen(false)}>
          <section
            className="dialog-panel panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delivery-items-page__legend-head">
              <h3>Columns</h3>
              <button
                type="button"
                className="button-secondary icon-button"
                aria-label="Close column settings"
                title="Close"
                onClick={() => setIsColumnsDialogOpen(false)}
              >
                <CloseIcon className="action-icon" />
              </button>
            </div>

            <div className="delivery-items-page__column-list">
              {columnDefinitions.map((column) => (
                <label key={column.key} className="delivery-items-page__column-option">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.key]}
                    onChange={() => toggleColumnVisibility(column.key)}
                    disabled={visibleColumns[column.key] && visibleColumnCount === 1}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {bulkDialogType ? (
        <div className="dialog-backdrop" onClick={closeBulkDialog}>
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
                onClick={closeBulkDialog}
              >
                <CloseIcon className="action-icon" />
              </button>
            </div>

            <form className="delivery-items-page__bulk-form" onSubmit={handleBulkSubmit}>
              <p className="delivery-items-page__bulk-copy">
                {meta.total
                  ? `This will update ${meta.total} filtered delivery items.`
                  : 'No filtered delivery items are currently available.'}
              </p>

              {bulkDialogType === BULK_ACTION_STATUS ? (
                <label className="form-field">
                  Status
                  <select value={bulkValue} onChange={(event) => setBulkValue(event.target.value)} required>
                    {STATUS_OPTIONS.map(([status, label]) => (
                      <option key={status} value={status}>
                        {label}
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
                    onChange={(event) => setBulkValue(event.target.value)}
                    required
                  />
                </label>
              )}

              <div className="delivery-items-page__bulk-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={closeBulkDialog}
                  disabled={isBulkSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={isBulkSubmitting || !meta.total}
                >
                  Confirm
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}
