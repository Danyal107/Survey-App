import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Survey } from "@/models/Survey";

export async function GET() {
  try {
    await connectDB();
    const surveys = await Survey.find().sort({ updatedAt: -1 }).lean();
    return NextResponse.json(
      surveys.map((s) => ({
        ...s,
        _id: String(s._id),
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load surveys" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await connectDB();
    const survey = await Survey.create({
      title,
      description,
      questions: Array.isArray(body.questions) ? body.questions : [],
    });

    return NextResponse.json({
      ...survey.toObject(),
      _id: String(survey._id),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create survey" },
      { status: 500 }
    );
  }
}
