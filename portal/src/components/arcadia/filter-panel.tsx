import React from 'react';
import { Icon } from './icon';

export interface SearchFieldProps {
  placeholder?: string;
  label?: string;
  shortcut?: string;
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function SearchField({
  placeholder,
  label,
  shortcut,
  value,
  defaultValue,
  onChange,
  autoFocus,
  style,
  className,
}: SearchFieldProps) {
  const classes = ['ar-search', className].filter(Boolean).join(' ');

  return (
    <label className={classes} style={style}>
      <Icon name="search" />
      <span className="ar-sr">{label || placeholder}</span>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        autoFocus={autoFocus}
      />
      {shortcut && <kbd className="ar-kbd">{shortcut}</kbd>}
    </label>
  );
}

export interface CheckboxProps {
  label: React.ReactNode;
  count?: number;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  className?: string;
}

export function Checkbox({
  label,
  count,
  checked,
  defaultChecked,
  onChange,
  className,
}: CheckboxProps) {
  const classes = ['ar-check', className].filter(Boolean).join(' ');

  return (
    <label className={classes}>
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
      />
      <span className="ar-check-box" aria-hidden="true">
        <Icon name="check" size={12} strokeWidth={3} />
      </span>
      {label}
      {count != null && <span className="ar-check-count">{count}</span>}
    </label>
  );
}

export interface FilterOption {
  label: string;
  count?: number;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export interface FilterGroup {
  title: string;
  options: FilterOption[];
}

export interface FilterPanelProps {
  groups?: FilterGroup[];
  search?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  label?: string;
  className?: string;
}

export function FilterPanel({
  groups = [],
  search = true,
  searchPlaceholder = 'Buscar',
  searchValue,
  onSearchChange,
  label = 'Filtros',
  className,
}: FilterPanelProps) {
  const classes = ['ar-filter', className].filter(Boolean).join(' ');

  return (
    <aside className={classes} aria-label={label}>
      {search && (
        <SearchField
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          style={{ background: 'var(--surface)' }}
        />
      )}
      {groups.map((g) => (
        <div
          key={g.title}
          className="ar-filter-group"
          role="group"
          aria-label={g.title}
        >
          <div className="ar-filter-title">
            {g.title}
          </div>
          {g.options.map((o) => (
            <Checkbox
              key={o.label}
              label={o.label}
              count={o.count}
              checked={o.checked}
              onChange={(e) => o.onChange && o.onChange(e.target.checked)}
            />
          ))}
        </div>
      ))}
    </aside>
  );
}
