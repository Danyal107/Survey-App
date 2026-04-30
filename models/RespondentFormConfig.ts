import mongoose, { Schema, models, model } from "mongoose";

export interface IRespondentFormConfig {
  _id: mongoose.Types.ObjectId;
  key: string;
  sectionTitle: string;
  sectionDescription: string;
  fields: Record<string, unknown>[];
  updatedAt: Date;
}

/** Loose sub-schema so legacy + future field keys are preserved until `parseRespondentFieldList` runs. */
const RespondentFieldSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    kind: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    placeholder: { type: String, default: "" },
    required: { type: Boolean, default: true },
    maxLength: { type: Number },
    multiline: { type: Boolean },
    /** `string[]` for choice fields; legacy docs may store `{ value, label }` objects. */
    options: { type: [Schema.Types.Mixed], default: undefined },
    maxFiles: { type: Number },
    optionsSource: { type: String },
    selectPlaceholder: { type: String },
    categoryFieldId: { type: String },
  },
  { _id: false, strict: false }
);

const RespondentFormConfigSchema = new Schema<IRespondentFormConfig>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    sectionTitle: { type: String, default: "Your details", trim: true },
    sectionDescription: { type: String, default: "", trim: true },
    fields: { type: [RespondentFieldSchema], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const RespondentFormConfig =
  models.RespondentFormConfig ??
  model<IRespondentFormConfig>(
    "RespondentFormConfig",
    RespondentFormConfigSchema
  );
