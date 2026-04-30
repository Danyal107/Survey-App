import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { notDeleted } from "@/lib/notDeleted";
import { Survey, type ISurvey } from "@/models/Survey";
import { SurveyResponse } from "@/models/Response";

type RouteParams = { params: Promise<{ id: string }> };

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await connectDB();
    const survey = await Survey.findOne({
      _id: id,
      ...notDeleted,
    }).lean<ISurvey | null>();
    if (!survey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ...survey, _id: String(survey._id) });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load survey" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const body = await req.json();
    await connectDB();
    const survey = await Survey.findOne({ _id: id, ...notDeleted });
    if (!survey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (typeof body.title === "string") {
      survey.title = body.title.trim();
    }
    if (typeof body.description === "string") {
      survey.description = body.description.trim();
    }
    if (Array.isArray(body.questions)) {
      survey.questions = body.questions;
    }

    if (!survey.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await survey.save();
    return NextResponse.json({
      ...survey.toObject(),
      _id: String(survey._id),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update survey" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await connectDB();
    const survey = await Survey.findOneAndUpdate(
      { _id: id, ...notDeleted },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!survey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await SurveyResponse.updateMany(
      { surveyId: id, ...notDeleted },
      { $set: { isDeleted: true } }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete survey" },
      { status: 500 }
    );
  }
}
