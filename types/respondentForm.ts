/** Mirrors survey question shapes: text, single, multiple, plus photos. */
export type RespondentFieldKind = "text" | "single" | "multiple" | "photo";

export interface RespondentFieldBase {
  id: string;
  kind: RespondentFieldKind;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
}

/** Free text: single-line or multiline (like survey “text”). */
export interface RespondentFieldText extends RespondentFieldBase {
  kind: "text";
  maxLength?: number;
  /** If true (default), use a textarea; otherwise a one-line input. */
  multiline?: boolean;
}

/** One option (radio list, same UX as survey single choice). */
export interface RespondentFieldSingle extends RespondentFieldBase {
  kind: "single";
  /** Display and stored value, like `SurveyQuestion.options`. */
  options: string[];
}

/** Many options (checkboxes, same as survey multiple choice). */
export interface RespondentFieldMultiple extends RespondentFieldBase {
  kind: "multiple";
  options: string[];
}

export interface RespondentFieldPhoto extends RespondentFieldBase {
  kind: "photo";
  maxFiles?: number;
}

export type RespondentFieldDef =
  | RespondentFieldText
  | RespondentFieldSingle
  | RespondentFieldMultiple
  | RespondentFieldPhoto;

export type RespondentFormDTO = {
  sectionTitle: string;
  sectionDescription: string;
  fields: RespondentFieldDef[];
  updatedAt: string | null;
};

/** Values submitted under `respondentInfo` (keys = field ids). */
export type RespondentValuesPayload = Record<string, string | string[]>;
