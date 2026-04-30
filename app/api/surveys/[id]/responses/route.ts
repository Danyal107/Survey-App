import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { notDeleted } from "@/lib/notDeleted";
import { Survey, type ISurvey } from "@/models/Survey";
import { Shop } from "@/models/Shop";
import { SurveyResponse, type IRespondentInfo } from "@/models/Response";
import { getOrCreateRespondentFormConfig } from "@/lib/respondentFormStore";
import { validateRespondentSubmission } from "@/lib/validateRespondentSubmission";
import {
  DEFAULT_SHOP_FIELD_IDS,
  splitRespondentForShop,
} from "@/lib/respondentShopSplit";

type RouteParams = { params: Promise<{ id: string }> };

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

    await connectDB();
    const { fields } = await getOrCreateRespondentFormConfig();
    const respondentParsed = validateRespondentSubmission(
      body.respondentInfo,
      fields
    );
    if (respondentParsed instanceof NextResponse) {
      return respondentParsed;
    }
    const respondentFull = respondentParsed as IRespondentInfo;

    const survey = await Survey.findOne({
      _id: surveyId,
      ...notDeleted,
    }).lean<ISurvey | null>();
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

    let resolvedShopId: mongoose.Types.ObjectId | undefined;
    const rawShopId = (body as { shopId?: unknown }).shopId;
    if (rawShopId != null && rawShopId !== "") {
      if (
        typeof rawShopId !== "string" ||
        !mongoose.Types.ObjectId.isValid(rawShopId)
      ) {
        return NextResponse.json({ error: "Invalid shopId" }, { status: 400 });
      }
      const existingShop = await Shop.findOne({
        _id: rawShopId,
        ...notDeleted,
      });
      if (!existingShop) {
        return NextResponse.json({ error: "Shop not found" }, { status: 404 });
      }
      resolvedShopId = existingShop._id as mongoose.Types.ObjectId;
    }

    const { shop: shopPayload, respondent: respondentOnly } =
      splitRespondentForShop(respondentFull, DEFAULT_SHOP_FIELD_IDS);

    if (resolvedShopId) {
      if (Object.keys(shopPayload).length > 0) {
        const shopDoc = await Shop.findOne({
          _id: resolvedShopId,
          ...notDeleted,
        });
        if (shopDoc) {
          const prev =
            shopDoc.details &&
            typeof shopDoc.details === "object" &&
            !Array.isArray(shopDoc.details)
              ? (shopDoc.details as IRespondentInfo)
              : {};
          shopDoc.details = { ...prev, ...shopPayload };
          await shopDoc.save();
        }
      }
    } else if (Object.keys(shopPayload).length > 0) {
      const shopDoc = await Shop.create({
        details: shopPayload,
      });
      resolvedShopId = shopDoc._id as mongoose.Types.ObjectId;
    }

    const doc = await SurveyResponse.create({
      surveyId: surveyId,
      shopId: resolvedShopId,
      respondentInfo:
        Object.keys(respondentOnly).length > 0 ? respondentOnly : undefined,
      answers: normalized,
    });

    return NextResponse.json({
      ok: true,
      id: String(doc._id),
      shopId: resolvedShopId ? String(resolvedShopId) : undefined,
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
    const rows = await SurveyResponse.find({
      surveyId,
      ...notDeleted,
    })
      .populate({ path: "shopId", select: "details createdAt isDeleted" })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      rows.map((r) => {
        const shopRef = r.shopId as
          | mongoose.Types.ObjectId
          | {
              _id: mongoose.Types.ObjectId;
              details: unknown;
              createdAt?: Date;
              isDeleted?: boolean;
            }
          | null
          | undefined;

        const base: Record<string, unknown> = {
          ...r,
          _id: String(r._id),
          surveyId: String(r.surveyId),
        };
        delete base.shopId;

        if (shopRef && typeof shopRef === "object" && "_id" in shopRef) {
          const s = shopRef as {
            _id: mongoose.Types.ObjectId;
            details: unknown;
            createdAt?: Date;
            isDeleted?: boolean;
          };
          base.shopId = String(s._id);
          base.shop = {
            _id: String(s._id),
            details: s.details,
            createdAt: s.createdAt,
            isDeleted: Boolean(s.isDeleted),
          };
        } else if (shopRef) {
          base.shopId = String(shopRef);
        }

        return base;
      })
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load responses" },
      { status: 500 }
    );
  }
}
