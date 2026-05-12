import { useEffect, useMemo, useRef, useState } from 'react'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import { apiRequest } from '../../core/http/api.js'
import { DataTable } from '../../core/ui/data-table.jsx'
import { TablePagination } from '../../core/ui/table-pagination.jsx'
import {
  BULK_ACTION_COURIER,
  BULK_ACTION_STATUS,
  DEFAULT_STATUS_OPTIONS,
  initialFilters,
  initialPagination,
  initialSort,
  initialVisibleColumns,
  PER_PAGE_OPTIONS,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  WAREHOUSE_STATE_OPTIONS,
} from './delivery-items.constants.js'
import { buildDeliveryItemColumns } from './delivery-items.columns.jsx'
import {
  buildQueryString,
  createEmptyDraftItem,
  formatImportDate,
  isImportRowEmpty,
  readStoredTableState,
  writeStoredTableState,
} from './delivery-items.utils.js'
import { BulkUpdateDialog } from './components/bulk-update-dialog.jsx'
import { ColumnsDialog } from './components/columns-dialog.jsx'
import { CreateDeliveriesDialog } from './components/create-deliveries-dialog.jsx'
import { DeliveredStatusDialog } from './components/delivered-status-dialog.jsx'
import { DeliveryItemsHeader } from './components/delivery-items-header.jsx'
import { FilterMenuPortal } from './components/filter-menu-portal.jsx'
import { ImportPreviewDialog } from './components/import-preview-dialog.jsx'
import { useIsMobile } from './components/mobile-option-select.jsx'
import { StatusLegendDialog } from './components/status-legend-dialog.jsx'
import './delivery-items-page.scss'

function applyViewScopeToItems(items, viewScope) {
  if (viewScope === 'canceled') {
    return items.filter((item) => item.delivery_status === 'canceled')
  }

  if (viewScope === 'active') {
    return items.filter((item) => item.delivery_status !== 'canceled')
  }

  return items
}

