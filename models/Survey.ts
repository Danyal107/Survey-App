import mongoose, { Schema, models, model } from "mongoose";
import type { QuestionType } from "@/types/survey";

export interface ISurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  required: boolean;
}

export interface ISurvey {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  questions: ISurveyQuestion[];
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<ISurveyQuestion>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ["single", "multiple", "text"],
      required: true,
    },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: true },
  },
  { _id: false }
);

const SurveySchema = new Schema<ISurvey>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    questions: { type: [QuestionSchema], default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Survey =
  models.Survey ?? model<ISurvey>("Survey", SurveySchema);
