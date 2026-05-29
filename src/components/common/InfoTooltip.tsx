import { useEffect, useId, useState } from 'react';
import { cn } from './cn';

interface InfoTooltipProps {
  text: string;
  label?: string;
  align?: 'left' | 'right';
}

/**
 * Accessible "(i)" info icon. Focusable (in tab order), reveals on hover AND
 * keyboard focus, links to its popover via aria-describedby, and dismisses on
 * Escape/blur. The tooltip explains how the adjacent number is calculated.
 */
export function InfoTooltip({ text, label, align = 'left' }: InfoTooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label ?? 'More information'}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        className={cn(
          'ml-1 inline-flex h-4 w-4 items-center justify-center rounded-pill border text-[10px] font-semibold leading-none transition-colors duration-fast',
          'border-graphite-300 text-muted hover:border-primary hover:text-primary',
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'absolute top-6 z-30 w-64 rounded border border-hairline bg-page p-2 text-[12px] font-normal normal-case leading-snug text-ink shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}
