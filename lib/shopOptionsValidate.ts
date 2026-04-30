import { NextResponse } from 'next/server';
import type { IShopCategoryOption } from '@/models/ShopOptions';

const MAX_LEN = 300;
const MAX_LIST = 200;

function trimNonEmptyStrings(
  arr: unknown,
  field: string,
): string[] | NextResponse {
  if (!Array.isArray(arr)) {
    return NextResponse.json(
      { error: `${field} must be an array of strings` },
      { status: 400 },
    );
  }
  if (arr.length > MAX_LIST) {
    return NextResponse.json(
      { error: `${field} has too many entries (max ${MAX_LIST})` },
      { status: 400 },
    );
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (typeof item !== 'string') {
      return NextResponse.json(
        { error: `${field} must contain only strings` },
        { status: 400 },
      );
    }
    const t = item.trim();
    if (!t) continue;
    if (t.length > MAX_LEN) {
      return NextResponse.json(
        {
          error: `Each ${field.slice(0, -1)} is at most ${MAX_LEN} characters`,
        },
        { status: 400 },
      );
    }
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  if (out.length === 0) {
    return NextResponse.json(
      {
        error: `Add at least one non-empty ${field === 'markets' ? 'market' : 'value'}`,
      },
      { status: 400 },
    );
  }
  return out;
}

/** Parse and validate body for PUT /api/shop-options */
export function parseShopOptionsBody(
  raw: unknown,
): { markets: string[]; categories: IShopCategoryOption[] } | NextResponse {
  if (raw == null || typeof raw !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const o = raw as Record<string, unknown>;

  const marketsOrErr = trimNonEmptyStrings(o.markets, 'markets');
  if (marketsOrErr instanceof NextResponse) return marketsOrErr;
  const markets = marketsOrErr;

  if (!Array.isArray(o.categories)) {
    return NextResponse.json(
      { error: 'categories must be an array' },
      { status: 400 },
    );
  }
  if (o.categories.length > MAX_LIST) {
    return NextResponse.json(
      { error: `categories has too many entries (max ${MAX_LIST})` },
      { status: 400 },
    );
  }
  const categories: IShopCategoryOption[] = [];
  const labelSeen = new Set<string>();
  for (const row of o.categories) {
    if (row == null || typeof row !== 'object') {
      return NextResponse.json(
        { error: 'Each category must be an object with label' },
        { status: 400 },
      );
    }
    const r = row as Record<string, unknown>;
    if (typeof r.label !== 'string') {
      return NextResponse.json(
        { error: 'Each category needs a string label' },
        { status: 400 },
      );
    }
    const label = r.label.trim();
    if (!label) {
      return NextResponse.json(
        { error: 'Category labels cannot be empty' },
        { status: 400 },
      );
    }
    if (label.length > MAX_LEN) {
      return NextResponse.json(
        { error: `Each category label is at most ${MAX_LEN} characters` },
        { status: 400 },
      );
    }
    if (labelSeen.has(label)) {
      return NextResponse.json(
        { error: `Duplicate category label: ${label}` },
        { status: 400 },
      );
    }
    labelSeen.add(label);
    const requiresAudience = Boolean(r.requiresAudience);
    categories.push({ label, requiresAudience });
  }
  if (categories.length === 0) {
    return NextResponse.json(
      { error: 'Add at least one shop category' },
      { status: 400 },
    );
  }

  return { markets, categories };
}
