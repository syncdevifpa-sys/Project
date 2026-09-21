import React from 'react';
import { Badge, type Tone } from './badge';
import { Button } from './button';

export interface BoardColumnProps {
  title: string;
  tone?: Tone;
  empty?: string;
  children?: React.ReactNode;
  className?: string;
}

export function BoardColumn({
  title,
  tone = 'neutral',
  empty = 'Nenhum item nesta etapa',
  children,
  className,
}: BoardColumnProps) {
  const kids = React.Children.toArray(children);
  const countLabel = kids.length === 1 ? '1 item' : `${kids.length} itens`;

  return (
    <section className={['ar-col', className].filter(Boolean).join(' ')}>
      <div className="ar-col-head">
        <Badge tone={tone}>{title}</Badge>
        <span className="ar-col-count">{countLabel}</span>
      </div>
      {kids.length > 0 ? (
        kids
      ) : (
        <div className="ar-col-empty">{empty}</div>
      )}
    </section>
  );
}

export interface BoardCardAction {
  label: string;
  onClick?: (e: React.MouseEvent) => void;
}

export interface BoardCardProps {
  title: string;
  meta?: string;
  badge?: { label: string; tone?: Tone };
  footer?: React.ReactNode;
  action?: BoardCardAction;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function BoardCard({
  title,
  meta,
  badge,
  footer,
  action,
  onClick,
  className,
}: BoardCardProps) {
  return (
    <article
      className={['ar-bcard', className].filter(Boolean).join(' ')}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {badge && (
        <div>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      )}
      <div className="ar-bcard-title">{title}</div>
      {meta && <div className="ar-bcard-meta">{meta}</div>}
      {(footer || action) && (
        <div className="ar-bcard-foot">
          <span>{footer}</span>
          {action && (
            <Button size="xs" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
