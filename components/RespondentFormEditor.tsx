'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  RespondentFieldDef,
  RespondentFieldKind,
  RespondentFormDTO,
} from '@/types/respondentForm';
import { formatDateTimeMedium } from '@/lib/formatDate';

const KINDS: { value: RespondentFieldKind; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'single', label: 'Single choice' },
  { value: 'multiple', label: 'Multiple choice' },
  { value: 'location', label: 'Map location' },
  { value: 'photo', label: 'Photo upload' },
];

/** Stable React key per row; must not change when the user edits persisted `field.id`. */
type RespondentFieldRow = RespondentFieldDef & { _stableKey: string };

function withStableKeys(fields: RespondentFieldDef[]): RespondentFieldRow[] {
  const clone = JSON.parse(JSON.stringify(fields)) as RespondentFieldDef[];
  return clone.map((f) => ({
    ...f,
    _stableKey: crypto.randomUUID(),
  }));
}

function stripStableKeys(rows: RespondentFieldRow[]): RespondentFieldDef[] {
  return rows.map(({ _stableKey: _, ...f }) => f);
}

function defaultFieldForKind(
  kind: RespondentFieldKind,
  id: string,
): RespondentFieldDef {
  const base = {
    id,
    label: 'New field',
    description: '',
    placeholder: '',
    required: false,
  };
  switch (kind) {
    case 'text':
      return { ...base, kind: 'text', maxLength: 2000, multiline: true };
    case 'single':
      return {
        ...base,
        kind: 'single',
        required: true,
        options: ['Option 1'],
      };
    case 'multiple':
      return {
        ...base,
        kind: 'multiple',
        required: true,
        options: ['Option 1'],
      };
    case 'location':
      return {
        ...base,
        kind: 'location',
        required: false,
        defaultLat: 31.5204,
        defaultLng: 74.3587,
        defaultZoom: 13,
      };
    case 'photo':
      return { ...base, kind: 'photo', required: false };
  }
}

