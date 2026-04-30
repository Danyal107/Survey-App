import type { IRespondentInfo } from "@/models/Response";

/**
 * Respondent field ids whose values are stored on `Shop` and linked from
 * `SurveyResponse.shopId`. Keep in sync with shop-oriented fields in
 * `respondentFormDefaults`.
 */
export const DEFAULT_SHOP_FIELD_IDS: readonly string[] = [
  "shopName",
  "shopCategory",
  "shopAudience",
  "market",
  "shopLocation",
  "shopImageUrls",
];

export function splitRespondentForShop(
  full: IRespondentInfo,
  shopFieldIds: readonly string[] = DEFAULT_SHOP_FIELD_IDS
): { shop: IRespondentInfo; respondent: IRespondentInfo } {
  const shop: IRespondentInfo = {};
  const respondent: IRespondentInfo = { ...full };
  for (const id of shopFieldIds) {
    if (id in respondent) {
      shop[id] = respondent[id]!;
      delete respondent[id];
    }
  }
  return { shop, respondent };
}
