export type QuestionType = "single" | "multiple" | "text";

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  /** Options for single/multiple choice */
  options: string[];
  required?: boolean;
}

export interface SurveyAnswer {
  questionId: string;
  /** string for single/text; string[] for multiple */
  value: string | string[];
}

/** Submitted with each response (take-survey form). */
export interface RespondentInfoPayload {
  shopName: string;
  /** One of the hardcoded markets from `SHOP_MARKETS` */
  market: string;
  /** One of the hardcoded categories from `SHOP_CATEGORIES` */
  shopCategory: string;
  /** Required when category is Garments or Shoes: `male` | `female` | `both` */
  shopAudience?: "male" | "female" | "both";
  respondentName: string;
  whatsappContact: string;
  /** Max 3 HTTPS URLs from this app’s Cloudinary upload API */
  shopImageUrls: string[];
}