export function RespondentFormEditor() {
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [fields, setFields] = useState<RespondentFieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch('/api/respondent-form');
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? 'Failed to load');
        return;
      }
      const payload = data as RespondentFormDTO;
      setSectionTitle(payload.sectionTitle);
      setSectionDescription(payload.sectionDescription);
      setFields(withStableKeys(payload.fields));
      setUpdatedAt(payload.updatedAt);
    } catch {
      setErr('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function moveField(index: number, dir: -1 | 1) {
    setFields((rows) => {
      const j = index + dir;
      if (j < 0 || j >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function updateField(index: number, patch: Partial<RespondentFieldDef>) {
    setFields((rows) =>
      rows.map((row, i) =>
        i === index ? ({ ...row, ...patch } as RespondentFieldRow) : row,
      ),
    );
  }

  function setFieldKind(index: number, kind: RespondentFieldKind) {
    setFields((rows) => {
      const cur = rows[index];
      if (!cur) return rows;
      const next = [...rows];
      const base = defaultFieldForKind(kind, cur.id);
      next[index] = {
        ...base,
        label: cur.label,
        required: cur.required,
        _stableKey: cur._stableKey,
      };
      return next;
    });
  }

  function removeField(index: number) {
    setFields((rows) => rows.filter((_, i) => i !== index));
  }

  function updateChoiceOption(
    fieldIndex: number,
    optionIndex: number,
    value: string,
  ) {
    setFields((rows) =>
      rows.map((row, i) => {
        if (i !== fieldIndex) return row;
        if (row.kind !== 'single' && row.kind !== 'multiple') return row;
        const options = row.options.map((o, j) =>
          j === optionIndex ? value : o,
        );
        return { ...row, options };
      }),
    );
  }

  function addChoiceOption(fieldIndex: number) {
    setFields((rows) =>
      rows.map((row, i) => {
        if (i !== fieldIndex) return row;
        if (row.kind !== 'single' && row.kind !== 'multiple') return row;
        return { ...row, options: [...row.options, ''] };
      }),
    );
  }

  function removeChoiceOption(fieldIndex: number, optionIndex: number) {
    setFields((rows) =>
      rows.map((row, i) => {
        if (i !== fieldIndex) return row;
        if (row.kind !== 'single' && row.kind !== 'multiple') return row;
        const next = row.options.filter((_, j) => j !== optionIndex);
        return { ...row, options: next.length > 0 ? next : [''] };
      }),
    );
  }

  function moveChoiceOption(
    fieldIndex: number,
    optionIndex: number,
    dir: -1 | 1,
  ) {
    setFields((rows) =>
      rows.map((row, i) => {
        if (i !== fieldIndex) return row;
        if (row.kind !== 'single' && row.kind !== 'multiple') return row;
        const j = optionIndex + dir;
        if (j < 0 || j >= row.options.length) return row;
        const options = [...row.options];
        [options[optionIndex], options[j]] = [options[j], options[optionIndex]];
        return { ...row, options };
      }),
    );
  }

  function addField() {
    const id = `field_${crypto.randomUUID().slice(0, 8)}`;
    setFields((rows) => [
      ...rows,
      { ...defaultFieldForKind('text', id), _stableKey: crypto.randomUUID() },
    ]);
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch('/api/respondent-form', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle,
          sectionDescription,
          fields: stripStableKeys(fields),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? 'Save failed');
        return;
      }
      const payload = data as RespondentFormDTO;
      setSectionTitle(payload.sectionTitle);
      setSectionDescription(payload.sectionDescription);
      setFields(withStableKeys(payload.fields));
      setUpdatedAt(payload.updatedAt);
      setMsg('Saved');
      setTimeout(() => setMsg(null), 2000);
    } catch {
      setErr('Network error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-pulse">
        <div className="h-10 w-2/3 rounded-xl bg-zinc-800" />
        <div className="h-40 rounded-2xl bg-zinc-800/80" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
            Settings
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Respondent form
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Define the “Your details” block on the live survey. Choice fields
            use the same option model as survey questions (one text per choice).
            Field <code className="rounded bg-zinc-800 px-1">id</code> values
            are stored on each response — change them carefully if you already
            have data.
          </p>
          {updatedAt ? (
            <p className="mt-2 text-xs text-zinc-500">
              Last updated {formatDateTimeMedium(updatedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <section className="surface-card space-y-4 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Section</h2>
        <div>
          <label className="label-field">Title</label>
          <input
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            className="input-field mt-2"
            maxLength={200}
          />
        </div>
        <div>
          <label className="label-field">Description</label>
          <textarea
            value={sectionDescription}
            onChange={(e) => setSectionDescription(e.target.value)}
            className="input-field mt-2 min-h-[5rem] resize-y"
            maxLength={2000}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Fields</h2>
          <button type="button" onClick={addField} className="btn-secondary">
            Add field
          </button>
        </div>

        {fields.map((field, index) => (
          <div
            key={field._stableKey}
            className="surface-card space-y-4 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => moveField(index, -1)}
                className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Up
              </button>
              <button
                type="button"
                onClick={() => moveField(index, 1)}
                className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Down
              </button>
              <span className="text-xs text-zinc-500">
                Order {index + 1} · id:{' '}
                <code className="text-zinc-400">{field.id}</code>
              </span>
              <button
                type="button"
                onClick={() => removeField(index)}
                className="ml-auto text-sm text-red-300 hover:text-red-200"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-field">Field id</label>
                <input
                  value={field.id}
                  onChange={(e) =>
                    updateField(index, {
                      id: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                    } as Partial<RespondentFieldDef>)
                  }
                  className="input-field mt-2 font-mono text-sm"
                  maxLength={64}
                />
              </div>
              <div>
                <label className="label-field">Type</label>
                <select
                  value={field.kind}
                  onChange={(e) =>
                    setFieldKind(index, e.target.value as RespondentFieldKind)
                  }
                  className="input-select mt-2"
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label-field">Label</label>
              <input
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
                className="input-field mt-2"
                maxLength={300}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) =>
                  updateField(index, { required: e.target.checked })
                }
                className="h-4 w-4 rounded border-zinc-600"
              />
              Required
            </label>

            <div>
              <label className="label-field">Description / hint</label>
              <textarea
                value={field.description ?? ''}
                onChange={(e) =>
                  updateField(index, { description: e.target.value })
                }
                className="input-field mt-2 min-h-[4rem] resize-y"
                maxLength={2000}
              />
            </div>

            {field.kind === 'text' && (
              <>
                <div>
                  <label className="label-field">Placeholder</label>
                  <input
                    value={field.placeholder ?? ''}
                    onChange={(e) =>
                      updateField(index, { placeholder: e.target.value })
                    }
                    className="input-field mt-2"
                    maxLength={200}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={field.multiline !== false}
                    onChange={(e) =>
                      updateField(index, { multiline: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-zinc-600"
                  />
                  Multiline (textarea)
                </label>
                <div>
                  <label className="label-field">Max length</label>
                  <input
                    type="number"
                    min={1}
                    max={20000}
                    value={field.maxLength ?? 2000}
                    onChange={(e) =>
                      updateField(index, {
                        maxLength: Number(e.target.value) || 2000,
                      })
                    }
                    className="input-field mt-2"
                  />
                </div>
              </>
            )}

            {(field.kind === 'single' || field.kind === 'multiple') && (
              <>
                <div>
                  <label className="label-field">Placeholder (optional)</label>
                  <input
                    value={field.placeholder ?? ''}
                    onChange={(e) =>
                      updateField(index, { placeholder: e.target.value })
                    }
                    className="input-field mt-2"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="label-field mb-0">Answer options</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Same as survey questions: one line per choice (shown and
                        stored as that text). Duplicates are removed when you
                        save.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addChoiceOption(index)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                    >
                      Add option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {field.options.map((opt, oi) => (
                      <div
                        key={`${field._stableKey}-opt-${oi}`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input
                          value={opt}
                          onChange={(e) =>
                            updateChoiceOption(index, oi, e.target.value)
                          }
                          placeholder={`Option ${oi + 1}`}
                          className="input-field min-w-0 flex-1 py-2 text-sm"
                          maxLength={500}
                        />
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            title="Move up"
                            onClick={() => moveChoiceOption(index, oi, -1)}
                            disabled={oi === 0}
                            className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            title="Move down"
                            onClick={() => moveChoiceOption(index, oi, 1)}
                            disabled={oi === field.options.length - 1}
                            className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChoiceOption(index, oi)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-zinc-500 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                            aria-label="Remove option"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {field.kind === 'location' && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label-field">Default latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={field.defaultLat ?? 31.5204}
                    onChange={(e) =>
                      updateField(index, {
                        defaultLat: Number(e.target.value),
                      })
                    }
                    className="input-field mt-2"
                  />
                </div>
                <div>
                  <label className="label-field">Default longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={field.defaultLng ?? 74.3587}
                    onChange={(e) =>
                      updateField(index, {
                        defaultLng: Number(e.target.value),
                      })
                    }
                    className="input-field mt-2"
                  />
                </div>
                <div>
                  <label className="label-field">Default zoom (1–18)</label>
                  <input
                    type="number"
                    min={1}
                    max={18}
                    value={field.defaultZoom ?? 13}
                    onChange={(e) =>
                      updateField(index, {
                        defaultZoom: Number(e.target.value) || 13,
                      })
                    }
                    className="input-field mt-2"
                  />
                </div>
              </div>
            )}

            {field.kind === 'photo' && (
              <div>
                <label className="label-field">Max images (optional cap)</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={field.maxFiles ?? ''}
                  placeholder="No cap"
                  onChange={(e) => {
                    const v = e.target.value;
                    updateField(index, {
                      maxFiles: v === '' ? undefined : Number(v) || undefined,
                    });
                  }}
                  className="input-field mt-2"
                />
              </div>
            )}
          </div>
        ))}
      </section>

      {err ? (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {msg}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary py-3.5 text-base sm:px-10"
        >
          {saving ? 'Saving…' : 'Save respondent form'}
        </button>
        <Link href="/" className="btn-secondary py-3.5">
          Back to surveys
        </Link>
      </div>
    </div>
  );
}
