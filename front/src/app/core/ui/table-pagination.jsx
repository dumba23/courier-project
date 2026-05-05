import { ChevronLeftIcon, ChevronRightIcon } from './icons.jsx'
import './table-pagination.scss'

export function TablePagination({
  currentPage,
  lastPage,
  from,
  to,
  total,
  perPage,
  perPageOptions = [],
  isRefreshing = false,
  onPageChange,
  onPerPageChange,
}) {
  return (
    <div className="table-pagination">
      <div className="table-pagination__summary">
        {total ? `${from}-${to} of ${total}` : '0 results'}
      </div>
      <div className="table-pagination__actions">
        {perPageOptions.length ? (
          <label className="table-pagination__limit">
            <span>Rows</span>
            <select
              value={perPage}
              onChange={(event) => onPerPageChange?.(Number(event.target.value))}
              disabled={isRefreshing}
            >
              {perPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className="button-secondary table-pagination__nav-button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isRefreshing}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeftIcon className="table-pagination__nav-icon" />
        </button>
        <span className="table-pagination__page">
          {currentPage} / {lastPage}
        </span>
        <button
          type="button"
          className="button-secondary table-pagination__nav-button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage || isRefreshing}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRightIcon className="table-pagination__nav-icon" />
        </button>
      </div>
    </div>
  )
}
