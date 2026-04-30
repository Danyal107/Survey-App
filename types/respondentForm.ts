/** Mirrors survey question shapes: text, single, multiple, photos, map pin. */
export type RespondentFieldKind =
  | "text"
  | "single"
  | "multiple"
  | "photo"
  | "location";

/** Value for `kind: "location"` (WGS84). */
export type RespondentLocationValue = { lat: number; lng: number };

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

/** Map: click or drag pin to set shop coordinates (OpenStreetMap). */
export interface RespondentFieldLocation extends RespondentFieldBase {
  kind: "location";
  defaultLat?: number;
  defaultLng?: number;
  /** Leaflet zoom level (e.g. 13). */
  defaultZoom?: number;
}

export type RespondentFieldDef =
  | RespondentFieldText
  | RespondentFieldSingle
  | RespondentFieldMultiple
  | RespondentFieldPhoto
  | RespondentFieldLocation;

export type RespondentFormDTO = {
  sectionTitle: string;
  sectionDescription: string;
  fields: RespondentFieldDef[];
  updatedAt: string | null;
};

/**
 * Client sends this as `respondentInfo`; the API moves every field onto `Shop`
 * and saves only `shopId` on the response.
 */
export type RespondentValuesPayload = Record<
  string,
  string | string[] | RespondentLocationValue
>;
