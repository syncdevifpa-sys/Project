import { IconButton } from './button';

export interface SelectionAction {
  label: string;
  danger?: boolean;
  onClick?: () => void;
}

export interface SelectionBarProps {
  count: number;
  actions?: SelectionAction[];
  onClear?: () => void;
  className?: string;
}

export function SelectionBar({
  count,
  actions = [],
  onClear,
  className,
}: SelectionBarProps) {
  if (count <= 0) return null;

  const countText = count === 1 ? '1 registro selecionado' : `${count} registros selecionados`;

  return (
    <div
      className={['ar-selbar', className].filter(Boolean).join(' ')}
      role="region"
      aria-label="Seleção"
    >
      <span>{countText}</span>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          className={[
            'ar-btn',
            'ar-btn--sm',
            a.danger ? 'ar-btn--flag' : 'ar-btn--secondary',
          ].join(' ')}
          onClick={a.onClick}
        >
          {a.label}
        </button>
      ))}
      {onClear && (
        <IconButton
          icon="x"
          label="Limpar seleção"
          size="sm"
          onClick={onClear}
        />
      )}
    </div>
  );
}
