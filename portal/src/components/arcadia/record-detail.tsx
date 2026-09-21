import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './icon';
import { Button } from './button';
import { HeroArt } from './page-hero';
import type { Field } from '@/lib/theme';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items = [], className }: BreadcrumbProps) {
  return (
    <nav className={['ar-crumbs', className].filter(Boolean).join(' ')} aria-label="Você está em">
      <ol>
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i}>
              {isLast ? (
                <span aria-current="page">{it.label}</span>
              ) : it.href && it.href.startsWith('/') ? (
                <Link to={it.href}>{it.label}</Link>
              ) : (
                <a href={it.href || '#'} onClick={it.onClick}>
                  {it.label}
                </a>
              )}
              {!isLast && <Icon name="chevron-right" size={14} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface RecordDetailHeroProps {
  title: string;
  description?: string;
  tags?: string[];
  primary?: { label: string; onClick?: () => void };
  secondary?: React.ReactNode;
  status?: string;
  tone?: Field;
  className?: string;
}

export function RecordDetailHero({
  title,
  description,
  tags,
  primary,
  secondary,
  status,
  tone = 'pink',
  className,
}: RecordDetailHeroProps) {
  const classes = ['ar-detail', 'ar-detail--' + tone, className]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes}>
      <HeroArt />
      {tags && tags.length > 0 && (
        <div className="ar-detail-eyebrow">
          {tags.map((t) => (
            <span key={t} className="ar-tag ar-tag--onfield">
              {t}
            </span>
          ))}
        </div>
      )}
      <h1 className="ar-detail-title">{title}</h1>
      {description && <p className="ar-detail-desc">{description}</p>}
      {(primary || secondary) && (
        <div className="ar-detail-actions">
          {primary && (
            <Button
              variant="primary"
              size="lg"
              iconRight="arrow-right"
              onClick={primary.onClick}
            >
              {primary.label}
            </Button>
          )}
          {secondary}
        </div>
      )}
      {status && <span className="ar-detail-status">{status}</span>}
    </section>
  );
}

export interface InfoItem {
  icon?: IconName;
  label: string;
  value: React.ReactNode;
}

export interface InfoStripProps {
  items: InfoItem[];
  className?: string;
}

export function InfoStrip({ items = [], className }: InfoStripProps) {
  return (
    <div className={['ar-info', className].filter(Boolean).join(' ')}>
      {items.map((it) => (
        <div key={it.label} className="ar-info-item">
          <Icon name={it.icon || 'clock'} size={18} />
          <div>
            <span>{it.label}: </span>
            <b style={{ fontWeight: 600 }}>{it.value}</b>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface StepItem {
  title: string;
  description?: string;
  when?: string;
}

export interface StepListProps {
  steps: StepItem[];
  className?: string;
}

export function StepList({ steps = [], className }: StepListProps) {
  return (
    <ol className={['ar-steps', className].filter(Boolean).join(' ')}>
      {steps.map((s, i) => (
        <li key={i} className="ar-step">
          <span className="ar-step-n">{i + 1}</span>
          <div>
            <h4 className="ar-step-title">{s.title}</h4>
            {s.description && <p className="ar-step-desc">{s.description}</p>}
          </div>
          {s.when && <span className="ar-step-when">{s.when}</span>}
        </li>
      ))}
    </ol>
  );
}
