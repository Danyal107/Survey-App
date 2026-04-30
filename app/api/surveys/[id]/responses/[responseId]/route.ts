import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { notDeleted } from "@/lib/notDeleted";
import { SurveyResponse } from "@/models/Response";

type RouteParams = { params: Promise<{ id: string; responseId: string }> };

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id: surveyId, responseId } = await params;
  if (!mongoose.Types.ObjectId.isValid(surveyId)) {
    return NextResponse.json({ error: "Invalid survey id" }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(responseId)) {
    return NextResponse.json({ error: "Invalid response id" }, { status: 400 });
  }

  try {
    await connectDB();
    const doc = await SurveyResponse.findOneAndUpdate(
      {
        _id: responseId,
        surveyId,
        ...notDeleted,
      },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete response" },
      { status: 500 }
    );
  }
}
