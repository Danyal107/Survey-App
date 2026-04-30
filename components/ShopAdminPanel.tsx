"use client";

import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { useRef, useState, useTransition } from "react";
import { RespondentLocationField } from "@/components/RespondentLocationField";
import { reloadIfAdminSessionExpired } from "@/lib/adminSessionClient";
import { isLocationValue } from "@/lib/shopCoordinates";
import { MAX_SHOP_IMAGES_PER_RESPONSE } from "@/lib/shopImageUrls";
import { toast } from "@/lib/toast";
import type { IShopDetails } from "@/models/Shop";
import type {
  RespondentFieldDef,
  RespondentFieldLocation,
  RespondentLocationValue,
  RespondentValuesPayload,
} from "@/types/respondentForm";

type ShopImageSlot =
  | { status: "uploading"; id: string }
  | { status: "done"; url: string };

type Props = {
  shopId: string;
  fields: RespondentFieldDef[];
  initialDetails: IShopDetails;
  initialCoordinates: [number, number] | null;
  onClose?: () => void;
};

function detailsForClient(details: IShopDetails): IShopDetails {
  const out: IShopDetails = { ...details };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      delete out[k];
    }
  }
  return out;
}

function initialPhotoSlots(
  fields: RespondentFieldDef[],
  details: IShopDetails
): Record<string, ShopImageSlot[]> {
  const out: Record<string, ShopImageSlot[]> = {};
  for (const f of fields) {
    if (f.kind !== "photo") continue;
    const v = details[f.id];
    const urls = Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string")
      : typeof v === "string" && v.trim()
        ? [v.trim()]
        : [];
    out[f.id] = urls.map((url) => ({ status: "done" as const, url }));
  }
  return out;
}

function buildDraft(
  fields: RespondentFieldDef[],
  details: IShopDetails,
  coordinates: [number, number] | null
): RespondentValuesPayload {
  const clean = detailsForClient(details);
  const draft: RespondentValuesPayload = { ...clean };
  const locField = fields.find((f) => f.kind === "location");
  if (
    locField &&
    coordinates &&
    coordinates.length === 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1])
  ) {
    draft[locField.id] = {
      lat: coordinates[0],
      lng: coordinates[1],
    };
  }
  return draft;
}

async function deleteAdminBlobQuiet(url: string) {
  try {
    await fetch("/api/admin/shop-image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url }),
    });
  } catch {
    /* ignore */
  }
}

