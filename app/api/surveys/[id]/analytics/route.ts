import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { notDeleted } from "@/lib/notDeleted";
import { Survey, type ISurvey } from "@/models/Survey";
import { SurveyResponse, type IResponse } from "@/models/Response";
import type { QuestionType } from "@/types/survey";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { id: surveyId } = await params;
  if (!mongoose.Types.ObjectId.isValid(surveyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await connectDB();
    const survey = await Survey.findOne({
      _id: surveyId,
      ...notDeleted,
    }).lean<ISurvey | null>();
    if (!survey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const responses = await SurveyResponse.find({
      surveyId,
      ...notDeleted,
    }).lean<IResponse[]>();
    const totalResponses = responses.length;

    const byQuestion: {
      questionId: string;
      text: string;
      type: QuestionType;
      options: string[];
      counts: Record<string, number>;
      textSamples: string[];
    }[] = [];

    for (const q of survey.questions) {
      const counts: Record<string, number> = {};
      for (const opt of q.options) {
        counts[opt] = 0;
      }
      const textSamples: string[] = [];

      for (const r of responses) {
        const ans = r.answers.find((a) => a.questionId === q.id);
        if (!ans) continue;
        const v = ans.value;
        if (q.type === "text" && typeof v === "string" && v.trim()) {
          if (textSamples.length < 50) textSamples.push(v.trim());
        } else if (q.type === "single" && typeof v === "string" && v) {
          counts[v] = (counts[v] ?? 0) + 1;
        } else if (q.type === "multiple" && Array.isArray(v)) {
          for (const opt of v) {
            counts[opt] = (counts[opt] ?? 0) + 1;
          }
        }
      }

      byQuestion.push({
        questionId: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        counts,
        textSamples,
      });
    }

    const lastSubmittedAt =
      responses.length > 0
        ? responses.reduce(
            (max, r) =>
              r.createdAt && r.createdAt > max ? r.createdAt : max,
            responses[0].createdAt
          )
        : null;

    return NextResponse.json({
      surveyId: String(survey._id),
      title: survey.title,
      totalResponses,
      lastSubmittedAt,
      byQuestion,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to compute analytics" },
      { status: 500 }
    );
  }
}
