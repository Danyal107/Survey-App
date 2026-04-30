'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { QuestionType, SurveyQuestion } from '@/types/survey';
import { reloadIfAdminSessionExpired } from '@/lib/adminSessionClient';
import { toast } from '@/lib/toast';

type SurveyDoc = {
  _id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
};

function newQuestion(partial?: Partial<SurveyQuestion>): SurveyQuestion {
  return {
    id: crypto.randomUUID(),
    text: '',
    type: 'single',
    options: ['', ''],
    required: true,
    ...partial,
  };
}

export function SurveyBuilder({ surveyId }: { surveyId: string }) {
  const router = useRouter();
  const [survey, setSurvey] = useState<SurveyDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`);
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? 'Failed to load';
        toast.error(msg);
        setErr(msg);
        return;
      }
      setSurvey({
        _id: data._id,
        title: data.title,
        description: data.description ?? '',
        questions: (data.questions ?? []).map((q: SurveyQuestion) => ({
          ...q,
          options: q.options ?? [],
          required: q.required !== false,
        })),
      });
    } catch {
      toast.error('Network error');
      setErr('Network error');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!survey) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: survey.title,
          description: survey.description,
          questions: survey.questions.map((q) => ({
            ...q,
            options:
              q.type === 'text'
                ? []
                : q.options.map((o) => o.trim()).filter(Boolean),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        reloadIfAdminSessionExpired(res, data);
        const msg = data.error ?? 'Save failed';
        toast.error(msg);
        setErr(msg);
        return;
      }
      setSurvey({
        _id: data._id,
        title: data.title,
        description: data.description ?? '',
        questions: data.questions ?? [],
      });
      setMsg('Saved');
      toast.success('Survey saved');
      setTimeout(() => setMsg(null), 2000);
      router.refresh();
    } catch {
      toast.error('Network error');
      setErr('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function removeSurvey() {
    if (!confirm('Delete this survey and all responses?')) return;
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        reloadIfAdminSessionExpired(res, data);
        const msg = data.error ?? 'Delete failed';
        toast.error(msg);
        setErr(msg);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      toast.error('Network error');
      setErr('Network error');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-zinc-800" />
        <div className="h-40 rounded-2xl bg-zinc-800/80" />
        <div className="h-64 rounded-2xl bg-zinc-800/60" />
      </div>
    );
  }
  if (err && !survey) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
        {err}
      </p>
    );
  }
  if (!survey) return null;

  function updateQuestion(index: number, patch: Partial<SurveyQuestion>) {
    setSurvey((s) => {
      if (!s) return s;
      const questions = [...s.questions];
      const cur = { ...questions[index], ...patch };
      if (patch.type === 'text') {
        cur.options = [];
      } else if (
        (patch.type === 'single' || patch.type === 'multiple') &&
        cur.options.length === 0
      ) {
        cur.options = ['', ''];
      }
      questions[index] = cur;
      return { ...s, questions };
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
            Editor
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Edit survey
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Public link:{' '}
            <Link
              href={`/surveys/${surveyId}`}
              className="font-medium text-[var(--accent-hover)] underline decoration-indigo-500/40 underline-offset-2 hover:decoration-indigo-400"
            >
              /surveys/{surveyId}
            </Link>
          </p>
        </header>
        <div className="flex flex-shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link href={`/surveys/${surveyId}/results`} className="btn-secondary">
            Results
          </Link>
          <button
            type="button"
            onClick={removeSurvey}
            className="rounded-xl border border-red-500/35 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
          >
            Delete
          </button>
        </div>
      </div>

      {(err || msg) && (
        <div
          role="status"
          className={
            err
              ? 'rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200'
              : 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200'
          }
        >
          {err ?? msg}
        </div>
      )}

      <div className="surface-card space-y-5 p-6 sm:p-8">
        <div>
          <label className="label-field">Title</label>
          <input
            value={survey.title}
            onChange={(e) =>
              setSurvey((s) => (s ? { ...s, title: e.target.value } : s))
            }
            className="input-field mt-2"
          />
        </div>
        <div>
          <label className="label-field">Description</label>
          <textarea
            value={survey.description}
            onChange={(e) =>
              setSurvey((s) => (s ? { ...s, description: e.target.value } : s))
            }
            rows={2}
            className="input-field mt-2 min-h-[4.5rem] resize-y"
          />
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-white">Questions</h2>
          <button
            type="button"
            onClick={() =>
              setSurvey((s) =>
                s ? { ...s, questions: [...s.questions, newQuestion()] } : s,
              )
            }
            className="btn-secondary w-full sm:w-auto"
          >
            + Add question
          </button>
        </div>

        {survey.questions.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--border)] bg-zinc-900/30 px-5 py-8 text-center text-sm text-[var(--muted)]">
            No questions yet. Add one so respondents have something to answer.
          </p>
        )}

        <ul className="space-y-6">
          {survey.questions.map((q, i) => (
            <li
              key={q.id}
              className="surface-card overflow-hidden shadow-md shadow-black/25"
            >
              <div className="flex items-center gap-3 border-b border-[var(--border)] bg-zinc-900/40 px-5 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-xs font-bold text-[var(--accent-hover)]">
                  {i + 1}
                </span>
                <select
                  value={q.type}
                  onChange={(e) =>
                    updateQuestion(i, {
                      type: e.target.value as QuestionType,
                    })
                  }
                  className="input-field max-w-[11rem] border-zinc-700/80 py-2 text-sm"
                >
                  <option value="single">Single choice</option>
                  <option value="multiple">Multiple choice</option>
                  <option value="text">Short text</option>
                </select>
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) =>
                      updateQuestion(i, { required: e.target.checked })
                    }
                    className="rounded border-zinc-600 text-[var(--accent)] focus:ring-[var(--ring)]"
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSurvey((s) =>
                      s
                        ? {
                            ...s,
                            questions: s.questions.filter((_, j) => j !== i),
                          }
                        : s,
                    )
                  }
                  className="text-sm text-red-400/90 transition hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-4 p-5 sm:p-6">
                <input
                  value={q.text}
                  onChange={(e) => updateQuestion(i, { text: e.target.value })}
                  placeholder="Question text"
                  className="input-field"
                />

                {q.type !== 'text' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Answer options
                    </p>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2">
                        <input
                          value={opt}
                          onChange={(e) => {
                            const options = [...q.options];
                            options[oi] = e.target.value;
                            updateQuestion(i, { options });
                          }}
                          placeholder={`Option ${oi + 1}`}
                          className="input-field flex-1 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const options = q.options.filter(
                              (_, j) => j !== oi,
                            );
                            updateQuestion(i, {
                              options: options.length ? options : [''],
                            });
                          }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-zinc-500 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                          aria-label="Remove option"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestion(i, { options: [...q.options, ''] })
                      }
                      className="text-sm font-medium text-[var(--accent-hover)] transition hover:text-indigo-200"
                    >
                      + Add option
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
