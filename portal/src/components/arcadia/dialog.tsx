import React, { useEffect } from 'react';
import { IconButton } from './button';

export interface DialogProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  inline?: boolean;
  className?: string;
}

export function Dialog({
  title,
  eyebrow,
  description,
  children,
  footer,
  onClose,
  inline,
  className,
}: DialogProps) {
  useEffect(() => {
    if (inline || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inline, onClose]);

  const box = (
    <div
      className={['ar-dialog', className].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="ar-dialog-head">
        <div>
          {eyebrow && <div className="ar-field-label">{eyebrow}</div>}
          <h2 className="ar-dialog-title">{title}</h2>
          {description && <p className="ar-dialog-desc">{description}</p>}
        </div>
        {onClose && (
          <IconButton icon="x" label="Fechar" size="sm" onClick={onClose} />
        )}
      </div>

      {children}

      {footer && <div className="ar-dialog-foot">{footer}</div>}
    </div>
  );

  if (inline) return box;

  return (
    <div
      className="ar-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {box}
    </div>
  );
}
