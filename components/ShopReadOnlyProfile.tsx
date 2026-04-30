"use client";

import { formatShopDetailValue } from "@/lib/shopDisplay";
import type { IShopDetails } from "@/models/Shop";
import type { RespondentFieldDef } from "@/types/respondentForm";
import { ShopLocationReadOnlyMap } from "@/components/ShopLocationReadOnlyMap";

type Props = {
  fields: RespondentFieldDef[];
  details: IShopDetails;
  coordinates: [number, number] | null;
};

function photoUrls(details: IShopDetails, fieldId: string): string[] {
  const v = details[fieldId];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

export function ShopReadOnlyProfile({
  fields,
  details,
  coordinates,
}: Props) {
  const locationField = fields.find((f) => f.kind === "location");

  return (
    <section className="surface-card p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-white">Profile</h2>
      <dl className="mt-6 space-y-6">
        {fields.map((field) => {
          if (field.kind === "location" || field.kind === "photo") {
            return null;
          }
          const v = details[field.id];
          const strVal =
            typeof v === "string" || Array.isArray(v) ? v : undefined;
          return (
            <div
              key={field.id}
              className="grid gap-1 border-b border-[var(--border)]/50 pb-6 last:border-0 last:pb-0 sm:grid-cols-[minmax(8rem,12rem)_1fr] sm:gap-4"
            >
              <dt className="text-sm font-medium text-zinc-400">{field.label}</dt>
              <dd className="text-sm text-zinc-100">
                {formatShopDetailValue(strVal)}
              </dd>
            </div>
          );
        })}
      </dl>

      {fields.map((field) => {
        if (field.kind !== "photo") return null;
        const urls = photoUrls(details, field.id);
        return (
          <div
            key={field.id}
            className="mt-8 border-t border-[var(--border)]/60 pt-8"
          >
            <h3 className="text-sm font-medium text-zinc-300">{field.label}</h3>
            {field.description ? (
              <p className="mt-1 text-xs text-zinc-500">{field.description}</p>
            ) : null}
            {urls.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No images.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {urls.map((url) => (
                  <li
                    key={url}
                    className="overflow-hidden rounded-xl border border-[var(--border)] bg-zinc-950/80"
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {locationField ? (
        <div className="mt-8 border-t border-[var(--border)]/60 pt-8">
          <h3 className="text-sm font-medium text-zinc-300">
            {locationField.label}
          </h3>
          {locationField.description ? (
            <p className="mt-1 text-xs text-zinc-500">
              {locationField.description}
            </p>
          ) : null}
          {coordinates ? (
            <>
              <div className="mt-4">
                <ShopLocationReadOnlyMap
                  lat={coordinates[0]}
                  lng={coordinates[1]}
                  zoom={locationField.defaultZoom ?? 15}
                />
              </div>
              <p className="mt-2 font-mono text-xs text-zinc-500">
                {coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No map pin set.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
