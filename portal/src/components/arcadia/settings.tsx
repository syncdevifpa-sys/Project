import React, { useState } from 'react';
import { Icon, type IconName } from './icon';
import { Avatar } from './avatar';
import { Badge, Tag } from './badge';
import type { ThemeMode, Field } from '@/lib/theme';

export interface MiniProps {
  theme?: string;
  accent?: Field;
}

export function Mini({ theme, accent = 'cyan' }: MiniProps) {
  return (
    <span className="ar-mini" data-theme={theme} aria-hidden="true">
      <span className="ar-mini-nav">
        <i />
        <b />
      </span>
      <span className={`ar-mini-hero ar-mini--${accent}`} />
      <span className="ar-mini-row">
        <span className="ar-mini-card" />
        <span className="ar-mini-card" />
      </span>
    </span>
  );
}

export interface ThemeOption {
  value: ThemeMode;
  label: string;
  icon: IconName;
  hint?: string;
}

export const THEMES: ThemeOption[] = [
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Escuro', icon: 'moon' },
  { value: 'auto', label: 'Automático', icon: 'monitor', hint: 'Segue o sistema' },
];

export interface ThemePickerProps {
  value?: ThemeMode;
  defaultValue?: ThemeMode;
  onChange?: (v: ThemeMode) => void;
  accent?: Field;
  options?: ThemeOption[];
  label?: string;
  className?: string;
}

