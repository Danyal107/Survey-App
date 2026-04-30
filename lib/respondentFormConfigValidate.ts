import { NextResponse } from "next/server";
import { parseRespondentFieldList } from "@/lib/respondentFormParse";
import type { RespondentFormDTO } from "@/types/respondentForm";

const MAX_TITLE = 200;
const MAX_DESC = 2000;

export function parseRespondentFormPutBody(
  raw: unknown
): RespondentFormDTO | NextResponse {
  if (raw == null || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const o = raw as Record<string, unknown>;

  const sectionTitle =
    typeof o.sectionTitle === "string"
      ? o.sectionTitle.trim().slice(0, MAX_TITLE)
      : "";
  if (!sectionTitle) {
    return NextResponse.json(
      { error: "sectionTitle is required" },
      { status: 400 }
    );
  }

  const sectionDescription =
    typeof o.sectionDescription === "string"
      ? o.sectionDescription.trim().slice(0, MAX_DESC)
      : "";

  let fields;
  try {
    fields = parseRespondentFieldList(o.fields);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid fields";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (fields.length === 0) {
    return NextResponse.json(
      { error: "Add at least one field" },
      { status: 400 }
    );
  }

  return {
    sectionTitle,
    sectionDescription,
    fields,
    updatedAt: null,
  };
}
