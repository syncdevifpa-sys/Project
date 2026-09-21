import React from 'react';
import { Icon, type IconName } from './icon';
import { TextLink } from './button';
import type { Field } from '@/lib/theme';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  caption?: string;
  link?: { label: string; href?: string; onClick?: () => void };
  tone?: Field;
  icon?: IconName;
  className?: string;
}

export function StatCard({
  label,
  value,
  caption,
  link,
  tone,
  icon,
  className,
}: StatCardProps) {
  const classes = ['ar-stat', tone ? 'ar-stat--' + tone : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="ar-stat-label">
        {label}
        {icon && <Icon name={icon} />}
      </div>
      <div className="ar-stat-value">{value}</div>
      {caption && <div className="ar-stat-cap">{caption}</div>}
      {link && (
        <div className="ar-stat-foot">
          <TextLink href={link.href} onClick={link.onClick}>
            {link.label}
          </TextLink>
        </div>
      )}
    </div>
  );
}
