import React from 'react';
import cx from './cx';

const CELL = 'block rounded-sm px-1.5 py-1.5 text-2xs font-medium leading-tight text-ink md:text-xs';

/**
 * Weekly timetable as a real table.
 * `columns`: header labels. `rows`: [{ label, cells: [{ label, className }] }] (className is a literal Tailwind class string).
 * `corner` is the top-left header cell. `onCellSelect({ row, column, cell })` makes cells buttons.
 * The wrapper is a labelled scroll region with tabIndex 0 so narrow screens can reach overflowing content.
 */
export default function TimetableGrid({ caption, columns, rows, corner = null, onCellSelect, className = '' }) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cx('overflow-x-auto rounded-lg border border-line bg-surface', className)}
    >
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-surface-hover">
            <th scope="col" className="w-16 px-2 py-2 text-2xs font-semibold uppercase tracking-[0.04em] text-ink-2 md:w-24 md:px-3">
              {corner}
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-1 py-2 text-center text-2xs font-semibold uppercase tracking-[0.04em] text-ink-2 md:px-3"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-line">
              <th scope="row" className="px-2 py-2 text-left text-2xs font-medium text-ink-2 md:px-3 md:text-xs">
                {row.label}
              </th>
              {row.cells.map((cell, ci) => (
                <td key={`${row.label}-${ci}`} className="p-1 align-top md:p-2">
                  {onCellSelect ? (
                    <button
                      type="button"
                      onClick={() => onCellSelect({ row: row.label, column: columns[ci], cell })}
                      className={cx(CELL, 'min-h-[44px] w-full text-left', cell.className)}
                    >
                      {cell.label}
                    </button>
                  ) : (
                    <span className={cx(CELL, cell.className)}>{cell.label}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
