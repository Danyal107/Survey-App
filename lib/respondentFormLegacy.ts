/** Inline lists used when migrating old `single_select` + markets/categories from DB. */
export const LEGACY_MARKET_OPTIONS = [
  "Bagbanpura Market",
  "Azam Market",
  "Karim Block Market",
  "Moon Market",
  "Anarkali Market",
];

export const LEGACY_CATEGORY_OPTIONS = [
  "Garments",
  "Cosmetics",
  "Shoes",
  "Jewellery",
  "Electronics",
  "General / mixed",
  "Other",
];

const AUDIENCE_OPTIONS = ["male", "female", "both"];

/**
 * Normalize stored field documents from older app versions into the current shape
 * (before `parseRespondentFieldList` runs).
 */
export function migrateRespondentFieldRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const k = row.kind;
  if (
    k === "text" ||
    k === "single" ||
    k === "multiple" ||
    k === "photo"
  ) {
    return row;
  }

  if (k === "short_text") {
    return {
      ...row,
      kind: "text",
      multiline: false,
    };
  }

  if (k === "phone") {
    return {
      ...row,
      kind: "text",
      multiline: false,
    };
  }

  if (k === "image_upload") {
    return { ...row, kind: "photo" };
  }

  if (k === "audience_segment") {
    return {
      ...row,
      kind: "single",
      options: AUDIENCE_OPTIONS,
      categoryFieldId: undefined,
      selectPlaceholder: undefined,
      optionsSource: undefined,
    };
  }

  if (k === "single_select") {
    const src = row.optionsSource;
    let options = row.options;
    if (src === "markets") {
      options = LEGACY_MARKET_OPTIONS;
    } else if (src === "categories") {
      options = LEGACY_CATEGORY_OPTIONS;
    }
    return {
      ...row,
      kind: "single",
      optionsSource: undefined,
      categoryFieldId: undefined,
      options,
    };
  }

  return row;
}
