import './data-table.scss'

export function DataTable({
  wrapperClassName = '',
  tableClassName = '',
  headers,
  filtersRow = null,
  rows = [],
  emptyMessage = 'No items.',
  emptyColSpan,
}) {
  const resolvedColSpan = emptyColSpan ?? headers.length

  return (
    <div className={`data-table-wrap${wrapperClassName ? ` ${wrapperClassName}` : ''}`}>
      <table className={tableClassName}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
          {filtersRow ? filtersRow : null}
        </thead>
        <tbody>
          {rows.length ? (
            rows
          ) : (
            <tr className="data-table__empty-row">
              <td colSpan={resolvedColSpan}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
