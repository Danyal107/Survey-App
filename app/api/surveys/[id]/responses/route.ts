import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Survey, type ISurvey } from "@/models/Survey";
import { SurveyResponse, type IRespondentInfo } from "@/models/Response";

type RouteParams = { params: Promise<{ id: string }> };

const MAX_FIELD = 300;

function isCloudinaryHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      (u.hostname === "res.cloudinary.com" ||
        u.hostname.endsWith(".res.cloudinary.com"))
    );
  } catch {
    return false;
  }
}

function parseRespondentInfo(raw: unknown): IRespondentInfo | NextResponse {
  if (raw == null || typeof raw !== "object") {
    return NextResponse.json(
      { error: "respondentInfo is required" },
      { status: 400 }
    );
  }
  const o = raw as Record<string, unknown>;
  const shopName =
    typeof o.shopName === "string" ? o.shopName.trim() : "";
  const respondentName =
    typeof o.respondentName === "string" ? o.respondentName.trim() : "";
  const whatsappContact =
    typeof o.whatsappContact === "string" ? o.whatsappContact.trim() : "";
  const urlsRaw = o.shopImageUrls;

  if (!shopName || shopName.length > MAX_FIELD) {
    return NextResponse.json(
      { error: "Shop name is required (max 300 characters)." },
      { status: 400 }
    );
  }
  if (!respondentName || respondentName.length > MAX_FIELD) {
    return NextResponse.json(
      { error: "Your name is required (max 300 characters)." },
      { status: 400 }
    );
  }
  if (!whatsappContact || whatsappContact.length > MAX_FIELD) {
    return NextResponse.json(
      { error: "WhatsApp contact is required (max 300 characters)." },
      { status: 400 }
    );
  }
  if (!/^[\d\s+()-]{6,40}$/.test(whatsappContact)) {
    return NextResponse.json(
      {
        error:
          "WhatsApp number should contain digits (and optional +, spaces, or parentheses).",
      },
      { status: 400 }
    );
  }

  let shopImageUrls: string[] = [];
  if (urlsRaw === undefined || urlsRaw === null) {
    shopImageUrls = [];
  } else if (!Array.isArray(urlsRaw)) {
    return NextResponse.json(
      { error: "shopImageUrls must be an array of URLs" },
      { status: 400 }
    );
  } else {
    if (urlsRaw.length > 3) {
      return NextResponse.json(
        { error: "At most 3 shop images allowed" },
        { status: 400 }
      );
    }
    for (const item of urlsRaw) {
      if (typeof item !== "string" || !item.trim()) {
        return NextResponse.json(
          { error: "Each image must be a non-empty URL string" },
          { status: 400 }
        );
      }
      const u = item.trim();
      if (!isCloudinaryHttpsUrl(u)) {
        return NextResponse.json(
          { error: "Shop images must be valid Cloudinary (https) URLs" },
          { status: 400 }
        );
      }
      shopImageUrls.push(u);
    }
  }

  return {
    shopName,
    respondentName,
    whatsappContact,
    shopImageUrls,
  };
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id: surveyId } = await params;
  if (!mongoose.Types.ObjectId.isValid(surveyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const answers = body.answers;
    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers must be an array" },
        { status: 400 }
      );
    }

    const respondentParsed = parseRespondentInfo(body.respondentInfo);
    if (respondentParsed instanceof NextResponse) {
      return respondentParsed;
    }
    const respondentInfo = respondentParsed;

    await connectDB();
    const survey = await Survey.findById(surveyId).lean<ISurvey | null>();
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const questionIds = new Set(survey.questions.map((q) => q.id));
    const normalized: { questionId: string; value: string | string[] }[] = [];

    for (const q of survey.questions) {
      const raw = answers.find(
        (a: { questionId?: string }) => a?.questionId === q.id
      );
      const { value } = (raw ?? {}) as { value?: unknown };
      const isEmpty =
        raw == null ||
        value === "" ||
        value == null ||
        (Array.isArray(value) && value.length === 0);
      if (q.required && isEmpty) {
        return NextResponse.json(
          { error: `Missing answer for: ${q.text}` },
          { status: 400 }
        );
      }
      if (raw == null || isEmpty) continue;

      if (q.type === "text") {
        if (typeof value !== "string") {
          return NextResponse.json(
            { error: `Invalid text answer for: ${q.text}` },
            { status: 400 }
          );
        }
        normalized.push({ questionId: q.id, value: value.trim() });
      } else if (q.type === "single") {
        if (typeof value !== "string") {
          return NextResponse.json(
            { error: `Invalid single choice for: ${q.text}` },
            { status: 400 }
          );
        }
        if (value && !q.options.includes(value)) {
          return NextResponse.json(
            { error: `Invalid option for: ${q.text}` },
            { status: 400 }
          );
        }
        normalized.push({ questionId: q.id, value });
      } else {
        if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
          return NextResponse.json(
            { error: `Invalid multiple choice for: ${q.text}` },
            { status: 400 }
          );
        }
        const bad = value.find((v) => !q.options.includes(v));
        if (bad) {
          return NextResponse.json(
            { error: `Invalid option for: ${q.text}` },
            { status: 400 }
          );
        }
        normalized.push({ questionId: q.id, value });
      }
    }

    for (const a of answers) {
      if (a?.questionId && !questionIds.has(a.questionId)) {
        return NextResponse.json(
          { error: "Unknown question in answers" },
          { status: 400 }
        );
      }
    }

    const doc = await SurveyResponse.create({
      surveyId: surveyId,
      respondentInfo,
      answers: normalized,
    });

    return NextResponse.json({
      ok: true,
      id: String(doc._id),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save response" },
      { status: 500 }
    );
  }
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id: surveyId } = await params;
  if (!mongoose.Types.ObjectId.isValid(surveyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await connectDB();
    const rows = await SurveyResponse.find({ surveyId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(
      rows.map((r) => ({ ...r, _id: String(r._id), surveyId: String(r.surveyId) }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load responses" },
      { status: 500 }
    );
  }
}
