import React from 'react';
import { Icon, type IconName } from './icon';

export interface ChipItem {
  label: string;
  value?: string;
  count?: number;
}

export interface ChipBarProps {
  items: ChipItem[];
  value?: string;
  onChange?: (v: string) => void;
  label?: string;
  className?: string;
}

function Sup({ n }: { n?: number }) {
  if (n == null) return null;
  return <sup className="ar-sup">({n})</sup>;
}

export function ChipBar({ items = [], value, onChange, label, className }: ChipBarProps) {
  const classes = ['ar-chipbar', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="group" aria-label={label}>
      {label && <span className="ar-chipbar-label">{label}</span>}
      {items.map((it) => {
        const v = it.value != null ? it.value : it.label;
        const pressed = v === value;
        return (
          <button
            key={v}
            type="button"
            className="ar-chip"
            aria-pressed={pressed}
            onClick={() => onChange && onChange(v)}
          >
            {it.label}
            <Sup n={it.count} />
          </button>
        );
      })}
    </div>
  );
}

export interface SegmentOption {
  value?: string;
  label: string;
  icon?: IconName;
}

export type SegmentOptionItem = SegmentOption | string;

export interface SegmentedControlProps {
  options: SegmentOptionItem[];
  value?: string;
  onChange?: (v: string) => void;
  label?: string;
  className?: string;
}

export function SegmentedControl({
  options = [],
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps) {
  const classes = ['ar-seg', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="group" aria-label={label}>
      {options.map((opt) => {
        const o: SegmentOption = typeof opt === 'string' ? { label: opt, value: opt } : opt;
        const v = o.value != null ? o.value : o.label;
        const pressed = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange && onChange(v)}
          >
            {o.icon && <Icon name={o.icon} size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const DEFAULT_VIEWS: SegmentOption[] = [
  { value: 'tabela', label: 'Tabela', icon: 'table-2' },
  { value: 'quadro', label: 'Quadro', icon: 'layout-grid' },
  { value: 'lista', label: 'Lista', icon: 'list' },
];

export interface ViewToolbarProps {
  view?: string;
  onViewChange?: (v: string) => void;
  views?: SegmentOption[];
  summary?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function ViewToolbar({
  view,
  onViewChange,
  views = DEFAULT_VIEWS,
  summary,
  children,
  className,
}: ViewToolbarProps) {
  const classes = ['ar-toolbar', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <SegmentedControl
        label="Visualização"
        options={views}
        value={view}
        onChange={onViewChange}
      />
      {summary && <span className="ar-toolbar-sum">{summary}</span>}
      {children}
    </div>
  );
}
