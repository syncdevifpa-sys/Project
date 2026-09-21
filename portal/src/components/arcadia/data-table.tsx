import React from 'react';
import { Icon } from './icon';
import { IconButton } from './button';
import { Checkbox } from './filter-panel';

export interface Column<R = any> {
  key: string;
  label: string;
  sortable?: boolean;
  kind?: 'strong' | 'muted' | 'mono';
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  render?: (row: R) => React.ReactNode;
}

export interface DataTableProps<R = any> {
  columns: Column<R>[];
  rows: R[];
  selectable?: boolean;
  selected?: Array<string | number>;
  onSelectAll?: () => void;
  onToggleSelect?: (id: string | number) => void;
  onSort?: (key: string) => void;
  onRemove?: (row: R) => void;
  footer?: React.ReactNode;
  className?: string;
}

export function DataTable<R = any>({
  columns = [],
  rows = [],
  selectable,
  selected = [],
  onSelectAll,
  onToggleSelect,
  onSort,
  onRemove,
  footer,
  className,
}: DataTableProps<R>) {
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className={['ar-table-wrap', className].filter(Boolean).join(' ')}>
      <table className="ar-table">
        <thead>
          <tr>
            {selectable && (
              <th className="ar-td-check">
                <Checkbox
                  label={<span className="ar-sr">Selecionar todos</span>}
                  checked={allSelected}
                  onChange={onSelectAll}
                />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width, textAlign: c.align }}
              >
                {c.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort && onSort(c.key)}
                  >
                    {c.label}
                    <Icon name="arrow-up-down" size={12} />
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
            {onRemove && <th style={{ textAlign: 'right' }}>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => {
            const rowId = r.id != null ? r.id : i;
            const isSelected = selected.indexOf(rowId) > -1;

            return (
              <tr key={rowId} aria-selected={isSelected ? 'true' : undefined}>
                {selectable && (
                  <td className="ar-td-check">
                    <Checkbox
                      label={<span className="ar-sr">Selecionar linha</span>}
                      checked={isSelected}
                      onChange={() => onToggleSelect && onToggleSelect(rowId)}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={c.kind ? 'ar-td-' + c.kind : undefined}
                    style={{ textAlign: c.align }}
                  >
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
                {onRemove && (
                  <td style={{ textAlign: 'right' }}>
                    <IconButton
                      icon="x"
                      label="Remover"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(r)}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {footer && <div className="ar-table-foot">{footer}</div>}
    </div>
  );
}
