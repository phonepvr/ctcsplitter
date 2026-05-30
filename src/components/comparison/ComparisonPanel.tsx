import type { OfferResult, OptionResult, FinalOption } from '../../engine/types';
import { formatINR, formatPct } from '../../format/currency';
import { InfoTooltip } from '../common/InfoTooltip';
import { Chip, Eyebrow } from '../common/ui';
import { cn } from '../common/cn';

interface PanelProps {
  result: OfferResult;
  tooltips: Record<string, string>;
  paise: boolean;
  onSelectOption: (option: FinalOption) => void;
}

function OptionCard({
  opt, isFinal, paise, tooltips, onSelect, varLabel,
}: {
  opt: OptionResult;
  isFinal: boolean;
  paise: boolean;
  tooltips: Record<string, string>;
  onSelect: (o: FinalOption) => void;
  varLabel: string;
}) {
  const tag = opt.incrementPct === null ? 'Manual' : `+${Math.round(opt.incrementPct * 100)}%`;
  return (
    <button
      type="button"
      aria-pressed={isFinal}
      onClick={() => onSelect(opt.option)}
      className={cn(
        'card flex flex-col gap-3 p-3 text-left transition-colors duration-fast',
        isFinal ? 'border-primary ring-1 ring-primary' : 'hover:border-graphite-400',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-graphite-700">
          Option {opt.option}
        </span>
        <Chip tone={isFinal ? 'red' : 'neutral'} dot={isFinal}>{tag}</Chip>
      </div>
      <div>
        <span className="eyebrow flex items-center">
          Total CTC
          <InfoTooltip text={tooltips['option.totalCTC']} align="right" />
        </span>
        <div className="tnum font-display text-[24px] leading-tight text-ink">
          {formatINR(opt.totalCTC, { paise })}
        </div>
      </div>
      <div className="flex justify-between text-[13px]">
        <span className="flex items-center text-muted">
          Fixed<InfoTooltip text={tooltips['option.fixed']} align="right" />
        </span>
        <span className="tnum text-graphite-800">{formatINR(opt.fixed, { paise })}</span>
      </div>
      <div className="flex justify-between text-[13px]">
        <span className="flex items-center text-muted">
          {varLabel}<InfoTooltip text={tooltips['option.mpli']} align="right" />
        </span>
        <span className="tnum text-graphite-800">{formatINR(opt.mpli, { paise })}</span>
      </div>
    </button>
  );
}

function SummaryStat({
  label, value, tip, delta,
}: {
  label: string;
  value: string;
  tip?: string;
  delta?: number | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow flex items-center">
        {label}
        {tip && <InfoTooltip text={tip} align="right" />}
      </span>
      <span className="tnum font-display text-[20px] leading-tight text-ink">{value}</span>
      {delta !== undefined && delta !== null && (
        <Chip tone={delta >= 0 ? 'leaf' : 'ember'}>{formatPct(delta, true)}</Chip>
      )}
    </div>
  );
}

export function ComparisonPanel({ result, tooltips, paise, onSelectOption }: PanelProps) {
  const { summary, options } = result;
  const v = result.band.variableShortLabel;
  const ratioLabel = result.band.ratioOfFixed ? 'Var : Fixed' : 'Var : total';
  return (
    <section className="flex flex-col gap-4">
      <div>
        <Eyebrow>Offer comparison</Eyebrow>
        <h2 className="text-h3 text-ink">Four options vs current CTC</h2>
        <p className="text-[12px] text-muted">
          Current total CTC {formatINR(summary.currentCTC, { paise })}. Click a card to set the final option.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <OptionCard
            key={o.option}
            opt={o}
            isFinal={o.option === summary.finalOption}
            paise={paise}
            tooltips={tooltips}
            onSelect={onSelectOption}
            varLabel={v}
          />
        ))}
      </div>

      <div className="card p-3">
        <Eyebrow>Selected offer · summary</Eyebrow>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <SummaryStat label="Offer fixed" tip={tooltips['summary.pctIncFixed']} value={formatINR(summary.offerFixed, { paise })} delta={summary.pctIncFixed} />
          <SummaryStat label={`Offer ${v}`} tip={tooltips['summary.offerMPLI']} value={formatINR(summary.offerMPLI, { paise })} delta={summary.pctIncMPLI} />
          <SummaryStat label="Offer total CTC" tip={tooltips['summary.offerCTC']} value={formatINR(summary.offerCTC, { paise })} delta={summary.pctIncCTC} />
          {result.band.hasCarAllowance && summary.carAllowance > 0 && (
            <SummaryStat label="Total remuneration" tip={tooltips['totalRemuneration']} value={formatINR(summary.totalRemuneration, { paise })} />
          )}
          <SummaryStat label={`${ratioLabel} — offer`} tip={tooltips['summary.varToTotal']} value={formatPct(summary.offerVarRatio)} />
          <SummaryStat label={`${ratioLabel} — current`} tip={tooltips['summary.varToTotal']} value={formatPct(summary.currentVarRatio)} />
        </div>
      </div>
    </section>
  );
}
