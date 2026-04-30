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
  /** Must match a market from `/api/shop-options` */
  market: string;
  /** Must match a category label from `/api/shop-options` */
  shopCategory: string;
  /** Required when the category has `requiresAudience` in shop options */
  shopAudience?: "male" | "female" | "both";
  respondentName: string;
  whatsappContact: string;
  /** Max 3 HTTPS URLs from this app’s Cloudinary upload API */
  shopImageUrls: string[];
}
