"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { MAX_SHOP_IMAGES_PER_RESPONSE } from "@/lib/shopImageUrls";
import type {
  RespondentFieldDef,
  RespondentLocationValue,
} from "@/types/respondentForm";
import { RespondentLocationField } from "@/components/RespondentLocationField";

type ShopImageSlot =
  | { status: "uploading"; id: string }
  | { status: "done"; url: string };

type Props = {
  formId: string;
  title: string;
  description: string;
  fields: RespondentFieldDef[];
  values: Record<
    string,
    string | string[] | RespondentLocationValue | undefined
  >;
  onFieldChange: (
    id: string,
    value: string | string[] | RespondentLocationValue | undefined
  ) => void;
  onImageUploadingChange: (inFlight: boolean) => void;
  onClientError: (message: string) => void;
};

export function RespondentFormSection({
  formId,
  title,
  description,
  fields,
  values,
  onFieldChange,
  onImageUploadingChange,
  onClientError,
}: Props) {
  const baseId = useId();
  const [slotsByField, setSlotsByField] = useState<
    Record<string, ShopImageSlot[]>
  >({});
  const uploadAbortByKey = useRef(new Map<string, AbortController>());

  const optionBase =
    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition duration-150";
  const optionIdle =
    "border-[var(--border)] bg-zinc-950/50 hover:border-zinc-600 hover:bg-zinc-900/60";
  const optionActive =
    "border-[var(--accent)]/45 bg-[var(--accent-muted)] ring-1 ring-indigo-500/20";

  const anyUploading = useMemo(
    () =>
      Object.values(slotsByField).some((slots) =>
        slots.some((s) => s.status === "uploading")
      ),
    [slotsByField]
  );

  useEffect(() => {
    onImageUploadingChange(anyUploading);
  }, [anyUploading, onImageUploadingChange]);

  async function deleteBlobQuiet(url: string) {
    try {
      await fetch("/api/upload/shop-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    } catch {
      /* ignore */
    }
  }

  async function uploadShopImageRequest(
    file: File,
    signal?: AbortSignal
  ): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/shop-image", {
      method: "POST",
      body: fd,
      signal,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Upload failed");
    }
    if (typeof data.url !== "string") {
      throw new Error("Invalid upload response");
    }
    return data.url;
  }

  const lastImageSigRef = useRef<Record<string, string>>({});

  useEffect(() => {
    for (const f of fields) {
      if (f.kind !== "photo") continue;
      const slots = slotsByField[f.id] ?? [];
      const urls = slots
        .filter((s): s is { status: "done"; url: string } => s.status === "done")
        .map((s) => s.url);
      const sig = urls.join("\u0001");
      if (lastImageSigRef.current[f.id] === sig) continue;
      lastImageSigRef.current[f.id] = sig;
      onFieldChange(f.id, urls);
    }
  }, [fields, slotsByField, onFieldChange]);

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
      const url = await uploadShopImageRequest(file, abortController.signal);
      setSlotsByField((prev) => {
        const slots = prev[fieldId] ?? [];
        const stillThere = slots.some(
          (s) => s.status === "uploading" && s.id === slotId
        );
        if (!stillThere) {
          void deleteBlobQuiet(url);
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
      onClientError(c instanceof Error ? c.message : "Upload failed");
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

    const res = await fetch("/api/upload/shop-image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: target.url }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Could not remove image");
    }
    setSlotsByField((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] ?? []).filter(
        (s) => !(s.status === "done" && s.url === target.url)
      ),
    }));
  }

  return (
    <section
      className="surface-card p-6 sm:p-8"
      aria-labelledby={`${formId}-info-heading`}
    >
      <div className="flex items-start gap-3 border-b border-[var(--border)]/80 pb-5">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-hover)] ring-1 ring-indigo-500/15"
          aria-hidden
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
        <div>
          <h2
            id={`${formId}-info-heading`}
            className="text-lg font-semibold text-white"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-6 space-y-5">
        {fields.map((field) => {
          if (field.kind === "text") {
            const v = (values[field.id] as string) ?? "";
            const multiline = field.multiline !== false;
            return (
              <div key={field.id}>
                <label
                  htmlFor={`${baseId}-${field.id}`}
                  className="label-field"
                >
                  {field.label}{" "}
                  {field.required ? (
                    <span className="text-red-400">*</span>
                  ) : null}
                </label>
                {multiline ? (
                  <textarea
                    id={`${baseId}-${field.id}`}
                    name={field.id}
                    required={field.required}
                    value={v}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    rows={4}
                    className="input-field mt-2 min-h-[6.5rem] resize-y"
                    placeholder={field.placeholder || undefined}
                    maxLength={field.maxLength ?? 2000}
                  />
                ) : (
                  <input
                    id={`${baseId}-${field.id}`}
                    name={field.id}
                    required={field.required}
                    value={v}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    className="input-field mt-2"
                    placeholder={field.placeholder || undefined}
                    maxLength={field.maxLength ?? 2000}
                  />
                )}
                {field.description ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {field.description}
                  </p>
                ) : null}
              </div>
            );
          }

          if (field.kind === "single") {
            const v = (values[field.id] as string) ?? "";
            const headingId = `${baseId}-${field.id}-single`;
            return (
              <div key={field.id} className="flex flex-col gap-2">
                <p id={headingId} className="label-field">
                  {field.label}{" "}
                  {field.required ? (
                    <span className="text-red-400">*</span>
                  ) : null}
                </p>
                {field.description ? (
                  <p className="text-xs text-[var(--muted)]">
                    {field.description}
                  </p>
                ) : null}
                <ul
                  className="mt-2 space-y-2"
                  role="radiogroup"
                  aria-labelledby={headingId}
                >
                  {field.options.map((opt, optIndex) => {
                    const checked = v === opt;
                    return (
                      <li key={`${field.id}-opt-${optIndex}`}>
                        <label
                          className={`${optionBase} ${checked ? optionActive : optionIdle}`}
                        >
                          <input
                            type="radio"
                            name={field.id}
                            required={field.required}
                            value={opt}
                            checked={checked}
                            onChange={() => onFieldChange(field.id, opt)}
                            className="shrink-0 border-zinc-600 text-[var(--accent)] focus:ring-[var(--ring)]"
                          />
                          <span className="text-[15px] text-zinc-200">
                            {opt}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }

          if (field.kind === "multiple") {
            const selected = new Set(
              ((values[field.id] as string[]) ?? []).filter(Boolean)
            );
            const headingId = `${baseId}-${field.id}-multi`;
            return (
              <div key={field.id} className="flex flex-col gap-2">
                <p id={headingId} className="label-field">
                  {field.label}{" "}
                  {field.required ? (
                    <span className="text-red-400">*</span>
                  ) : null}
                </p>
                {field.description ? (
                  <p className="text-xs text-[var(--muted)]">
                    {field.description}
                  </p>
                ) : null}
                <ul className="mt-2 space-y-2" aria-labelledby={headingId}>
                  {field.options.map((opt, optIndex) => {
                    const isOn = selected.has(opt);
                    return (
                      <li key={`${field.id}-m-${optIndex}`}>
                        <label
                          className={`${optionBase} ${isOn ? optionActive : optionIdle}`}
                        >
                          <input
                            type="checkbox"
                            checked={isOn}
                            onChange={() => {
                              const next = new Set(selected);
                              if (next.has(opt)) next.delete(opt);
                              else next.add(opt);
                              onFieldChange(field.id, [...next]);
                            }}
                            className="shrink-0 rounded border-zinc-600 text-[var(--accent)] focus:ring-[var(--ring)]"
                          />
                          <span className="text-[15px] text-zinc-200">
                            {opt}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }

          if (field.kind === "location") {
            const v = values[field.id] as RespondentLocationValue | undefined;
            const mapId = `${baseId}-${field.id}-map`;
            return (
              <div key={field.id}>
                <p className="label-field">
                  {field.label}{" "}
                  {field.required ? (
                    <span className="text-red-400">*</span>
                  ) : (
                    <span className="font-normal text-zinc-500">
                      (optional)
                    </span>
                  )}
                </p>
                {field.description ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {field.description}
                  </p>
                ) : null}
                <div className="mt-2">
                  <RespondentLocationField
                    field={field}
                    value={v}
                    onChange={(next) => onFieldChange(field.id, next)}
                    mapContainerId={mapId}
                  />
                </div>
              </div>
            );
          }

          if (field.kind === "photo") {
            const maxF = field.maxFiles ?? MAX_SHOP_IMAGES_PER_RESPONSE;
            const slots = slotsByField[field.id] ?? [];

            return (
              <div key={field.id}>
                <span className="label-field">
                  {field.label}{" "}
                  {!field.required ? (
                    <span className="font-normal text-zinc-500">
                      (optional)
                    </span>
                  ) : (
                    <span className="text-red-400">*</span>
                  )}
                </span>
                {field.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    {field.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {slots.map((slot) =>
                    slot.status === "done" ? (
                      <div
                        key={slot.url}
                        className="relative h-24 w-24 overflow-hidden rounded-xl border border-[var(--border)] bg-zinc-900 shadow-inner"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slot.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void removePhotoSlot(field.id, slot).catch((err) => {
                              onClientError(
                                err instanceof Error
                                  ? err.message
                                  : "Could not remove image"
                              );
                            })
                          }
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-black/75 text-sm text-white backdrop-blur-sm transition hover:bg-red-500/90"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div
                        key={slot.id}
                        className="relative flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] bg-zinc-950/80 text-[var(--muted)]"
                      >
                        <span
                          className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-[var(--accent)]"
                          aria-hidden
                        />
                        <span className="px-1 text-center text-[10px] font-medium leading-tight">
                          Uploading…
                        </span>
                        <button
                          type="button"
                          onClick={() => void removePhotoSlot(field.id, slot)}
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-black/75 text-sm text-white backdrop-blur-sm transition hover:bg-red-500/90"
                          aria-label="Cancel upload"
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                  {slots.length < maxF ? (
                    <div className="flex flex-wrap gap-2">
                      <label className="btn-secondary cursor-pointer border-dashed py-2.5 text-xs sm:text-sm">
                        Take photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={(e) =>
                            void onPhotoChange(field.id, maxF, e).catch(
                              () => {}
                            )
                          }
                          aria-label="Take a photo with the camera"
                        />
                      </label>
                      <label className="btn-secondary cursor-pointer border-dashed py-2.5 text-xs sm:text-sm">
                        Gallery
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={(e) =>
                            void onPhotoChange(field.id, maxF, e).catch(
                              () => {}
                            )
                          }
                          aria-label="Choose an image from your device"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </section>
  );
}
