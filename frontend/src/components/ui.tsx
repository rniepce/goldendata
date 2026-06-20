/*
 * Componentes próprios, simples e acessíveis (sem libs de UI pesadas).
 * Todos com semântica HTML correta e suporte a teclado/leitor de tela.
 */

import type { ReactNode } from 'react';
import { ApiError } from '../lib/api';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}): ReactNode {
  return (
    <header className="gd-page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="gd-row">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}): ReactNode {
  return (
    <section className="gd-card">
      {title && (
        <div className="gd-toolbar">
          <h2 className="gd-card__title" style={{ margin: 0, border: 'none' }}>
            {title}
          </h2>
          <div className="gd-toolbar__spacer" />
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }): ReactNode {
  return (
    <div className="gd-loading" role="status" aria-live="polite">
      <span className="gd-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorAlert({ error }: { error: unknown }): ReactNode {
  const message =
    error instanceof ApiError || error instanceof Error
      ? error.message
      : 'Ocorreu um erro inesperado.';
  return (
    <div className="gd-alert gd-alert--error" role="alert" aria-live="assertive">
      {message}
    </div>
  );
}

export function SuccessAlert({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="gd-alert gd-alert--success" role="status" aria-live="polite">
      {children}
    </div>
  );
}

export function InfoAlert({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="gd-alert gd-alert--info" role="note">
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }): ReactNode {
  return <div className="gd-empty">{children}</div>;
}

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}): ReactNode {
  return <span className={`gd-badge gd-badge--${tone}`}>{children}</span>;
}

export function RiskBadge({ risco }: { risco?: string | null }): ReactNode {
  if (!risco) return <Badge tone="neutral">Sem classificação</Badge>;
  return <Badge tone={risco === 'alto' ? 'danger' : 'success'}>Risco {risco}</Badge>;
}

let fieldSeq = 0;
function nextId(prefix: string): string {
  fieldSeq += 1;
  return `${prefix}-${fieldSeq}`;
}

interface BaseFieldProps {
  label: string;
  hint?: string;
  required?: boolean;
}

export function TextField({
  label,
  hint,
  required,
  value,
  onChange,
  type = 'text',
  disabled,
  placeholder,
}: BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}): ReactNode {
  const id = nextId('fld');
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="gd-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        className="gd-input"
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={hintId}
        aria-required={required}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <span className="gd-field__hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  required,
  value,
  onChange,
  rows = 4,
  disabled,
  placeholder,
}: BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
  placeholder?: string;
}): ReactNode {
  const id = nextId('fld');
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="gd-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={id}
        className="gd-textarea"
        value={value}
        rows={rows}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={hintId}
        aria-required={required}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <span className="gd-field__hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  hint,
  required,
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
}): ReactNode {
  const id = nextId('fld');
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="gd-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        id={id}
        className="gd-select"
        value={value}
        required={required}
        disabled={disabled}
        aria-describedby={hintId}
        aria-required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && (
        <span className="gd-field__hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}): ReactNode {
  const id = nextId('chk');
  return (
    <div className="gd-checkbox-row">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function MetaItem({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div>
      <div className="gd-meta__label">{label}</div>
      <div className="gd-meta__value">{children ?? '—'}</div>
    </div>
  );
}

/* Trechos em **negrito** dentro de uma linha (sem HTML inseguro). */
function mdInline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    return bold ? <strong key={i}>{bold[1]}</strong> : <span key={i}>{part}</span>;
  });
}

/**
 * Renderizador leve de markdown para a saída da IA (parecer, Q&A): cobre
 * **negrito**, listas com "- " e parágrafos. Não usa dangerouslySetInnerHTML.
 */
export function Markdown({ text }: { text: string }): ReactNode {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;
  const flush = (): void => {
    if (bullets.length) {
      const items = bullets;
      blocks.push(
        <ul key={`l${key++}`} className="gd-md-list">
          {items.map((b, i) => (
            <li key={i}>{mdInline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      bullets.push(li[1]);
      continue;
    }
    flush();
    if (line.trim() === '') continue;
    blocks.push(
      <p key={`p${key++}`} className="gd-md-p">
        {mdInline(line)}
      </p>,
    );
  }
  flush();
  return <div className="gd-md">{blocks}</div>;
}
