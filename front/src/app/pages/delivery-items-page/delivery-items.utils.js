import { DELIVERY_ITEMS_TABLE_STATE_KEY, initialFilters, initialPagination, initialSort, initialVisibleColumns } from './delivery-items.constants.js'

function getTableStateStorageKey(viewScope = 'active') {
  return `${DELIVERY_ITEMS_TABLE_STATE_KEY}:${viewScope}`
}

export function createEmptyDraftItem(isAdmin) {
  return {
    partner_id: isAdmin ? '' : undefined,
    product: '',
    person_name: '',
    phone: '',
    address: '',
    city: '',
    price: '',
    comment: '',
    delivery_date: '',
  }
}

export function formatImportDate(value) {
  if (!value) {
    return ''
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const trimmedValue = String(value).trim()

  if (!trimmedValue) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmedValue)) {
    const [day, month, year] = trimmedValue.split('.')

    return `${year}-${month}-${day}`
  }

  const parsedDate = new Date(trimmedValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  return parsedDate.toISOString().slice(0, 10)
}

export function isImportRowEmpty(row) {
  return Object.values(row).every((value) => String(value ?? '').trim() === '')
}

export function readStoredTableState(viewScope = 'active') {
  const storageKey = getTableStateStorageKey(viewScope)

  try {
    const storedValue = localStorage.getItem(storageKey)

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
    localStorage.removeItem(storageKey)

    return null
  }
}

export function writeStoredTableState(state, viewScope = 'active') {
  localStorage.setItem(getTableStateStorageKey(viewScope), JSON.stringify(state))
}

export function formatDate(value) {
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

export function buildQueryString(filters, sort) {
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

export function getSortIndicator(sort, key) {
  if (sort.key !== key) {
    return ''
  }

  return sort.direction === 'asc' ? '↑' : '↓'
}

export function getCourierName(item) {
  return item.courier
    ? `${item.courier.first_name} ${item.courier.last_name}`
    : '-'
}
