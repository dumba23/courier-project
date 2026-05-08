export const STATUS_LABELS = {
  new_item: 'New item',
  delivered: 'Delivered',
  canceled: 'Canceled',
  postponement: 'Postponement',
  cancellation_on_site: 'Cancellation on site',
  postponement_after_arrive: 'Postponement after arrive',
  redirect_address: 'Redirect address',
  future_delivery: 'Future delivery',
}

export const STATUS_DESCRIPTIONS = {
  new_item: 'White row means the item is newly added and not processed yet.',
  delivered: 'Green row means the product was delivered successfully.',
  canceled: 'Red row means the order was canceled.',
  postponement: 'Yellow row means the delivery was postponed.',
  cancellation_on_site: 'Blue row means it was canceled when the courier arrived.',
  postponement_after_arrive: 'Grey row means it was postponed after arrival.',
  redirect_address: 'Light purple row means the address was redirected.',
  future_delivery: 'Brown row means it is scheduled for a future delivery date.',
}

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS)
export const DELIVERY_ITEMS_TABLE_STATE_KEY = 'delivery-items-table-state'
export const BULK_ACTION_STATUS = 'status'
export const BULK_ACTION_DELIVERY_DATE = 'delivery_date'
export const BULK_ACTION_ACTUAL_DELIVERY_DATE = 'actual_delivery_date'
export const BULK_ACTION_COURIER = 'assigned_courier_id'

export const initialFilters = {
  product: '',
  person_name: '',
  partner: '',
  partner_ids: [],
  courier: '',
  courier_ids: [],
  district: '',
  address: '',
  price: '',
  status: [],
  delivery_date: '',
  actual_delivery_date: '',
}

export const initialSort = {
  key: 'delivery_date',
  direction: 'asc',
}

export const initialPagination = {
  page: 1,
  per_page: 10,
}

export const PER_PAGE_OPTIONS = [10, 20, 50, 100, 200]

export const initialVisibleColumns = {
  product: true,
  person_name: true,
  partner: true,
  courier: true,
  district: true,
  address: true,
  price: true,
  status: true,
  delivery_date: true,
  actual_delivery_date: true,
}
