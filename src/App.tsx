import { useEffect, useMemo, useRef, useState } from 'react';
import type { LevelMaster } from './engine/types';
import { computeOffer, MissingLevelError } from './engine/engine';
import { buildTooltips } from './data/strings';
import { emptyMaster, hasData, parseUserJson } from './data/dataProvider';
import { initialForm, toInputs, type FormState } from './state/form';
import { AppHeader } from './components/Layout/AppHeader';
import { Wizard } from './components/Wizard';
import { Button, Chip, Eyebrow } from './components/common/ui';

function DataBar({
  master, error, onPick,
}: {
  master: LevelMaster;
  error: string | null;
  onPick: () => void;
}) {
  const ready = hasData(master);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <Chip tone={ready ? 'leaf' : 'ember'} dot>
        {ready ? `Tables loaded · ${master.source}` : 'No tables loaded'}
      </Chip>
      <Button variant="ghost" onClick={onPick}>Load tables (JSON)</Button>
      {error && <span className="text-red-700">{error}</span>}
    </div>
  );
}

function NoData({ onPick, error }: { onPick: () => void; error: string | null }) {
  return (
    <div className="card mx-auto max-w-xl p-6 text-center">
      <Eyebrow>Confidential data</Eyebrow>
      <h2 className="mt-1 text-h3 text-ink">Load the source compensation tables</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">
        For confidentiality, the level master is not shipped with this app. Load your local{' '}
        <code className="font-mono text-[12px]">level-master.json</code> to begin. It stays in your
        browser and is never uploaded.
      </p>
      <div className="mt-4 flex justify-center">
        <Button onClick={onPick}>Choose JSON file</Button>
      </div>
      {error && <p className="mt-2 text-[12px] text-red-700">{error}</p>}
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState<FormState>(() => initialForm('M-9', 12));
  const [master, setMaster] = useState<LevelMaster>(emptyMaster);
  const [paise, setPaise] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Dev-only convenience: auto-load the bundled sample tables. The dynamic
  // import is guarded by import.meta.env.DEV, so it is stripped from the
  // production build (verified by `npm run check-leak`). In production the user
  // must load a local JSON instead — nothing confidential ships in the bundle.
  useEffect(() => {
    if (import.meta.env.DEV) {
      import('./data/levelMaster')
        .then((m) => setMaster(m.bundledMaster))
        .catch(() => undefined);
    }
  }, []);

  const inputs = useMemo(() => toInputs(form), [form]);
  const tooltips = useMemo(() => buildTooltips(inputs), [inputs]);
  const ready = hasData(master);
  const result = useMemo(() => {
    if (!ready) return null;
    try {
      return computeOffer(inputs, master);
    } catch (e) {
      if (e instanceof MissingLevelError) return null;
      throw e;
    }
  }, [inputs, master, ready]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setDataError(null);
    try {
      const text = await file.text();
      setMaster(parseUserJson(text));
    } catch (e) {
      setDataError(e instanceof Error ? e.message : 'Could not load that file.');
    }
  };
  const pick = () => fileRef.current?.click();

  return (
    <div className="min-h-screen bg-page text-ink">
      <AppHeader />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <main className="mx-auto max-w-wide px-4 py-4">
        <div className="no-print mb-4 flex items-center">
          <DataBar master={master} error={dataError} onPick={pick} />
        </div>

        {!ready ? (
          <NoData onPick={pick} error={dataError} />
        ) : result ? (
          <Wizard
            form={form}
            setForm={setForm}
            master={master}
            inputs={inputs}
            result={result}
            tooltips={tooltips}
            paise={paise}
            setPaise={setPaise}
          />
        ) : (
          <div className="card p-4 text-[13px] text-muted">
            No data is loaded for level {form.offer.level}. Load tables that include this level.
          </div>
        )}
      </main>
    </div>
  );
}
