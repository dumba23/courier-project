export const STATUS_LABELS = {
  new_item: 'New item',
  delivered: 'Delivered',
  canceled: 'Canceled',
  receivable: 'მისაღები',
  received: 'მიღებული',
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
  receivable: 'Teal row means the item is marked as ready to be received back.',
  received: 'Dark teal row means the item was received back and the return date was recorded.',
  postponement: 'Yellow row means the delivery was postponed.',
  cancellation_on_site: 'Blue row means it was canceled when the courier arrived.',
  postponement_after_arrive: 'Grey row means it was postponed after arrival.',
  redirect_address: 'Light purple row means the address was redirected.',
  future_delivery: 'Brown row means it is scheduled for a future delivery date.',
}

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS)
export const DEFAULT_STATUS_OPTIONS = STATUS_OPTIONS.filter(
  ([status]) => !['receivable', 'received'].includes(status),
)
export const ADDITIONAL_STATUS_LABELS = {
  receivable: 'მისაღები',
  received: 'მიღებული',
}
export const ADDITIONAL_STATUS_OPTIONS = Object.entries(ADDITIONAL_STATUS_LABELS)
export const WAREHOUSE_STATE_LABELS = {
  received_in_warehouse: 'მიღებულია საწყობში',
  handed_to_courier: 'გადაეცა კურიერს',
}
export const WAREHOUSE_STATE_OPTIONS = Object.entries(WAREHOUSE_STATE_LABELS)
export const DELIVERY_ITEMS_TABLE_STATE_KEY = 'delivery-items-table-state'
export const BULK_ACTION_STATUS = 'status'
export const BULK_ACTION_DELIVERY_DATE = 'delivery_date'
export const BULK_ACTION_ACTUAL_DELIVERY_DATE = 'actual_delivery_date'
export const BULK_ACTION_RETURN_DATE = 'return_date'
export const BULK_ACTION_COURIER = 'assigned_courier_id'

export const initialFilters = {
  product: '',
  person_name: '',
  phone: '',
  partner: '',
  partner_ids: [],
  courier: '',
  courier_ids: [],
  multiple_districts: false,
  district: '',
  city: '',
  address: '',
  price: '',
  comment: '',
  courier_comment: '',
  additional_status: '',
  warehouse_state: [],
  status: [],
  delivery_date: '',
  actual_delivery_date: '',
  return_date: '',
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
  phone: true,
  partner: true,
  courier: true,
  district: true,
  city: true,
  address: true,
  price: true,
  comment: true,
  courier_comment: true,
  status: true,
  additional_status: true,
  warehouse_state: true,
  delivery_date: true,
  actual_delivery_date: true,
  return_date: true,
}
