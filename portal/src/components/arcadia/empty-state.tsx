import React from 'react';
import { Icon, type IconName } from './icon';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: IconName;
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  actions,
  compact,
  className,
}: EmptyStateProps) {
  const classes = [
    'ar-empty',
    compact ? 'ar-empty--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <span className="ar-empty-icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <div className="ar-empty-title">{title}</div>
      {description && <p className="ar-empty-desc">{description}</p>}
      {actions && <div className="ar-empty-actions">{actions}</div>}
    </div>
  );
}
