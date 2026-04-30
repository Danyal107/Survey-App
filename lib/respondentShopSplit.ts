import type { IRespondentInfo } from "@/models/Response";
import type { RespondentFieldDef } from "@/types/respondentForm";

/**
 * Field ids on the default seeded respondent form (reference only).
 * {@link shopStorageKeys} persists every configured respondent field on `Shop`.
 */
export const DEFAULT_SHOP_FIELD_IDS: readonly string[] = [
  "shopName",
  "shopCategory",
  "shopAudience",
  "market",
  "shopLocation",
  "respondentName",
  "whatsappContact",
  "shopImageUrls",
];

/** Every respondent-section field is stored on `Shop` (details + coordinates). */
export function shopStorageKeys(
  formFields: RespondentFieldDef[]
): Set<string> {
  return new Set(formFields.map((f) => f.id));
}

export function splitRespondentForShop(
  full: IRespondentInfo,
  formFields: RespondentFieldDef[]
): { shop: IRespondentInfo; respondent: IRespondentInfo } {
  const shopKeys = shopStorageKeys(formFields);
  const shop: IRespondentInfo = {};
  const respondent: IRespondentInfo = { ...full };
  for (const id of shopKeys) {
    if (id in respondent) {
      shop[id] = respondent[id]!;
      delete respondent[id];
    }
  }
  return { shop, respondent };
}