export function ThemePicker({
  value,
  defaultValue = 'light',
  onChange,
  accent,
  options = THEMES,
  label = 'Tema',
  className,
}: ThemePickerProps) {
  const [internal, setInternal] = useState<ThemeMode>(defaultValue);
  const current = value !== undefined ? value : internal;

  return (
    <div
      className={['ar-themes', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o) => {
        const on = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className="ar-theme"
            onClick={() => {
              setInternal(o.value);
              if (onChange) onChange(o.value);
            }}
          >
            {o.value === 'auto' ? (
              <span className="ar-mini-split">
                <Mini theme="light" accent={accent} />
                <Mini theme="dark" accent={accent} />
              </span>
            ) : (
              <Mini theme={o.value} accent={accent} />
            )}
            <span className="ar-theme-label">
              <Icon name={o.icon} size={14} />
              {o.label}
              {on && <Icon name="check" size={14} className="ar-theme-check" />}
            </span>
            {o.hint && <span className="ar-theme-hint">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export interface AccentOption {
  value: Field;
  label: string;
}

export const ACCENTS: AccentOption[] = [
  { value: 'cyan', label: 'Piscina' },
  { value: 'pink', label: 'Rosa' },
  { value: 'yellow', label: 'Amarelo' },
  { value: 'lime', label: 'Limão' },
];

export interface AccentPickerProps {
  value?: Field;
  defaultValue?: Field;
  onChange?: (v: Field) => void;
  options?: AccentOption[];
  label?: string;
  className?: string;
}

export function AccentPicker({
  value,
  defaultValue = 'cyan',
  onChange,
  options = ACCENTS,
  label = 'Cor de destaque',
  className,
}: AccentPickerProps) {
  const [internal, setInternal] = useState<Field>(defaultValue);
  const current = value !== undefined ? value : internal;

  return (
    <div
      className={['ar-accents', className].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o) => {
        const on = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className="ar-accent"
            onClick={() => {
              setInternal(o.value);
              if (onChange) onChange(o.value);
            }}
          >
            <span className={`ar-accent-dot ar-mini--${o.value}`}>
              {on && <Icon name="check" size={14} strokeWidth={3} />}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface SettingsNavItem {
  label: string;
  description?: string;
  icon?: IconName;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
}

export interface SettingsNavProps {
  items: SettingsNavItem[];
  label?: string;
  className?: string;
}

export function SettingsNav({ items = [], label = 'Configurações', className }: SettingsNavProps) {
  return (
    <nav className={['ar-snav', className].filter(Boolean).join(' ')} aria-label={label}>
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href || '#'}
          onClick={it.onClick}
          aria-current={it.active ? 'page' : undefined}
        >
          <Icon name={it.icon || 'user'} size={18} />
          <span>
            <b>{it.label}</b>
            {it.description && <small>{it.description}</small>}
          </span>
        </a>
      ))}
    </nav>
  );
}

export interface SettingsSectionProps {
  title: string;
  description?: string;
  id?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  id,
  children,
  footer,
  className,
}: SettingsSectionProps) {
  const titleId = id ? `${id}-t` : undefined;

  return (
    <section
      className={['ar-sset', className].filter(Boolean).join(' ')}
      id={id}
      aria-labelledby={titleId}
    >
      <header className="ar-sset-head">
        <h2 id={titleId}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="ar-sset-body">{children}</div>
      {footer && <footer className="ar-sset-foot">{footer}</footer>}
    </section>
  );
}

export interface SettingRowProps {
  label: string;
  description?: string;
  stacked?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function SettingRow({
  label,
  description,
  stacked,
  children,
  className,
}: SettingRowProps) {
  return (
    <div
      className={[
        'ar-srow',
        stacked ? 'ar-srow--stacked' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="ar-srow-text">
        <div className="ar-srow-label">{label}</div>
        {description && <div className="ar-srow-desc">{description}</div>}
      </div>
      <div className="ar-srow-control">{children}</div>
    </div>
  );
}

export interface ProfileHeaderProps {
  name: string;
  role?: string;
  course?: string;
  id?: string;
  verified?: boolean;
  tone?: Field;
  onChangePhoto?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function ProfileHeader({
  name,
  role = 'Aluno',
  course,
  id,
  verified,
  tone = 'cyan',
  onChangePhoto,
  actions,
  className,
}: ProfileHeaderProps) {
  return (
    <div className={['ar-profile', className].filter(Boolean).join(' ')}>
      <span className="ar-profile-av">
        <Avatar name={name} tone={tone} size={72} />
        <button
          type="button"
          className="ar-profile-cam"
          aria-label="Alterar foto"
          title="Alterar foto"
          onClick={onChangePhoto}
        >
          <Icon name="camera" size={14} />
        </button>
      </span>
      <div className="ar-profile-text">
        <div className="ar-profile-name">{name}</div>
        <div className="ar-profile-meta">
          {course ? `${role} do curso ${course}` : role}
        </div>
        <div className="ar-profile-badges">
          {verified ? (
            <Badge tone="green">Vínculo verificado</Badge>
          ) : (
            <Badge tone="yellow">Vínculo em verificação</Badge>
          )}
          {id && <Tag>Matrícula {id}</Tag>}
        </div>
      </div>
      {actions && <div className="ar-profile-actions">{actions}</div>}
    </div>
  );
}

export type SaveBarState = 'dirty' | 'saving' | 'saved' | 'error' | 'clean';

export interface SaveBarProps {
  state?: SaveBarState;
  dirty?: boolean;
  message?: string;
  onSave?: () => void;
  onDiscard?: () => void;
  className?: string;
}

const SAVE_TEXT: Record<SaveBarState, string> = {
  dirty: 'Você tem alterações não salvas',
  saving: 'Salvando…',
  saved: 'Alterações salvas',
  error: 'Não foi possível salvar. Verifique sua conexão e tente de novo.',
  clean: '',
};

export function SaveBar({
  state,
  dirty,
  message,
  onSave,
  onDiscard,
  className,
}: SaveBarProps) {
  const currentState: SaveBarState = state || (dirty === false ? 'clean' : 'dirty');
  if (currentState === 'clean') return null;

  return (
    <div
      className={['ar-savebar', 'ar-savebar--' + currentState, className]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
    >
      {currentState === 'saved' && <Icon name="check" size={16} />}
      {currentState === 'error' && <Icon name="circle-alert" size={16} />}
      <span className="ar-savebar-msg">{message || SAVE_TEXT[currentState]}</span>
      {(currentState === 'dirty' || currentState === 'error') && (
        <button
          type="button"
          className="ar-btn ar-btn--sm ar-btn--secondary"
          onClick={onDiscard}
        >
          Descartar
        </button>
      )}
      {(currentState === 'dirty' || currentState === 'error') && (
        <button
          type="button"
          className="ar-btn ar-btn--sm ar-btn--save"
          onClick={onSave}
        >
          {currentState === 'error' ? 'Tentar de novo' : 'Salvar alterações'}
        </button>
      )}
    </div>
  );
}