export function ShopAdminPanel({
  shopId,
  fields,
  initialDetails,
  initialCoordinates,
  onClose,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RespondentValuesPayload>(() =>
    buildDraft(fields, initialDetails, initialCoordinates)
  );
  const [slotsByField, setSlotsByField] = useState<Record<string, ShopImageSlot[]>>(
    () => initialPhotoSlots(fields, initialDetails)
  );
  const uploadAbortByKey = useRef(new Map<string, AbortController>());

  const mapId = `shop-admin-map-${shopId}`;

  function setField(
    id: string,
    value: string | string[] | RespondentLocationValue | undefined
  ) {
    setDraft((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });
  }

  async function uploadAdminShopImage(
    file: File,
    signal?: AbortSignal
  ): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/shop-image", {
      method: "POST",
      body: fd,
      credentials: "include",
      signal,
    });
    const data = await res.json().catch(() => ({}));
    reloadIfAdminSessionExpired(res, data);
    if (!res.ok) {
      throw new Error(
        typeof data.error === "string" ? data.error : "Upload failed"
      );
    }
    if (typeof data.url !== "string") {
      throw new Error("Invalid upload response");
    }
    return data.url;
  }

  async function onPhotoChange(
    fieldId: string,
    maxFiles: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const cur = slotsByField[fieldId] ?? [];
    if (cur.length >= maxFiles) return;

    const slotId = crypto.randomUUID();
    const abortKey = `${fieldId}:${slotId}`;
    const abortController = new AbortController();
    uploadAbortByKey.current.set(abortKey, abortController);

    flushSync(() => {
      setSlotsByField((prev) => ({
        ...prev,
        [fieldId]: [...(prev[fieldId] ?? []), { status: "uploading", id: slotId }],
      }));
    });

    try {
      const url = await uploadAdminShopImage(file, abortController.signal);
      setSlotsByField((prev) => {
        const slots = prev[fieldId] ?? [];
        const stillThere = slots.some(
          (s) => s.status === "uploading" && s.id === slotId
        );
        if (!stillThere) {
          void deleteAdminBlobQuiet(url);
          return prev;
        }
        return {
          ...prev,
          [fieldId]: slots.map((s) =>
            s.status === "uploading" && s.id === slotId
              ? { status: "done" as const, url }
              : s
          ),
        };
      });
    } catch (c) {
      if (c instanceof DOMException && c.name === "AbortError") {
        return;
      }
      setSlotsByField((prev) => ({
        ...prev,
        [fieldId]: (prev[fieldId] ?? []).filter(
          (s) => !(s.status === "uploading" && s.id === slotId)
        ),
      }));
      toast.error(c instanceof Error ? c.message : "Upload failed");
    } finally {
      uploadAbortByKey.current.delete(abortKey);
    }
  }

  async function removePhotoSlot(fieldId: string, target: ShopImageSlot) {
    if (target.status === "uploading") {
      uploadAbortByKey.current.get(`${fieldId}:${target.id}`)?.abort();
      uploadAbortByKey.current.delete(`${fieldId}:${target.id}`);
      setSlotsByField((prev) => ({
        ...prev,
        [fieldId]: (prev[fieldId] ?? []).filter(
          (s) => !(s.status === "uploading" && s.id === target.id)
        ),
      }));
      return;
    }

    try {
      const res = await fetch("/api/admin/shop-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: target.url }),
      });
      const data = await res.json().catch(() => ({}));
      reloadIfAdminSessionExpired(res, data);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not remove image"
        );
      }
      setSlotsByField((prev) => ({
        ...prev,
        [fieldId]: (prev[fieldId] ?? []).filter(
          (s) => !(s.status === "done" && s.url === target.url)
        ),
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  }

  function resetMapLocation() {
    const locField = fields.find((f) => f.kind === "location");
    if (!locField) return;
    setField(locField.id, undefined);
    toast.info("Pin cleared locally — save to update the shop.");
  }

  async function save() {
    setFormError(null);
    setSaving(true);
    try {
      const coordField = fields.find((f) => f.kind === "location");
      let coordinates: { lat: number; lng: number } | null | undefined;
      if (coordField) {
        const v = draft[coordField.id];
        if (isLocationValue(v)) {
          coordinates = { lat: v.lat, lng: v.lng };
        } else {
          coordinates = null;
        }
      }

      const details: IShopDetails = {};
      for (const f of fields) {
        if (f.kind === "photo") {
          const urls = (slotsByField[f.id] ?? [])
            .filter((s): s is { status: "done"; url: string } => s.status === "done")
            .map((s) => s.url);
          details[f.id] = urls;
          continue;
        }
        if (f.kind === "location") continue;
        const v = draft[f.id];
        if (v === undefined) continue;
        if (typeof v === "string") details[f.id] = v;
        else if (Array.isArray(v) && v.every((x) => typeof x === "string"))
          details[f.id] = v;
      }

      const body: Record<string, unknown> = { details };
      if (coordField) body.coordinates = coordinates;

      const res = await fetch(`/api/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      reloadIfAdminSessionExpired(res, data);
      if (!res.ok) {
        setFormError(
          typeof data.error === "string" ? data.error : "Save failed"
        );
        return;
      }
      toast.success("Shop updated.");
      onClose?.();
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Soft-delete this shop? It will disappear from lists."))
      return;
    setFormError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/shops/${shopId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      reloadIfAdminSessionExpired(res, data);
      if (!res.ok) {
        setFormError(
          typeof data.error === "string" ? data.error : "Delete failed"
        );
        return;
      }
      router.push("/shops");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="surface-card space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-hover)]">
            Admin
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
            Edit shop
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Changes are saved to the shop profile used by survey responses.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="btn-ghost shrink-0 text-sm ring-1 ring-[var(--border)]"
            onClick={onClose}
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="space-y-6">
        {fields.map((field) => {
          if (field.kind === "text") {
            const v = typeof draft[field.id] === "string" ? draft[field.id] : "";
            return (
              <div key={field.id}>
                <label htmlFor={`shop-${field.id}`} className="label-field">
                  {field.label}
                  {field.required ? (
                    <span className="text-red-400/90"> *</span>
                  ) : null}
                </label>
                {field.multiline ? (
                  <textarea
                    id={`shop-${field.id}`}
                    className="input-field mt-2 min-h-[6rem] resize-y"
                    value={v as string}
                    onChange={(e) => setField(field.id, e.target.value)}
                    maxLength={field.maxLength}
                    required={field.required}
                  />
                ) : (
                  <input
                    id={`shop-${field.id}`}
                    type="text"
                    className="input-field mt-2"
                    value={v as string}
                    onChange={(e) => setField(field.id, e.target.value)}
                    maxLength={field.maxLength}
                    required={field.required}
                  />
                )}
                {field.description ? (
                  <p className="mt-1 text-xs text-zinc-500">{field.description}</p>
                ) : null}
              </div>
            );
          }

          if (field.kind === "single") {
            const rawSingle = draft[field.id];
            const v = typeof rawSingle === "string" ? rawSingle : "";
            return (
              <div key={field.id}>
                <label htmlFor={`shop-${field.id}`} className="label-field">
                  {field.label}
                  {field.required ? (
                    <span className="text-red-400/90"> *</span>
                  ) : null}
                </label>
                <select
                  id={`shop-${field.id}`}
                  className="input-select mt-2"
                  value={v}
                  onChange={(e) => setField(field.id, e.target.value)}
                  required={field.required}
                >
                  {!field.required ? (
                    <option value="">—</option>
                  ) : null}
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {field.description ? (
                  <p className="mt-1 text-xs text-zinc-500">{field.description}</p>
                ) : null}
              </div>
            );
          }

          if (field.kind === "multiple") {
            const raw = draft[field.id];
            const selected = new Set(
              Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []
            );
            return (
              <fieldset key={field.id} className="space-y-2">
                <legend className="label-field">
                  {field.label}
                  {field.required ? (
                    <span className="text-red-400/90"> *</span>
                  ) : null}
                </legend>
                <div className="mt-2 flex flex-col gap-2">
                  {field.options.map((opt) => (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(opt)}
                        onChange={() => {
                          const next = new Set(selected);
                          if (next.has(opt)) next.delete(opt);
                          else next.add(opt);
                          setField(field.id, [...next]);
                        }}
                        className="rounded border-zinc-600"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
                {field.description ? (
                  <p className="text-xs text-zinc-500">{field.description}</p>
                ) : null}
              </fieldset>
            );
          }

          if (field.kind === "location") {
            const v = draft[field.id];
            const locVal: RespondentLocationValue | undefined =
              isLocationValue(v) ? v : undefined;
            return (
              <div key={field.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="label-field mb-0">
                    {field.label}
                    {field.required ? (
                      <span className="text-red-400/90"> *</span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--accent-hover)] hover:underline"
                    onClick={resetMapLocation}
                  >
                    Reset map location
                  </button>
                </div>
                <div className="mt-2">
                  <RespondentLocationField
                    field={field as RespondentFieldLocation}
                    value={locVal}
                    onChange={(next) => setField(field.id, next)}
                    mapContainerId={mapId}
                  />
                </div>
                {field.description ? (
                  <p className="mt-1 text-xs text-zinc-500">{field.description}</p>
                ) : null}
              </div>
            );
          }

          if (field.kind === "photo") {
            const maxF = field.maxFiles ?? MAX_SHOP_IMAGES_PER_RESPONSE;
            const slots = slotsByField[field.id] ?? [];
            return (
              <div key={field.id}>
                <p className="label-field">
                  {field.label}
                  {field.required ? (
                    <span className="text-red-400/90"> *</span>
                  ) : null}
                </p>
                {field.description ? (
                  <p className="mt-1 text-xs text-zinc-500">{field.description}</p>
                ) : null}
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slots.map((slot) => (
                    <li
                      key={slot.status === "uploading" ? slot.id : slot.url}
                      className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-zinc-950/80"
                    >
                      {slot.status === "uploading" ? (
                        <div className="flex aspect-square items-center justify-center text-xs text-zinc-500">
                          Uploading…
                        </div>
                      ) : (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slot.url}
                            alt=""
                            className="aspect-square w-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute right-1.5 top-1.5 rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-white hover:bg-black/90"
                            onClick={() => void removePhotoSlot(field.id, slot)}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {slots.length < maxF ? (
                  <div className="mt-3">
                    <label className="btn-secondary inline-flex cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={(e) => void onPhotoChange(field.id, maxF, e)}
                      />
                      Add image
                    </label>
                  </div>
                ) : null}
              </div>
            );
          }

          return null;
        })}
      </div>

      {formError ? (
        <p className="text-sm text-red-300" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-[var(--border)]/60 pt-6">
        <button
          type="button"
          className="btn-primary"
          disabled={saving || deleting || pending}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="btn-secondary border border-red-500/30 text-red-200 hover:bg-red-950/40"
          disabled={saving || deleting || pending}
          onClick={() => void remove()}
        >
          {deleting ? "Deleting…" : "Delete shop"}
        </button>
      </div>
    </section>
  );
}
