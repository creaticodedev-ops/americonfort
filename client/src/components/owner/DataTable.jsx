import React from 'react'
import { EmptyState, SkeletonRows } from './ui'

const DataTable = ({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  loading,
  emptyMessage = 'No data found',
  emptyDescription,
  emptyAction,
  emptyIcon = 'inbox',
  onRowClick,
  className = '',
}) => {
  const handleSort = (key) => {
    if (!key || !onSort) return
    if (sortBy === key) {
      onSort(key, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, 'desc')
    }
  }

  const SortIcon = ({ columnKey }) => {
    if (!columnKey) return null
    if (sortBy !== columnKey) {
      return <span className="ml-1 opacity-35 text-[10px]" aria-hidden="true">↕</span>
    }
    return (
      <span className="ml-1 text-[var(--admin-accent)] text-[10px]" aria-hidden="true">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  return (
    <div className={`admin-table-wrap ${className}`}>
      <div className="table-scroll max-h-[min(70vh,44rem)] overflow-auto">
        <table className="admin-table max-lg:min-w-[720px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.className || ''} ${col.sortable ? 'is-sortable' : ''}`}
                  onClick={() => col.sortable && handleSort(col.sortKey || col.key)}
                  aria-sort={
                    col.sortable && sortBy === (col.sortKey || col.key)
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && <SortIcon columnKey={col.sortKey || col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="!p-4">
                  <SkeletonRows rows={6} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="!p-0">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyMessage}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row._id || index}
                  className={onRowClick ? 'cursor-pointer' : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className || ''}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
