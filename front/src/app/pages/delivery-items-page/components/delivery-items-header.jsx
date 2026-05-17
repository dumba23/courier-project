import {
  ColumnsIcon,
  DownloadIcon,
  InfoIcon,
  MapPinIcon,
  PlusIcon,
  UploadIcon,
} from "../../../core/ui/icons.jsx";
import { useI18n } from "../../../core/i18n/i18n.context.jsx";

export function DeliveryItemsHeader({
  canCreateItems,
  importInputRef,
  isAdmin,
  isAssigningDistricts,
  isMultipleDistrictsFilterActive,
  isRefreshing,
  title = "მიწოდებები",
  onAssignDistricts,
  onDownloadTemplate,
  onOpenColumns,
  onOpenCreate,
  onOpenImportPicker,
  onOpenLegend,
  onImportFileChange,
  onToggleMultipleDistrictsFilter,
}) {
  const { t } = useI18n()

  return (
    <header className="delivery-items-page__header">
      <div className="delivery-items-page__header-main">
        <h2 className="page-title">{title}</h2>
        <button
          type="button"
          className={`button-secondary delivery-items-page__header-filter${
            isMultipleDistrictsFilterActive ? " is-active" : ""
          }`}
          onClick={onToggleMultipleDistrictsFilter}
        >
          {t("deliveryItems.multiDistricts")}
        </button>
      </div>
      <div className="delivery-items-page__header-actions">
        {isRefreshing ? (
          <span className="delivery-items-page__refreshing">{t("deliveryItems.updating")}</span>
        ) : null}
        {isAdmin ? (
          <button
            type="button"
            className="button-secondary icon-button delivery-items-page__toolbar-button"
            aria-label={t("deliveryItems.assignDistricts")}
            title={t("deliveryItems.assignDistricts")}
            data-tooltip={t("deliveryItems.assignDistricts")}
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
              aria-label={t("deliveryItems.downloadTemplate")}
              title={t("deliveryItems.downloadTemplate")}
              data-tooltip={t("deliveryItems.downloadTemplate")}
              onClick={onDownloadTemplate}
            >
              <DownloadIcon className="action-icon" />
            </button>
            <button
              type="button"
              className="button-secondary icon-button delivery-items-page__toolbar-button"
              aria-label={t("deliveryItems.import")}
              title={t("deliveryItems.import")}
              data-tooltip={t("deliveryItems.import")}
              onClick={onOpenImportPicker}
            >
              <UploadIcon className="action-icon" />
            </button>
            <button
              type="button"
              className="button-primary icon-button delivery-items-page__toolbar-button"
              aria-label={t("deliveryItems.add")}
              title={t("deliveryItems.add")}
              data-tooltip={t("deliveryItems.add")}
              onClick={onOpenCreate}
            >
              <PlusIcon className="action-icon" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="button-secondary icon-button delivery-items-page__toolbar-button"
          aria-label={t("deliveryItems.columnSettings")}
          title={t("deliveryItems.columnSettings")}
          data-tooltip={t("deliveryItems.columnSettings")}
          onClick={onOpenColumns}
        >
          <ColumnsIcon className="action-icon" />
        </button>
        <button
          type="button"
          className="button-secondary icon-button delivery-items-page__toolbar-button"
          aria-label={t("deliveryItems.statusColors")}
          title={t("deliveryItems.statusColors")}
          data-tooltip={t("deliveryItems.statusColors")}
          onClick={onOpenLegend}
        >
          <InfoIcon className="action-icon" />
        </button>
      </div>
    </header>
  );
}
