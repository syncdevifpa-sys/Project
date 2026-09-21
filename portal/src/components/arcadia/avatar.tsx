import type { Field } from '@/lib/theme';

export interface AvatarProps {
  name: string;
  initials?: string;
  tone?: 'action' | Field;
  size?: number;
  decorative?: boolean;
  className?: string;
}

function getInitials(name: string): string {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function Avatar({
  name,
  initials,
  tone = 'action',
  size = 36,
  decorative,
  className,
}: AvatarProps) {
  const classes = ['ar-avatar', 'ar-avatar--' + tone, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden={decorative ? 'true' : undefined}
      title={decorative ? undefined : name}
    >
      {initials || getInitials(name)}
    </span>
  );
}
