import mongoose, { Schema, models, model } from "mongoose";
import { MAX_SHOP_IMAGES_PER_RESPONSE } from "@/lib/shopImageUrls";

export interface IAnswer {
  questionId: string;
  value: string | string[];
}

export interface IRespondentInfo {
  shopName: string;
  market: string;
  shopCategory: string;
  /** Present when the shop category requires audience (see ShopOptions) */
  shopAudience?: "male" | "female" | "both";
  respondentName: string;
  whatsappContact: string;
  /** Vercel Blob HTTPS URLs from this app’s shop uploader (capped per response). */
  shopImageUrls: string[];
}

export interface IResponse {
  _id: mongoose.Types.ObjectId;
  surveyId: mongoose.Types.ObjectId;
  respondentInfo?: IRespondentInfo;
  answers: IAnswer[];
  createdAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const RespondentInfoSchema = new Schema<IRespondentInfo>(
  {
    shopName: { type: String, required: true },
    market: { type: String, required: true },
    shopCategory: { type: String, required: true },
    shopAudience: {
      type: String,
      required: false,
      enum: ["male", "female", "both"],
    },
    respondentName: { type: String, required: true },
    whatsappContact: { type: String, required: true },
    shopImageUrls: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) =>
          Array.isArray(v) && v.length <= MAX_SHOP_IMAGES_PER_RESPONSE,
        message: `At most ${MAX_SHOP_IMAGES_PER_RESPONSE} shop images`,
      },
    },
  },
  { _id: false }
);

const ResponseSchema = new Schema<IResponse>(
  {
    surveyId: {
      type: Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },
    respondentInfo: { type: RespondentInfoSchema, required: false },
    answers: { type: [AnswerSchema], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SurveyResponse =
  models.SurveyResponse ??
  model<IResponse>("SurveyResponse", ResponseSchema);
