import { cn } from './common/cn';

export interface StepDef {
  id: number;
  title: string;
}

export function Stepper({
  steps, current, onJump,
}: {
  steps: StepDef[];
  current: number;
  onJump: (id: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-0.5">
      {steps.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <li key={s.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onJump(s.id)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1 text-[13px] transition-colors duration-fast',
                active ? 'font-semibold text-ink' : 'text-muted hover:text-ink',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-pill text-[11px] font-semibold',
                  active ? 'bg-primary text-white' : done ? 'bg-leaf text-white' : 'bg-graphite-200 text-graphite-700',
                )}
              >
                {done ? '✓' : s.id}
              </span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < steps.length - 1 && <span aria-hidden className="mx-0.5 h-px w-4 bg-hairline sm:w-6" />}
          </li>
        );
      })}
    </ol>
  );
}
