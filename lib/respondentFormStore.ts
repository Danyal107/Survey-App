import type { HydratedDocument } from "mongoose";
import { connectDB } from "@/lib/db";
import {
  RespondentFormConfig,
  type IRespondentFormConfig,
} from "@/models/RespondentFormConfig";
import {
  DEFAULT_RESPONDENT_FIELDS,
  DEFAULT_RESPONDENT_SECTION_DESCRIPTION,
  DEFAULT_RESPONDENT_SECTION_TITLE,
} from "@/lib/respondentFormDefaults";
import { parseRespondentFieldList } from "@/lib/respondentFormParse";
import type { RespondentFieldDef, RespondentFormDTO } from "@/types/respondentForm";

const SINGLETON_KEY = "default";

export function toRespondentFormDTO(
  doc: IRespondentFormConfig,
  fields: RespondentFieldDef[]
): RespondentFormDTO {
  return {
    sectionTitle: doc.sectionTitle,
    sectionDescription: doc.sectionDescription ?? "",
    fields,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

export async function getOrCreateRespondentFormConfig(): Promise<{
  doc: HydratedDocument<IRespondentFormConfig>;
  fields: RespondentFieldDef[];
}> {
  await connectDB();
  let doc = await RespondentFormConfig.findOne({ key: SINGLETON_KEY });
  if (!doc) {
    doc = await RespondentFormConfig.create({
      key: SINGLETON_KEY,
      sectionTitle: DEFAULT_RESPONDENT_SECTION_TITLE,
      sectionDescription: DEFAULT_RESPONDENT_SECTION_DESCRIPTION,
      fields: DEFAULT_RESPONDENT_FIELDS.map((f) =>
        JSON.parse(JSON.stringify(f))
      ) as unknown as Record<string, unknown>[],
    });
  }
  const fields = parseRespondentFieldList(doc.fields);
  return { doc, fields };
}
