import React, { useState } from 'react';
import { Icon } from './icon';

export interface TextFieldProps {
  label: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  readOnly?: boolean;
  locked?: boolean;
  error?: string;
  optional?: boolean;
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  className?: string;
  name?: string;
}

export function TextField({
  label,
  value,
  defaultValue,
  placeholder,
  type = 'text',
  hint,
  multiline,
  rows = 3,
  readOnly,
  locked,
  error,
  optional,
  autoComplete,
  required,
  autoFocus,
  onChange,
  className,
  name,
}: TextFieldProps) {
  const isReadOnly = readOnly || locked;
  const msgId = error || hint ? 'f-' + String(label).replace(/\W+/g, '-').toLowerCase() : undefined;

  const classes = [
    'ar-field',
    isReadOnly ? 'ar-field--ro' : '',
    error ? 'ar-field--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const commonProps = {
    name,
    placeholder,
    defaultValue,
    value,
    onChange,
    readOnly: isReadOnly,
    required,
    autoFocus,
    autoComplete,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': msgId,
  };

  return (
    <label className={classes}>
      <span className="ar-field-label">
        {label}
        {readOnly && <Icon name="lock" size={11} strokeWidth={2.5} />}
        {optional && <span className="ar-field-opt">(opcional)</span>}
      </span>

      {multiline ? (
        <textarea rows={rows} {...commonProps} />
      ) : (
        <input type={type} {...commonProps} />
      )}

      {error ? (
        <span className="ar-field-error" id={msgId} role="alert">
          <Icon name="circle-alert" size={14} />
          {error}
        </span>
      ) : hint ? (
        <span className="ar-field-hint" id={msgId}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface ChoiceChipsProps {
  label: string;
  options: Array<string | ChoiceOption>;
  value?: string;
  defaultValue?: string;
  onChange?: (val: string) => void;
  className?: string;
}

export function ChoiceChips({
  label,
  options = [],
  value,
  defaultValue,
  onChange,
  className,
}: ChoiceChipsProps) {
  const [internal, setInternal] = useState(
    value !== undefined ? value : defaultValue !== undefined ? defaultValue : ''
  );
  const currentVal = value !== undefined ? value : internal;

  const classes = ['ar-field', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="radiogroup" aria-label={label}>
      <span className="ar-field-label">{label}</span>
      <div className="ar-choices">
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const lab = typeof o === 'string' ? o : o.label;
          const active = v === currentVal;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              aria-pressed={active}
              className="ar-chip"
              onClick={() => {
                setInternal(v);
                if (onChange) onChange(v);
              }}
            >
              {lab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface SwitchProps {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (on: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  label,
  checked,
  defaultChecked = false,
  onChange,
  disabled,
  className,
}: SwitchProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const isOn = checked !== undefined ? checked : internal;

  const classes = ['ar-switch', className].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      className={classes}
      disabled={disabled}
      onClick={() => {
        const next = !isOn;
        setInternal(next);
        if (onChange) onChange(next);
      }}
    >
      <span className="ar-switch-knob" aria-hidden="true" />
    </button>
  );
}
