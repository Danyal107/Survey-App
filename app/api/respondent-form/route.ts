import { NextResponse } from "next/server";
import {
  getOrCreateRespondentFormConfig,
  toRespondentFormDTO,
} from "@/lib/respondentFormStore";
import { parseRespondentFormPutBody } from "@/lib/respondentFormConfigValidate";
import { parseRespondentFieldList } from "@/lib/respondentFormParse";

export async function GET() {
  try {
    const { doc, fields } = await getOrCreateRespondentFormConfig();
    return NextResponse.json(toRespondentFormDTO(doc, fields));
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load respondent form" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseRespondentFormPutBody(body);
    if (parsed instanceof NextResponse) {
      return parsed;
    }

    const { doc } = await getOrCreateRespondentFormConfig();
    doc.sectionTitle = parsed.sectionTitle;
    doc.sectionDescription = parsed.sectionDescription;
    doc.fields = parsed.fields as unknown as Record<string, unknown>[];
    await doc.save();

    const fields = parseRespondentFieldList(doc.fields);
    return NextResponse.json(toRespondentFormDTO(doc, fields));
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update respondent form" },
      { status: 500 }
    );
  }
}