export function DeliveryItemsPage({ auth, viewScope = 'active' }) {
  const storedTableState = useMemo(() => readStoredTableState(viewScope), [viewScope])
  const [deliveryItems, setDeliveryItems] = useState([])
  const [cities, setCities] = useState([])
  const [partners, setPartners] = useState([])
  const [couriers, setCouriers] = useState([])
  const [courierCommentTemplates, setCourierCommentTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusUpdateId, setStatusUpdateId] = useState(null)
  const [courierUpdateId, setCourierUpdateId] = useState(null)
  const [courierCommentUpdateId, setCourierCommentUpdateId] = useState(null)
  const [districtUpdateId, setDistrictUpdateId] = useState(null)
  const [cityUpdateId, setCityUpdateId] = useState(null)
  const [priceUpdateId, setPriceUpdateId] = useState(null)
  const [productUpdateId, setProductUpdateId] = useState(null)
  const [additionalStatusUpdateId, setAdditionalStatusUpdateId] = useState(null)
  const [warehouseStateUpdateId, setWarehouseStateUpdateId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isLegendOpen, setIsLegendOpen] = useState(false)
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false)
  const [isAssigningDistricts, setIsAssigningDistricts] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isImportSubmitting, setIsImportSubmitting] = useState(false)
  const [deliveredDialogState, setDeliveredDialogState] = useState(null)
  const [importedItems, setImportedItems] = useState([])
  const [importErrors, setImportErrors] = useState([])
  const [importFileName, setImportFileName] = useState('')
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
  const [draftItems, setDraftItems] = useState(() => [createEmptyDraftItem(auth?.user?.role === 'admin')])

  const filterMenuRef = useRef(null)
  const filterTriggerRefs = useRef({})
  const importInputRef = useRef(null)
  const isMobile = useIsMobile()
  const isAdmin = auth?.user?.role === 'admin'
  const isCourier = auth?.user?.role === 'courier'
  const isPartner = auth?.user?.role === 'seller'
  const canCreateItems = isAdmin || auth?.user?.role === 'seller'
  const partnerEmailMap = useMemo(() => (
    Object.fromEntries(partners.map((partner) => [partner.user?.email?.toLowerCase(), partner]))
  ), [partners])
  const partnerIdMap = useMemo(() => (
    Object.fromEntries(partners.map((partner) => [String(partner.id), partner]))
  ), [partners])
  const sellerTariffPerKg = Boolean(auth?.user?.partner?.tariff_per_kg)
  const hiddenColumnKeys = useMemo(() => (
    isPartner
      ? ['partner', 'courier', 'district']
      : isCourier
        ? ['courier']
        : []
  ), [isCourier, isPartner])
  const pageTitle = viewScope === 'canceled' ? 'Canceled Deliveries' : 'Deliveries'
  const visibleStatusOptions = useMemo(() => DEFAULT_STATUS_OPTIONS, [])
  const visibleStatusLabels = useMemo(() => (
    Object.fromEntries(visibleStatusOptions)
  ), [visibleStatusOptions])
  const visibleStatusDescriptions = useMemo(() => (
    Object.fromEntries(
      visibleStatusOptions.map(([status]) => [status, STATUS_DESCRIPTIONS[status]]),
    )
  ), [visibleStatusOptions])

  useEffect(() => {
    writeStoredTableState({ filters, sort, pagination, visibleColumns }, viewScope)
  }, [filters, sort, pagination, viewScope, visibleColumns])

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
        const queryString = `${buildQueryString(filters, sort)}&page=${pagination.page}&per_page=${pagination.per_page}&view_scope=${viewScope}`
        const payload = await apiRequest(`/api/delivery-items?${queryString}`, {
          token: auth?.token,
        })

        if (!isCancelled) {
          setDeliveryItems(applyViewScopeToItems(payload.delivery_items ?? [], viewScope))
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
  }, [auth?.token, filters, sort, pagination.page, pagination.per_page, reloadKey, hasLoadedOnce, viewScope])

  useEffect(() => {
    if (!isAdmin) {
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
    if (!auth?.token) {
      return undefined
    }

    let isCancelled = false

    async function loadCities() {
      try {
        const payload = await apiRequest('/api/cities', {
          token: auth?.token,
        })

        if (!isCancelled) {
          setCities(payload.cities ?? [])
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(requestError.message)
        }
      }
    }

    loadCities()

    return () => {
      isCancelled = true
    }
  }, [auth?.token])

  useEffect(() => {
    if (!auth?.token) {
      return undefined
    }

    let isCancelled = false

    async function loadCourierCommentTemplates() {
      try {
        const payload = await apiRequest('/api/courier-comment-templates', {
          token: auth?.token,
        })

        if (!isCancelled) {
          setCourierCommentTemplates(payload.templates ?? [])
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(requestError.message)
        }
      }
    }

    loadCourierCommentTemplates()

    return () => {
      isCancelled = true
    }
  }, [auth?.token])

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

  function toggleMultipleDistrictsFilter() {
    setFilters((current) => ({
      ...current,
      multiple_districts: !current.multiple_districts,
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

  function handleMultiSelectSet(filterKey, values) {
    setFilters((current) => ({
      ...current,
      [filterKey]: values,
    }))
    setPagination((current) => ({
      ...current,
      page: 1,
    }))
  }

  function handleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
    setPagination((current) => ({
      ...current,
      page: 1,
    }))
  }

  function toggleFilterMenu(key) {
    setOpenFilterMenu((current) => (current === key ? '' : key))
  }

  function getFilterTriggerRef(key) {
    return (element) => {
      filterTriggerRefs.current[key] = element
    }
  }

  async function handleStatusUpdate(deliveryItemId, nextStatus) {
    const currentItem = deliveryItems.find((item) => item.id === deliveryItemId)

    if (
      isCourier
      && nextStatus === 'delivered'
      && currentItem
      && currentItem.delivery_status !== 'delivered'
    ) {
      setDeliveredDialogState({
        deliveryItemId,
        transferredAmount: String(currentItem.transferred_to_shop_amount ?? '0'),
        collectedAmount: String(currentItem.collected_amount ?? currentItem.price ?? '0'),
      })

      return
    }

    if (
      viewScope === 'canceled'
      && currentItem?.delivery_status === 'canceled'
      && nextStatus !== currentItem.delivery_status
    ) {
      const isConfirmed = window.confirm(
        'Changing the status will remove this item from the canceled page. Continue?',
      )

      if (!isConfirmed) {
        return
      }
    }

    setStatusUpdateId(deliveryItemId)
    setError('')
    setNotice('')

    try {
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/status`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          delivery_status: nextStatus,
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setStatusUpdateId(null)
    }
  }

  function closeDeliveredDialog(force = false) {
    if (statusUpdateId && !force) {
      return
    }

    setDeliveredDialogState(null)
  }

  async function handleDeliveredDialogSubmit(event) {
    event.preventDefault()

    if (!deliveredDialogState) {
      return
    }

    setStatusUpdateId(deliveredDialogState.deliveryItemId)
    setError('')
    setNotice('')

    try {
      const payload = await apiRequest(`/api/delivery-items/${deliveredDialogState.deliveryItemId}/status`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          delivery_status: 'delivered',
          transferred_to_shop_amount: Number(deliveredDialogState.transferredAmount || 0),
          collected_amount: Number(deliveredDialogState.collectedAmount || 0),
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveredDialogState.deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
      closeDeliveredDialog(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setStatusUpdateId(null)
    }
  }

  async function handleCourierUpdate(deliveryItemId, nextCourierId) {
    setCourierUpdateId(deliveryItemId)
    setError('')
    setNotice('')

    try {
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/courier`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          assigned_courier_id: nextCourierId ? Number(nextCourierId) : null,
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCourierUpdateId(null)
    }
  }

  async function handleCourierCommentUpdate(deliveryItemId, nextComment) {
    setCourierCommentUpdateId(deliveryItemId)
    setError('')
    setNotice('')

    try {
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/courier-comment`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          courier_comment: nextComment.trim() ? nextComment : null,
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCourierCommentUpdateId(null)
    }
  }

  async function handleProductUpdate(deliveryItemId, nextProduct) {
    setProductUpdateId(deliveryItemId)
    setError('')
    setNotice('')

    try {
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/product`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          product: nextProduct,
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setProductUpdateId(null)
    }
  }

  async function handlePriceUpdate(deliveryItemId, nextPrice) {
    setPriceUpdateId(deliveryItemId)
    setError('')
    setNotice('')

    try {
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/price`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          price: Number(nextPrice || 0),
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPriceUpdateId(null)
    }
  }

  async function handleDistrictUpdate(deliveryItemId, nextDistrict) {
    setDistrictUpdateId(deliveryItemId)
    setError('')
    setNotice('')

    try {
      const currentItem = deliveryItems.find((item) => item.id === deliveryItemId)
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/location`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          district: nextDistrict,
          city: currentItem?.city ?? '',
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDistrictUpdateId(null)
    }
  }

  async function handleCityUpdate(deliveryItemId, nextCity) {
    setCityUpdateId(deliveryItemId)
    setError('')
    setNotice('')

    try {
      const currentItem = deliveryItems.find((item) => item.id === deliveryItemId)
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/location`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          district: currentItem?.district ?? '',
          city: nextCity,
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCityUpdateId(null)
    }
  }

  async function handleAdditionalStatusUpdate(deliveryItemId, nextStatus) {
    setAdditionalStatusUpdateId(deliveryItemId)
    setError('')
    setNotice('')

    try {
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/additional-status`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          additional_status: nextStatus || null,
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setAdditionalStatusUpdateId(null)
    }
  }

  async function handleWarehouseStateUpdate(deliveryItemId, nextState) {
    setWarehouseStateUpdateId(deliveryItemId)
    setError('')
    setNotice('')

    try {
      const payload = await apiRequest(`/api/delivery-items/${deliveryItemId}/warehouse-state`, {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          warehouse_state: nextState || null,
        }),
      })

      setDeliveryItems((current) => applyViewScopeToItems(
        current.map((item) => (
          item.id === deliveryItemId ? payload.delivery_item : item
        )),
        viewScope,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setWarehouseStateUpdateId(null)
    }
  }

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
    setBulkValue(type === BULK_ACTION_STATUS ? visibleStatusOptions[0][0] : '')
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
    setNotice('')

    try {
      await apiRequest('/api/delivery-items/bulk', {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          view_scope: viewScope,
          ...filters,
          bulk_action: bulkDialogType,
          ...(bulkDialogType === BULK_ACTION_STATUS
            ? { delivery_status: bulkValue }
            : bulkDialogType === BULK_ACTION_COURIER
              ? { assigned_courier_id: bulkValue ? Number(bulkValue) : null }
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

  function openCreateDialog() {
    setDraftItems([createEmptyDraftItem(isAdmin)])
    setIsCreateDialogOpen(true)
  }

  function closeCreateDialog(force = false) {
    if (isCreateSubmitting && !force) {
      return
    }

    setIsCreateDialogOpen(false)
    setDraftItems([createEmptyDraftItem(isAdmin)])
  }

  function closeImportDialog(force = false) {
    if (isImportSubmitting && !force) {
      return
    }

    setIsImportDialogOpen(false)
    setImportFileName('')
    setImportedItems([])
    setImportErrors([])
  }

  function toggleColumnVisibility(columnKey) {
    const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length

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

  function addDraftRow() {
    setDraftItems((current) => [...current, createEmptyDraftItem(isAdmin)])
  }

  function removeDraftRow(rowIndex) {
    setDraftItems((current) => (
      current.length === 1
        ? current
        : current.filter((_, index) => index !== rowIndex)
    ))
  }

  function updateDraftItem(rowIndex, field, value) {
    setDraftItems((current) => current.map((item, index) => (
      index === rowIndex
        ? {
          ...item,
          [field]: value,
        }
        : item
    )))
  }

  function isTariffPerKgItem(item) {
    if (isAdmin) {
      return Boolean(partnerIdMap[String(item.partner_id ?? '')]?.tariff_per_kg)
    }

    return sellerTariffPerKg
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    setIsCreateSubmitting(true)
    setError('')
    setNotice('')

    try {
      await apiRequest('/api/delivery-items', {
        method: 'POST',
        token: auth?.token,
        body: JSON.stringify({
          items: draftItems.map((item) => ({
            ...item,
            city: item.city || null,
          })),
        }),
      })

      closeCreateDialog(true)
      setReloadKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsCreateSubmitting(false)
    }
  }

  async function handleAssignDistricts() {
    setIsAssigningDistricts(true)
    setError('')
    setNotice('')

    try {
      const payload = await apiRequest('/api/delivery-items/assign-districts', {
        method: 'PATCH',
        token: auth?.token,
        body: JSON.stringify({
          ...filters,
          view_scope: viewScope,
        }),
      })

      setNotice(
        `Processed ${payload.processed_count ?? 0} deliveries. Updated ${payload.updated_count ?? 0}, unresolved ${payload.unresolved_count ?? 0}.`,
      )
      setReloadKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsAssigningDistricts(false)
    }
  }

  function downloadImportTemplate() {
    if (isAdmin) {
      void downloadAdminImportTemplate()

      return
    }

    void downloadSellerImportTemplate()
  }

  async function downloadAdminImportTemplate() {
    let availablePartners = partners
    let availableCities = cities

    if (!availablePartners.length) {
      try {
        const partnersPayload = await apiRequest('/api/partners', { token: auth?.token })
        availablePartners = partnersPayload.partners ?? []
      } catch (requestError) {
        setError(requestError.message)

        return
      }
    }

    if (!availableCities.length) {
      try {
        const citiesPayload = await apiRequest('/api/cities', { token: auth?.token })
        availableCities = citiesPayload.cities ?? []
      } catch (requestError) {
        setError(requestError.message)

        return
      }
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Delivery Items')
    const partnerOptionsSheet = workbook.addWorksheet('Partner Options')
    const cityOptionsSheet = workbook.addWorksheet('City Options')
    partnerOptionsSheet.state = 'veryHidden'
    cityOptionsSheet.state = 'veryHidden'

    const headers = [
      'partner_email',
      'product',
      'person_name',
      'phone',
      'city',
      'address',
      'price',
      'comment',
      'delivery_date',
    ]
    const exampleRow = [
      availablePartners[0]?.user?.email ?? 'partner@courier.test',
      'Electronics package',
      'Nino Beridze',
      '+995555100111',
      'თბილისი',
      'Saburtalo, Pekini Avenue 12',
      35,
      'Call on arrival.',
      '2026-05-10',
    ]

    worksheet.addRow(headers)
    worksheet.addRow(exampleRow)

    worksheet.columns = [
      { key: 'partner_email', width: 28 },
      { key: 'product', width: 24 },
      { key: 'person_name', width: 24 },
      { key: 'phone', width: 18 },
      { key: 'city', width: 18 },
      { key: 'address', width: 34 },
      { key: 'price', width: 12 },
      { key: 'comment', width: 24 },
      { key: 'delivery_date', width: 16 },
    ]

    worksheet.getRow(1).font = { bold: true }

    partnerOptionsSheet.addRows(
      availablePartners
        .map((partner) => [partner.user?.email])
        .filter(([email]) => Boolean(email)),
    )
    cityOptionsSheet.addRows(
      availableCities
        .map((city) => [city.name])
        .filter(([name]) => Boolean(name)),
    )

    if (partnerOptionsSheet.rowCount > 0) {
      for (let rowNumber = 2; rowNumber <= 500; rowNumber += 1) {
        worksheet.getCell(`A${rowNumber}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`'Partner Options'!$A$1:$A$${partnerOptionsSheet.rowCount}`],
          showErrorMessage: true,
          errorTitle: 'Invalid partner',
          error: 'Please select a partner email from the dropdown list.',
        }
      }
    }

    if (cityOptionsSheet.rowCount > 0) {
      for (let rowNumber = 2; rowNumber <= 500; rowNumber += 1) {
        worksheet.getCell(`E${rowNumber}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'City Options'!$A$1:$A$${cityOptionsSheet.rowCount}`],
          showErrorMessage: true,
          errorTitle: 'Invalid city',
          error: 'Please select a city from the dropdown list.',
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'delivery-items-import-admin.xlsx'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function downloadSellerImportTemplate() {
    let availableCities = cities

    if (!availableCities.length) {
      try {
        const citiesPayload = await apiRequest('/api/cities', { token: auth?.token })
        availableCities = citiesPayload.cities ?? []
      } catch (requestError) {
        setError(requestError.message)

        return
      }
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Delivery Items')
    const cityOptionsSheet = workbook.addWorksheet('City Options')
    cityOptionsSheet.state = 'veryHidden'

    const headers = ['product', 'person_name', 'phone', 'city', 'address', 'price', 'comment', 'delivery_date']
    const exampleRow = [
      'Electronics package',
      'Nino Beridze',
      '+995555100111',
      availableCities[0]?.name ?? 'თბილისი',
      'Saburtalo, Pekini Avenue 12',
      35,
      'Call on arrival.',
      '2026-05-10',
    ]

    worksheet.addRow(headers)
    worksheet.addRow(exampleRow)

    worksheet.columns = [
      { key: 'product', width: 24 },
      { key: 'person_name', width: 24 },
      { key: 'phone', width: 18 },
      { key: 'city', width: 18 },
      { key: 'address', width: 34 },
      { key: 'price', width: 12 },
      { key: 'comment', width: 24 },
      { key: 'delivery_date', width: 16 },
    ]

    worksheet.getRow(1).font = { bold: true }

    cityOptionsSheet.addRows(
      availableCities
        .map((city) => [city.name])
        .filter(([name]) => Boolean(name)),
    )

    if (cityOptionsSheet.rowCount > 0) {
      for (let rowNumber = 2; rowNumber <= 500; rowNumber += 1) {
        worksheet.getCell(`D${rowNumber}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'City Options'!$A$1:$A$${cityOptionsSheet.rowCount}`],
          showErrorMessage: true,
          errorTitle: 'Invalid city',
          error: 'Please select a city from the dropdown list.',
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'delivery-items-import.xlsx'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function openImportPicker() {
    importInputRef.current?.click()
  }

  function validateImportedItems(items) {
    const nextImportErrors = []

    items.forEach((item, index) => {
      const rowNumber = index + 2

      if (isAdmin) {
        const partnerId = String(item.partner_id ?? '').trim()
        const matchedPartner = partnerIdMap[partnerId]

        if (!partnerId) {
          nextImportErrors.push(`Row ${rowNumber}: partner is required.`)
        } else if (!matchedPartner) {
          nextImportErrors.push(`Row ${rowNumber}: selected partner was not found.`)
        }
      }

      if (!String(item.product ?? '').trim()) {
        nextImportErrors.push(`Row ${rowNumber}: product is required.`)
      } else if (isTariffPerKgItem(item) && Number.isNaN(Number(item.product))) {
        nextImportErrors.push(`Row ${rowNumber}: product must be a decimal value for this partner.`)
      }

      if (!String(item.person_name ?? '').trim()) {
        nextImportErrors.push(`Row ${rowNumber}: person_name is required.`)
      }

      if (!String(item.phone ?? '').trim()) {
        nextImportErrors.push(`Row ${rowNumber}: phone is required.`)
      }

      if (!String(item.address ?? '').trim()) {
        nextImportErrors.push(`Row ${rowNumber}: address is required.`)
      }

      if (!String(item.price ?? '').trim() || Number.isNaN(Number(item.price))) {
        nextImportErrors.push(`Row ${rowNumber}: price must be a valid number.`)
      }

      if (!String(item.delivery_date ?? '').trim()) {
        nextImportErrors.push(`Row ${rowNumber}: delivery_date must be a valid date.`)
      }
    })

    if (!items.length) {
      nextImportErrors.push('No import rows were found in the uploaded file.')
    }

    if (items.length > 200) {
      nextImportErrors.push('The import file can contain at most 200 rows per upload.')
    }

    return nextImportErrors
  }

  function updateImportedItem(rowIndex, field, value) {
    setImportedItems((current) => {
      const nextItems = current.map((item, index) => (
        index === rowIndex
          ? {
            ...item,
            [field]: value,
          }
          : item
      ))

      setImportErrors(validateImportedItems(nextItems))

      return nextItems
    })
  }

  async function handleImportFileChange(event) {
    const [file] = event.target.files ?? []
    event.target.value = ''

    if (!file) {
      return
    }

    setError('')

    try {
      const fileBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
      const partnerImportErrors = []

      const nextImportedItems = rawRows
        .filter((row) => !isImportRowEmpty(row))
        .map((row, index) => {
          const rowNumber = index + 2
          const normalizedItem = {
            partner_id: '',
            partner_name: '',
            product: String(row.product ?? '').trim(),
            person_name: String(row.person_name ?? '').trim(),
            phone: String(row.phone ?? '').trim(),
            city: String(row.city ?? '').trim(),
            address: String(row.address ?? '').trim(),
            price: String(row.price ?? '').trim(),
            comment: String(row.comment ?? '').trim(),
            delivery_date: formatImportDate(row.delivery_date),
          }

          if (isAdmin) {
            const partnerEmail = String(row.partner_email ?? '').trim().toLowerCase()
            const matchedPartner = partnerEmailMap[partnerEmail]

            if (!partnerEmail) {
              partnerImportErrors.push(`Row ${rowNumber}: partner_email is required.`)
              return normalizedItem
            } else if (!matchedPartner) {
              partnerImportErrors.push(`Row ${rowNumber}: partner_email "${row.partner_email}" was not found.`)
              return normalizedItem
            }

            normalizedItem.partner_id = String(matchedPartner.id)
            normalizedItem.partner_name = matchedPartner.name
          }

          return normalizedItem
        })
      const nextImportErrors = [
        ...partnerImportErrors,
        ...validateImportedItems(nextImportedItems),
      ]

      setImportFileName(file.name)
      setImportedItems(nextImportedItems)
      setImportErrors(nextImportErrors)
      setIsImportDialogOpen(true)
    } catch {
      setError('The uploaded Excel file could not be read.')
    }
  }

  async function handleImportSubmit() {
    if (!importedItems.length || importErrors.length) {
      return
    }

    setIsImportSubmitting(true)
    setError('')
    setNotice('')

    try {
      await apiRequest('/api/delivery-items', {
        method: 'POST',
        token: auth?.token,
        body: JSON.stringify({
          items: importedItems.map((item) => ({
            ...(isAdmin ? { partner_id: Number(item.partner_id) } : {}),
            product: item.product,
            person_name: item.person_name,
            phone: item.phone,
            city: item.city || null,
            address: item.address,
            price: Number(item.price),
            comment: item.comment || null,
            delivery_date: item.delivery_date,
          })),
        }),
      })

      closeImportDialog(true)
      setReloadKey((current) => current + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsImportSubmitting(false)
    }
  }

  const partnerFilterLabel = filters.partner_ids.length
    ? `${filters.partner_ids.length} selected`
    : 'All'
  const courierFilterLabel = filters.courier_ids.length
    ? `${filters.courier_ids.length} selected`
    : 'All'
  const warehouseStateFilterLabel = filters.warehouse_state.length
    ? `${filters.warehouse_state.length} selected`
    : 'All'
  const statusFilterLabel = filters.status.length
    ? `${filters.status.length} selected`
    : 'All'

  const columnDefinitions = buildDeliveryItemColumns({
    activeFilterMenu: openFilterMenu,
    additionalStatusUpdateId,
    courierCommentTemplates,
    couriers,
    courierCommentUpdateId,
    courierFilterLabel,
    courierUpdateId,
    districtUpdateId,
    cityUpdateId,
    priceUpdateId,
    productUpdateId,
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
    metaTotal: meta.total,
    onOpenBulkDialog: openBulkDialog,
    onSort: handleSort,
    onToggleFilterMenu: toggleFilterMenu,
    partnerFilterLabel,
    sort,
    statusLabels: STATUS_LABELS,
    statusOptions: visibleStatusOptions,
    statusFilterLabel,
    statusUpdateId,
    warehouseStateFilterLabel,
    viewScope,
  })
  const visibleColumnDefinitions = columnDefinitions.filter((column) => !hiddenColumnKeys.includes(column.key))
  const activeColumns = visibleColumnDefinitions.filter((column) => visibleColumns[column.key])
  const visibleColumnCount = visibleColumnDefinitions.filter((column) => visibleColumns[column.key]).length
  const filteredDeliveryItems = filters.multiple_districts
    ? deliveryItems.filter((item) => String(item.district ?? '').includes(','))
    : deliveryItems

  return (
    <section className="delivery-items-page">
      <DeliveryItemsHeader
        canCreateItems={canCreateItems}
        importInputRef={importInputRef}
        isAdmin={isAdmin}
        isAssigningDistricts={isAssigningDistricts}
        isMultipleDistrictsFilterActive={Boolean(filters.multiple_districts)}
        isRefreshing={isRefreshing}
        title={pageTitle}
        onAssignDistricts={handleAssignDistricts}
        onDownloadTemplate={downloadImportTemplate}
        onImportFileChange={handleImportFileChange}
        onOpenColumns={() => setIsColumnsDialogOpen(true)}
        onOpenCreate={openCreateDialog}
        onOpenImportPicker={openImportPicker}
        onOpenLegend={() => setIsLegendOpen(true)}
        onToggleMultipleDistrictsFilter={toggleMultipleDistrictsFilter}
      />

      {error ? <p className="status-message is-error">{error}</p> : null}
      {!error && notice ? <p className="status-message">{notice}</p> : null}

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
            rows={filteredDeliveryItems.map((item) => (
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

      <FilterMenuPortal
        filterKey="partner_ids"
        getOptionLabel={(partner) => partner.name}
        menuRef={filterMenuRef}
        openFilterMenu={openFilterMenu}
        options={partners}
        selectedValues={filters.partner_ids}
        style={filterMenuStyle}
        onToggleValue={handleMultiSelectChange}
      />
      <FilterMenuPortal
        filterKey="courier_ids"
        getOptionLabel={(courier) => `${courier.first_name} ${courier.last_name}`}
        menuRef={filterMenuRef}
        openFilterMenu={openFilterMenu}
        options={couriers}
        selectedValues={filters.courier_ids}
        style={filterMenuStyle}
        onToggleValue={handleMultiSelectChange}
      />
      <FilterMenuPortal
        filterKey="warehouse_state"
        getOptionLabel={(warehouseStateOption) => warehouseStateOption[1]}
        menuRef={filterMenuRef}
        openFilterMenu={openFilterMenu}
        options={WAREHOUSE_STATE_OPTIONS}
        selectedValues={filters.warehouse_state}
        style={filterMenuStyle}
        onToggleValue={handleMultiSelectChange}
      />
      <FilterMenuPortal
        filterKey="status"
        getOptionLabel={(statusOption) => statusOption[1]}
        headerActions={(
          <>
            <button
              type="button"
              className="delivery-items-table__multi-filter-action"
              onClick={() => handleMultiSelectSet('status', visibleStatusOptions.map(([status]) => status))}
            >
              Select all
            </button>
            <button
              type="button"
              className="delivery-items-table__multi-filter-action"
              onClick={() => handleMultiSelectSet('status', [])}
            >
              Clear
            </button>
          </>
        )}
        menuRef={filterMenuRef}
        openFilterMenu={openFilterMenu}
        options={visibleStatusOptions}
        selectedValues={filters.status}
        style={filterMenuStyle}
        onToggleValue={handleMultiSelectChange}
      />

      {isCreateDialogOpen ? (
        <CreateDeliveriesDialog
          cities={cities}
          draftItems={draftItems}
          isTariffPerKgItem={isTariffPerKgItem}
          isAdmin={isAdmin}
          isSubmitting={isCreateSubmitting}
          onAddRow={addDraftRow}
          onClose={() => closeCreateDialog()}
          onRemoveRow={removeDraftRow}
          onSubmit={handleCreateSubmit}
          onUpdateItem={updateDraftItem}
          partners={partners}
        />
      ) : null}

      {isImportDialogOpen ? (
        <ImportPreviewDialog
          cities={cities}
          importErrors={importErrors}
          importFileName={importFileName}
          importedItems={importedItems}
          isTariffPerKgItem={isTariffPerKgItem}
          isAdmin={isAdmin}
          isSubmitting={isImportSubmitting}
          onClose={() => closeImportDialog()}
          onConfirm={handleImportSubmit}
          onUpdateItem={updateImportedItem}
          partners={partners}
        />
      ) : null}

      {deliveredDialogState ? (
        <DeliveredStatusDialog
          isSubmitting={statusUpdateId === deliveredDialogState.deliveryItemId}
          transferredAmount={deliveredDialogState.transferredAmount}
          collectedAmount={deliveredDialogState.collectedAmount}
          onTransferredAmountChange={(value) => setDeliveredDialogState((current) => (
            current ? { ...current, transferredAmount: value } : current
          ))}
          onCollectedAmountChange={(value) => setDeliveredDialogState((current) => (
            current ? { ...current, collectedAmount: value } : current
          ))}
          onClose={() => closeDeliveredDialog()}
          onConfirm={handleDeliveredDialogSubmit}
        />
      ) : null}

      {isLegendOpen ? (
        <StatusLegendDialog
          descriptions={visibleStatusDescriptions}
          labels={visibleStatusLabels}
          onClose={() => setIsLegendOpen(false)}
        />
      ) : null}

      {isColumnsDialogOpen ? (
        <ColumnsDialog
          columns={visibleColumnDefinitions}
          onClose={() => setIsColumnsDialogOpen(false)}
          onToggleColumn={toggleColumnVisibility}
          visibleColumnCount={visibleColumnCount}
          visibleColumns={visibleColumns}
        />
      ) : null}

      {bulkDialogType ? (
        <BulkUpdateDialog
          bulkDialogType={bulkDialogType}
          bulkValue={bulkValue}
          couriers={couriers}
          isSubmitting={isBulkSubmitting}
          metaTotal={meta.total}
          onClose={closeBulkDialog}
          onSubmit={handleBulkSubmit}
          statusOptions={visibleStatusOptions}
          onValueChange={setBulkValue}
        />
      ) : null}
    </section>
  )
}
