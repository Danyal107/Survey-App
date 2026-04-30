import { NextResponse } from "next/server";
import {
  isAppShopImageBlobUrl,
  MAX_SHOP_IMAGES_PER_RESPONSE,
} from "@/lib/shopImageUrls";
import type { RespondentFieldDef } from "@/types/respondentForm";
import type { IRespondentInfo } from "@/models/Response";
import { isLocationValue } from "@/lib/shopCoordinates";

const DEFAULT_MAX_TEXT = 2000;

function allowedOptionValues(field: RespondentFieldDef): string[] {
  if (field.kind === "single" || field.kind === "multiple") {
    return field.options;
  }
  return [];
}

export function validateRespondentSubmission(
  raw: unknown,
  fields: RespondentFieldDef[]
): IRespondentInfo | NextResponse {
  if (raw == null || typeof raw !== "object") {
    return NextResponse.json(
      { error: "respondentInfo is required" },
      { status: 400 }
    );
  }
  const o = raw as Record<string, unknown>;
  const out: IRespondentInfo = {};

  for (const field of fields) {
    const rawVal = o[field.id];

    if (field.kind === "location") {
      if (field.required) {
        if (!isLocationValue(rawVal)) {
          return NextResponse.json(
            { error: `“${field.label}” requires a map location.` },
            { status: 400 }
          );
        }
        out[field.id] = rawVal;
      } else {
        if (rawVal === undefined || rawVal === null) {
          continue;
        }
        if (!isLocationValue(rawVal)) {
          return NextResponse.json(
            { error: `Invalid map location for “${field.label}”.` },
            { status: 400 }
          );
        }
        out[field.id] = rawVal;
      }
      continue;
    }

    if (field.kind === "photo") {
      const maxF = field.maxFiles ?? MAX_SHOP_IMAGES_PER_RESPONSE;
      let urls: string[] = [];
      if (rawVal === undefined || rawVal === null) {
        urls = [];
      } else if (!Array.isArray(rawVal)) {
        return NextResponse.json(
          { error: `“${field.label}” must be an array of URLs` },
          { status: 400 }
        );
      } else {
        if (rawVal.length > maxF) {
          return NextResponse.json(
            {
              error: `At most ${maxF} images for “${field.label}”.`,
            },
            { status: 400 }
          );
        }
        for (const item of rawVal) {
          if (typeof item !== "string" || !item.trim()) {
            return NextResponse.json(
              {
                error: `Each image URL in “${field.label}” must be a non-empty string`,
              },
              { status: 400 }
            );
          }
          const u = item.trim();
          if (!isAppShopImageBlobUrl(u)) {
            return NextResponse.json(
              {
                error: `“${field.label}” must use HTTPS URLs from this app’s image uploader.`,
              },
              { status: 400 }
            );
          }
          urls.push(u);
        }
      }
      if (field.required && urls.length === 0) {
        return NextResponse.json(
          { error: `“${field.label}” requires at least one image.` },
          { status: 400 }
        );
      }
      out[field.id] = urls;
      continue;
    }

    if (field.kind === "text") {
      const maxLen = field.maxLength ?? DEFAULT_MAX_TEXT;
      const s = typeof rawVal === "string" ? rawVal.trim() : "";
      if (field.required && !s) {
        return NextResponse.json(
          { error: `“${field.label}” is required.` },
          { status: 400 }
        );
      }
      if (s.length > maxLen) {
        return NextResponse.json(
          {
            error: `“${field.label}” must be at most ${maxLen} characters.`,
          },
          { status: 400 }
        );
      }
      if (s) out[field.id] = s;
      continue;
    }

    if (field.kind === "single") {
      const s = typeof rawVal === "string" ? rawVal.trim() : "";
      if (field.required && !s) {
        return NextResponse.json(
          { error: `Please choose an option for “${field.label}”.` },
          { status: 400 }
        );
      }
      if (!s) continue;
      const allowed = allowedOptionValues(field);
      if (!allowed.includes(s)) {
        return NextResponse.json(
          { error: `Invalid option for “${field.label}”.` },
          { status: 400 }
        );
      }
      out[field.id] = s;
      continue;
    }

    if (field.kind === "multiple") {
      let arr: string[] = [];
      if (rawVal === undefined || rawVal === null) {
        arr = [];
      } else if (!Array.isArray(rawVal)) {
        return NextResponse.json(
          { error: `“${field.label}” must be an array of selected values` },
          { status: 400 }
        );
      } else {
        if (!rawVal.every((v) => typeof v === "string")) {
          return NextResponse.json(
            { error: `“${field.label}” selections must be strings` },
            { status: 400 }
          );
        }
        arr = rawVal.map((v) => v.trim()).filter(Boolean);
      }
      const allowed = new Set(allowedOptionValues(field));
      const bad = arr.find((v) => !allowed.has(v));
      if (bad) {
        return NextResponse.json(
          { error: `Invalid option for “${field.label}”.` },
          { status: 400 }
        );
      }
      if (field.required && arr.length === 0) {
        return NextResponse.json(
          { error: `Please select at least one option for “${field.label}”.` },
          { status: 400 }
        );
      }
      if (arr.length > 0) out[field.id] = arr;
    }
  }

  return out;
}
