import { ColumnsIcon, DownloadIcon, InfoIcon, MapPinIcon, PlusIcon, UploadIcon } from '../../../core/ui/icons.jsx'

export function DeliveryItemsHeader({
  canCreateItems,
  importInputRef,
  isAdmin,
  isAssigningDistricts,
  isMultipleDistrictsFilterActive,
  isRefreshing,
  title = 'Deliveries',
  onAssignDistricts,
  onDownloadTemplate,
  onOpenColumns,
  onOpenCreate,
  onOpenImportPicker,
  onOpenLegend,
  onImportFileChange,
  onToggleMultipleDistrictsFilter,
}) {
  return (
    <header className="delivery-items-page__header">
      <div className="delivery-items-page__header-main">
        <h2 className="page-title">{title}</h2>
        <button
          type="button"
          className={`button-secondary delivery-items-page__header-filter${
            isMultipleDistrictsFilterActive ? ' is-active' : ''
          }`}
          onClick={onToggleMultipleDistrictsFilter}
        >
          Multiple districts
        </button>
      </div>
      <div className="delivery-items-page__header-actions">
        {isRefreshing ? <span className="delivery-items-page__refreshing">Updating...</span> : null}
        {isAdmin ? (
          <button
            type="button"
            className="button-secondary icon-button delivery-items-page__toolbar-button"
            aria-label="Assign districts to filtered deliveries"
            title="Assign districts to filtered deliveries"
            data-tooltip="Assign districts to filtered deliveries"
            disabled={isAssigningDistricts}
            onClick={onAssignDistricts}
          >
            <MapPinIcon className="action-icon" />
          </button>
        ) : null}
        {canCreateItems ? (
          <>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="delivery-items-page__hidden-input"
              onChange={onImportFileChange}
            />
            <button
              type="button"
              className="button-secondary icon-button delivery-items-page__toolbar-button"
              aria-label="Download import template"
              title="Download import template"
              data-tooltip="Download import template"
              onClick={onDownloadTemplate}
            >
              <DownloadIcon className="action-icon" />
            </button>
            <button
              type="button"
              className="button-secondary icon-button delivery-items-page__toolbar-button"
              aria-label="Import delivery items"
              title="Import delivery items"
              data-tooltip="Import delivery items"
              onClick={onOpenImportPicker}
            >
              <UploadIcon className="action-icon" />
            </button>
            <button
              type="button"
              className="button-primary icon-button delivery-items-page__toolbar-button"
              aria-label="Add delivery items"
              title="Add delivery items"
              data-tooltip="Add delivery items"
              onClick={onOpenCreate}
            >
              <PlusIcon className="action-icon" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="button-secondary icon-button delivery-items-page__toolbar-button"
          aria-label="Column settings"
          title="Column settings"
          data-tooltip="Column settings"
          onClick={onOpenColumns}
        >
          <ColumnsIcon className="action-icon" />
        </button>
        <button
          type="button"
          className="button-secondary icon-button delivery-items-page__toolbar-button"
          aria-label="Status colors"
          title="Status colors"
          data-tooltip="Status colors"
          onClick={onOpenLegend}
        >
          <InfoIcon className="action-icon" />
        </button>
      </div>
    </header>
  )
}
