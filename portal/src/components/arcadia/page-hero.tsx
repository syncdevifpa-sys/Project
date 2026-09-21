import React from 'react';
import type { Field } from '@/lib/theme';

export interface PageHeroProps {
  title: string;
  count?: number;
  description?: string;
  tone?: 'accent' | Field;
  size?: 'compact' | 'large';
  actions?: React.ReactNode;
  className?: string;
}

export function HeroArt() {
  return (
    <svg
      className="ar-hero-art"
      viewBox="0 0 1000 220"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <path className="l" d="M420 214 C 520 130, 620 230, 720 150 S 900 96, 1010 124" />
      <circle className="s" cx="650" cy="182" r="52" opacity="0.9" />
      <rect
        className="s"
        x="770"
        y="116"
        width="180"
        height="52"
        rx="26"
        opacity="0.75"
        transform="rotate(-16 860 142)"
      />
      <circle className="s" cx="975" cy="196" r="44" opacity="0.85" />
      <rect className="s" x="520" y="150" width="76" height="26" rx="13" opacity="0.6" />
      <circle className="d" cx="752" cy="133" r="5" />
      <circle className="s" cx="470" cy="128" r="9" opacity="0.9" />
    </svg>
  );
}

export function PageHero({
  title,
  count,
  description,
  tone = 'accent',
  size = 'compact',
  actions,
  className,
}: PageHeroProps) {
  const isLarge = size === 'large';
  const classes = [
    'ar-hero',
    'ar-hero--' + tone,
    isLarge ? 'ar-hero--large' : 'ar-hero--compact',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes}>
      <HeroArt />
      <h1 className="ar-hero-title">
        {title}
        {count != null && <sup className="ar-hero-count">({count})</sup>}
      </h1>
      <div className="ar-hero-side">
        {description && <p className="ar-hero-desc">{description}</p>}
        {actions && <div className="ar-hero-actions">{actions}</div>}
      </div>
    </section>
  );
}
