import { useState, type ReactNode } from 'react';
import { InfoTooltip } from '../common/InfoTooltip';
import { cn } from '../common/cn';

function FieldLabel({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <span className="flex items-center text-[13px] font-medium text-graphite-700">
      {label}
      {tooltip && <InfoTooltip text={tooltip} label={`About ${label}`} />}
    </span>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  tooltip?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField({
  id, label, tooltip, value, onChange, prefix = '₹', suffix, min = 0, max, step = 1,
}: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <FieldLabel label={label} tooltip={tooltip} />
      <span className="flex items-center rounded border border-graphite-300 bg-page focus-within:border-primary">
        {prefix && <span className="pl-2 text-[13px] text-muted">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="tnum w-full bg-transparent px-2 py-1.5 text-right text-[14px] outline-none"
        />
        {suffix && <span className="pr-2 text-[13px] text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

interface Option<T> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string | number> {
  id: string;
  label: string;
  tooltip?: string;
  value: T;
  options: Option<T>[];
  onChange: (raw: string) => void;
}

export function SelectField<T extends string | number>({
  id, label, tooltip, value, options, onChange,
}: SelectFieldProps<T>) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <FieldLabel label={label} tooltip={tooltip} />
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-graphite-300 bg-page px-2 py-1.5 text-[14px] outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  tooltip?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'date';
}

export function TextField({ id, label, tooltip, value, onChange, placeholder, type = 'text' }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <FieldLabel label={label} tooltip={tooltip} />
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-graphite-300 bg-page px-2 py-1.5 text-[14px] outline-none focus:border-primary"
      />
    </label>
  );
}

interface ToggleFieldProps<T extends string | boolean> {
  label: string;
  tooltip?: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}

export function ToggleField<T extends string | boolean>({
  label, tooltip, value, options, onChange,
}: ToggleFieldProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel label={label} tooltip={tooltip} />
      <div role="group" aria-label={label} className="inline-flex w-fit overflow-hidden rounded border border-graphite-300">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'px-3 py-1 text-[13px] transition-colors duration-fast',
              value === o.value ? 'bg-graphite-900 text-white' : 'bg-page text-graphite-700 hover:bg-surface',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InputGroup({
  title, children, defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-graphite-700">{title}</span>
        <span aria-hidden className="text-muted">{open ? '–' : '+'}</span>
      </button>
      {open && <div className="flex flex-col gap-3 border-t border-hairline p-3">{children}</div>}
    </section>
  );
}

export function ReadoutRow({
  label, value, tooltip, strong,
}: {
  label: string;
  value: string;
  tooltip?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="flex items-center text-muted">
        {label}
        {tooltip && <InfoTooltip text={tooltip} label={`About ${label}`} />}
      </span>
      <span className={cn('tnum', strong ? 'font-semibold text-ink' : 'text-graphite-700')}>{value}</span>
    </div>
  );
}
