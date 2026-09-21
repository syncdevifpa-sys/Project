import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Icon, type IconName } from './icon';
import { IconButton } from './button';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  message: string;
  action?: ToastAction;
  tone?: 'error';
  icon?: IconName | false;
  onClose?: () => void;
  className?: string;
}

export function Toast({
  message,
  action,
  tone,
  icon,
  onClose,
  className,
}: ToastProps) {
  const classes = ['ar-toast', tone ? 'ar-toast--' + tone : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status" aria-live="polite">
      {icon !== false && (
        <Icon name={icon || (tone === 'error' ? 'circle-alert' : 'check')} size={16} />
      )}
      <span className="ar-toast-msg">{message}</span>
      {action && (
        <button
          type="button"
          className="ar-toast-action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
      {onClose && (
        <IconButton
          icon="x"
          label="Fechar aviso"
          size="sm"
          onClick={onClose}
        />
      )}
    </div>
  );
}

interface ToastOptions {
  message: string;
  action?: ToastAction;
  tone?: 'error';
  duration?: number;
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastOptions | null>(null);

  const showToast = useCallback((opts: ToastOptions) => {
    setCurrent(opts);
  }, []);

  useEffect(() => {
    if (!current) return;
    const duration = current.duration ?? (current.action ? 6000 : 4000);
    const timer = setTimeout(() => {
      setCurrent(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {current && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
        >
          <Toast
            message={current.message}
            action={current.action ? {
              label: current.action.label,
              onClick: () => {
                current.action?.onClick();
                setCurrent(null);
              },
            } : undefined}
            tone={current.tone}
            onClose={() => setCurrent(null)}
          />
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
