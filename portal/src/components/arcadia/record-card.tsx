import React from 'react';
import { Tag, Badge, type Tone } from './badge';
import { Icon, type IconName } from './icon';
import type { Field } from '@/lib/theme';

export interface RecordMetaItem {
  label: string;
  value: string;
}

export interface RecordSignal {
  tone?: 'orange' | 'link' | 'muted';
  label: string;
  icon?: IconName;
}

export interface RecordCardProps {
  title: string;
  description?: string;
  tags?: string[];
  badges?: Array<{ label: string; tone?: Tone }>;
  flag?: string;
  meta?: RecordMetaItem[];
  signal?: RecordSignal;
  stamp?: string;
  tone?: Field;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

const SIGNAL_ICON: Record<'orange' | 'link' | 'muted', IconName> = {
  orange: 'clock',
  link: 'refresh-cw',
  muted: 'clock',
};

export function RecordCard({
  title,
  description,
  tags = [],
  badges = [],
  flag,
  meta = [],
  signal,
  stamp,
  tone,
  href,
  onClick,
  className,
}: RecordCardProps) {
  const isLink = Boolean(href || onClick);
  const TagName = isLink ? (href ? 'a' : 'button') : 'article';

  const classes = [
    'ar-card',
    tone ? 'ar-card--' + tone : '',
    isLink ? 'ar-card--link' : '',
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
    <div className="ar-card-top">
      {tags.map((t) => (
        <Tag key={t}>{t}</Tag>
      ))}
      {badges.map((b) => (
        <Badge key={b.label} tone={b.tone}>
          {b.label}
        </Badge>
      ))}
      {flag && <span className="ar-badge ar-badge--flag">{flag}</span>}
    </div>,
    <h3 className="ar-card-title">{title}</h3>,
    description ? <p className="ar-card-desc">{description}</p> : null,
    meta.length > 0 ? (
      <p className="ar-card-meta">
        {meta.map((m) => (
          <span key={m.label}>
            {m.label}: <b style={{ color: 'inherit', fontWeight: 500 }}>{m.value}</b>
          </span>
        ))}
      </p>
    ) : null,
    stamp ? (
      <div className="ar-card-signal">
        <span className="ar-badge ar-badge--stamp">{stamp}</span>
      </div>
    ) : null,
    signal ? (
      <div className={['ar-card-signal', 'ar-signal--' + (signal.tone || 'muted')].join(' ')}>
        <Icon name={signal.icon || SIGNAL_ICON[signal.tone || 'muted']} size={14} />
        {signal.label}
      </div>
    ) : null
  );
}
