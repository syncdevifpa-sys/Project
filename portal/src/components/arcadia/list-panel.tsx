import React from 'react';
import { Badge, type Tone } from './badge';
import { Icon } from './icon';

export interface ListPanelProps {
  label?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function ListPanel({ label, action, children, className }: ListPanelProps) {
  const classes = ['ar-panel', className].filter(Boolean).join(' ');

  return (
    <section className={classes}>
      {(label || action) && (
        <div className="ar-panel-head">
          {label && <h3 className="ar-panel-label" style={{ margin: 0 }}>{label}</h3>}
          {action}
        </div>
      )}
      <div className="ar-panel-body">{children}</div>
    </section>
  );
}

export interface ListRowDate {
  day: string;
  month: string;
}

export interface ListRowProps {
  title: string;
  meta?: React.ReactNode;
  badges?: Array<{ label: string; tone?: Tone }>;
  date?: ListRowDate;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function ListRow({
  title,
  meta,
  badges,
  date,
  trailing,
  href,
  onClick,
  className,
}: ListRowProps) {
  const isNav = Boolean(href || onClick);
  const TagName = isNav ? (href ? 'a' : 'button') : 'div';

  const classes = [
    'ar-row',
    isNav ? 'ar-row--nav' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const props: any = {
    className: classes,
    onClick,
  };
  if (href) props.href = href;

  return React.createElement(
    TagName,
    props,
    date ? (
      <span className="ar-row-date">
        <b>{date.day}</b>
        <small>{date.month}</small>
      </span>
    ) : badges && badges.length > 0 ? (
      <span className="ar-row-badges">
        {badges.map((b) => (
          <Badge key={b.label} tone={b.tone}>
            {b.label}
          </Badge>
        ))}
      </span>
    ) : null,
    <span className="ar-row-main">
      <div className="ar-row-title">{title}</div>
      {meta && <div className="ar-row-meta">{meta}</div>}
    </span>,
    trailing ? <span className="ar-row-trail">{trailing}</span> : null,
    isNav ? (
      <span className="ar-row-chev">
        <Icon name="chevron-right" size={18} />
      </span>
    ) : null
  );
}
