import type {
  RespondentFieldDef,
  RespondentFieldKind,
} from "@/types/respondentForm";
import { migrateRespondentFieldRow } from "@/lib/respondentFormLegacy";

const KINDS: RespondentFieldKind[] = ["text", "single", "multiple", "photo"];

function isKind(s: string): s is RespondentFieldKind {
  return (KINDS as string[]).includes(s);
}

/** Like survey `options: string[]`; accepts legacy `{ value, label }` objects (uses `value` if set, else `label`). */
function parseChoiceOptions(id: string, raw: unknown, fieldLabel: string): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(
      `Field "${id}" (${fieldLabel}) needs a non-empty options array`
    );
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const opt of raw) {
    let s = "";
    if (typeof opt === "string") {
      s = opt.trim();
    } else if (opt != null && typeof opt === "object") {
      const op = opt as Record<string, unknown>;
      const v = typeof op.value === "string" ? op.value.trim() : "";
      const lab = typeof op.label === "string" ? op.label.trim() : "";
      s = v || lab;
    }
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  if (out.length === 0) {
    throw new Error(`Field "${id}" (${fieldLabel}) needs at least one option`);
  }
  return out;
}

/** Normalize DB / JSON into typed fields; throws string message on invalid config. */
export function parseRespondentFieldList(raw: unknown): RespondentFieldDef[] {
  if (!Array.isArray(raw)) {
    throw new Error("fields must be an array");
  }
  const ids = new Set<string>();
  const out: RespondentFieldDef[] = [];

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (row == null || typeof row !== "object") {
      throw new Error(`Field at index ${i} is invalid`);
    }
    const migrated = migrateRespondentFieldRow(row as Record<string, unknown>);
    const o = migrated;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!id || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(id)) {
      throw new Error(
        `Field at index ${i}: id must be a non-empty identifier (letters, numbers, underscore)`
      );
    }
    if (ids.has(id)) {
      throw new Error(`Duplicate field id: ${id}`);
    }
    ids.add(id);

    const kindRaw = o.kind;
    if (typeof kindRaw !== "string" || !isKind(kindRaw)) {
      throw new Error(`Field "${id}": invalid kind (use text, single, multiple, or photo)`);
    }
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) {
      throw new Error(`Field "${id}": label is required`);
    }
    const description =
      typeof o.description === "string" ? o.description : "";
    const placeholder =
      typeof o.placeholder === "string" ? o.placeholder : "";
    const required = Boolean(o.required);

    if (kindRaw === "text") {
      const maxLength =
        typeof o.maxLength === "number" && o.maxLength > 0
          ? Math.min(o.maxLength, 20000)
          : 2000;
      const multiline =
        o.multiline === undefined ? true : Boolean(o.multiline);
      out.push({
        id,
        kind: "text",
        label,
        description,
        placeholder,
        required,
        maxLength,
        multiline,
      });
      continue;
    }

    if (kindRaw === "single") {
      const options = parseChoiceOptions(id, o.options, label);
      out.push({
        id,
        kind: "single",
        label,
        description,
        placeholder,
        required,
        options,
      });
      continue;
    }

    if (kindRaw === "multiple") {
      const options = parseChoiceOptions(id, o.options, label);
      out.push({
        id,
        kind: "multiple",
        label,
        description,
        placeholder,
        required,
        options,
      });
      continue;
    }

    if (kindRaw === "photo") {
      const maxFiles =
        typeof o.maxFiles === "number" && o.maxFiles > 0
          ? Math.min(o.maxFiles, 500)
          : undefined;
      out.push({
        id,
        kind: "photo",
        label,
        description,
        placeholder,
        required,
        maxFiles,
      });
      continue;
    }
  }

  return out;
}
