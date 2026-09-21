import React from 'react';
import { Icon, type IconName } from './icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'ar-btn',
    'ar-btn--' + variant,
    size !== 'md' ? 'ar-btn--' + size : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />}
    </button>
  );
}

export interface IconButtonProps {
  icon: IconName;
  label: string;
  variant?: 'ghost' | 'primary';
  size?: 'sm';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export function IconButton({
  icon,
  label,
  variant,
  size,
  onClick,
  className,
  type = 'button',
  title,
}: IconButtonProps) {
  const classes = [
    'ar-iconbtn',
    variant ? 'ar-iconbtn--' + variant : '',
    size === 'sm' ? 'ar-iconbtn--sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      aria-label={label}
      title={title || label}
      onClick={onClick}
    >
      <Icon name={icon} size={size === 'sm' ? 14 : 16} />
    </button>
  );
}

export interface TextLinkProps {
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  arrow?: boolean;
  muted?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function TextLink({
  href = '#',
  onClick,
  arrow = true,
  muted,
  className,
  children,
}: TextLinkProps) {
  const classes = ['ar-link', muted ? 'ar-link--muted' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <a className={classes} href={href} onClick={onClick}>
      {children}
      {arrow && <Icon name="arrow-right" size={14} />}
    </a>
  );
}
