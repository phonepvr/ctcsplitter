import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-red-700 px-4 py-2',
  secondary: 'bg-graphite-900 text-white hover:bg-graphite-800 px-4 py-2',
  ghost: 'border border-graphite-300 text-ink hover:border-primary hover:text-primary px-4 py-2',
  link: 'text-primary hover:underline',
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded text-[14px] font-medium transition-colors duration-fast',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

type ChipTone = 'neutral' | 'red' | 'leaf' | 'ember';

const TONES: Record<ChipTone, string> = {
  neutral: 'border-graphite-300 text-muted',
  red: 'border-red-600 text-primary',
  leaf: 'border-leaf text-leaf',
  ember: 'border-ember text-ember',
};

export function Chip({
  children,
  tone = 'neutral',
  dot = false,
}: {
  children: ReactNode;
  tone?: ChipTone;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-medium',
        TONES[tone],
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-pill bg-current" />}
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
