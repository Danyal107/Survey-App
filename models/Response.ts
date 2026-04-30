import mongoose, { Schema, models, model } from "mongoose";

export interface IAnswer {
  questionId: string;
  value: string | string[];
}

/** Keys match `RespondentFormConfig` field ids (dynamic respondent section). */
export type IRespondentInfo = Record<string, string | string[]>;

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

const ResponseSchema = new Schema<IResponse>(
  {
    surveyId: {
      type: Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },
    respondentInfo: { type: Schema.Types.Mixed, required: false },
    answers: { type: [AnswerSchema], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SurveyResponse =
  models.SurveyResponse ??
  model<IResponse>("SurveyResponse", ResponseSchema);
