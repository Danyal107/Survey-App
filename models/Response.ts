import mongoose, { Schema, models, model } from "mongoose";

export interface IAnswer {
  questionId: string;
  value: string | string[];
}

/**
 * Shape of the respondent block during validation / transport. Values are
 * persisted on `Shop`, not on `SurveyResponse` (except legacy rows).
 */
export type IRespondentInfo = Record<
  string,
  string | string[] | { lat: number; lng: number }
>;

export interface IResponse {
  _id: mongoose.Types.ObjectId;
  surveyId: mongoose.Types.ObjectId;
  /** Shop profile for this submission (`Shop` collection). */
  shopId?: mongoose.Types.ObjectId;
  /**
   * Legacy: older responses may have per-field data here. New submissions
   * store the whole respondent section on `Shop` and omit this field.
   */
  respondentInfo?: IRespondentInfo;
  answers: IAnswer[];
  isDeleted?: boolean;
  createdAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
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
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: false,
      index: true,
    },
    respondentInfo: { type: Schema.Types.Mixed, required: false },
    answers: { type: [AnswerSchema], required: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SurveyResponse =
  models.SurveyResponse ??
  model<IResponse>("SurveyResponse", ResponseSchema);
